import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { parseBankStatement } from "@/lib/parse-bank";
import { importTransactions } from "@/lib/service";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function isPasswordError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | undefined;
  return (
    e?.name === "PasswordException" || /password/i.test(e?.message ?? "")
  );
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  let form: FormData | null;
  try {
    form = await req.formData();
  } catch (err) {
    console.error("[import-pdf] FormData parse failed:", err);
    return NextResponse.json(
      { error: "Could not read the upload — the file may be too large or the request was interrupted." },
      { status: 400 }
    );
  }

  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const blob = file as File;
  if (blob.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File is ${(blob.size / 1024 / 1024).toFixed(1)} MB — max 10 MB. Export a shorter date range and try again.` },
      { status: 413 }
    );
  }

  const password = form?.get("password");
  const pwd = typeof password === "string" && password ? password : undefined;

  let text: string;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const doc = await getDocumentProxy(bytes, pwd ? { password: pwd } : undefined);
    const result = await extractText(doc, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch (err) {
    console.error("[import-pdf] PDF extraction failed:", err);
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

  const { rows, skipped, format } = parseBankStatement(text);

  if (rows.length === 0) {
    console.warn("[import-pdf] Parsed 0 rows from", blob.name, "format:", format, "text length:", text.length);
  }

  const { imported, duplicates } = await importTransactions(userId, rows);

  return NextResponse.json({ imported, duplicates, skipped, format });
}
