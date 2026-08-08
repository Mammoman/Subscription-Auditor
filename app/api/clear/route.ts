import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const userId = await requireUserId();
  const { count } = await prisma.transaction.deleteMany({ where: { userId } });
  return NextResponse.json({ deleted: count });
}
