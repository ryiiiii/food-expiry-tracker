import { cookies } from "next/headers";
import { signToken, verifyToken } from "./token";
import { isLoginName, type LoginName } from "./names";

export const SESSION_COOKIE = "session";
export const CHALLENGE_COOKIE = "login_challenge";
export const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7日
export const CHALLENGE_TTL_SEC = 5 * 60; // 5分

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function createSession(name: LoginName): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signToken({ name }, SESSION_TTL_SEC), {
    ...baseOptions,
    maxAge: SESSION_TTL_SEC,
  });
}

export async function getSession(): Promise<{ name: LoginName } | null> {
  const store = await cookies();
  const payload = verifyToken<{ name: string }>(store.get(SESSION_COOKIE)?.value);
  return payload && isLoginName(payload.name) ? { name: payload.name } : null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// ── ログイン途中の「どの質問を出したか」を覚えるチャレンジ ──
export async function setChallenge(name: LoginName, questionId: string): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, signToken({ name, qid: questionId }, CHALLENGE_TTL_SEC), {
    ...baseOptions,
    maxAge: CHALLENGE_TTL_SEC,
  });
}

export async function getChallenge(): Promise<{ name: LoginName; questionId: string } | null> {
  const store = await cookies();
  const p = verifyToken<{ name: string; qid: string }>(store.get(CHALLENGE_COOKIE)?.value);
  return p && isLoginName(p.name) && typeof p.qid === "string"
    ? { name: p.name, questionId: p.qid }
    : null;
}

export async function clearChallenge(): Promise<void> {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}
