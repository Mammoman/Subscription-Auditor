import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "@/lib/db";
import { parseStatementText } from "@/lib/parse-statement";
import { normalizeMerchant } from "@/lib/engine/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  let text: string;
  try {
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    const doc = await getDocumentProxy(bytes);
    const result = await extractText(doc, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch {
    return NextResponse.json(
      { error: "Could not read the PDF" },
      { status: 422 }
    );
  }

  const { rows, skipped } = parseStatementText(text);

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
