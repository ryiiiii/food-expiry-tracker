import { randomUUID } from "node:crypto";

// LINE Messaging API（マルチキャスト）で、期限前日の通知を送る。
// LINE Notify は 2025年3月31日に終了しているため、公式アカウントの Messaging API を使う。
// 必要な環境変数: LINE_CHANNEL_ACCESS_TOKEN（チャネルアクセストークン）、
//               LINE_USER_IDS（送信先のユーザーID。カンマ区切り）

const ENDPOINT = "https://api.line.me/v2/bot/message/multicast";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
/** LINE のテキスト上限は5000文字。余裕を見て、一覧の合計をこの範囲に収める */
const MAX_TEXT_LENGTH = 4800;
const USER_ID_RE = /^U[0-9a-f]{32}$/;

type NotifyFood = {
  name: string;
  expiryType: string;
  expiryDate: Date | null;
};

/** 通知の本文（プレーンテキスト）。長い場合は一覧を切り詰めて「ほかN件」を付ける */
export function formatNotificationText(foods: NotifyFood[]): string {
  const header =
    "⚠️ 食品期限のお知らせ\n\n明日が期限の食品があります。お早めにご確認ください。\n\n";

  const lines = foods.map((food) => {
    const dateStr = food.expiryDate
      ? new Date(food.expiryDate).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "日付不明";
    return `・${food.name} — ${food.expiryType}：${dateStr}`;
  });

  const kept: string[] = [];
  let length = header.length;
  for (const line of lines) {
    // 「ほかN件」の行ぶん（最大約10文字）の余裕を残す
    if (length + line.length + 1 > MAX_TEXT_LENGTH - 10) break;
    kept.push(line);
    length += line.length + 1;
  }
  if (kept.length < lines.length) {
    kept.push(`…ほか${lines.length - kept.length}件`);
  }
  return header + kept.join("\n");
}

function getConfig(): { token: string; userIds: string[] } {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が未設定です");
  }
  const userIds = (process.env.LINE_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (userIds.length === 0) {
    throw new Error("LINE_USER_IDS が未設定です");
  }
  // 形式が不正なIDが1つでも混ざると LINE が 400 を返し、全員に届かないため、先に弾く
  const bad = userIds.filter((id) => !USER_ID_RE.test(id));
  if (bad.length > 0) {
    throw new Error(`LINE_USER_IDS に不正な形式のIDがあります（${bad.length}件）`);
  }
  return { token, userIds };
}

/**
 * 設定が無い・送信に失敗したときは例外を投げる（呼び出し側は notified を更新しない＝翌日再試行される）。
 */
export async function sendLineNotification(foods: NotifyFood[]): Promise<void> {
  const { token, userIds } = getConfig();
  const body = JSON.stringify({
    to: userIds,
    messages: [{ type: "text", text: formatNotificationText(foods) }],
  });
  // 再試行しても二重に届かないよう、同じ送信には同じリトライキーを付ける（24時間有効）
  const retryKey = randomUUID();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Line-Retry-Key": retryKey,
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      // タイムアウト・通信エラーは再試行する
      console.error(
        `LINE request failed (${attempt}/${MAX_ATTEMPTS}):`,
        e instanceof Error ? e.message : e
      );
      if (attempt === MAX_ATTEMPTS) throw new Error("LINE への送信に失敗しました（通信エラー）");
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    // 409 = 同じリトライキーで受付済み（＝送信済み）
    if (res.ok || res.status === 409) return;

    const detail = await res.text().catch(() => "");
    console.error(`LINE API error ${res.status} (${attempt}/${MAX_ATTEMPTS}):`, detail.slice(0, 500));

    if (res.status === 429) {
      throw new Error("LINE の送信上限（月間メッセージ数）に達しました");
    }
    // 4xx は再試行しても結果が変わらない。サーバー側の一時エラー（5xx）だけ再試行する
    if (res.status < 500 || attempt === MAX_ATTEMPTS) {
      throw new Error(`LINE への送信に失敗しました（${res.status}）`);
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
}
