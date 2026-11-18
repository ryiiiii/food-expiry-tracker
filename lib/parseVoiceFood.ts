import { addDays, addMonths, makeDate, toLocalDateString } from "./date";

export type ParsedVoiceFood = {
  name?: string;
  expiryType?: "消費期限" | "賞味期限";
  expiryDate?: string;
  quantity?: string;
  unit?: string;
  frozen?: boolean;
  category?: "生鮮" | "調味料" | "保存食";
  memo?: string;
  /** 末尾が「追加して」などの送信コマンドだった */
  submit?: boolean;
};

/**
 * 発話の末尾にある「追加して」「登録して」などの送信コマンド。
 * 空白・ひらがな表記・語尾（します/ください/お願い/ね）の揺れを許容する。
 * 動詞を伴わない「追加」だけの場合は、直前に空白があるときのみ（食品名と混ざらないように）。
 */
const SUBMIT_VERB = "(?:追加|ついか|登録|とうろく|保存|ほぞん|更新|こうしん|追伽)";
const SUBMIT_TAIL = "(?:\\s*(?:しといて|して|します|する|で|を)?\\s*(?:ください|下さい|くださ[いー]|お願い|おねがい)?\\s*(?:します|致します)?\\s*[ねよ]?)";
const SUBMIT_RE = new RegExp(
  `(?:\\s*${SUBMIT_VERB}\\s*(?:しといて|して|します|する|で|お願い|おねがい|ください|下さい)${SUBMIT_TAIL}|\\s+${SUBMIT_VERB})[。.!！、,\\s]*$`
);

export function endsWithSubmitCommand(transcript: string): boolean {
  return SUBMIT_RE.test(transcript.normalize("NFKC"));
}

const UNITS = ["パック", "切れ", "人前", "kg", "ml", "個", "本", "袋", "枚", "束", "缶", "瓶", "箱", "g", "L"];
const UNIT_RE = UNITS.join("|");

