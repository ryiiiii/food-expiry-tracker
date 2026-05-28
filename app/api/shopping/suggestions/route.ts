import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 消費済み食品名を提案（FoodName にあって Food に存在しないもの）
export async function GET() {
  try {
    // 現在の食品名一覧
    const currentFoods = await prisma.food.findMany({
      select: { name: true },
    });
    const currentNames = new Set(currentFoods.map((f) => f.name));

    // 全登録履歴から現在存在しない名前を抽出
    const allNames = await prisma.foodName.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });

    const suggestions = allNames
      .map((n) => n.name)
      .filter((name) => !currentNames.has(name));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch shopping suggestions:", error);
    return NextResponse.json(
      { error: "提案の取得に失敗しました" },
      { status: 500 }
    );
  }
}
