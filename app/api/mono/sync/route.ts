import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMonoTransactions, isMonoConfigured } from "@/lib/providers/mono";
import { normalizeMerchant } from "@/lib/engine/normalize";

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
    if (rows.length > 0) {
      await prisma.transaction.createMany({
        data: rows.map((r) => ({
          date: r.date,
          merchantRaw: r.merchantRaw,
          merchantNormalized: normalizeMerchant(r.merchantRaw),
          amount: r.amount,
          category: r.category,
        })),
      });
    }
    return NextResponse.json({ imported: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 502 }
    );
  }
}
