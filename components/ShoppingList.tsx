"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type ShoppingItem = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  createdAt: string;
};

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputName, setInputName] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      // エラーは無視
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping/suggestions");
      if (!res.ok) return;
      setSuggestions(await res.json());
    } catch {
      // エラーは無視
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchSuggestions();
  }, [fetchItems, fetchSuggestions]);

  // アイテム追加
  const addItem = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) return;
      setInputName("");
      await fetchItems();
    } finally {
      setAdding(false);
    }
  };

  // 提案チップからワンタップ追加
  const addFromSuggestion = async (name: string) => {
    await addItem(name);
    // 追加済みなら提案から除外（楽観的 UI）
    setSuggestions((prev) => prev.filter((s) => s !== name));
  };

  // チェック状態トグル
  const toggleItem = async (id: number) => {
    // 楽観的 UI
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
    await fetch(`/api/shopping/${id}`, { method: "PATCH" });
  };

  // 個別削除
  const deleteItem = async (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/shopping/${id}`, { method: "DELETE" });
  };

  // チェック済み一括削除
  const clearChecked = async () => {
    setItems((prev) => prev.filter((item) => !item.checked));
    await fetch("/api/shopping", { method: "DELETE" });
    fetchSuggestions(); // 削除後に提案を更新
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 消費済みから提案 */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">💡 消費済みから提案</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={() => addFromSuggestion(name)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-dashed border-green-400 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <span className="text-base leading-none">＋</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 手動入力欄 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem(inputName);
          }}
          placeholder="食品名を入力して追加"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <button
          onClick={() => addItem(inputName)}
          disabled={!inputName.trim() || adding}
          className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          追加
        </button>
      </div>

      {/* リスト */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-lg font-medium text-gray-500">買い物リストは空です</p>
          <p className="text-sm mt-1">上の提案から追加するか、直接入力してみましょう</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* 未チェック */}
          {uncheckedItems.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={toggleItem}
              onDelete={deleteItem}
            />
          ))}

          {/* チェック済み区切り */}
          {checkedItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-3 pb-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  購入済み {checkedCount}件
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {checkedItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                />
              ))}
              <button
                onClick={clearChecked}
                className="w-full mt-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                🗑️ 購入済みをすべて削除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 個別アイテム行
function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
        item.checked
          ? "bg-gray-50 border-gray-100 opacity-60"
          : "bg-white border-gray-200"
      }`}
    >
      {/* チェックボックス */}
      <button
        onClick={() => onToggle(item.id)}
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.checked
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-400"
        }`}
      >
        {item.checked && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 名前 */}
      <span
        className={`flex-1 text-sm font-medium ${
          item.checked ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {item.name}
        {item.quantity != null && (
          <span className="ml-1.5 text-xs text-gray-400 font-normal">
            {item.quantity}{item.unit ?? ""}
          </span>
        )}
      </span>

      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
        title="削除"
      >
        ✕
      </button>
    </div>
  );
}
