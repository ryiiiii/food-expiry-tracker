import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 食品一覧取得
export async function GET() {
  try {
    const foods = await prisma.food.findMany({
      orderBy: { expiryDate: "asc" },
    });
    return NextResponse.json(foods);
  } catch (error) {
    console.error("Failed to fetch foods:", error);
    return NextResponse.json(
      { error: "食品の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 食品追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, expiryType, expiryDate, quantity, unit, frozen, category, memo } = body;

    if (!name || !expiryType) {
      return NextResponse.json(
        { error: "名前・種別は必須です" },
        { status: 400 }
      );
    }
    // 冷凍でない場合は期限日が必須
    if (!frozen && !expiryDate) {
      return NextResponse.json(
        { error: "冷凍でない場合は期限日が必須です" },
        { status: 400 }
      );
    }

    const [food] = await prisma.$transaction([
      prisma.food.create({
        data: {
          name,
          expiryType,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          quantity: quantity ? parseInt(quantity, 10) : null,
          unit: unit || null,
          frozen: frozen ?? false,
          category: category || null,
          memo: memo || null,
          notified: false,
        },
      }),
      prisma.foodName.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ]);

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("Failed to create food:", error);
    return NextResponse.json(
      { error: "食品の追加に失敗しました" },
      { status: 500 }
    );
  }
}
