"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ChipToggle from "@/components/ui/ChipToggle";
import Switch from "@/components/ui/Switch";
import { addDays, toLocalDateString } from "@/lib/date";
import { parseVoiceFood, endsWithSubmitCommand } from "@/lib/parseVoiceFood";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export type FoodCategory = "生鮮" | "調味料" | "保存食";

export const FOOD_CATEGORIES: { value: FoodCategory; emoji: string; label: string }[] = [
  { value: "生鮮",   emoji: "🥩", label: "生鮮" },
  { value: "調味料", emoji: "🧂", label: "調味料" },
  { value: "保存食", emoji: "🥫", label: "保存食" },
];

export type FoodFormData = {
  name: string;
  expiryType: "消費期限" | "賞味期限";
  expiryDate: string;
  quantity: string;
  unit: string;
  frozen: boolean;
  category: FoodCategory | "";
  memo: string;
};

const UNIT_SUGGESTIONS = ["個", "本", "パック", "袋", "枚", "切れ", "束", "缶", "瓶", "箱", "g", "kg", "ml", "L", "人前"];

type Props = {
  initialData?: FoodFormData & { id?: number };
  onSubmit: (data: FoodFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>; // 編集時のみ: 削除
  nameSuggestions?: string[]; // 登録済み食品名の候補
};

const inputCls =
  "h-12 w-full rounded-[10px] border border-field bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30";

function defaultExpiryDate(): string {
  return toLocalDateString(addDays(new Date(), 5));
}

export default function FoodForm({ initialData, onSubmit, onCancel, isSubmitting, nameSuggestions = [], onDelete }: Props) {
  const [form, setForm] = useState<FoodFormData>({
    name: "",
    expiryType: "消費期限",
    expiryDate: defaultExpiryDate(),
    quantity: "",
    unit: "",
    frozen: false,
    category: "",
    memo: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        expiryType: initialData.expiryType,
        expiryDate: initialData.expiryDate,
        quantity: initialData.quantity ?? "",
        unit: initialData.unit ?? "",
        frozen: initialData.frozen ?? false,
        category: (initialData.category as FoodCategory) ?? "",
        memo: initialData.memo || "",
      });
    }
  }, [initialData]);

  const [heard, setHeard] = useState("");
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const { supported, listening, interim, error: voiceError, start, stop } = useSpeechRecognition(
    (transcript) => {
      setHeard(transcript);
      setVoiceNotice(null);
      const { submit, ...parsed } = parseVoiceFood(transcript);
      const merged = { ...form, ...parsed };
      setForm(merged);
      if (!submit) return;
      // 「追加して」で送信。必須項目が足りなければ送信せず知らせる
      if (isSubmitting) return;
      if (!merged.name.trim()) return setVoiceNotice("食品名が入力されていないため追加できません");
      if (!merged.frozen && !merged.expiryDate) return setVoiceNotice("期限日が入力されていないため追加できません");
      void onSubmit(merged);
    },
    endsWithSubmitCommand
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {/* 音声入力 */}
      {supported && (
        <div>
          <button
            type="button"
            onClick={listening ? stop : start}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-3 text-sm font-medium ${
              listening
                ? "animate-pulse border-danger/40 bg-danger-soft text-danger"
                : "border-field bg-surface text-ink"
            }`}
          >
            <Icon name="mic" size={18} />
            {listening ? "聞いています…（話し終えたらタップ）" : "音声で入力（例：牛乳 期限 明後日 数量 2個 追加して）"}
          </button>
          {listening && interim && (
            <p className="mt-1.5 text-xs text-muted">「{interim}」</p>
          )}
          {heard && !listening && (
            <p className="mt-1.5 text-xs text-muted">認識結果：「{heard}」</p>
          )}
          {voiceNotice && <p className="mt-1.5 text-xs text-danger">{voiceNotice}</p>}
          {voiceError && <p className="mt-1.5 text-xs text-danger">{voiceError}</p>}
        </div>
      )}

      {/* 食品名 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          食品名 <span className="text-danger">*</span>
        </span>
        <input
          type="text"
          list="name-suggestions"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例：牛乳、鶏もも肉"
          className={inputCls}
        />
        {nameSuggestions.length > 0 && (
          <datalist id="name-suggestions">
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </label>

      {/* 期限の種別 */}
      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-none p-0">
        <legend className="mb-1.5 p-0 text-[13px] font-medium">
          期限の種別 <span className="text-danger">*</span>
        </legend>
        <SegmentedControl
          options={[
            { value: "消費期限", label: "消費期限" },
            { value: "賞味期限", label: "賞味期限" },
          ]}
          value={form.expiryType}
          onChange={(expiryType) => setForm({ ...form, expiryType })}
        />
      </fieldset>

      {/* カテゴリ */}
      <fieldset className="m-0 min-w-0 border-none p-0">
        <legend className="mb-2 p-0 text-[13px] font-medium">
          カテゴリ <span className="font-normal text-muted">任意</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {FOOD_CATEGORIES.map(({ value, label }) => (
            <ChipToggle
              key={value}
              selected={form.category === value}
              onClick={() =>
                setForm({ ...form, category: form.category === value ? "" : value })
              }
            >
              {label}
            </ChipToggle>
          ))}
        </div>
      </fieldset>

      {/* 冷凍 */}
      <div>
        <Switch
          label="冷凍庫に入れる"
          checked={form.frozen}
          onChange={(frozen) =>
            setForm({ ...form, frozen, expiryDate: frozen ? "" : form.expiryDate })
          }
        />
        {form.frozen && (
          <p className="text-xs text-muted">冷凍品は期限日の入力が不要です</p>
        )}
      </div>

      {/* 期限日 */}
      {!form.frozen && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">
            期限日 <span className="text-danger">*</span>
          </span>
          <span className="flex h-12 items-center gap-2.5 rounded-[10px] border border-field bg-surface px-3.5 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <Icon name="calendar" size={18} />
            <input
              type="date"
              required
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
            />
          </span>
        </label>
      )}

      {/* 数量・単位 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          数量・単位 <span className="font-normal text-muted">任意</span>
        </span>
        <div className="flex gap-2">
          <label className="w-[110px]">
            <span className="sr-only">数量</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="例：2"
              className={inputCls}
            />
          </label>
          <label className="flex-1">
            <span className="sr-only">単位</span>
            <input
              type="text"
              list="unit-suggestions"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="個・本・パック など"
              className={inputCls}
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>
        </div>
      </div>

      {/* メモ */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          メモ <span className="font-normal text-muted">任意</span>
        </span>
        <textarea
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="保存場所や注意点など"
          rows={2}
          className="h-[76px] w-full resize-none rounded-[10px] border border-field bg-surface px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>

      {/* ボタン */}
      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-[50px] flex-1 rounded-xl bg-chip text-[15px] font-medium text-ink"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[50px] flex-1 rounded-xl bg-accent text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : initialData?.id ? "更新する" : "追加する"}
        </button>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => void onDelete()}
          className="flex h-11 items-center justify-center gap-1.5 text-sm font-medium text-danger"
        >
          <Icon name="trash" size={16} />
          この食品を削除
        </button>
      )}
    </form>
  );
}
