import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// DELETE /api/guests/[id] — remove a guest
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

    const existing = await prisma.guest.findFirst({
      where: { id },
      include: { event: true },
    });

    if (!existing || existing.event.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    // Check if guest has any sales
    const salesCount = await prisma.sale.count({ where: { guestId: id } });
    if (salesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete guest with ${salesCount} existing sales. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.guest.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting guest:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
