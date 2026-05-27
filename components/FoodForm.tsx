"use client";

import { useState, useEffect } from "react";

export type FoodFormData = {
  name: string;
  expiryType: "消費期限" | "賞味期限";
  expiryDate: string;
  memo: string;
};

type Props = {
  initialData?: FoodFormData & { id?: number };
  onSubmit: (data: FoodFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export default function FoodForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const [form, setForm] = useState<FoodFormData>({
    name: "",
    expiryType: "消費期限",
    expiryDate: "",
    memo: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        expiryType: initialData.expiryType,
        expiryDate: initialData.expiryDate,
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          食品名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例：牛乳、鶏もも肉"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

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
                onChange={(e) =>
                  setForm({
                    ...form,
                    expiryType: e.target.value as "消費期限" | "賞味期限",
                  })
                }
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          期限日 <span className="text-red-500">*</span>
        </label>
        {/* grid ラッパーで iOS Safari の date input 幅はみ出しを防ぐ */}
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
