"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import Icon from "@/components/ui/Icon";

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
      fetchSuggestions();
    } finally {
      setAdding(false);
    }
  };

  // 提案チップからワンタップ追加
  const addFromSuggestion = async (name: string) => {
    // 楽観的 UI: 先に提案から除外してからAPIを呼ぶ
    setSuggestions((prev) => prev.filter((s) => s !== name));
    await addItem(name);
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
    return <LoadingScreen />;
  }

  return (
    <>
      {/* 手動入力欄 */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addItem(inputName);
        }}
      >
        <label className="flex h-11 flex-1 items-center rounded-[10px] border border-line bg-surface px-3 focus-within:ring-2 focus-within:ring-accent">
          <span className="sr-only">品目を追加</span>
          <input
            ref={inputRef}
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="品目を入力"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={!inputName.trim() || adding}
          className="h-11 rounded-[10px] bg-accent px-[18px] text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          追加
        </button>
      </form>

      {/* 消費済みから提案 */}
      {suggestions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-muted">消費した食品からの提案</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addFromSuggestion(name)}
                className="flex h-9 items-center gap-1 rounded-full border border-dashed border-[#b9bcb5] bg-surface pr-3 pl-2.5 text-[13px] text-ink"
              >
                <Icon name="plus" size={16} />
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* リスト */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center">
          <p className="text-sm font-medium text-muted">買い物リストは空です</p>
          <p className="mt-1 text-xs text-muted">上の提案から追加するか、直接入力してみましょう</p>
        </div>
      ) : (
        <>
          {uncheckedItems.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-medium text-muted">買うもの · {uncheckedItems.length}件</h2>
              <ul className="rounded-xl border border-line bg-surface">
                {uncheckedItems.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                ))}
              </ul>
            </section>
          )}

          {checkedItems.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-medium text-muted">購入済み · {checkedCount}件</h2>
              <ul className="rounded-xl border border-line bg-surface">
                {checkedItems.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                ))}
              </ul>
              <button
                type="button"
                onClick={clearChecked}
                className="flex h-11 items-center justify-center gap-1.5 text-sm font-medium text-danger"
              >
                <Icon name="trash" size={16} />
                購入済みをすべて削除
              </button>
            </section>
          )}
        </>
      )}
    </>
  );
}

// ─── 個別アイテム行 ───────────────────────────────────────────────
function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const quantityLabel =
    item.quantity != null && item.unit ? `${item.quantity}${item.unit}`
    : item.quantity != null            ? `${item.quantity}`
    : item.unit                        ? item.unit
    : null;

  return (
    <li className="flex items-center border-b border-divider last:border-b-0">
      <label
        className={`flex min-h-[52px] flex-1 cursor-pointer items-center gap-3 pl-3.5 text-[15px] ${
          item.checked ? "text-muted line-through" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggle(item.id)}
          className="m-0 size-5 shrink-0 accent-accent"
        />
        <span className="min-w-0 truncate">
          {item.name}
          {quantityLabel && <span className="ml-1.5 text-xs text-muted">{quantityLabel}</span>}
        </span>
      </label>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`${item.name}を削除`}
        className="flex size-11 shrink-0 items-center justify-center text-muted"
      >
        <Icon name="x" size={18} />
      </button>
    </li>
  );
}
