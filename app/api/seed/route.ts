import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDemoTransactions } from "@/lib/demo-data";
import { normalizeMerchant } from "@/lib/engine/normalize";

export const dynamic = "force-dynamic";

export async function POST() {
  await prisma.transaction.deleteMany({});

  const demo = generateDemoTransactions(new Date());
  await prisma.transaction.createMany({
    data: demo.map((t) => ({
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
