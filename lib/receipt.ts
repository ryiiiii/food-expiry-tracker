// レシート読み取りの共通型とサニタイズ（サーバー・クライアントの両方から使える）

export type ReceiptCategory = "生鮮" | "調味料" | "保存食";

export type ReceiptItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: ReceiptCategory | null;
};

export const MAX_ITEMS = 50;
const CATEGORIES: ReceiptCategory[] = ["生鮮", "調味料", "保存食"];

/** モデルの出力（信用しない）から、安全な形の食品リストだけを取り出す */
export function sanitizeItems(raw: unknown): ReceiptItem[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

  const items: ReceiptItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    const name = typeof e.name === "string" ? e.name.normalize("NFKC").trim().slice(0, 60) : "";
    if (!name) continue;

    const q = typeof e.quantity === "number" ? e.quantity : Number(e.quantity);
    const quantity = Number.isFinite(q) && q >= 1 && q <= 99 ? Math.round(q) : null;

    const unitRaw = typeof e.unit === "string" ? e.unit.trim().slice(0, 8) : "";
    const unit = unitRaw || null;

    const category = CATEGORIES.includes(e.category as ReceiptCategory)
      ? (e.category as ReceiptCategory)
      : null;

    items.push({ name, quantity, unit, category });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}
