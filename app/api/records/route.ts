import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const recordSchema = z.object({
  timestamp: z.string(),
  activity: z.string().max(200),
  rating: z.enum(["GOOD", "NORMAL", "BAD"]),
  durationHours: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).max(59),
});

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const records = await prisma.record.findMany({
      where: { userId: session.user.id },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { timestamp, activity, rating, durationHours, durationMinutes } = parsed.data;

    const { prisma } = await import("@/lib/prisma");

    const totalMinutes = (durationHours || 0) * 60 + (durationMinutes || 0);

    const record = await prisma.record.create({
      data: {
        userId: session.user.id,
        timestamp: new Date(timestamp),
        activity,
        rating,
        durationMinutes: totalMinutes,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
