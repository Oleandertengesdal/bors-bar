import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/events/[id]/analytics — comprehensive event analytics
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

    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, status: true, organizationId: true, createdAt: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Fetch all sales with drink and guest info
    const sales = await prisma.sale.findMany({
      where: { eventId },
      include: {
        drink: { select: { id: true, name: true, category: true, basePrice: true } },
        guest: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch price history
    const priceHistory = await prisma.priceHistory.findMany({
      where: { drink: { eventId } },
      include: { drink: { select: { id: true, name: true } } },
      orderBy: { recordedAt: "asc" },
    });

    // Fetch drinks for current state
    const drinks = await prisma.drink.findMany({
      where: { eventId, isActive: true },
      select: { id: true, name: true, category: true, basePrice: true, currentPrice: true },
    });

    // Fetch market events
    const marketEvents = await prisma.marketEvent.findMany({
      where: { eventId },
      orderBy: { triggeredAt: "asc" },
    });

    // ─── Compute KPIs ─────────────────────────────────

    const totalRevenue = sales.reduce((sum, s) => sum + s.pricePaid * s.quantity, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0);
    const uniqueGuests = new Set(sales.map((s) => s.guestId)).size;
    const avgPricePerDrink = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

    // ─── Revenue Over Time (bucketed by 5 min) ────────

    const revenueOverTime: { time: string; revenue: number; sales: number }[] = [];
    if (sales.length > 0) {
      const startTime = sales[0].createdAt.getTime();
      const endTime = sales[sales.length - 1].createdAt.getTime();
      const bucketMs = 5 * 60 * 1000; // 5 minutes

      let bucketStart = startTime;
      while (bucketStart <= endTime + bucketMs) {
        const bucketEnd = bucketStart + bucketMs;
        const bucketSales = sales.filter(
          (s) => s.createdAt.getTime() >= bucketStart && s.createdAt.getTime() < bucketEnd
        );
        const bucketRevenue = bucketSales.reduce((sum, s) => sum + s.pricePaid * s.quantity, 0);
        const bucketCount = bucketSales.reduce((sum, s) => sum + s.quantity, 0);

        revenueOverTime.push({
          time: new Date(bucketStart).toLocaleTimeString("nb-NO", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          revenue: bucketRevenue / 100, // convert to NOK
          sales: bucketCount,
        });

        bucketStart = bucketEnd;
      }
    }

    // ─── Sales By Drink ────────────────────────────────

    const salesByDrink: { name: string; quantity: number; revenue: number }[] = [];
    const drinkSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const sale of sales) {
      const key = sale.drinkId;
      const existing = drinkSalesMap.get(key) || {
        name: sale.drink.name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += sale.quantity;
      existing.revenue += sale.pricePaid * sale.quantity;
      drinkSalesMap.set(key, existing);
    }

    for (const [, v] of drinkSalesMap) {
      salesByDrink.push({ ...v, revenue: v.revenue / 100 });
    }
    salesByDrink.sort((a, b) => b.quantity - a.quantity);

    // ─── Top Spenders ──────────────────────────────────

    const guestSpendMap = new Map<string, { name: string; total: number; count: number }>();
    for (const sale of sales) {
      const key = sale.guestId;
      const existing = guestSpendMap.get(key) || {
        name: sale.guest.name,
        total: 0,
        count: 0,
      };
      existing.total += sale.pricePaid * sale.quantity;
      existing.count += sale.quantity;
      guestSpendMap.set(key, existing);
    }

    const topSpenders = [...guestSpendMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((g) => ({ ...g, total: g.total / 100 }));

    // ─── Sales By Category ─────────────────────────────

    const categoryMap = new Map<string, number>();
    for (const sale of sales) {
      const cat = sale.drink.category || "other";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + sale.quantity);
    }
    const salesByCategory = [...categoryMap.entries()]
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    // ─── Peak Hour (hourly breakdown) ──────────────────

    const hourMap = new Map<number, number>();
    for (const sale of sales) {
      const hour = sale.createdAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + sale.quantity);
    }
    const peakHours = [...hourMap.entries()]
      .map(([hour, count]) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        count,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // ─── Price History ─────────────────────────────────

    const priceHistoryByDrink: Record<string, { time: string; price: number }[]> = {};
    for (const ph of priceHistory) {
      const key = ph.drink.name;
      if (!priceHistoryByDrink[key]) priceHistoryByDrink[key] = [];
      priceHistoryByDrink[key].push({
        time: ph.recordedAt.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        price: ph.price / 100,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: totalRevenue / 100,
          totalSales,
          uniqueGuests,
          avgPricePerDrink: avgPricePerDrink / 100,
          totalDrinks: drinks.length,
          totalMarketEvents: marketEvents.length,
        },
        revenueOverTime,
        salesByDrink,
        salesByCategory,
        topSpenders,
        peakHours,
        priceHistoryByDrink,
        marketEvents: marketEvents.map((me) => ({
          type: me.type,
          name: me.name,
          triggeredAt: me.triggeredAt.toISOString(),
          durationSec: me.durationSec,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
