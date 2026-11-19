import Image from "next/image";

export default function LoadingScreen() {
  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-surface pb-10"
    >
      <Image
        src="/house_ending_bw.gif"
        alt="読み込み中"
        width={220}
        height={80}
        unoptimized
        priority
        className="h-20 w-[220px] object-contain"
      />
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-xl font-bold tracking-[0.02em] loading-shimmer-text">
          ストックまどの家庭あれこれ
        </p>
        <span className="text-xs tracking-[0.12em] text-muted">読み込み中</span>
      </div>
    </div>
  );
}
