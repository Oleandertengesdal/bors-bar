import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createSaleSchema } from "@/lib/validators";
import { calculateStepBasedPrice, type DrinkPriceState } from "@/lib/pricing/engine";
import { stepBasedConfigSchema, type StepBasedConfig } from "@/lib/validators";
import { z } from "zod/v4";

// GET /api/events/[id]/sales — list sales for an event
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get("guestId");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const sales = await prisma.sale.findMany({
      where: {
        eventId: id,
        ...(guestId ? { guestId } : {}),
      },
      include: {
        drink: { select: { name: true, category: true } },
        guest: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
    });

    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/sales — register a sale
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;

    // 1. Validate event exists, belongs to org, and is ACTIVE
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Event is not active. Start the event before registering sales." },
        { status: 400 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const parsed = createSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { guestId, items } = parsed.data;

    // 3. Validate guest exists for this event
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, eventId },
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found for this event" },
        { status: 404 }
      );
    }

    // 4. Validate all drinks exist, are active, and belong to this event
    const drinkIds = items.map((item) => item.drinkId);
    const drinks = await prisma.drink.findMany({
      where: { id: { in: drinkIds }, eventId },
    });

    if (drinks.length !== drinkIds.length) {
      const foundIds = new Set(drinks.map((d) => d.id));
      const missing = drinkIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { success: false, error: `Drinks not found: ${missing.join(", ")}` },
        { status: 404 }
      );
    }

    const inactiveDrinks = drinks.filter((d) => !d.isActive);
    if (inactiveDrinks.length > 0) {
      return NextResponse.json(
        { success: false, error: `Inactive drinks: ${inactiveDrinks.map((d) => d.name).join(", ")}` },
        { status: 400 }
      );
    }

    // 5. Parse pricing config
    const pricingConfig = stepBasedConfigSchema.safeParse(event.pricingConfig);
    const config: StepBasedConfig = pricingConfig.success
      ? pricingConfig.data
      : { stepAmount: 500, salesPerStepUp: 3, decayIntervalSec: 60, decayAmount: 200 };

    // 6. Create sales and update prices in a transaction
    const drinkMap = new Map(drinks.map((d) => [d.id, d]));
    const now = new Date();

    // Build all sale records
    const saleRecords = items.flatMap((item) => {
      const drink = drinkMap.get(item.drinkId)!;
      return Array.from({ length: item.quantity }, () => ({
        eventId,
        drinkId: item.drinkId,
        guestId,
        pricePaid: drink.currentPrice,
        quantity: 1,
        synced: true,
      }));
    });

    // Execute in transaction: create sales, update prices, record history
    const result = await prisma.$transaction(async (tx) => {
      // Create all sales
      await tx.sale.createMany({ data: saleRecords });

      // Recalculate prices for each affected drink
      const updatedDrinks: Array<{
        id: string;
        name: string;
        previousPrice: number;
        currentPrice: number;
      }> = [];

      for (const item of items) {
        const drink = drinkMap.get(item.drinkId)!;

        // Count recent sales for this drink (within the pricing window)
        const recentSalesCount = await tx.sale.count({
          where: {
            drinkId: item.drinkId,
            eventId,
            createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) }, // 5 min window
          },
        });

        // Find last sale time
        const lastSale = await tx.sale.findFirst({
          where: { drinkId: item.drinkId, eventId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        const drinkState: DrinkPriceState = {
          id: drink.id,
          basePrice: drink.basePrice,
          minPrice: drink.minPrice,
          maxPrice: drink.maxPrice,
          currentPrice: drink.currentPrice,
          recentSalesCount,
          lastSaleAt: lastSale?.createdAt ?? null,
        };

        const newPrice = calculateStepBasedPrice(drinkState, config, "sale");

        if (newPrice !== drink.currentPrice) {
          await tx.drink.update({
            where: { id: item.drinkId },
            data: { currentPrice: newPrice },
          });

          // Record price history
          await tx.priceHistory.create({
            data: {
              drinkId: item.drinkId,
              price: newPrice,
            },
          });
        }

        updatedDrinks.push({
          id: drink.id,
          name: drink.name,
          previousPrice: drink.currentPrice,
          currentPrice: newPrice,
        });
      }

      return updatedDrinks;
    });

    // 7. Return updated prices for all drinks in this event
    const allDrinks = await prisma.drink.findMany({
      where: { eventId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        salesCount: saleRecords.length,
        priceUpdates: result,
        drinks: allDrinks,
      },
    });
  } catch (error) {
    console.error("Error registering sale:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
