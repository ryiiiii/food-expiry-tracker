"use client";

import { useState, useCallback, useEffect } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BottomSheet from "@/components/ui/BottomSheet";
import Icon from "@/components/ui/Icon";
import ChipToggle from "@/components/ui/ChipToggle";
import FoodItem, { type Food } from "./FoodItem";
import FoodForm, { type FoodFormData, FOOD_CATEGORIES, type FoodCategory } from "./FoodForm";

type ModalMode = "add" | "edit" | null;

export default function FoodList() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "urgent" | "expired" | "frozen">("all");
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFoods = useCallback(async () => {
    try {
      const res = await fetch("/api/foods");
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setFoods(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNameSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/foods/names");
      if (!res.ok) return;
      const data = await res.json();
      setNameSuggestions(data);
    } catch {
      // サジェスト取得失敗は無視
    }
  }, []);

  useEffect(() => {
    fetchFoods();
    fetchNameSuggestions();
  }, [fetchFoods, fetchNameSuggestions]);

  const handleAdd = async (data: FoodFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      await fetchFoods();
      fetchNameSuggestions();
      setModalMode(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: FoodFormData) => {
    if (!editingFood) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/foods/${editingFood.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      await fetchFoods();
      setModalMode(null);
      setEditingFood(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await fetchFoods();
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const openEditModal = (food: Food) => {
    setEditingFood(food);
    setModalMode("edit");
  };

  // フィルタリング
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 冷凍でない食品の残り日数を計算するヘルパー
  const daysLeft = (food: Food) => {
    if (food.frozen || !food.expiryDate) return null;
    const expiry = new Date(food.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const matchesQuery = (food: Food) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return food.name.toLowerCase().includes(q) || (food.memo?.toLowerCase().includes(q) ?? false);
  };

  // ステータス → カテゴリ → キーワードの順に絞り込む（冷凍品は「冷凍」以外では除外）
  const filteredFoods = foods.filter((food) => {
    const d = daysLeft(food);

    if (filter === "frozen") {
      if (!food.frozen) return false;
    } else {
      if (food.frozen) return false;
      if (filter === "urgent" && !(d !== null && d >= 0 && d <= 3)) return false;
      if (filter === "expired" && !(d !== null && d < 0)) return false;
    }

    if (categoryFilter && food.category !== categoryFilter) return false;
    return matchesQuery(food);
  });

  const urgentCount  = foods.filter((food) => { const d = daysLeft(food); return d !== null && d >= 0 && d <= 3; }).length;
  const expiredCount = foods.filter((food) => { const d = daysLeft(food); return d !== null && d < 0; }).length;
  const activeCount  = foods.filter((food) => !food.frozen).length;

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="py-16 text-center text-danger">
        <p>{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); fetchFoods(); }}
          className="mt-3 text-sm text-muted underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const emptyMessage = searchQuery.trim()
    ? `「${searchQuery.trim()}」に一致する食品はありません`
    : filter === "expired" ? "期限切れの食品はありません"
    : filter === "urgent"  ? "3日以内に期限が来る食品はありません"
    : filter === "frozen"  ? "冷凍中の食品はありません"
    : categoryFilter       ? `${categoryFilter}の食品はありません`
    : "食品がまだ登録されていません";

  const tiles: { key: "expired" | "urgent" | "all"; label: string; count: number; color: string }[] = [
    { key: "expired", label: "期限切れ", count: expiredCount, color: "text-danger" },
    { key: "urgent",  label: "3日以内", count: urgentCount,  color: "text-warn" },
    { key: "all",     label: "保管中",   count: activeCount,  color: "text-muted" },
  ];

  const closeModal = () => {
    setModalMode(null);
    setEditingFood(null);
  };

  return (
    <>
      {/* 件数タイル（タップで絞り込み） */}
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => {
          const selected = t.key === "all"
            ? filter !== "expired" && filter !== "urgent"
            : filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(t.key === "all" || filter === t.key ? "all" : t.key)}
              className={`flex flex-col gap-0.5 rounded-xl border bg-surface p-3 text-left ${
                selected && t.key !== "all" ? "border-accent ring-1 ring-accent" : "border-line"
              }`}
            >
              <span className={`text-[11px] font-medium ${t.color}`}>{t.label}</span>
              <span className="text-[22px] font-bold">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* 検索・カテゴリ */}
      <div className="flex flex-col gap-2.5">
        <label className="flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-accent">
          <Icon name="search" size={18} />
          <span className="sr-only">食品を検索</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="食品を検索"
            className="flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </label>
        <div className="scrollbar-hide -mx-5 flex gap-1.5 overflow-x-auto px-5">
          <ChipToggle
            size="sm"
            selected={filter !== "frozen" && !categoryFilter && filter === "all"}
            onClick={() => { setFilter("all"); setCategoryFilter(""); }}
          >
            すべて
          </ChipToggle>
          {FOOD_CATEGORIES.map((c) => (
            <ChipToggle
              key={c.value}
              size="sm"
              selected={filter !== "frozen" && categoryFilter === c.value}
              onClick={() => {
                if (filter === "frozen") setFilter("all");
                setCategoryFilter(categoryFilter === c.value && filter !== "frozen" ? "" : c.value);
              }}
            >
              {c.label}
            </ChipToggle>
          ))}
          <ChipToggle
            size="sm"
            selected={filter === "frozen"}
            onClick={() => setFilter(filter === "frozen" ? "all" : "frozen")}
          >
            冷凍
          </ChipToggle>
        </div>
      </div>

      {/* 一覧 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted">期限が近い順</h2>
        {filteredFoods.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center">
            <p className="text-sm font-medium text-muted">{emptyMessage}</p>
            {foods.length === 0 && (
              <p className="mt-1 text-xs text-muted">右下の「食品を追加」から登録しましょう</p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl border border-line bg-surface">
            {filteredFoods.map((food) => (
              <FoodItem key={food.id} food={food} onEdit={openEditModal} />
            ))}
          </ul>
        )}
      </section>

      {/* 追加ボタン */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 mx-auto flex w-full max-w-[480px] justify-end px-5">
        <button
          type="button"
          onClick={() => setModalMode("add")}
          className="pointer-events-auto flex h-12 items-center gap-1.5 rounded-3xl bg-accent pr-5 pl-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        >
          <Icon name="plus" size={18} />
          食品を追加
        </button>
      </div>

      {/* 追加・編集シート */}
      {modalMode && (
        <BottomSheet
          title={modalMode === "add" ? "食品を追加" : "食品を編集"}
          onClose={closeModal}
        >
          <FoodForm
            initialData={
              modalMode === "edit" && editingFood
                ? {
                    id: editingFood.id,
                    name: editingFood.name,
                    expiryType: editingFood.expiryType as "消費期限" | "賞味期限",
                    expiryDate: editingFood.expiryDate
                      ? new Date(editingFood.expiryDate).toISOString().split("T")[0]
                      : "",
                    quantity: editingFood.quantity != null ? String(editingFood.quantity) : "",
                    unit: editingFood.unit ?? "",
                    frozen: editingFood.frozen,
                    category: (editingFood.category as FoodCategory) ?? "",
                    memo: editingFood.memo ?? "",
                  }
                : undefined
            }
            nameSuggestions={nameSuggestions}
            onSubmit={modalMode === "add" ? handleAdd : handleEdit}
            onCancel={closeModal}
            onDelete={
              modalMode === "edit" && editingFood
                ? async () => {
                    if (!confirm(`「${editingFood.name}」を削除しますか？`)) return;
                    await handleDelete(editingFood.id);
                    closeModal();
                  }
                : undefined
            }
            isSubmitting={submitting}
          />
        </BottomSheet>
      )}
    </>
  );
}
