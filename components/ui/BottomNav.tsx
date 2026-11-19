"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "leaf", label: "食品管理" },
  { href: "/shopping", icon: "cart", label: "買い物リスト" },
  { href: "/accounting", icon: "wallet", label: "家計管理" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed bottom-0 left-1/2 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] w-full max-w-[480px] -translate-x-1/2 grid-cols-3 border-t border-line bg-surface pb-[calc(8px+env(safe-area-inset-bottom))]"
    >
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              active ? "font-bold text-accent" : "text-muted"
            }`}
          >
            <Icon name={icon} size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
