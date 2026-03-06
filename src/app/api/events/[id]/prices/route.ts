import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/events/[id]/prices — get all current prices for an event (public for TV display)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Verify event exists (no auth required — TV display needs public access)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, status: true, pricingMode: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const drinks = await prisma.drink.findMany({
      where: { eventId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        imageUrl: true,
        basePrice: true,
        minPrice: true,
        maxPrice: true,
        currentPrice: true,
        sortOrder: true,
      },
    });

    // Compute price changes
    const drinksWithChange = drinks.map((d) => ({
      ...d,
      priceChangePercent:
        d.basePrice > 0
          ? ((d.currentPrice - d.basePrice) / d.basePrice) * 100
          : 0,
      priceDirection:
        d.currentPrice > d.basePrice
          ? ("up" as const)
          : d.currentPrice < d.basePrice
            ? ("down" as const)
            : ("stable" as const),
    }));

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          status: event.status,
        },
        drinks: drinksWithChange,
      },
    });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
