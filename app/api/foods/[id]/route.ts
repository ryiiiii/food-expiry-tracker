import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 食品更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const foodId = parseInt(id, 10);
    if (isNaN(foodId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const { name, expiryType, expiryDate, quantity, unit, memo } = body;

    if (!name || !expiryType || !expiryDate) {
      return NextResponse.json(
        { error: "名前・種別・期限日は必須です" },
        { status: 400 }
      );
    }

    const food = await prisma.food.update({
      where: { id: foodId },
      data: {
        name,
        expiryType,
        expiryDate: new Date(expiryDate),
        quantity: quantity ? parseInt(quantity, 10) : null,
        unit: unit || null,
        memo: memo || null,
        // 日付が変わったら再通知できるようリセット
        notified: false,
      },
    });

    return NextResponse.json(food);
  } catch (error) {
    console.error("Failed to update food:", error);
    return NextResponse.json(
      { error: "食品の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// 食品削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const foodId = parseInt(id, 10);
    if (isNaN(foodId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.food.delete({ where: { id: foodId } });

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Failed to delete food:", error);
    return NextResponse.json(
      { error: "食品の削除に失敗しました" },
      { status: 500 }
    );
  }
}
