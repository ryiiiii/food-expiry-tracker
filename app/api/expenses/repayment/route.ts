import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REPAYMENT_CATEGORY = "結婚式・旅行代の返済";

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      where: { category: REPAYMENT_CATEGORY },
      select: { amount: true },
    });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return NextResponse.json({ total, count: expenses.length });
  } catch (error) {
    console.error("Repayment total error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
