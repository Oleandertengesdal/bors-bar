import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { triggerMarketEventSchema } from "@/lib/validators";
import { applyMarketEvent } from "@/lib/pricing/engine";
import { z } from "zod/v4";

// GET /api/events/[id]/market-events — list market events
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Public — TV display needs to query active market events
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Auto-expire old market events
    await prisma.marketEvent.updateMany({
      where: {
        eventId,
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    const marketEvents = await prisma.marketEvent.findMany({
      where: { eventId },
      orderBy: { triggeredAt: "desc" },
      take: 50,
    });

    const active = marketEvents.filter((e) => e.isActive);

    return NextResponse.json({
      success: true,
      data: {
        events: marketEvents,
        active,
      },
    });
  } catch (error) {
    console.error("Error fetching market events:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/market-events — trigger a market event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized — admin only" },
        { status: 403 }
      );
    }

    const { id: eventId } = await params;

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
        { success: false, error: "Event must be active to trigger market events" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = triggerMarketEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { type, name, modifier, durationSec } = parsed.data;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationSec * 1000);

    // Determine the effective modifier for each type
    const effectiveModifier = (() => {
      switch (type) {
        case "HAPPY_HOUR":
          return modifier !== 1.0 ? modifier : 0.7;
        case "BULL_RUN":
          return modifier !== 1.0 ? modifier : 1.3;
        case "MARKET_CRASH":
          return 1.0; // resets to base, modifier not used
        case "SPOTLIGHT":
          return 1.0; // sets to min, modifier not used
        case "CHAOS":
          return 1.0; // randomizes, modifier not used
        default:
          return modifier;
      }
    })();

    // Create market event and apply prices in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const marketEvent = await tx.marketEvent.create({
        data: {
          eventId,
          type,
          name: name || type.replace(/_/g, " "),
          modifier: effectiveModifier,
          durationSec,
          isActive: true,
          triggeredAt: now,
          expiresAt,
        },
      });

      // Apply to all active drinks
      const drinks = await tx.drink.findMany({
        where: { eventId, isActive: true },
      });

      const priceUpdates = [];
      for (const drink of drinks) {
        const newPrice = applyMarketEvent(
          drink.currentPrice,
          drink.basePrice,
          drink.minPrice,
          drink.maxPrice,
          { type, modifier: effectiveModifier }
        );

        if (newPrice !== drink.currentPrice) {
          await tx.drink.update({
            where: { id: drink.id },
            data: { currentPrice: newPrice },
          });

          await tx.priceHistory.create({
            data: { drinkId: drink.id, price: newPrice },
          });

          priceUpdates.push({
            drinkId: drink.id,
            drinkName: drink.name,
            oldPrice: drink.currentPrice,
            newPrice,
          });
        }
      }

      return { marketEvent, priceUpdates };
    });

    return NextResponse.json({
      success: true,
      data: {
        marketEvent: result.marketEvent,
        priceUpdates: result.priceUpdates,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error triggering market event:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