const KANJI_DIGIT: Record<string, number> = {
  〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

function kanjiToNumber(s: string): number {
  if (s.includes("十")) {
    const [tens, ones] = s.split("十");
    return (tens ? KANJI_DIGIT[tens] ?? 1 : 1) * 10 + (ones ? KANJI_DIGIT[ones] ?? 0 : 0);
  }
  return [...s].reduce((acc, c) => acc * 10 + (KANJI_DIGIT[c] ?? 0), 0);
}

/** 全角→半角、数量・日付の直前にある漢数字→算用数字 */
function normalize(text: string): string {
  return text
    .normalize("NFKC")
    // 「賞味 期限」「賞味」「しょうみ期限」「賞味期間」などの揺れを正規形にそろえる
    .replace(/(賞味|しょうみ|ショウミ)\s*(期限|期間|きげん|キゲン)?/g, "賞味期限")
    .replace(/(消費|しょうひ|ショウヒ)\s*(期限|期間|きげん|キゲン)?/g, "消費期限")
    .replace(/きげん|キゲン/g, "期限")
    // 音声認識は「2026 年 12 月 1 日」のように空白を挟むことがある
    .replace(/(\d)\s+(?=[年月日週])/g, "$1")
    .replace(/([年月])\s+(?=\d)/g, "$1")
    .replace(/\s*([/／.\-‐−ー])\s*(?=\d)/g, (m, c, off, str) =>
      /\d/.test(str[off - 1] ?? "") ? c : m
    )
    .replace(
      new RegExp(`([〇一二三四五六七八九十]+)(?=日|週間|ヶ月|か月|カ月|ケ月|月|年|${UNIT_RE})`, "g"),
      (_, k: string) => String(kanjiToNumber(k))
    );
}

/** マッチ部分を text から取り除いて返す */
function take(text: string, re: RegExp): { match: RegExpMatchArray | null; rest: string } {
  const match = text.match(re);
  return { match, rest: match ? text.replace(match[0], " ") : text };
}

function parseDate(text: string, today: Date): { date: Date | null; rest: string } {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let r;

  // 和暦（令和・平成）
  r = take(text, /(令和|平成)(\d{1,2})年(\d{1,2})月(\d{1,2})日/);
  if (r.match) {
    const year = (r.match[1] === "令和" ? 2018 : 1988) + +r.match[2];
    return { date: makeDate(year, +r.match[3], +r.match[4]), rest: r.rest };
  }

  // 2026/12/1・2026-12-01・2026.12.1
  r = take(text, /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (r.match) {
    return { date: makeDate(+r.match[1], +r.match[2], +r.match[3]), rest: r.rest };
  }

  // 月末（今月末・来月末・12月末・2026年12月末）
  r = take(text, /(?:(\d{4})年)?(今月|来月|再来月|(\d{1,2})月)末/);
  if (r.match) {
    let y = base.getFullYear(), m = base.getMonth() + 1;
    if (r.match[3]) {
      m = +r.match[3];
      if (r.match[1]) y = +r.match[1];
      else if (new Date(y, m, 0) < base) y += 1;
    } else {
      const off = r.match[2] === "来月" ? 1 : r.match[2] === "再来月" ? 2 : 0;
      const t = new Date(y, m - 1 + off, 1);
      y = t.getFullYear();
      m = t.getMonth() + 1;
    }
    return { date: new Date(y, m, 0), rest: r.rest };
  }

  // 来月・再来月の○日
  r = take(text, /(来月|再来月)(\d{1,2})日/);
  if (r.match) {
    const t = new Date(base.getFullYear(), base.getMonth() + (r.match[1] === "来月" ? 1 : 2), 1);
    return { date: makeDate(t.getFullYear(), t.getMonth() + 1, +r.match[2]), rest: r.rest };
  }

  r = take(text, /(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (r.match) {
    return { date: makeDate(+r.match[1], +r.match[2], +r.match[3]), rest: r.rest };
  }

  r = take(text, /(\d{1,2})[/月](\d{1,2})日?/);
  if (r.match) {
    const m = +r.match[1], d = +r.match[2];
    let date = makeDate(base.getFullYear(), m, d);
    if (date && date < base) date = makeDate(base.getFullYear() + 1, m, d);
    return { date, rest: r.rest };
  }

  r = take(text, /(\d+)\s*日後/);
  if (r.match) return { date: addDays(base, +r.match[1]), rest: r.rest };

  r = take(text, /(\d+)\s*週間後/);
  if (r.match) return { date: addDays(base, +r.match[1] * 7), rest: r.rest };

  r = take(text, /(\d+)\s*[ヶケカか]月後/);
  if (r.match) return { date: addMonths(base, +r.match[1]), rest: r.rest };

  r = take(text, /明後日|あさって/);
  if (r.match) return { date: addDays(base, 2), rest: r.rest };

  r = take(text, /明日|あした|あす/);
  if (r.match) return { date: addDays(base, 1), rest: r.rest };

  r = take(text, /今日|きょう/);
  if (r.match) return { date: base, rest: r.rest };

  r = take(text, /再来週/);
  if (r.match) return { date: addDays(base, 14), rest: r.rest };

  r = take(text, /来週/);
  if (r.match) return { date: addDays(base, 7), rest: r.rest };

  // 「25日」のみ → 今月（過ぎていれば来月）のその日
  r = take(text, /(\d{1,2})日/);
  if (r.match) {
    const d = +r.match[1];
    let date = makeDate(base.getFullYear(), base.getMonth() + 1, d);
    if (date && date < base) {
      const next = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), 1);
      date = makeDate(next.getFullYear(), next.getMonth() + 1, d);
    }
    return { date, rest: r.rest };
  }

  return { date: null, rest: text };
}

function parseFreeForm(normalized: string, today: Date): ParsedVoiceFood {
  const result: ParsedVoiceFood = {};
  let text = normalized;

  if (/消費期限/.test(text)) result.expiryType = "消費期限";
  else if (/賞味期限/.test(text)) result.expiryType = "賞味期限";
  text = text.replace(/消費期限|賞味期限/g, " ");

  if (/冷凍/.test(text)) {
    result.frozen = true;
    result.expiryDate = "";
    text = text.replace(/冷凍/g, " ");
  }

  const cat = text.match(/生鮮|調味料|保存食/);
  if (cat) {
    result.category = cat[0] as NonNullable<ParsedVoiceFood["category"]>;
    text = text.replace(cat[0], " ");
  }

  const { date, rest } = parseDate(text, today);
  text = rest;
  if (date && !result.frozen) result.expiryDate = toLocalDateString(date);

  const q = take(text, new RegExp(`(\\d+)\\s*(${UNIT_RE})`, "i"));
  if (q.match) {
    result.quantity = q.match[1];
    const u = q.match[2];
    result.unit = u.toLowerCase() === "l" ? "L" : /^[a-z]+$/i.test(u) ? u.toLowerCase() : u;
    text = q.rest;
  }

  const name = text
    .replace(/まで|です|[、。,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[のはがを]+|[のはがを]+$/g, "")
    .trim();
  if (name) result.name = name;

  return result;
}

// ── 項目名つき（「名前 牛乳 期限 明後日 数量 2個」）─────────────────────────

type Field = "name" | "expiry" | "quantity" | "unit" | "memo" | "category";

const LABELS: { re: string; field: Field; expiryType?: "消費期限" | "賞味期限" }[] = [
  { re: "消費期限", field: "expiry", expiryType: "消費期限" },
  { re: "賞味期限", field: "expiry", expiryType: "賞味期限" },
  { re: "食品名|品名|名前", field: "name" },
  { re: "期限", field: "expiry" },
  { re: "個数|数量", field: "quantity" },
  { re: "単位", field: "unit" },
  { re: "メモ", field: "memo" },
  { re: "カテゴリー|カテゴリ|分類", field: "category" },
];
const LABEL_RE = new RegExp(`(${LABELS.map((l) => l.re).join("|")})`, "g");
const CATEGORIES = ["生鮮", "調味料", "保存食"] as const;

function stripParticles(s: string): string {
  return s
    .replace(/[、。,]|\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(は|が|を|の|です)\s*/, "")
    .replace(/\s*(です|で|を|は)$/, "")
    .trim();
}

function parseLabeled(input: string, today: Date): ParsedVoiceFood | null {
  if (input.split(LABEL_RE).length < 3) return null; // ラベルなし

  const result: ParsedVoiceFood = {};
  // 「カテゴリ」と言わなくても、カテゴリ名（生鮮・調味料・保存食）だけで設定する
  const cat = input.match(/生鮮|調味料|保存食/);
  if (cat) result.category = cat[0] as NonNullable<ParsedVoiceFood["category"]>;
  const normalized = input.replace(/(カテゴリー|カテゴリ|分類)?(は|が)?(生鮮|調味料|保存食)/, " ");
  const parts = normalized.split(LABEL_RE);
  const lead = stripParticles(parts[0].split(/\s+/).filter((w) => w !== "冷凍").join(" "));
  if (lead) result.name = lead; // 最初のラベルより前は食品名

  for (let i = 1; i < parts.length; i += 2) {
    const label = LABELS.find((l) => new RegExp(`^(${l.re})$`).test(parts[i]));
    if (!label) continue;
    const seg = stripParticles(parts[i + 1] ?? "");

    switch (label.field) {
      case "name": {
          const n = seg.split(" ").filter((w) => w !== "冷凍").join(" ");
          if (n) result.name = n;
        }
        break;
      case "expiry": {
        if (label.expiryType) result.expiryType = label.expiryType;
        if (/冷凍/.test(seg)) {
          result.frozen = true;
          result.expiryDate = "";
        } else {
          const { date } = parseDate(seg, today);
          if (date) result.expiryDate = toLocalDateString(date);
        }
        break;
      }
      case "quantity": {
        const num = seg.replace(/[〇一二三四五六七八九十]+/g, (k) => String(kanjiToNumber(k)));
        const m = num.match(new RegExp(`(\\d+)\\s*(${UNIT_RE})?`, "i"));
        if (m) {
          result.quantity = m[1];
          if (m[2]) result.unit = m[2].toLowerCase() === "l" ? "L" : /^[a-z]+$/i.test(m[2]) ? m[2].toLowerCase() : m[2];
        }
        break;
      }
      case "unit": {
        const m = seg.match(new RegExp(`(${UNIT_RE})`, "i"));
        const u = m ? m[1] : seg;
        if (u) result.unit = u.toLowerCase() === "l" ? "L" : /^[a-z]+$/i.test(u) ? u.toLowerCase() : u;
        break;
      }
      case "memo":
        if (seg) result.memo = seg;
        break;
      case "category": {
        const c = CATEGORIES.find((c) => seg.includes(c));
        if (c) result.category = c;
        break;
      }
    }
  }

  // 空白で独立した「冷凍」だけをフラグとして扱う（「冷凍餃子」は名前のまま）
  if (normalized.split(/\s+/).includes("冷凍")) {
    result.frozen = true;
    result.expiryDate = "";
  }
  return result;
}

/**
 * 音声認識テキストから食品フォームの値を抽出する。
 * - 項目名つき: 「名前 牛乳 期限 明後日 数量 2個」（順不同、「単位」「メモ」「カテゴリ」も可）
 * - 項目名なし: 「牛乳 明後日 2個」（自由形式）
 * 抽出できなかった項目は返さない（既存入力を上書きしないため）。
 */
export function parseVoiceFood(transcript: string, today: Date = new Date()): ParsedVoiceFood {
  const submit = endsWithSubmitCommand(transcript);
  const normalized = normalize(submit ? transcript.normalize("NFKC").replace(SUBMIT_RE, "") : transcript);
  const result = parseLabeled(normalized, today) ?? parseFreeForm(normalized, today);
  if (submit) result.submit = true;
  return result;
}
