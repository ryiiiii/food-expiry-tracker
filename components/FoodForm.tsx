"use client";

import { useState, useEffect } from "react";

export type FoodCategory = "生鮮" | "飲料" | "調味料" | "加工・保存食" | "お菓子・パン";

export const FOOD_CATEGORIES: { value: FoodCategory; emoji: string; label: string }[] = [
  { value: "生鮮",       emoji: "🥩", label: "生鮮" },
  { value: "飲料",       emoji: "🥤", label: "飲料" },
  { value: "調味料",     emoji: "🧂", label: "調味料" },
  { value: "加工・保存食", emoji: "🥫", label: "加工・保存食" },
  { value: "お菓子・パン", emoji: "🍪", label: "お菓子・パン" },
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
  nameSuggestions?: string[]; // 登録済み食品名の候補
};

export default function FoodForm({ initialData, onSubmit, onCancel, isSubmitting, nameSuggestions = [] }: Props) {
  const [form, setForm] = useState<FoodFormData>({
    name: "",
    expiryType: "消費期限",
    expiryDate: "",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 食品名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          食品名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          list="name-suggestions"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例：牛乳、鶏もも肉"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {nameSuggestions.length > 0 && (
          <datalist id="name-suggestions">
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </div>

      {/* 期限の種別 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          期限の種別 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          {(["消費期限", "賞味期限"] as const).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                form.expiryType === type
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="expiryType"
                value={type}
                checked={form.expiryType === type}
                onChange={(e) => setForm({ ...form, expiryType: e.target.value as "消費期限" | "賞味期限" })}
                className="sr-only"
              />
              <span className="text-sm font-medium">{type}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          消費期限：食べても安全な期限　／　賞味期限：品質が保たれる期限
        </p>
      </div>

      {/* カテゴリ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          カテゴリ（任意）
        </label>
        <div className="flex flex-wrap gap-2">
          {FOOD_CATEGORIES.map(({ value, emoji, label }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setForm({ ...form, category: form.category === value ? "" : value })
              }
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.category === value
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 冷凍トグル */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm({ ...form, frozen: !form.frozen, expiryDate: !form.frozen ? "" : form.expiryDate })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.frozen ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.frozen ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            🧊 冷凍庫に入れる
          </span>
        </label>
        {form.frozen && (
          <p className="text-xs text-blue-600 mt-1 ml-14">
            冷凍中は期限日の管理は不要です
          </p>
        )}
      </div>

      {/* 期限日（冷凍時は非表示） */}
      {!form.frozen && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            期限日 <span className="text-red-500">*</span>
          </label>
          <div className="grid">
            <input
              type="date"
              required
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* 数量・単位 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          数量・単位（任意）
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="例：2"
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <div className="flex-1">
            <input
              type="text"
              list="unit-suggestions"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="個・本・パック など"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メモ（任意）
        </label>
        <textarea
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="保存場所や注意点など"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
