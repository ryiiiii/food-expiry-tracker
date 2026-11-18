type Props = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** 一覧用の小さいチップ */
  size?: "sm" | "md";
};

export default function ChipToggle({ selected, onClick, children, size = "md" }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border ${
        size === "sm" ? "h-8 px-3.5 text-[13px]" : "h-9 px-4 text-sm"
      } ${
        selected
          ? "border-accent bg-accent text-white"
          : "border-field bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
