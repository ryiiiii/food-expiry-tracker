import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC-SHA256 の署名付きトークン（形式: base64url(JSON).base64url(署名)）。
// proxy.ts（Node ランタイム）とサーバー側コードの両方から使う。クライアントからは import しない。

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET が未設定、または短すぎます（32文字以上）");
  }
  return s;
}

function mac(data: string): Buffer {
  return createHmac("sha256", getSecret()).update(data).digest();
}

export function signToken(payload: Record<string, unknown>, ttlSec: number): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })
  ).toString("base64url");
  return `${body}.${mac(body).toString("base64url")}`;
}

/** 署名と有効期限を検証する。不正・期限切れ・設定不備はすべて null（fail closed） */
export function verifyToken<T extends Record<string, unknown>>(
  token: string | undefined | null
): (T & { exp: number }) | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  try {
    const expected = mac(body);
    const given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload?.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
