import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackNotification } from "@/lib/slack";

export async function GET(request: NextRequest) {
  // Vercel Cron Jobs のセキュリティ確認
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 明日の日付範囲を計算（JST対応）
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowStart = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      0,
      0,
      0
    );
    const tomorrowEnd = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      23,
      59,
      59
    );

    // 明日が期限かつ未通知の食品を取得
    const foodsToNotify = await prisma.food.findMany({
      where: {
        expiryDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
        notified: false,
      },
    });

    if (foodsToNotify.length === 0) {
      return NextResponse.json({ message: "通知対象の食品はありません", count: 0 });
    }

    // Slack通知を送信
    await sendSlackNotification(foodsToNotify);

    // 通知済みに更新
    await prisma.food.updateMany({
      where: {
        id: { in: foodsToNotify.map((f) => f.id) },
      },
      data: { notified: true },
    });

    return NextResponse.json({
      message: `${foodsToNotify.length}件の食品について通知しました`,
      count: foodsToNotify.length,
      foods: foodsToNotify.map((f) => f.name),
    });
  } catch (error) {
    console.error("Cron notification error:", error);
    return NextResponse.json(
      { error: "通知の送信に失敗しました" },
      { status: 500 }
    );
  }
}
