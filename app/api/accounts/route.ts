import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/service";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  return NextResponse.json({ accounts: await getAccounts(userId) });
}
