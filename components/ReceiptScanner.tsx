"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { addDays, toLocalDateString } from "@/lib/date";
import { resizeImageFile, type ResizedImage } from "@/lib/resizeImage";
import { FOOD_CATEGORIES, type FoodCategory } from "./FoodForm";
import type { ReceiptItem } from "@/lib/receipt";

type Row = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  category: FoodCategory | "";
};

type Phase = "idle" | "reading" | "review" | "saving" | "done";

const inputCls =
  "h-11 w-full rounded-[10px] border border-field bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30";

/** 登録日の1週間後 */
const defaultExpiry = () => toLocalDateString(addDays(new Date(), 7));

export default function ReceiptScanner() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<ResizedImage | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // null のあいだは「登録日の1週間後」を自動で使う。日付を触ったら固定する。
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [expiryType, setExpiryType] = useState<"消費期限" | "賞味期限">("消費期限");
  const [savedCount, setSavedCount] = useState(0);

  const toRow = (item: ReceiptItem): Row => ({
    id: nextId.current++,
    name: item.name,
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit: item.unit ?? "",
    category: item.category ?? "",
  });

  const reset = () => {
    setPhase("idle");
    setError(null);
    setImage(null);
    setRows([]);
    setExpiryDate(null);
    setSavedCount(0);
  };

  // ① 撮影した画像を読み取る
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("reading");
    try {
      const resized = await resizeImageFile(file);
      setImage(resized);

      const res = await fetch("/api/receipt/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized.base64, mimeType: resized.mimeType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");

      const items = (data.items ?? []) as ReceiptItem[];
      if (items.length === 0) {
        setPhase("idle");
        setImage(null);
        setError("食品を読み取れませんでした。レシート全体が写るように撮り直してください。");
        return;
      }
      setRows(items.map(toRow));
      setExpiryDate(null);
      setPhase("review");
    } catch (e) {
      setPhase("idle");
      setImage(null);
      setError(e instanceof Error ? e.message : "読み取りに失敗しました");
    }
  };

  // ② 確認・編集
  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: nextId.current++, name: "", quantity: "", unit: "", category: "" },
    ]);

  const discard = () => {
    if (!confirm("読み取り結果を破棄しますか？")) return;
    reset();
  };

  // ③ 食品管理へ本登録（既存の POST /api/foods を1件ずつ呼ぶ）
  const register = async () => {
    const targets = rows.filter((r) => r.name.trim());
    if (targets.length === 0) {
      setError("登録する食品がありません。");
      return;
    }
    setError(null);
    setPhase("saving");
    const date = expiryDate ?? defaultExpiry(); // 未編集なら、登録した日の1週間後

    const results = await Promise.allSettled(
      targets.map(async (r) => {
        const res = await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: r.name.trim(),
            expiryType,
            expiryDate: date,
            quantity: r.quantity,
            unit: r.unit.trim(),
            frozen: false,
            category: r.category,
            memo: "",
          }),
        });
        if (!res.ok) throw new Error("failed");
        return r.id;
      })
    );

    const okIds = new Set(
      results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
    );
    const failed = targets.filter((r) => !okIds.has(r.id));

    if (failed.length === 0) {
      setSavedCount(okIds.size);
      setPhase("done");
      return;
    }
    // 失敗した分だけ残して、もう一度登録できるようにする
    setRows(failed);
    setPhase("review");
    setError(
      `${okIds.size}件を登録しましたが、${failed.length}件は失敗しました。残りをもう一度登録してください。`
    );
  };

  // ── 表示 ──────────────────────────────────────────────

  if (phase === "done") {
    return (
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-center">
        <p className="text-base font-bold">{savedCount}件を食品管理に登録しました</p>
        <p className="text-sm text-muted">期限は登録日の1週間後に設定しています。</p>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white"
        >
          食品管理を見る
        </Link>
        <button
          type="button"
          onClick={reset}
          className="h-11 rounded-xl bg-chip text-[15px] font-medium text-ink"
        >
          続けて読み取る
        </button>
      </section>
    );
  }

  if (phase === "idle" || phase === "reading") {
    const reading = phase === "reading";
    return (
      <section className="flex flex-col gap-3">
        {/* 隠し入力: 撮影 / ギャラリー */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="rounded-xl border border-line bg-surface px-4 py-6 text-center">
          {reading ? (
            <div role="status" className="flex flex-col items-center gap-3 py-4">
              <span className="size-8 animate-spin rounded-full border-[3px] border-accent-light border-t-accent" />
              <p className="text-sm font-medium">レシートを読み取っています…</p>
              <p className="text-xs text-muted">数秒〜十数秒かかります</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name="receipt" size={26} />
              </span>
              <p className="mt-1 text-sm font-medium">レシートを撮影してください</p>
              <p className="text-xs leading-relaxed text-muted">
                レシート全体が写るように撮ると、読み取りやすくなります
              </p>
            </div>
          )}
        </div>

        {error && (
          <p aria-live="polite" className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={reading}
          onClick={() => cameraRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
        >
          <Icon name="camera" size={20} />
          撮影する
        </button>
        <button
          type="button"
          disabled={reading}
          onClick={() => galleryRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-field bg-surface text-[15px] font-medium text-ink disabled:opacity-50"
        >
          <Icon name="image" size={20} />
          写真を選ぶ
        </button>
        <p className="text-xs leading-relaxed text-muted">
          読み取った内容は、確認・編集してから登録します。画像は保存されません。
        </p>
      </section>
    );
  }

  // review / saving
  const saving = phase === "saving";
  const shownDate = expiryDate ?? defaultExpiry();

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        読み取った内容を確認してください。違っていれば編集、不要な行は削除できます。
      </p>

      {image && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="flex h-11 cursor-pointer items-center px-3.5 text-sm font-medium">
            レシート画像を確認する
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt="撮影したレシート" className="max-h-96 w-full object-contain p-2" />
        </details>
      )}

      {/* 期限（全件共通） */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        <fieldset className="m-0 min-w-0 border-none p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-medium">期限の種別</legend>
          <SegmentedControl
            options={[
              { value: "消費期限", label: "消費期限" },
              { value: "賞味期限", label: "賞味期限" },
            ]}
            value={expiryType}
            onChange={setExpiryType}
          />
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">
            期限日 <span className="font-normal text-muted">初期値は登録日の1週間後</span>
          </span>
          <span className="flex h-11 items-center gap-2.5 rounded-[10px] border border-field bg-surface px-3 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <Icon name="calendar" size={18} />
            <input
              type="date"
              required
              value={shownDate}
              onChange={(e) => setExpiryDate(e.target.value || null)}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
            />
          </span>
        </label>
      </div>

      {/* 読み取り結果 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted">読み取り結果 · {rows.length}件</h2>
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <span className="sr-only">{i + 1}件目の食品名</span>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="食品名"
                    className={inputCls}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label={`${r.name || `${i + 1}件目`}を削除`}
                  className="flex size-11 shrink-0 items-center justify-center text-muted"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                <label className="w-20">
                  <span className="sr-only">数量</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.id, { quantity: e.target.value })}
                    placeholder="数量"
                    className={inputCls}
                  />
                </label>
                <label className="w-24">
                  <span className="sr-only">単位</span>
                  <input
                    type="text"
                    value={r.unit}
                    onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                    placeholder="単位"
                    className={inputCls}
                  />
                </label>
                <label className="flex-1">
                  <span className="sr-only">カテゴリ</span>
                  <select
                    value={r.category}
                    onChange={(e) => updateRow(r.id, { category: e.target.value as FoodCategory | "" })}
                    className={`${inputCls} appearance-none`}
                  >
                    <option value="">カテゴリなし</option>
                    {FOOD_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addRow}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#b9bcb5] bg-surface text-sm text-ink"
        >
          <Icon name="plus" size={16} />
          項目を追加
        </button>
      </div>

      {error && (
        <p aria-live="polite" className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={discard}
          disabled={saving}
          className="h-[50px] flex-1 rounded-xl bg-chip text-[15px] font-medium text-ink disabled:opacity-50"
        >
          破棄する
        </button>
        <button
          type="button"
          onClick={() => void register()}
          disabled={saving}
          className="h-[50px] flex-[1.4] rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "登録中…" : "食品管理に登録する"}
        </button>
      </div>
    </section>
  );
}
