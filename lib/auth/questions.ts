import { randomInt, timingSafeEqual } from "node:crypto";
import { makeDate } from "../date";
import { LOGIN_NAMES, type LoginName } from "./names";

export type Question = { id: string; text: string; answer: string };

let cache: Record<LoginName, Question[]> | null = null;

/** 環境変数 LOGIN_QUESTIONS を読み込んで検証する。不正なら例外（ログインさせない） */
function load(): Record<LoginName, Question[]> {
  if (cache) return cache;
  const raw = process.env.LOGIN_QUESTIONS;
  if (!raw) throw new Error("LOGIN_QUESTIONS が未設定です");

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const result = {} as Record<LoginName, Question[]>;

  for (const name of LOGIN_NAMES) {
    const list = parsed[name];
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(`LOGIN_QUESTIONS に ${name} の質問がありません`);
    }
    const ids = new Set<string>();
    result[name] = list.map((q, i) => {
      const { id, text, answer } = (q ?? {}) as Partial<Question>;
      if (typeof id !== "string" || !id || ids.has(id)) {
        throw new Error(`LOGIN_QUESTIONS ${name}[${i}]: id が不正または重複しています`);
      }
      if (typeof text !== "string" || !text.trim()) {
        throw new Error(`LOGIN_QUESTIONS ${name}[${i}]: text がありません`);
      }
      if (typeof answer !== "string" || !isRealYmd(answer)) {
        throw new Error(`LOGIN_QUESTIONS ${name}[${i}]: answer は実在する YYYYMMDD の8桁にしてください`);
      }
      ids.add(id);
      return { id, text, answer };
    });
  }
  cache = result;
  return result;
}

function isRealYmd(s: string): boolean {
  return /^\d{8}$/.test(s) && makeDate(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8)) !== null;
}

export function getQuestions(name: LoginName): Question[] {
  return load()[name];
}

export function pickRandomQuestion(name: LoginName): Question {
  const list = getQuestions(name);
  return list[randomInt(list.length)];
}

export function findQuestion(name: LoginName, id: string): Question | undefined {
  return getQuestions(name).find((q) => q.id === id);
}

/**
 * 入力を8桁（YYYYMMDD）にそろえる。
 * 全角数字・「2025/06/14」「2025-6-14」「2025年6月14日」も受け付ける。8桁にならなければ null。
 */
export function normalizeAnswer(input: string): string | null {
  const s = input.normalize("NFKC").trim();
  const ymd = s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/);
  const digits = ymd
    ? `${ymd[1]}${ymd[2].padStart(2, "0")}${ymd[3].padStart(2, "0")}`
    : s.replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function answerMatches(input8: string, answer8: string): boolean {
  const a = Buffer.from(input8);
  const b = Buffer.from(answer8);
  return a.length === b.length && timingSafeEqual(a, b);
}
