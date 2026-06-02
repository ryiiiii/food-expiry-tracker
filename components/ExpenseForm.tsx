"use client";

import { useState, useEffect } from "react";

export type ExpenseCategory = "食品・日用品" | "外食" | "光熱費" | "家賃" | "その他";
export type Payer = "まどか" | "りょう";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; emoji: string }[] = [
  { value: "食品・日用品", emoji: "🛒" },
  { value: "外食",         emoji: "🍽️" },
  { value: "光熱費",       emoji: "💡" },
  { value: "家賃",         emoji: "🏠" },
  { value: "その他",       emoji: "📝" },
];

export type ExpenseFormData = {
  amount: string;
  category: ExpenseCategory;
  description: string;
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

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ExpenseForm({ initialData, onSubmit, onCancel, isSubmitting }: Props) {
  const [form, setForm] = useState<ExpenseFormData>({
    amount: "",
    category: "食品・日用品",
    description: "",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 金額 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          金額 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
          <input
            type="number"
            required
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 支払項目 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          支払項目 <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map(({ value, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, category: value, description: "" })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.category === value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              <span>{emoji}</span>
              <span>{value}</span>
            </button>
          ))}
        </div>
        {form.category === "その他" && (
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="支払内容を入力"
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>

      {/* 変動・固定 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          支払種別 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {([false, true] as const).map((val) => (
            <label
              key={String(val)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                form.isFixed === val
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="isFixed"
                checked={form.isFixed === val}
                onChange={() => setForm({ ...form, isFixed: val })}
                className="sr-only"
              />
              <span className="text-sm font-medium">{val ? "固定" : "変動"}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 支払者 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          支払者 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {(["まどか", "りょう"] as const).map((p) => (
            <label
              key={p}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                form.payer === p
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payer"
                value={p}
                checked={form.payer === p}
                onChange={() => setForm({ ...form, payer: p })}
                className="sr-only"
              />
              <span className="text-sm font-medium">{p}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 日付 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          日付 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "保存中..." : initialData?.id ? "更新する" : "追加する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
