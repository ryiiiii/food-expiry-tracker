"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import SegmentedControl from "@/components/ui/SegmentedControl";
import UnitCombobox from "@/components/ui/UnitCombobox";
import { invalidateUnitOptions } from "@/hooks/useUnitOptions";
import { addDays, toLocalDateString } from "@/lib/date";
import { resizeImageFile, type ResizedImage } from "@/lib/resizeImage";
import { FOOD_CATEGORIES, type FoodCategory } from "./FoodForm";
import type { ReceiptItem } from "@/lib/receipt";
import { isValidDateString, sanitizeQuantity, validateFoodFields, type FoodField } from "@/lib/foodValidation";

type Row = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  category: FoodCategory | "";
  /** 登録できなかった理由と直し方（編集すると消える） */
  error?: Problem;
};

/** 行ごとの問題: 何が原因か（reason）と、どう直せば登録できるか（fix）。field はその入力欄を赤くする */
type Problem = { reason: string; fix: string; field?: FoodField };

/** 全件に共通する問題（ログイン切れ・通信エラー・期限日など） */
type GlobalProblem = {
  kind: "auth" | "network" | "date";
  reason: string;
  fix: string;
};

const AUTH_PROBLEM: GlobalProblem = {
  kind: "auth",
  reason: "ログインの有効期限が切れました",
  fix: "下のリンクからログインし直し、この画面に戻って、もう一度「食品管理に登録する」を押してください（入力内容はそのまま残っています）",
};
const NETWORK_PROBLEM: GlobalProblem = {
  kind: "network",
  reason: "通信できないか、応答がありません",
  fix: "電波の良い場所で、もう一度「食品管理に登録する」を押してください（入力内容はそのまま残っています）。時間がかかっていた場合は、先に食品管理の一覧で、すでに登録されていないか確認してください",
};
const DATE_PROBLEM: GlobalProblem = {
  kind: "date",
  reason: "期限日が正しくありません",
  fix: "上の「期限日」を、実在する日付で入力し直してください",
};

/** サーバーの失敗応答を、原因と直し方に直す */
function classifyFailure(
  status: number,
  d: { error?: string; fix?: string; field?: FoodField }
): { problem?: Problem; global?: GlobalProblem } {
  if (status === 401) return { global: AUTH_PROBLEM };
  if (status === 400 && d.field) {
    return {
      problem: {
        reason: d.error ?? "入力内容が正しくありません",
        fix: d.fix ?? "内容を確認してください",
        field: d.field,
      },
    };
  }
  if (status === 400 && d.error?.includes("期限日")) return { global: DATE_PROBLEM };
  if (status === 400) {
    return {
      problem: {
        reason: d.error ?? "入力内容が正しくありません",
        fix: "内容を確認して、もう一度登録してください",
      },
    };
  }
  return {
    problem: {
      reason: `サーバーでエラーが発生しました（${status}）`,
      fix: "しばらく待ってから、もう一度「食品管理に登録する」を押してください（入力内容はそのまま残っています）",
    },
  };
}

type Outcome =
  | { id: number; ok: true }
  | { id: number; ok: false; problem?: Problem; global?: GlobalProblem };

type Phase = "idle" | "reading" | "review" | "saving" | "done";

const inputCls =
  "h-11 w-full rounded-[10px] border border-field bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30";

/** 問題のある入力欄は赤い枠にする */
const fieldCls = (bad: boolean) => (bad ? inputCls.replace("border-field", "border-danger") : inputCls);

/** 登録日の1週間後 */
/** 登録1件あたりの待ち時間。これを超えたら通信エラーとして扱い、画面を操作できる状態に戻す */
const REGISTER_TIMEOUT_MS = 20_000;

const defaultExpiry = () => toLocalDateString(addDays(new Date(), 7));

