import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestSelfRegisterSchema } from "@/lib/validators";
import { generatePin, generateQrToken } from "@/lib/utils";

// POST /api/events/[id]/register — public guest self-registration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Verify event exists and is accepting registrations
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, status: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Event is no longer accepting registrations" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = guestSelfRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, cardId, email } = parsed.data;

    // Check for duplicate card ID within this event
    if (cardId) {
      const existingCard = await prisma.guest.findFirst({
        where: { eventId, cardId },
      });
      if (existingCard) {
        return NextResponse.json(
          { success: false, error: "This card ID is already registered for this event" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate email within this event
    if (email) {
      const existingEmail = await prisma.guest.findFirst({
        where: { eventId, email },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "This email is already registered for this event" },
          { status: 409 }
        );
      }
    }

    // Generate unique PIN
    const existingPins = await prisma.guest.findMany({
      where: { eventId },
      select: { pin: true },
    });
    const pinSet = new Set(existingPins.map((g) => g.pin).filter(Boolean) as string[]);
    const pin = generatePin(pinSet);

    // Generate QR code token
    const qrCode = generateQrToken();

    const guest = await prisma.guest.create({
      data: {
        eventId,
        name,
        cardId: cardId || null,
        email: email || null,
        pin,
        qrCode,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        name: guest.name,
        pin: guest.pin,
        qrCode: guest.qrCode,
        eventName: event.name,
      },
    });
  } catch (error) {
    console.error("Error in guest self-registration:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
