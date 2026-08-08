import { NextResponse } from "next/server";
import { getTransfers } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const transfers = await getTransfers();
  return NextResponse.json({ transfers });
}
