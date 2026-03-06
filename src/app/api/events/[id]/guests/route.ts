import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createGuestSchema } from "@/lib/validators";
import { generatePin, generateQrToken } from "@/lib/utils";
import { z } from "zod/v4";

// GET /api/events/[id]/guests — list guests for an event
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

    const event = await prisma.event.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const guests = await prisma.guest.findMany({
      where: { eventId: id },
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: guests });
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/guests — register a guest
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
    const parsed = createGuestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Check for duplicate card ID
    if (parsed.data.cardId) {
      const existing = await prisma.guest.findFirst({
        where: { eventId: id, cardId: parsed.data.cardId },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "A guest with this card ID is already registered" },
          { status: 409 }
        );
      }
    }

    // Generate unique PIN
    const existingPins = await prisma.guest.findMany({
      where: { eventId: id },
      select: { pin: true },
    });
    const pinSet = new Set(existingPins.map((g) => g.pin).filter(Boolean) as string[]);
    const pin = generatePin(pinSet);

    // Generate QR token
    const qrCode = generateQrToken();

    const guest = await prisma.guest.create({
      data: {
        name: parsed.data.name,
        cardId: parsed.data.cardId || null,
        email: parsed.data.email || null,
        pin,
        qrCode,
        eventId: id,
      },
    });

    return NextResponse.json({ success: true, data: guest }, { status: 201 });
  } catch (error) {
    console.error("Error creating guest:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
