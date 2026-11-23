"use client";

import { useId, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { useUnitOptions } from "@/hooks/useUnitOptions";
import { MAX_UNIT_LENGTH } from "@/lib/foodValidation";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** スクリーンリーダー向けの名前 */
  label?: string;
  placeholder?: string;
  invalid?: boolean;
  /** 入力欄の高さ */
  size?: "md" | "lg";
};

type Item = { value: string; create: boolean };

/** 候補から選ぶ、または入力して新しい単位を追加できる入力欄 */
export default function UnitCombobox({
  value,
  onChange,
  label = "単位",
  placeholder = "個・本・パック など",
  invalid = false,
  size = "lg",
}: Props) {
  const options = useUnitOptions();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // 入力を始めるまでは全候補を見せる。入力したら絞り込む
  const [typed, setTyped] = useState(false);
  // 画面の下に余白が足りないときは、候補を上向きに開く
  const [up, setUp] = useState(false);

  const openList = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const below = viewport - rect.bottom;
      setUp(below < 240 && rect.top > below);
    }
    setOpen(true);
  };

  const query = value.trim();

  const items = useMemo<Item[]>(() => {
    const q = query.toLowerCase();
    const shown = typed && q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    const list: Item[] = shown.map((o) => ({ value: o, create: false }));
    // 候補にない文字を入力したら「◯◯を追加」を先頭に出す
    if (typed && query && !options.includes(query)) list.unshift({ value: query, create: true });
    return list;
  }, [options, query, typed]);

  const select = (item: Item) => {
    onChange(item.value);
    setOpen(false);
    setTyped(false);
    setActive(-1);
  };

  const close = () => {
    setOpen(false);
    setTyped(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      setActive((i) => (items.length === 0 ? -1 : (i + 1) % items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      setActive((i) => (items.length === 0 ? -1 : (i <= 0 ? items.length - 1 : i - 1)));
    } else if (e.key === "Enter") {
      // 候補を選んでいる最中は、フォームの送信にしない
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        select(items[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation(); // 外側のシートまで閉じない
        close();
      }
    }
  };

  const height = size === "lg" ? "h-12" : "h-11";

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // フォーカスがこの欄の外へ出たら閉じる
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        maxLength={MAX_UNIT_LENGTH}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value.slice(0, MAX_UNIT_LENGTH));
          setTyped(true);
          openList();
          setActive(-1);
        }}
        onFocus={openList}
        onKeyDown={onKeyDown}
        className={`${height} w-full rounded-[10px] border bg-surface pr-10 pl-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30 ${
          invalid ? "border-danger" : "border-field"
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label}の候補を${open ? "閉じる" : "開く"}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setTyped(false);
          if (open) setOpen(false);
          else openList();
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted"
      >
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
      </button>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label}の候補`}
          className={`absolute right-0 left-0 z-30 max-h-56 overflow-auto rounded-[10px] border border-line bg-surface py-1 shadow-[0_6px_20px_rgba(0,0,0,0.12)] ${
            up ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {items.map((item, i) => {
            const selected = !item.create && item.value === value;
            return (
              <li
                key={`${item.create ? "new" : "opt"}-${item.value}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                // フォーカスを入力欄に残したまま選べるようにする
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                className={`flex min-h-11 cursor-pointer items-center justify-between px-3 text-[15px] ${
                  i === active ? "bg-accent-soft" : ""
                } ${item.create ? "font-medium text-accent" : selected ? "font-bold" : ""}`}
              >
                <span>{item.create ? `「${item.value}」を追加` : item.value}</span>
                {selected && <Icon name="check" size={16} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
