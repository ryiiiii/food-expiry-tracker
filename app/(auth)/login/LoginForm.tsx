"use client";

import { useActionState } from "react";
import { DISPLAY_NAME } from "@/lib/auth/names";
import { loginAction, type LoginState } from "./actions";

const inputCls =
  "h-12 w-full rounded-[10px] border border-field bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30";

const initialState: LoginState = { step: "name" };

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-[18px]">
      {state.step === "name" ? (
        <label key="name" className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">名前</span>
          <input
            name="name"
            type="text"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputCls}
          />
        </label>
      ) : (
        <div key="answer" className="flex flex-col gap-[18px]">
          <p className="text-[13px] text-muted">
            {state.name ? `${DISPLAY_NAME[state.name]}さん、` : ""}次の質問に答えてください
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-bold">{state.question}</span>
            <input
              name="answer"
              type="text"
              required
              autoFocus
              autoComplete="off"
              inputMode="numeric"
              maxLength={10}
              className={inputCls}
            />
          </label>
          <p className="rounded-[10px] bg-warn-soft px-3.5 py-3 text-xs leading-relaxed text-warn">
            間違った場合、{state.partner}に通知されるので注意してください。
          </p>
        </div>
      )}

      <p aria-live="polite" className="min-h-0 text-sm text-danger empty:hidden">
        {state.error}
      </p>

      {state.step === "name" ? (
        <button
          type="submit"
          name="intent"
          value="start"
          disabled={pending}
          className="h-[50px] rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
        >
          次へ
        </button>
      ) : (
        <div className="flex gap-2.5">
          <button
            type="submit"
            name="intent"
            value="back"
            formNoValidate
            disabled={pending}
            className="h-[50px] flex-1 rounded-xl bg-chip text-[15px] font-medium text-ink disabled:opacity-50"
          >
            戻る
          </button>
          <button
            type="submit"
            name="intent"
            value="answer"
            disabled={pending}
            className="h-[50px] flex-1 rounded-xl bg-accent text-[15px] font-bold text-white disabled:opacity-50"
          >
            ログイン
          </button>
        </div>
      )}
    </form>
  );
}
