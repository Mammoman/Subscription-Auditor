import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "@/lib/db";
import { parseStatementText } from "@/lib/parse-statement";
import { normalizeMerchant } from "@/lib/engine/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isPasswordError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | undefined;
  return (
    e?.name === "PasswordException" || /password/i.test(e?.message ?? "")
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const password = form?.get("password");
  const pwd = typeof password === "string" && password ? password : undefined;

  let text: string;
  try {
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    const doc = await getDocumentProxy(bytes, pwd ? { password: pwd } : undefined);
    const result = await extractText(doc, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch (err) {
    if (isPasswordError(err)) {
      return NextResponse.json(
        {
          error: pwd
            ? "Incorrect PDF password. Please check it and try again."
            : "This PDF is password-protected. Enter its password and re-upload, or remove the password (open it, then Print → Save as PDF).",
          needsPassword: true,
        },
        { status: 422 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not read this PDF — it may be corrupted or an unusual format. A CSV export is the most reliable option.",
      },
      { status: 422 }
    );
  }

  if (!text || text.replace(/\s/g, "").length === 0) {
    return NextResponse.json(
      {
        error:
          "No readable text found — this looks like a scanned/image PDF. Text-based statements work; scanned ones need OCR (not supported). Try a CSV export.",
      },
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
