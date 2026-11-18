type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** 2〜3択の切替（ラジオ相当）。ラベルは親の fieldset/legend で付ける。 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="flex rounded-[10px] bg-track p-[3px]">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className={`h-[38px] flex-1 rounded-lg text-sm ${
              selected
                ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
