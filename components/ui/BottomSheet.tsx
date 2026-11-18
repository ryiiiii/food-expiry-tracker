"use client";

import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** 画面下から出るシート。背景タップ・Esc で閉じる。 */
export default function BottomSheet({ title, onClose, children }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    // 背景スクロールを止める
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-ink/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-up max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-surface px-5 pt-2 pb-[calc(28px+env(safe-area-inset-bottom))] outline-none"
      >
        <div className="flex justify-center">
          <span className="h-1 w-9 rounded-full bg-field" />
        </div>
        <div className="-mt-1 mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="-mr-2.5 flex size-11 items-center justify-center text-muted"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
