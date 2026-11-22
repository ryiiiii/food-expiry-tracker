import { sanitizeItems, type ReceiptItem } from "./receipt";

// 無料枠で使える軽量モデル。変更したいときは環境変数 GEMINI_MODEL で上書きする。
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20_000;

export class ReceiptError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const PROMPT = `あなたは日本のスーパー・コンビニのレシート画像を読み取るアシスタントです。
画像のレシートから「食品・飲料」の購入品だけを抜き出し、次の JSON だけを出力してください。

{"items":[{"name":"品名","quantity":数量または null,"unit":"単位または null","category":"生鮮|調味料|保存食 のいずれか、または null"}]}

ルール:
- 食品・飲料以外（レジ袋、日用品、雑貨、たばこ、商品券など）は含めない。
- 値引き・割引・ポイント・小計・合計・消費税・お預り・お釣り・店名・日付・電話番号などの行は含めない。
- 品名は、レシートの略称を分かる範囲で自然な商品名に直す（例:「ﾄﾞﾘﾝｸ ｷﾞｭｳﾆｭｳ」→「牛乳」）。ブランド名や容量は不要。分からない場合は印字のまま。
- quantity は「購入した点数」。レシートの「×2」「2点」などがあればその数、なければ 1。品名に含まれる容量・入数（1L、6枚、10個入り、300g など）は数量にしない（10個入りの卵を1パック買ったなら 1）。
- unit は、その食品を数える自然な単位を推測して入れる（例: 牛乳・飲料→本、食パン・野菜の袋入り→袋、卵・肉・魚→パック、キャベツ・玉ねぎ・果物→個）。自信がなければ null。
- category は、肉・魚・野菜・果物・卵・豆腐・納豆・牛乳・ヨーグルト・チーズなどの乳製品・惣菜など、傷みやすいものは「生鮮」。調味料・油・香辛料は「調味料」。缶詰・乾物・レトルト・菓子・パン・冷凍食品・ジュースやお茶などの常温の飲料は「保存食」。判断できなければ null。
- 同じ商品が複数行に分かれていても、そのまま別の項目として出力してよい。
- 読み取れる食品が1つもなければ {"items":[]} を返す。
- JSON 以外の文字（説明、コードブロックの記号）は出力しない。`;

export async function extractFoodsFromReceipt(
  base64: string,
  mimeType: string
): Promise<ReceiptItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ReceiptError("レシート読み取りの設定がされていません（GEMINI_API_KEY）。", 503);
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  // 一時的な混雑（503 など）は、少し待って再試行する。タイムアウトは再試行しない。
  const RETRY_STATUSES = [500, 502, 503, 504];
  const MAX_ATTEMPTS = 3;
  let res: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64 } }],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      console.error("Gemini request failed:", e instanceof Error ? e.message : e);
      throw new ReceiptError("読み取りに時間がかかっています。もう一度お試しください。", 504);
    }

    if (res.ok || !RETRY_STATUSES.includes(res.status) || attempt === MAX_ATTEMPTS) break;
    console.warn(`Gemini API ${res.status}; retrying (${attempt}/${MAX_ATTEMPTS - 1})`);
    await new Promise((r) => setTimeout(r, attempt * 1500));
  }

  if (!res || !res.ok) {
    // 本文には内部情報が含まれうるのでクライアントへは返さず、サーバーログにだけ残す
    const status = res?.status ?? 502;
    const detail = res ? await res.text().catch(() => "") : "";
    console.error(`Gemini API error ${status}:`, detail.slice(0, 500));
    if (status === 429) {
      throw new ReceiptError("読み取りの利用上限に達しました。しばらく待ってからお試しください。", 429);
    }
    if (status === 503) {
      throw new ReceiptError("読み取りサービスが混み合っています。少し待ってからお試しください。", 503);
    }
    throw new ReceiptError("読み取りに失敗しました。時間をおいてもう一度お試しください。", 502);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();

  if (!text) {
    console.error("Gemini returned no text", data.promptFeedback?.blockReason ?? "");
    throw new ReceiptError("レシートを読み取れませんでした。写真を撮り直してください。", 422);
  }

  try {
    // 念のためコードブロックの囲いを外してからパースする
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return sanitizeItems(JSON.parse(json));
  } catch {
    console.error("Gemini returned non-JSON:", text.slice(0, 200));
    throw new ReceiptError("読み取り結果を解釈できませんでした。もう一度お試しください。", 502);
  }
}
