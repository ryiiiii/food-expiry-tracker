import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenseId = parseInt(id, 10);
    if (isNaN(expenseId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

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

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        amount: parseInt(amount, 10),
        category,
        description: description || null,
        isFixed: isFixed ?? false,
        payer,
        date: new Date(date),
      },
    });
    return NextResponse.json(expense);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json(
      { error: "支出の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenseId = parseInt(id, 10);
    if (isNaN(expenseId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json(
      { error: "支出の削除に失敗しました" },
      { status: 500 }
    );
  }
}
