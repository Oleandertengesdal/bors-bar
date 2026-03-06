import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createDrinkSchema } from "@/lib/validators";
import { z } from "zod/v4";

// GET /api/events/[id]/drinks — list drinks for an event
export async function GET(
  _req: NextRequest,
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

    // Verify event belongs to user's org
    const event = await prisma.event.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const drinks = await prisma.drink.findMany({
      where: { eventId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: drinks });
  } catch (error) {
    console.error("Error fetching drinks:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/drinks — add a drink to an event
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

    const { id } = await params;

    // Verify event belongs to user's org
    const event = await prisma.event.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createDrinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Validate prices
    if (parsed.data.minPrice > parsed.data.basePrice) {
      return NextResponse.json(
        { success: false, error: "Min price cannot be higher than base price" },
        { status: 400 }
      );
    }
    if (parsed.data.maxPrice < parsed.data.basePrice) {
      return NextResponse.json(
        { success: false, error: "Max price cannot be lower than base price" },
        { status: 400 }
      );
    }

    const drink = await prisma.drink.create({
      data: {
        ...parsed.data,
        currentPrice: parsed.data.basePrice, // start at base price
        eventId: id,
      },
    });

    return NextResponse.json({ success: true, data: drink }, { status: 201 });
  } catch (error) {
    console.error("Error creating drink:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
