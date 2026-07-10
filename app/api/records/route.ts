import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const recordSchema = z.object({
  timestamp: z.string(),
  timestampEnd: z.string().optional(),
  activity: z.string().max(200),
  rating: z.enum(["GOOD", "NORMAL", "BAD"]),
});

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { prisma } = await import("@/lib/prisma");

    const where: Record<string, unknown> = { userId: session.user.id };

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date("2100-01-01");
      where.OR = [
        { timestamp: { lt: end }, timestampEnd: { gt: start } },
        { timestampEnd: null, timestamp: { gte: start, lt: end } },
      ];
    }

    const records = await prisma.record.findMany({
      where: where as any,
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

    const { timestamp, timestampEnd, activity, rating } = parsed.data;

    const { prisma } = await import("@/lib/prisma");

    const record = await prisma.record.create({
      data: {
        userId: session.user.id,
        timestamp: new Date(timestamp),
        timestampEnd: timestampEnd ? new Date(timestampEnd) : null,
        activity,
        rating,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
