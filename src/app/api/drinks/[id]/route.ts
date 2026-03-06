import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateDrinkSchema } from "@/lib/validators";
import { z } from "zod/v4";

// PUT /api/drinks/[id] — update a drink
export async function PUT(
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
    const parsed = updateDrinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Verify drink belongs to user's org
    const existing = await prisma.drink.findFirst({
      where: { id },
      include: { event: true },
    });

    if (!existing || existing.event.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { success: false, error: "Drink not found" },
        { status: 404 }
      );
    }

    const drink = await prisma.drink.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: drink });
  } catch (error) {
    console.error("Error updating drink:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/drinks/[id] — remove a drink
export async function DELETE(
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

    // Verify drink belongs to user's org
    const existing = await prisma.drink.findFirst({
      where: { id },
      include: { event: true },
    });

    if (!existing || existing.event.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { success: false, error: "Drink not found" },
        { status: 404 }
      );
    }

    await prisma.drink.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting drink:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
