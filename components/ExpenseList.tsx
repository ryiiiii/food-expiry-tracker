"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import ExpenseForm, {
  type ExpenseFormData,
  type ExpenseCategory,
  type Payer,
  EXPENSE_CATEGORIES,
} from "./ExpenseForm";

type Expense = {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  memo: string | null;
  isFixed: boolean;
  payer: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

// 負担割合: まどか / りょう
const BURDEN_RATIOS: Record<string, { madoka: number; ryo: number }> = {
  "食品・日用品":       { madoka: 0.4, ryo: 0.6 },
  "外食":               { madoka: 0.4, ryo: 0.6 },
  "光熱費":             { madoka: 0.5, ryo: 0.5 },
  "家賃":               { madoka: 0.3, ryo: 0.7 },
  "結婚式・旅行代の返済": { madoka: 0.0, ryo: 1.0 },
  "その他":             { madoka: 0.5, ryo: 0.5 },
};

const REPAYMENT_CATEGORY = "結婚式・旅行代の返済";

type ModalMode = "add" | "edit" | null;

export default function ExpenseList() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [repaymentTotal, setRepaymentTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/expenses/repayment")
      .then((r) => r.json())
      .then((d) => setRepaymentTotal(d.total ?? 0))
      .catch(() => setRepaymentTotal(null));
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setExpenses(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAdd = async (data: ExpenseFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      await fetchExpenses();
      setModalMode(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: ExpenseFormData) => {
    if (!editingExpense) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      await fetchExpenses();
      setModalMode(null);
      setEditingExpense(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await fetchExpenses();
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  // 集計
  const madokaPaid = expenses
    .filter((e) => e.payer === "まどか")
    .reduce((s, e) => s + e.amount, 0);
  const ryoPaid = expenses
    .filter((e) => e.payer === "りょう")
    .reduce((s, e) => s + e.amount, 0);
  const total = madokaPaid + ryoPaid;

  let madokaBurden = 0;
  let ryoBurden = 0;
  for (const e of expenses) {
    const ratio = BURDEN_RATIOS[e.category] ?? { madoka: 0.5, ryo: 0.5 };
    madokaBurden += Math.round(e.amount * ratio.madoka);
    ryoBurden += Math.round(e.amount * ratio.ryo);
  }

  // カテゴリ別内訳（支出がある項目のみ）
  const categoryBreakdown = EXPENSE_CATEGORIES.map((cat) => {
    const catExpenses = expenses.filter((e) => e.category === cat.value);
    if (catExpenses.length === 0) return null;
    const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
    const ratio = BURDEN_RATIOS[cat.value] ?? { madoka: 0.5, ryo: 0.5 };
    return {
      label: cat.value,
      emoji: cat.emoji,
      total: catTotal,
      madokaAmt: Math.round(catTotal * ratio.madoka),
      ryoAmt: Math.round(catTotal * ratio.ryo),
      madokaPct: Math.round(ratio.madoka * 100),
      ryoPct: Math.round(ratio.ryo * 100),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  // 正: まどかが多く払いすぎ → りょうはまどかに支払う
  // 負: まどかが少ない → まどかはりょうに支払う
  const settlement = madokaPaid - madokaBurden;
  const fmtAmt = (n: number) => `¥${Math.abs(n).toLocaleString("ja-JP")}`;

  if (loading && expenses.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/house_ending_bw.gif"
            alt="読み込み中"
            width={160}
            height={160}
            unoptimized
            priority
          />
          <h1 className="text-2xl font-bold loading-shimmer-text">
            ストックまどの家庭あれこれ
          </h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p>⚠️ {error}</p>
        <button
          onClick={fetchExpenses}
          className="mt-4 text-sm text-gray-600 underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 返済累計カード */}
      {repaymentTotal !== null && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-pink-500 font-medium mb-1">💍 {REPAYMENT_CATEGORY} — 返済累計</p>
          <p className="text-xl font-bold text-pink-700">
            ¥{repaymentTotal.toLocaleString("ja-JP")}
          </p>
          <p className="text-xs text-pink-400 mt-0.5">りょうが全額負担</p>
        </div>
      )}

      {/* 月選択 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold transition-colors"
        >
          ←
        </button>
        <span className="text-lg font-bold text-gray-800">
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold transition-colors"
        >
          →
        </button>
      </div>

      {/* 集計サマリー */}
      {expenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl mb-4">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <h3 className="text-sm font-bold text-gray-700">📊 {month}月の集計</h3>
            <span className="text-xs text-gray-400 transition-transform duration-200" style={{ display: "inline-block", transform: summaryOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>

          {summaryOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">
                  合計支払い: ¥{total.toLocaleString("ja-JP")}
                </p>
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-500">まどか</span>
                    <p className="text-sm font-bold text-gray-800">
                      ¥{madokaPaid.toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">りょう</span>
                    <p className="text-sm font-bold text-gray-800">
                      ¥{ryoPaid.toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">負担金額（割合計算）</p>
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-500">まどか</span>
                    <p className="text-sm font-bold text-gray-800">
                      ¥{madokaBurden.toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">りょう</span>
                    <p className="text-sm font-bold text-gray-800">
                      ¥{ryoBurden.toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>

              {categoryBreakdown.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">支払項目別 内訳</p>
                  {categoryBreakdown.map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {item.emoji} {item.label}
                        </span>
                        <span className="text-xs font-bold text-gray-800">
                          ¥{item.total.toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-0.5">
                        <span className="text-xs text-gray-500">
                          まどか ¥{item.madokaAmt.toLocaleString("ja-JP")}（{item.madokaPct}%）
                        </span>
                        <span className="text-xs text-gray-500">
                          りょう ¥{item.ryoAmt.toLocaleString("ja-JP")}（{item.ryoPct}%）
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                {settlement === 0 ? (
                  <p className="text-sm font-medium text-green-600">✅ 精算済み（差額なし）</p>
                ) : settlement > 0 ? (
                  <p className="text-sm font-medium text-blue-600">
                    💸 りょうはまどかに {fmtAmt(settlement)} 支払う
                  </p>
                ) : (
                  <p className="text-sm font-medium text-orange-600">
                    💸 まどかはりょうに {fmtAmt(settlement)} 支払う
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 追加ボタン */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setModalMode("add")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <span>＋</span>
          <span>支出を追加</span>
        </button>
      </div>

      {/* 支出リスト */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-lg font-medium text-gray-500">支出がありません</p>
          <p className="text-sm mt-1">「支出を追加」ボタンから登録してみましょう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => {
            const catInfo = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
            const emoji = catInfo?.emoji ?? "📝";
            const label =
              expense.category === "その他" && expense.description
                ? expense.description
                : expense.category;
            const dateStr = new Date(expense.date).toLocaleDateString("ja-JP", {
              month: "numeric",
              day: "numeric",
            });
            return (
              <div
                key={expense.id}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-3"
              >
                <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm truncate">
                      {label}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        expense.isFixed
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {expense.isFixed ? "固定" : "変動"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        expense.payer === "まどか"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-cyan-100 text-cyan-700"
                      }`}
                    >
                      {expense.payer}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
                  {expense.memo && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">📝 {expense.memo}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="font-bold text-gray-800">
                    ¥{expense.amount.toLocaleString("ja-JP")}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingExpense(expense);
                        setModalMode("edit");
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label="編集"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* モーダル */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalMode(null);
              setEditingExpense(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {modalMode === "add" ? "💰 支出を追加" : "✏️ 支出を編集"}
            </h2>
            <ExpenseForm
              initialData={
                editingExpense
                  ? {
                      ...editingExpense,
                      amount: String(editingExpense.amount),
                      category: editingExpense.category as ExpenseCategory,
                      description: editingExpense.description ?? "",
                      memo: editingExpense.memo ?? "",
                      payer: editingExpense.payer as Payer,
                      date: new Date(editingExpense.date)
                        .toISOString()
                        .split("T")[0],
                    }
                  : undefined
              }
              onSubmit={modalMode === "add" ? handleAdd : handleEdit}
              onCancel={() => {
                setModalMode(null);
                setEditingExpense(null);
              }}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
