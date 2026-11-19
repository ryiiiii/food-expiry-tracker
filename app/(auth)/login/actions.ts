"use server";

import { redirect } from "next/navigation";
import {
  clearChallenge,
  createSession,
  getChallenge,
  setChallenge,
} from "@/lib/auth/session";
import { isLoginName, PARTNER_NAME, type LoginName } from "@/lib/auth/names";
import {
  answerMatches,
  findQuestion,
  normalizeAnswer,
  pickRandomQuestion,
} from "@/lib/auth/questions";
import {
  clearFailures,
  getLockState,
  MAX_FAILURES,
  recordFailure,
} from "@/lib/auth/lockout";

export type LoginState = {
  step: "name" | "answer";
  error?: string;
  /** ステップ2で表示する質問文 */
  question?: string;
  /** 注意文の宛先 */
  partner?: string;
  /** ステップ2の見出し用 */
  name?: LoginName;
};

const LOCKED = (minutes: number): string =>
  `${MAX_FAILURES}回間違えたため、ロックされています。あと約${minutes}分後にもう一度お試しください。`;

const CONFIG_ERROR = "ログインの設定を読み込めませんでした。管理者に確認してください。";

/** 名前入力 → 質問表示 → 答え確認を1つの Server Action で処理する（intent で分岐） */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const intent = formData.get("intent");

  if (intent === "back") {
    await clearChallenge();
    return { step: "name" };
  }
  if (intent === "answer") return submitAnswer(formData);
  return startLogin(formData);
}

async function startLogin(formData: FormData): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim().toLowerCase();
  if (!isLoginName(name)) {
    return { step: "name", error: "名前が違います。" };
  }

  const lock = await getLockState(name);
  if (lock.locked) return { step: "name", error: LOCKED(lock.minutes) };

  let question;
  try {
    question = pickRandomQuestion(name);
  } catch (e) {
    console.error("login config error:", e);
    return { step: "name", error: CONFIG_ERROR };
  }

  await setChallenge(name, question.id);
  return { step: "answer", name, question: question.text, partner: PARTNER_NAME[name] };
}

async function submitAnswer(formData: FormData): Promise<LoginState> {
  const challenge = await getChallenge();
  if (!challenge) {
    return { step: "name", error: "有効期限が切れました。最初からやり直してください。" };
  }
  const { name } = challenge;

  let question;
  try {
    question = findQuestion(name, challenge.questionId);
  } catch (e) {
    console.error("login config error:", e);
    return { step: "name", error: CONFIG_ERROR };
  }
  if (!question) {
    await clearChallenge();
    return { step: "name", error: "質問が見つかりません。最初からやり直してください。" };
  }

  const view = { name, question: question.text, partner: PARTNER_NAME[name] };

  const lock = await getLockState(name);
  if (lock.locked) {
    await clearChallenge();
    return { step: "name", error: LOCKED(lock.minutes) };
  }

  // 形式が違う入力も「答えが違う」と同じ扱いにする（形式のヒントを出さない）
  const normalized = normalizeAnswer(String(formData.get("answer") ?? ""));
  if (normalized && answerMatches(normalized, question.answer)) {
    await clearFailures(name);
    await clearChallenge();
    await createSession(name);
    redirect("/");
  }

  await recordFailure(name);
  const after = await getLockState(name);
  if (after.locked) {
    await clearChallenge();
    return { step: "name", error: LOCKED(after.minutes) };
  }
  return {
    step: "answer",
    ...view,
    error: `答えが違います。あと${after.remaining}回間違えるとロックされます。`,
  };
}
