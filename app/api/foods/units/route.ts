import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 食品に使われたことのある単位（よく使う順）。単位コンボボックスの候補に加える。
export async function GET() {
  try {
    const rows = await prisma.food.groupBy({
      by: ["unit"],
      where: { unit: { not: null } },
      _count: { unit: true },
      orderBy: { _count: { unit: "desc" } },
    });
    const units = rows
      .map((r) => (r.unit ?? "").trim())
      .filter((u) => u.length > 0);
    return NextResponse.json(Array.from(new Set(units)));
  } catch (error) {
    console.error("Failed to fetch units:", error);
    return NextResponse.json({ error: "単位の取得に失敗しました" }, { status: 500 });
  }
}
