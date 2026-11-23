"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_UNITS } from "@/lib/units";

// 食品に使われた単位は全画面で共通なので、1回だけ取得して使い回す
let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

function load(): Promise<string[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch("/api/foods/units")
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      cache = Array.isArray(data) ? data.filter((u): u is string => typeof u === "string") : [];
      return cache;
    })
    .catch(() => [] as string[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 食品を保存したあとに呼ぶ。次に単位を開いたとき、新しく使った単位が候補に入る */
export function invalidateUnitOptions() {
  cache = null;
}

/** 単位の候補: 初期の候補 + これまでに食品で使われた単位 */
export function useUnitOptions(): string[] {
  const [used, setUsed] = useState<string[]>(cache ?? []);

  useEffect(() => {
    let alive = true;
    void load().then((units) => {
      if (alive) setUsed(units);
    });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => Array.from(new Set([...DEFAULT_UNITS, ...used])), [used]);
}
