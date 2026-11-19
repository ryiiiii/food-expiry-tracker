import Icon from "./Icon";
import { logout } from "@/app/(app)/actions";
import { DISPLAY_NAME, type LoginName } from "@/lib/auth/names";

export default function AppHeader({ userName }: { userName?: LoginName }) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Icon name="leaf" size={18} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold">ストックまど</span>
          <span className="text-[11px] text-muted">家庭あれこれ</span>
        </div>
      </div>
      {userName && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">{DISPLAY_NAME[userName]}さん</span>
          <form action={logout}>
            <button
              type="submit"
              aria-label="ログアウト"
              className="-mr-2.5 flex size-11 items-center justify-center text-muted"
            >
              <Icon name="log-out" size={18} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
