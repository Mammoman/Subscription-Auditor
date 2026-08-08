import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/service";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  return NextResponse.json({ transactions: await getTransactions(userId) });
}
