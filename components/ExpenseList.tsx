"use client";

import { useState, useCallback, useEffect } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BottomSheet from "@/components/ui/BottomSheet";
import Icon from "@/components/ui/Icon";
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
  const [summaryOpen, setSummaryOpen] = useState(true);
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
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="py-16 text-center text-danger">
        <p>{error}</p>
        <button
          onClick={fetchExpenses}
          className="mt-3 text-sm text-muted underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const closeModal = () => {
    setModalMode(null);
    setEditingExpense(null);
  };
  const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
  const showSummary = expenses.length > 0 || repaymentTotal !== null;

  return (
    <>
      {/* 月選択 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="前の月"
          className="flex size-11 items-center justify-center rounded-[10px] border border-line bg-surface"
        >
          <Icon name="chevron-left" />
        </button>
        <span className="text-[17px] font-bold">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="次の月"
          className="flex size-11 items-center justify-center rounded-[10px] border border-line bg-surface"
        >
          <Icon name="chevron-right" />
        </button>
      </div>

      {/* 集計 */}
      {showSummary && (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
          {expenses.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold">{month}月の集計</h2>
                <button
                  type="button"
                  onClick={() => setSummaryOpen((o) => !o)}
                  aria-expanded={summaryOpen}
                  aria-label={summaryOpen ? "集計を折りたたむ" : "集計を開く"}
                  className="-my-2.5 -mr-2.5 flex size-11 items-center justify-center text-muted"
                >
                  <Icon name={summaryOpen ? "chevron-up" : "chevron-down"} />
                </button>
              </div>

              {summaryOpen && (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted">合計支払い</span>
                    <span className="text-[30px] font-bold leading-tight">{yen(total)}</span>
                  </div>

                  <div className="grid grid-cols-[1.1fr_1fr_1fr] items-baseline gap-y-2.5 text-[13px]">
                    <span />
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-2 rounded-full bg-accent" />
                      まどか
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-2 rounded-full bg-accent-light" />
                      りょう
                    </span>
                    <span className="text-muted">支払った額</span>
                    <span className="text-base font-bold">{yen(madokaPaid)}</span>
                    <span className="text-base font-bold">{yen(ryoPaid)}</span>
                    <span className="text-muted">負担額（割合）</span>
                    <span className="text-base font-bold">{yen(madokaBurden)}</span>
                    <span className="text-base font-bold">{yen(ryoBurden)}</span>
                  </div>

                  {categoryBreakdown.length > 0 && (
                    <>
                      <div className="h-px bg-divider" />
                      <div className="flex flex-col gap-3.5">
                        <span className="text-xs text-muted">支払項目別の内訳</span>
                        {categoryBreakdown.map((item) => (
                          <div key={item.label} className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{item.label}</span>
                              <span className="font-bold">{yen(item.total)}</span>
                            </div>
                            <div className="flex h-2 gap-0.5 overflow-hidden rounded">
                              {item.madokaPct > 0 && (
                                <div className="bg-accent" style={{ width: `${item.madokaPct}%` }} />
                              )}
                              {item.ryoPct > 0 && <div className="flex-1 bg-accent-light" />}
                            </div>
                            <div className="flex justify-between text-xs text-muted">
                              <span>まどか {yen(item.madokaAmt)}（{item.madokaPct}%）</span>
                              <span>りょう {yen(item.ryoAmt)}（{item.ryoPct}%）</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between rounded-[10px] bg-accent-soft px-3.5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-accent">今月の精算</span>
                      {settlement === 0 ? (
                        <span className="text-sm font-medium">精算済み（差額なし）</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {settlement > 0 ? "りょう" : "まどか"}
                          <Icon name="arrow-right" size={16} label="から" />
                          {settlement > 0 ? "まどか" : "りょう"}
                        </span>
                      )}
                    </div>
                    {settlement !== 0 && (
                      <span className="text-[22px] font-bold">{fmtAmt(settlement)}</span>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* 返済累計（折りたたみに関係なく常に表示） */}
          {repaymentTotal !== null && (
            <>
              {expenses.length > 0 && <div className="h-px bg-divider" />}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted">{REPAYMENT_CATEGORY} — 返済累計</span>
                  <span className="text-lg font-bold">{yen(repaymentTotal)}</span>
                </div>
                <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-xs text-chip-ink">
                  りょうが全額負担
                </span>
              </div>
            </>
          )}
        </section>
      )}

      {/* 追加ボタン */}
      <button
        type="button"
        onClick={() => setModalMode("add")}
        className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-accent text-[15px] font-medium text-white"
      >
        <Icon name="plus" size={18} />
        支出を追加
      </button>

      {/* 支出リスト */}
      {expenses.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center">
          <p className="text-sm font-medium text-muted">支出がありません</p>
          <p className="mt-1 text-xs text-muted">「支出を追加」ボタンから登録してみましょう</p>
        </div>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-muted">
            {month}月の支出 · {expenses.length}件
          </h2>
          <ul className="rounded-xl border border-line bg-surface">
            {expenses.map((expense) => {
              const label =
                expense.category === "その他" && expense.description
                  ? expense.description
                  : expense.category;
              const dateStr = new Date(expense.date).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              });
              return (
                <li
                  key={expense.id}
                  className="flex items-center gap-2 border-b border-divider py-3 pr-1.5 pl-3.5 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[15px] font-medium">{label}</span>
                    <span className="truncate text-xs text-muted">
                      {dateStr} · {expense.category} · {expense.isFixed ? "固定" : "変動"} · {expense.payer}
                    </span>
                    {expense.memo && (
                      <span className="truncate text-xs text-muted">{expense.memo}</span>
                    )}
                  </div>
                  <span className="text-[15px] font-bold">{yen(expense.amount)}</span>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(expense);
                        setModalMode("edit");
                      }}
                      aria-label={`${label}を編集`}
                      className="flex h-11 w-10 items-center justify-center text-muted"
                    >
                      <Icon name="pencil" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      aria-label={`${label}を削除`}
                      className="flex h-11 w-10 items-center justify-center text-muted"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 追加・編集シート */}
      {modalMode && (
        <BottomSheet
          title={modalMode === "add" ? "支出を追加" : "支出を編集"}
          onClose={closeModal}
        >
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
            onCancel={closeModal}
            isSubmitting={submitting}
          />
        </BottomSheet>
      )}
    </>
  );
}
