import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]),
});

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED"],
  COMPLETED: [], // terminal state
};

export async function PATCH(
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
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Validate transition
    const allowed = validTransitions[event.status] || [];
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${event.status} to ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === "ACTIVE" && !event.startsAt
          ? { startsAt: new Date() }
          : {}),
        ...(parsed.data.status === "COMPLETED"
          ? { endsAt: new Date() }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating event status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
