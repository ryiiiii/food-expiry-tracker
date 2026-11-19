"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ChipToggle from "@/components/ui/ChipToggle";

export type ExpenseCategory = "食品・日用品" | "外食" | "光熱費" | "家賃" | "結婚式・旅行代の返済" | "その他";
export type Payer = "まどか" | "りょう";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; emoji: string }[] = [
  { value: "食品・日用品",       emoji: "🛒" },
  { value: "外食",               emoji: "🍽️" },
  { value: "光熱費",             emoji: "💡" },
  { value: "家賃",               emoji: "🏠" },
  { value: "結婚式・旅行代の返済", emoji: "💍" },
  { value: "その他",             emoji: "📝" },
];

export type ExpenseFormData = {
  amount: string;
  category: ExpenseCategory;
  description: string;
  memo: string;
  isFixed: boolean;
  payer: Payer;
  date: string;
};

type Props = {
  initialData?: ExpenseFormData & { id?: number };
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

const inputCls =
  "h-12 w-full rounded-[10px] border border-field bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30";

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ExpenseForm({ initialData, onSubmit, onCancel, isSubmitting }: Props) {
  const [form, setForm] = useState<ExpenseFormData>({
    amount: "",
    category: "食品・日用品",
    description: "",
    memo: "",
    isFixed: false,
    payer: "まどか",
    date: todayString(),
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        amount: initialData.amount,
        category: initialData.category,
        description: initialData.description ?? "",
        memo: initialData.memo ?? "",
        isFixed: initialData.isFixed,
        payer: initialData.payer,
        date: initialData.date,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {/* 金額 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          金額 <span className="text-danger">*</span>
        </span>
        <span className="flex h-14 items-center gap-2 rounded-[10px] border border-field bg-surface px-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <span className="text-xl text-muted">¥</span>
          <input
            type="number"
            required
            min="1"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink outline-none"
          />
        </span>
      </label>

      {/* 支払項目 */}
      <fieldset className="m-0 min-w-0 border-none p-0">
        <legend className="mb-2 p-0 text-[13px] font-medium">
          支払項目 <span className="text-danger">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map(({ value }) => (
            <ChipToggle
              key={value}
              selected={form.category === value}
              onClick={() => setForm({ ...form, category: value, description: "" })}
            >
              {value}
            </ChipToggle>
          ))}
        </div>
        {form.category === "その他" && (
          <input
            type="text"
            required
            aria-label="支払内容"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="支払内容を入力"
            className={`mt-2 ${inputCls}`}
          />
        )}
      </fieldset>

      {/* 変動・固定 / 支払者 */}
      <div className="grid grid-cols-2 gap-3">
        <fieldset className="m-0 min-w-0 border-none p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium">
            支払種別 <span className="text-danger">*</span>
          </legend>
          <SegmentedControl
            options={[
              { value: "変動", label: "変動" },
              { value: "固定", label: "固定" },
            ]}
            value={form.isFixed ? "固定" : "変動"}
            onChange={(v) => setForm({ ...form, isFixed: v === "固定" })}
          />
        </fieldset>
        <fieldset className="m-0 min-w-0 border-none p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium">
            支払者 <span className="text-danger">*</span>
          </legend>
          <SegmentedControl
            options={[
              { value: "まどか", label: "まどか" },
              { value: "りょう", label: "りょう" },
            ]}
            value={form.payer}
            onChange={(payer) => setForm({ ...form, payer })}
          />
        </fieldset>
      </div>

      {/* 日付 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          日付 <span className="text-danger">*</span>
        </span>
        <span className="flex h-12 items-center gap-2.5 rounded-[10px] border border-field bg-surface px-3.5 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <Icon name="calendar" size={18} />
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
          />
        </span>
      </label>

      {/* メモ */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          メモ <span className="font-normal text-muted">任意</span>
        </span>
        <input
          type="text"
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="任意のメモを入力"
          className={inputCls}
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
    </form>
  );
}
