import { NextResponse } from "next/server";
import { getSummary } from "@/lib/service";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  return NextResponse.json(await getSummary(userId));
}
