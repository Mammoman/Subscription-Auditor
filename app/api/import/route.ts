import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/parse-csv";
import { importTransactions } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const csv: string | undefined = body?.csv;
  if (typeof csv !== "string" || csv.trim() === "") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const { rows, skipped } = parseCsv(csv);
  const { imported, duplicates } = await importTransactions(rows);

  return NextResponse.json({ imported, duplicates, skipped });
}
