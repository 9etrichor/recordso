import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const recordSchema = z.object({
  timestamp: z.string().optional(),
  activity: z.string().max(200).optional(),
  rating: z.enum(["GOOD", "NORMAL", "BAD"]).optional(),
});

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = recordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { id } = await params;

    const existingRecord = await prisma.record.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (existingRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { timestamp, activity, rating } = parsed.data;

    const record = await prisma.record.update({
      where: { id },
      data: {
        ...(timestamp !== undefined && { timestamp: new Date(timestamp) }),
        ...(activity !== undefined && { activity }),
        ...(rating !== undefined && { rating }),
      },
    });

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { id } = await params;

    const existingRecord = await prisma.record.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (existingRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.record.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Record deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
