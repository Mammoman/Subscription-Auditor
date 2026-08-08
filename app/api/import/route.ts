import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/parse-csv";
import { importTransactions } from "@/lib/service";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const csv: string | undefined = body?.csv;
  if (typeof csv !== "string" || csv.trim() === "") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const { rows, skipped } = parseCsv(csv);
  const { imported, duplicates } = await importTransactions(userId, rows);

  return NextResponse.json({ imported, duplicates, skipped });
}
