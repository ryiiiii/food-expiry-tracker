import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 買い物リスト取得
export async function GET() {
  try {
    const items = await prisma.shoppingItem.findMany({
      orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch shopping items:", error);
    return NextResponse.json(
      { error: "買い物リストの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// アイテム追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, quantity, unit } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "食品名は必須です" },
        { status: 400 }
      );
    }

    const item = await prisma.shoppingItem.create({
      data: {
        name: name.trim(),
        quantity: quantity ? parseInt(quantity, 10) : null,
        unit: unit?.trim() || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create shopping item:", error);
    return NextResponse.json(
      { error: "アイテムの追加に失敗しました" },
      { status: 500 }
    );
  }
}

// チェック済みアイテムを一括削除
export async function DELETE() {
  try {
    await prisma.shoppingItem.deleteMany({ where: { checked: true } });
    return NextResponse.json({ message: "チェック済みを削除しました" });
  } catch (error) {
    console.error("Failed to delete checked items:", error);
    return NextResponse.json(
      { error: "削除に失敗しました" },
      { status: 500 }
    );
  }
}
