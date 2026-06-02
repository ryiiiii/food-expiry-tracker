import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const where =
      year && month
        ? {
            date: {
              gte: new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1),
              lt: new Date(parseInt(year, 10), parseInt(month, 10), 1),
            },
          }
        : {};

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json(
      { error: "支出の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, category, description, isFixed, payer, date } = body;

    if (!amount || !category || !payer || !date) {
      return NextResponse.json(
        { error: "金額・支払項目・支払者・日付は必須です" },
        { status: 400 }
      );
    }
    if (category === "その他" && !description?.trim()) {
      return NextResponse.json(
        { error: "その他の場合は詳細を入力してください" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseInt(amount, 10),
        category,
        description: description || null,
        isFixed: isFixed ?? false,
        payer,
        date: new Date(date),
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json(
      { error: "支出の追加に失敗しました" },
      { status: 500 }
    );
  }
}
