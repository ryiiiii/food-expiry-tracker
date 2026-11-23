// 食品の入力チェック。サーバー（POST/PUT /api/foods）とクライアント（レシート読取）の両方で使うため、
// Node 専用のものには依存しない。

export const MAX_NAME_LENGTH = 100;
export const MAX_QUANTITY = 9999;
export const MAX_UNIT_LENGTH = 20;

export type FoodField = "name" | "quantity" | "unit";

/** 何が原因か（reason）と、どう直せば登録できるか（fix） */
export type FoodProblem = { field: FoodField; reason: string; fix: string };

export function validateFoodFields(input: {
  name: unknown;
  quantity?: unknown;
  unit?: unknown;
}): FoodProblem | null {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    return {
      field: "name",
      reason: "食品名が空です",
      fix: "食品名を入力するか、この行を削除してください",
    };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      field: "name",
      reason: `食品名が長すぎます（${name.length}文字）`,
      fix: `${MAX_NAME_LENGTH}文字以内に短くしてください`,
    };
  }

  const q = input.quantity;
  if (q !== null && q !== undefined && String(q).trim() !== "") {
    const text = String(q).trim();
    const n = Number(text);
    if (!/^\d+$/.test(text) || n < 1 || n > MAX_QUANTITY) {
      return {
        field: "quantity",
        reason: `数量「${text.slice(0, 20)}」が正しくありません`,
        fix: `1〜${MAX_QUANTITY} の整数にするか、空欄にしてください`,
      };
    }
  }

  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  if (unit.length > MAX_UNIT_LENGTH) {
    return {
      field: "unit",
      reason: `単位が長すぎます（${unit.length}文字）`,
      fix: `${MAX_UNIT_LENGTH}文字以内に短くするか、空欄にしてください`,
    };
  }
  return null;
}

/** 期限日（YYYY-MM-DD の実在する日付）か */
export function isValidDateString(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * 数量の入力を「正の整数」だけにそろえる。
 * 数字以外を取り除き、先頭の 0 を落とす（0 は入力できない）。桁数は MAX_QUANTITY に合わせて 4 桁まで。
 */
export function sanitizeQuantity(input: string): string {
  const digits = input.normalize("NFKC").replace(/\D/g, "").replace(/^0+/, "");
  return digits.slice(0, String(MAX_QUANTITY).length);
}
