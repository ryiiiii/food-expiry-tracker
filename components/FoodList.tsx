"use client";

import { useState, useCallback, useEffect } from "react";
import FoodItem, { type Food } from "./FoodItem";
import FoodForm, { type FoodFormData } from "./FoodForm";

type ModalMode = "add" | "edit" | null;

export default function FoodList() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "urgent" | "expired" | "frozen">("all");
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

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

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

  const filteredFoods = foods.filter((food) => {
    const d = daysLeft(food);
    // 期限フィルター（冷凍品は「期限近い」「期限切れ」に出さない）
    if (filter === "frozen")  return food.frozen;
    if (filter === "urgent")  return d !== null && d >= 0 && d <= 3;
    if (filter === "expired") return d !== null && d < 0;

    // キーワード検索（食品名・メモの部分一致）
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = food.name.toLowerCase().includes(q);
      const matchMemo = food.memo?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchMemo) return false;
    }

    return true;
  });

  const urgentCount  = foods.filter((food) => { const d = daysLeft(food); return d !== null && d >= 0 && d <= 3; }).length;
  const expiredCount = foods.filter((food) => { const d = daysLeft(food); return d !== null && d < 0; }).length;
  const frozenCount  = foods.filter((food) => food.frozen).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p>⚠️ {error}</p>
        <button
          onClick={fetchFoods}
          className="mt-4 text-sm text-gray-600 underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 検索欄 */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="食品名・メモで検索"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* フィルター & 追加ボタン */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            すべて ({foods.length})
          </button>
          <button
            onClick={() => setFilter("urgent")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "urgent"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⚠️ 期限近い ({urgentCount})
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "expired"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            期限切れ ({expiredCount})
          </button>
          <button
            onClick={() => setFilter("frozen")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "frozen"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🧊 冷凍中 ({frozenCount})
          </button>
        </div>
        <button
          onClick={() => setModalMode("add")}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <span>＋</span>
          <span className="hidden sm:inline">食品を追加</span>
        </button>
      </div>

      {/* 食品リスト */}
      {filteredFoods.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🥗</p>
          <p className="text-lg font-medium text-gray-500">
            {searchQuery.trim()
              ? `「${searchQuery}」に一致する食品はありません`
              : filter === "all"     ? "まだ食品が登録されていません"
              : filter === "urgent"  ? "期限が近い食品はありません"
              : filter === "frozen"  ? "冷凍中の食品はありません"
              : "期限切れの食品はありません"}
          </p>
          {!searchQuery.trim() && filter === "all" && (
            <p className="text-sm mt-1">「食品を追加」ボタンから登録してみましょう</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFoods.map((food) => (
            <FoodItem
              key={food.id}
              food={food}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* モーダル */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalMode(null);
              setEditingFood(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {modalMode === "add" ? "🥬 食品を追加" : "✏️ 食品を編集"}
            </h2>
            <FoodForm
              initialData={
                editingFood
                  ? {
                      ...editingFood,
                      expiryDate: editingFood.expiryDate
                        ? new Date(editingFood.expiryDate).toISOString().split("T")[0]
                        : "",
                      expiryType: editingFood.expiryType as "消費期限" | "賞味期限",
                      quantity: editingFood.quantity?.toString() ?? "",
                      unit: editingFood.unit ?? "",
                      frozen: editingFood.frozen,
                      memo: editingFood.memo || "",
                    }
                  : undefined
              }
              onSubmit={modalMode === "add" ? handleAdd : handleEdit}
              onCancel={() => {
                setModalMode(null);
                setEditingFood(null);
              }}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
