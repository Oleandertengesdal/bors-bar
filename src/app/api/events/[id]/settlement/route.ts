import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/events/[id]/settlement — get settlement report
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

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: session.user.organizationId },
      select: { id: true, name: true, status: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Fetch all sales grouped by guest
    const sales = await prisma.sale.findMany({
      where: { eventId },
      include: {
        guest: { select: { id: true, name: true, email: true, cardId: true } },
        drink: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build per-guest settlement
    const guestMap = new Map<
      string,
      {
        guestId: string;
        guestName: string;
        email: string | null;
        cardId: string | null;
        totalOwed: number;
        drinkCount: number;
        purchases: Array<{
          drinkId: string;
          drinkName: string;
          category: string;
          quantity: number;
          pricePaid: number;
          timestamp: string;
        }>;
      }
    >();

    let grandTotal = 0;
    let totalSales = 0;

    for (const sale of sales) {
      const guestId = sale.guestId;
      if (!guestMap.has(guestId)) {
        guestMap.set(guestId, {
          guestId,
          guestName: sale.guest.name,
          email: sale.guest.email,
          cardId: sale.guest.cardId,
          totalOwed: 0,
          drinkCount: 0,
          purchases: [],
        });
      }

      const entry = guestMap.get(guestId)!;
      const saleTotal = sale.pricePaid * sale.quantity;
      entry.totalOwed += saleTotal;
      entry.drinkCount += sale.quantity;
      entry.purchases.push({
        drinkId: sale.drinkId,
        drinkName: sale.drink.name,
        category: sale.drink.category,
        quantity: sale.quantity,
        pricePaid: sale.pricePaid,
        timestamp: sale.createdAt.toISOString(),
      });

      grandTotal += saleTotal;
      totalSales += sale.quantity;
    }

    // Sort guests by total owed (descending)
    const guests = Array.from(guestMap.values()).sort(
      (a, b) => b.totalOwed - a.totalOwed
    );

    // Drink summary
    const drinkSummary = new Map<
      string,
      { drinkName: string; category: string; totalSold: number; totalRevenue: number }
    >();

    for (const sale of sales) {
      const key = sale.drinkId;
      if (!drinkSummary.has(key)) {
        drinkSummary.set(key, {
          drinkName: sale.drink.name,
          category: sale.drink.category,
          totalSold: 0,
          totalRevenue: 0,
        });
      }
      const entry = drinkSummary.get(key)!;
      entry.totalSold += sale.quantity;
      entry.totalRevenue += sale.pricePaid * sale.quantity;
    }

    const drinkBreakdown = Array.from(drinkSummary.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    // Check for CSV export
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "csv") {
      const csvLines = [
        "Gjest,E-post,Kort-ID,Antall drikker,Total (øre),Total (NOK)",
        ...guests.map(
          (g) =>
            `"${g.guestName}","${g.email || ""}","${g.cardId || ""}",${g.drinkCount},${g.totalOwed},${(g.totalOwed / 100).toFixed(2)}`
        ),
        "",
        `"TOTAL","","",${totalSales},${grandTotal},${(grandTotal / 100).toFixed(2)}`,
      ];

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "_")}_settlement.csv"`,
        },
      });
    }

    if (format === "transactions") {
      const txLines = [
        "Tidspunkt,Gjest,Drikke,Kategori,Antall,Pris (øre),Pris (NOK)",
        ...sales.map(
          (s) =>
            `"${s.createdAt.toISOString()}","${s.guest.name}","${s.drink.name}","${s.drink.category}",${s.quantity},${s.pricePaid},${(s.pricePaid / 100).toFixed(2)}`
        ),
      ];

      return new NextResponse(txLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "_")}_transactions.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        event: { id: event.id, name: event.name, status: event.status },
        summary: {
          grandTotal,
          totalSales,
          uniqueGuests: guests.length,
          averagePerGuest: guests.length > 0 ? Math.round(grandTotal / guests.length) : 0,
        },
        guests,
        drinkBreakdown,
      },
    });
  } catch (error) {
    console.error("Error generating settlement:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
