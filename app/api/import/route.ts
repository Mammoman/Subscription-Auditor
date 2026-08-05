import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/parse-csv";
import { normalizeMerchant } from "@/lib/engine/normalize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const csv: string | undefined = body?.csv;
  if (typeof csv !== "string" || csv.trim() === "") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const { rows, skipped } = parseCsv(csv);

  if (rows.length > 0) {
    await prisma.transaction.createMany({
      data: rows.map((r) => ({
        date: r.date,
        merchantRaw: r.merchantRaw,
        merchantNormalized: normalizeMerchant(r.merchantRaw),
        amount: r.amount,
      })),
    });
  }

  return NextResponse.json({ imported: rows.length, skipped });
}
