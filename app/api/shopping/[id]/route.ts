import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// チェック状態トグル
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const current = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
    if (!current) {
      return NextResponse.json({ error: "アイテムが見つかりません" }, { status: 404 });
    }

    const updated = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: { checked: !current.checked },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to toggle shopping item:", error);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

// アイテム個別削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.shoppingItem.delete({ where: { id: itemId } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Failed to delete shopping item:", error);
    return NextResponse.json(
      { error: "削除に失敗しました" },
      { status: 500 }
    );
  }
}
