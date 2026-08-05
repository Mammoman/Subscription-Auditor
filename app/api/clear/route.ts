import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const { count } = await prisma.transaction.deleteMany({});
  return NextResponse.json({ deleted: count });
}
