import { NextResponse } from "next/server";
import { getSubscriptions } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const subscriptions = await getSubscriptions();
  return NextResponse.json({ subscriptions });
}
