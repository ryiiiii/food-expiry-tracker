import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 消費済み食品名を提案（FoodName にあって Food にも ShoppingItem にも存在しないもの）
export async function GET() {
  try {
    // 現在の食品名一覧と買い物リスト一覧を並行取得
    const [currentFoods, shoppingItems] = await Promise.all([
      prisma.food.findMany({ select: { name: true } }),
      prisma.shoppingItem.findMany({ select: { name: true } }),
    ]);
    const excludedNames = new Set([
      ...currentFoods.map((f) => f.name),
      ...shoppingItems.map((s) => s.name),
    ]);

    // 全登録履歴から除外対象でない名前を抽出
    const allNames = await prisma.foodName.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });

    const suggestions = allNames
      .map((n) => n.name)
      .filter((name) => !excludedNames.has(name));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch shopping suggestions:", error);
    return NextResponse.json(
      { error: "提案の取得に失敗しました" },
      { status: 500 }
    );
  }
}
