import Icon from "./Icon";

export default function AppHeader() {
  return (
    <header className="flex items-center gap-2.5 px-5 pt-4 pb-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
        <Icon name="leaf" size={18} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold">ストックまど</span>
        <span className="text-[11px] text-muted">家庭あれこれ</span>
      </div>
    </header>
  );
}
