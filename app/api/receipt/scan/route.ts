import { NextRequest, NextResponse } from "next/server";
import { extractFoodsFromReceipt, ReceiptError } from "@/lib/gemini";

// Vercel の関数タイムアウト（Gemini 1回 20 秒 + 再試行の待ち時間の余裕）
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Vercel のリクエスト上限（4.5MB）に収まるよう、base64 で約 3MB までにする
const MAX_BASE64_LENGTH = 4_000_000;

// レシート画像を読み取り、食品の候補を返す（画像は保存しない）。ログイン必須（proxy.ts が /api/* を保護）。
export async function POST(request: NextRequest) {
  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { image, mimeType } = body;
  if (typeof image !== "string" || typeof mimeType !== "string" || !ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "対応していない画像です（JPEG / PNG / WebP）" }, { status: 400 });
  }
  if (image.length === 0 || image.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return NextResponse.json({ error: "画像のサイズまたは形式が不正です" }, { status: 400 });
  }

  try {
    const items = await extractFoodsFromReceipt(image, mimeType);
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof ReceiptError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("Receipt scan error:", e);
    return NextResponse.json({ error: "読み取りに失敗しました" }, { status: 500 });
  }
}