export default function ReceiptScanner() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const registering = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<ResizedImage | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // null のあいだは「登録日の1週間後」を自動で使う。日付を触ったら固定する。
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [expiryType, setExpiryType] = useState<"消費期限" | "賞味期限">("消費期限");
  const [savedCount, setSavedCount] = useState(0);
  const [notice, setNotice] = useState<GlobalProblem | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const toRow = (item: ReceiptItem): Row => ({
    id: nextId.current++,
    name: item.name,
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit: item.unit ?? "",
    category: item.category ?? "",
  });

  const reset = () => {
    setPhase("idle");
    setError(null);
    setImage(null);
    setRows([]);
    setExpiryDate(null);
    setSavedCount(0);
    setNotice(null);
    setDateError(null);
  };

  // ① 撮影した画像を読み取る
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("reading");
    let resized: ResizedImage;
    try {
      resized = await resizeImageFile(file);
    } catch {
      setPhase("idle");
      setError("画像を読み込めませんでした。JPEG か PNG の写真を選んで、もう一度お試しください。");
      return;
    }
    setImage(resized);
    try {
      const res = await fetch("/api/receipt/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized.base64, mimeType: resized.mimeType }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error(
          "ログインの有効期限が切れました。ログイン画面を別のタブで開いてログインし直してから、もう一度お試しください。"
        );
      }
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");

      const items = (data.items ?? []) as ReceiptItem[];
      if (items.length === 0) {
        setPhase("idle");
        setImage(null);
        setError("食品を読み取れませんでした。レシート全体が写るように撮り直してください。");
        return;
      }
      setRows(items.map(toRow));
      setExpiryDate(null);
      setPhase("review");
    } catch (e) {
      setPhase("idle");
      setImage(null);
      setError(
        e instanceof TypeError
          ? "通信できませんでした。電波の良い場所で、もう一度お試しください。"
          : e instanceof Error
            ? e.message
            : "読み取りに失敗しました"
      );
    }
  };

  // ② 確認・編集
  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, error: undefined } : r))
    );
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: nextId.current++, name: "", quantity: "", unit: "", category: "" },
    ]);

  const discard = () => {
    if (!confirm("読み取り結果を破棄しますか？")) return;
    reset();
  };

  // ③ 食品管理へ本登録（既存の POST /api/foods を1件ずつ呼ぶ）
  const runRegister = async () => {
    setError(null);
    setNotice(null);
    setDateError(null);
    const date = expiryDate ?? defaultExpiry(); // 未編集なら、登録した日の1週間後

    if (rows.length === 0) {
      setError("登録する食品がありません。「項目を追加」から追加してください。");
      return;
    }
    if (!isValidDateString(date)) {
      setNotice(DATE_PROBLEM);
      setDateError(DATE_PROBLEM.fix);
      return;
    }
    setPhase("saving");

    const outcomes: Outcome[] = await Promise.all(
      rows.map(async (r): Promise<Outcome> => {
        // 登録できない入力は、送信せずに原因と直し方を出す
        const pre = validateFoodFields({ name: r.name, quantity: r.quantity, unit: r.unit });
        if (pre) return { id: r.id, ok: false, problem: pre };
        try {
          const res = await fetch("/api/foods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: r.name.trim(),
              expiryType,
              expiryDate: date,
              quantity: r.quantity,
              unit: r.unit.trim(),
              frozen: false,
              category: r.category,
              memo: "",
            }),
            signal: AbortSignal.timeout(REGISTER_TIMEOUT_MS),
          });
          if (res.ok) return { id: r.id, ok: true };
          const d = await res.json().catch(() => ({}));
          return { id: r.id, ok: false, ...classifyFailure(res.status, d) };
        } catch {
          return { id: r.id, ok: false, global: NETWORK_PROBLEM };
        }
      })
    );

    const okCount = outcomes.filter((o) => o.ok).length;
    if (okCount > 0) invalidateUnitOptions();
    const failedOutcomes = outcomes.filter((o): o is Extract<Outcome, { ok: false }> => !o.ok);

    if (failedOutcomes.length === 0) {
      setSavedCount(okCount);
      setPhase("done");
      return;
    }

    // 失敗した食品だけを残し、行ごとの原因と直し方、全体に共通する原因を表示する
    const problemById = new Map(failedOutcomes.map((o) => [o.id, o.problem]));
    const remaining = rows.filter((r) => problemById.has(r.id));
    setRows(remaining.map((r) => ({ ...r, error: problemById.get(r.id) })));

    const global = failedOutcomes.find((o) => o.global)?.global ?? null;
    setNotice(global);
    if (global?.kind === "date") setDateError(global.fix);

    const namedProblems = remaining.filter((r) => problemById.get(r.id));
    const names = namedProblems.map((r) => `「${r.name.trim() || "（名前なし）"}」`).join("");
    setPhase("review");
    setError(
      `${okCount > 0 ? `${okCount}件を登録しました。` : ""}${remaining.length}件が未登録です。` +
        (names ? `登録できなかった食品：${names}。` : "") +
        "赤い表示で、原因と直し方を確認してください。"
    );
    setTimeout(() => {
      const first = namedProblems[0];
      const target = first ? document.getElementById(`row-${first.id}`) : document.getElementById("register-notice");
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  // 二重に押されても1回だけ実行し、想定外の例外が起きても「登録中…」のまま止まらないようにする
  const register = async () => {
    if (registering.current) return;
    registering.current = true;
    try {
      await runRegister();
    } catch (e) {
      console.error("register failed:", e);
      setPhase("review");
      setError(
        "登録中に予期しないエラーが発生しました。入力内容は残っています。もう一度「食品管理に登録する」を押してください。"
      );
    } finally {
      registering.current = false;
    }
  };

  // ── 表示 ──────────────────────────────────────────────

  if (phase === "done") {
    return (
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-center">
        <p className="text-base font-bold">{savedCount}件を食品管理に登録しました</p>
        <p className="text-sm text-muted">期限は登録日の1週間後に設定しています。</p>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white"
        >
          食品管理を見る
        </Link>
        <button
          type="button"
          onClick={reset}
          className="h-11 rounded-xl bg-chip text-[15px] font-medium text-ink"
        >
          続けて読み取る
        </button>
      </section>
    );
  }

  if (phase === "idle" || phase === "reading") {
    const reading = phase === "reading";
    return (
      <section className="flex flex-col gap-3">
        {/* 隠し入力: 撮影 / ギャラリー */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="rounded-xl border border-line bg-surface px-4 py-6 text-center">
          {reading ? (
            <div role="status" className="flex flex-col items-center gap-3 py-4">
              <span className="size-8 animate-spin rounded-full border-[3px] border-accent-light border-t-accent" />
              <p className="text-sm font-medium">レシートを読み取っています…</p>
              <p className="text-xs text-muted">数秒〜十数秒かかります</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name="receipt" size={26} />
              </span>
              <p className="mt-1 text-sm font-medium">レシートを撮影してください</p>
              <p className="text-xs leading-relaxed text-muted">
                レシート全体が写るように撮ると、読み取りやすくなります
              </p>
            </div>
          )}
        </div>

        {error && (
          <p aria-live="polite" className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={reading}
          onClick={() => cameraRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
        >
          <Icon name="camera" size={20} />
          撮影する
        </button>
        <button
          type="button"
          disabled={reading}
          onClick={() => galleryRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-field bg-surface text-[15px] font-medium text-ink disabled:opacity-50"
        >
          <Icon name="image" size={20} />
          写真を選ぶ
        </button>
        <p className="text-xs leading-relaxed text-muted">
          読み取った内容は、確認・編集してから登録します。画像は保存されません。
        </p>
      </section>
    );
  }

  // review / saving
  const saving = phase === "saving";
  const shownDate = expiryDate ?? defaultExpiry();

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        読み取った内容を確認してください。違っていれば編集、不要な行は削除できます。
      </p>

      {image && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="flex h-11 cursor-pointer items-center px-3.5 text-sm font-medium">
            レシート画像を確認する
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt="撮影したレシート" className="max-h-96 w-full object-contain p-2" />
        </details>
      )}

      {/* 期限（全件共通） */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        <fieldset className="m-0 min-w-0 border-none p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-medium">期限の種別</legend>
          <SegmentedControl
            options={[
              { value: "消費期限", label: "消費期限" },
              { value: "賞味期限", label: "賞味期限" },
            ]}
            value={expiryType}
            onChange={setExpiryType}
          />
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">
            期限日 <span className="font-normal text-muted">初期値は登録日の1週間後</span>
          </span>
          <span
            className={`flex h-11 items-center gap-2.5 rounded-[10px] border bg-surface px-3 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 ${
              dateError ? "border-danger" : "border-field"
            }`}
          >
            <Icon name="calendar" size={18} />
            <input
              type="date"
              required
              value={shownDate}
              onChange={(e) => {
                setExpiryDate(e.target.value || null);
                setDateError(null);
              }}
              aria-invalid={!!dateError}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
            />
          </span>
          {dateError && <span className="text-xs text-danger">{dateError}</span>}
        </label>
      </div>

      {/* 読み取り結果 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted">読み取り結果 · {rows.length}件</h2>
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.id}
              id={`row-${r.id}`}
              className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 ${
                r.error ? "border-danger ring-1 ring-danger" : "border-line"
              }`}
            >
              {r.error && (
                <div role="alert" className="rounded-lg bg-danger-soft px-2.5 py-2 text-xs leading-relaxed text-danger">
                  <p className="font-bold">登録できません：{r.error.reason}</p>
                  <p className="mt-0.5">直し方：{r.error.fix}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <span className="sr-only">{i + 1}件目の食品名</span>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="食品名"
                    aria-invalid={r.error?.field === "name"}
                    className={fieldCls(r.error?.field === "name")}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label={`${r.name || `${i + 1}件目`}を削除`}
                  className="flex size-11 shrink-0 items-center justify-center text-muted"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                <label className="w-20">
                  <span className="sr-only">数量</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={r.quantity}
                    onChange={(e) => updateRow(r.id, { quantity: sanitizeQuantity(e.target.value) })}
                    placeholder="数量"
                    aria-invalid={r.error?.field === "quantity"}
                    className={fieldCls(r.error?.field === "quantity")}
                  />
                </label>
                <div className="w-28">
                  <UnitCombobox
                    size="md"
                    placeholder="単位"
                    value={r.unit}
                    onChange={(unit) => updateRow(r.id, { unit })}
                    invalid={r.error?.field === "unit"}
                  />
                </div>
                <label className="flex-1">
                  <span className="sr-only">カテゴリ</span>
                  <select
                    value={r.category}
                    onChange={(e) => updateRow(r.id, { category: e.target.value as FoodCategory | "" })}
                    className={`${inputCls} appearance-none`}
                  >
                    <option value="">カテゴリなし</option>
                    {FOOD_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addRow}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#b9bcb5] bg-surface text-sm text-ink"
        >
          <Icon name="plus" size={16} />
          項目を追加
        </button>
      </div>

      {notice && (
        <div
          id="register-notice"
          role="alert"
          className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm leading-relaxed text-danger"
        >
          <p className="font-bold">原因：{notice.reason}</p>
          <p className="mt-1">直し方：{notice.fix}</p>
          {notice.kind === "auth" && (
            <Link
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium underline"
            >
              ログイン画面を別のタブで開く
            </Link>
          )}
        </div>
      )}

      {error && (
        <p aria-live="polite" className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={discard}
          disabled={saving}
          className="h-[50px] flex-1 rounded-xl bg-chip text-[15px] font-medium text-ink disabled:opacity-50"
        >
          破棄する
        </button>
        <button
          type="button"
          onClick={() => void register()}
          disabled={saving}
          className="h-[50px] flex-[1.4] rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "登録中…" : "食品管理に登録する"}
        </button>
      </div>
    </section>
  );
}
