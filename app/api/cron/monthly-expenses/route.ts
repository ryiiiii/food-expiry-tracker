import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const recurring = await prisma.recurringExpense.findMany({
      where: {
        active: true,
        OR: [
          { startYear: { lt: year } },
          { startYear: year, startMonth: { lte: month } },
        ],
      },
    });

    const results: string[] = [];

    for (const r of recurring) {
      const existing = await prisma.expense.findFirst({
        where: {
          category: r.category,
          payer: r.payer,
          amount: r.amount,
          isFixed: true,
          date: { gte: monthStart, lt: monthEnd },
        },
      });

      if (!existing) {
        await prisma.expense.create({
          data: {
            amount: r.amount,
            category: r.category,
            description: r.description ?? null,
            memo: r.memo ?? null,
            isFixed: true,
            payer: r.payer,
            date: monthStart,
          },
        });
        results.push(`追加: ${r.category} ¥${r.amount}`);
      } else {
        results.push(`スキップ（既存）: ${r.category}`);
      }
    }

    return NextResponse.json({ year, month, results });
  } catch (error) {
    console.error("Monthly expenses cron error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
