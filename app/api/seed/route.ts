import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDemoTransactions } from "@/lib/demo-data";
import { normalizeMerchant } from "@/lib/engine/normalize";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const userId = await requireUserId();
  // Reset only this user's data, then seed their account.
  await prisma.transaction.deleteMany({ where: { userId } });

  const demo = generateDemoTransactions(new Date());
  await prisma.transaction.createMany({
    data: demo.map((t) => ({
      userId,
      date: t.date,
      merchantRaw: t.merchantRaw,
      merchantNormalized: normalizeMerchant(t.merchantRaw),
      amount: t.amount,
      category: t.category,
      direction: t.direction ?? "debit",
    })),
  });

  return NextResponse.json({ seeded: demo.length });
}
