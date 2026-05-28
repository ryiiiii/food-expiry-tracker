import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 登録済み食品名の全履歴を取得（削除済みも含む）
export async function GET() {
  try {
    const names = await prisma.foodName.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });
    return NextResponse.json(names.map((n) => n.name));
  } catch (error) {
    console.error("Failed to fetch food names:", error);
    return NextResponse.json(
      { error: "食品名の取得に失敗しました" },
      { status: 500 }
    );
  }
}
