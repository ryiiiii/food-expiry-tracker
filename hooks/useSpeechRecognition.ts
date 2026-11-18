"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// lib.dom に無い環境向けの最小限の型
type SpeechRecognitionResultEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "マイクの使用が許可されていません",
  "service-not-allowed": "マイクの使用が許可されていません",
  "no-speech": "音声が聞き取れませんでした",
  "audio-capture": "マイクが見つかりません",
  network: "ネットワークエラーが発生しました",
};

/** 無音がこの時間続いたら自動で終了する（ミリ秒） */
const SILENCE_TIMEOUT_MS = 6000;

export function useSpeechRecognition(
  onResult: (transcript: string) => void,
  /** true を返したら、無音を待たずに即座に認識を終了する（「追加して」など） */
  shouldFinish?: (transcript: string) => boolean
) {
  // SSR とのハイドレーション不一致を避けるため、サーバー側は常に false
  const supported = useSyncExternalStore(
    () => () => {},
    () => getCtor() !== null,
    () => false
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  const shouldFinishRef = useRef(shouldFinish);

  useEffect(() => {
    onResultRef.current = onResult;
    shouldFinishRef.current = shouldFinish;
  }, [onResult, shouldFinish]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      clearTimer();
      recRef.current?.abort();
      recRef.current = null;
    },
    []
  );

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    clearTimer();
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    // 連続認識にして、ブラウザ既定の短い無音タイムアウトで切れないようにする
    rec.continuous = true;

    let transcript = "";
    const armTimer = () => {
      clearTimer();
      timerRef.current = setTimeout(() => rec.stop(), SILENCE_TIMEOUT_MS);
    };

    rec.onresult = (e) => {
      transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      setInterim(transcript);
      armTimer();
      if (shouldFinishRef.current?.(transcript)) rec.stop();
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERROR_MESSAGES[e.error] ?? "音声認識に失敗しました");
    };
    rec.onend = () => {
      clearTimer();
      // 新しい認識に置き換わった／アンマウントされた場合は何もしない
      if (recRef.current !== rec) return;
      recRef.current = null;
      setListening(false);
      setInterim("");
      if (transcript) onResultRef.current(transcript);
    };

    setError(null);
    setInterim("");
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      armTimer();
    } catch {
      recRef.current = null;
      setListening(false);
      clearTimer();
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
