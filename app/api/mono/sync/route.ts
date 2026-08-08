import { NextRequest, NextResponse } from "next/server";
import { fetchMonoTransactions, isMonoConfigured } from "@/lib/providers/mono";
import { importTransactions } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isMonoConfigured()) {
    return NextResponse.json(
      { error: "Mono is not configured" },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const accountId: string | undefined = body?.accountId;
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const rows = await fetchMonoTransactions(accountId);
    const { imported, duplicates } = await importTransactions(rows);
    return NextResponse.json({ imported, duplicates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 502 }
    );
  }
}
