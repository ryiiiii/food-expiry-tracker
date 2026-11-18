type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function Switch({ label, checked, onChange }: Props) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-[46px] rounded-full bg-field transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-[3px] after:left-[3px] after:size-[22px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.15)] after:transition-transform peer-checked:after:translate-x-[18px]"
      />
    </label>
  );
}
