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
    const { name, expiryType, expiryDate, memo } = body;

    if (!name || !expiryType || !expiryDate) {
      return NextResponse.json(
        { error: "名前・種別・期限日は必須です" },
        { status: 400 }
      );
    }

    const food = await prisma.food.create({
      data: {
        name,
        expiryType,
        expiryDate: new Date(expiryDate),
        memo: memo || null,
        notified: false,
      },
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("Failed to create food:", error);
    return NextResponse.json(
      { error: "食品の追加に失敗しました" },
      { status: 500 }
    );
  }
}
