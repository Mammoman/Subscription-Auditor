import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeMerchant } from "@/lib/engine/normalize";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Marks all of the user's transactions for a merchant as cancelled (local-only;
 * does NOT touch any real service). Cancelled merchants drop out of the build.
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const merchant: string | undefined = body?.merchant;
  if (!merchant) {
    return NextResponse.json({ error: "merchant is required" }, { status: 400 });
  }

  const key = normalizeMerchant(merchant);
  const all = await prisma.transaction.findMany({
    where: { userId, status: "active" },
  });
  const ids = all
    .filter((t) => normalizeMerchant(t.merchantRaw) === key)
    .map((t) => t.id);

  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ cancelled: ids.length, merchant: key });
}
