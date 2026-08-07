import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, isMonoConfigured } from "@/lib/providers/mono";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isMonoConfigured()) {
    return NextResponse.json(
      { error: "Mono is not configured" },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const code: string | undefined = body?.code;
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const accountId = await exchangeCode(code);
    // In a multi-user app, persist accountId against the logged-in user here.
    return NextResponse.json({ accountId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "exchange failed" },
      { status: 502 }
    );
  }
}
