import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/events/[id]/drinks/[drinkId]/history — get price history for a drink
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; drinkId: string }> }
) {
  try {
    const { id: eventId, drinkId } = await params;

    // Verify drink belongs to event
    const drink = await prisma.drink.findFirst({
      where: { id: drinkId, eventId },
      select: { id: true, name: true, basePrice: true, currentPrice: true },
    });

    if (!drink) {
      return NextResponse.json(
        { success: false, error: "Drink not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since"); // ISO datetime
    const limit = parseInt(searchParams.get("limit") ?? "500", 10);

    const history = await prisma.priceHistory.findMany({
      where: {
        drinkId,
        ...(since ? { recordedAt: { gte: new Date(since) } } : {}),
      },
      orderBy: { recordedAt: "asc" },
      take: Math.min(limit, 2000),
      select: {
        id: true,
        price: true,
        recordedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        drink,
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
