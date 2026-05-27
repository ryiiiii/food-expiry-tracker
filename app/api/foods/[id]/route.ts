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
    const { name, expiryType, expiryDate, quantity, unit, frozen, memo } = body;

    if (!name || !expiryType) {
      return NextResponse.json(
        { error: "名前・種別は必須です" },
        { status: 400 }
      );
    }
    if (!frozen && !expiryDate) {
      return NextResponse.json(
        { error: "冷凍でない場合は期限日が必須です" },
        { status: 400 }
      );
    }

    const food = await prisma.food.update({
      where: { id: foodId },
      data: {
        name,
        expiryType,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quantity: quantity ? parseInt(quantity, 10) : null,
        unit: unit || null,
        frozen: frozen ?? false,
        memo: memo || null,
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
