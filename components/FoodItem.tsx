"use client";

import { FOOD_CATEGORIES } from "./FoodForm";

export type Food = {
  id: number;
  name: string;
  expiryType: string;
  expiryDate: string | null;
  quantity: number | null;
  unit: string | null;
  frozen: boolean;
  category: string | null;
  memo: string | null;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  food: Food;
  onEdit: (food: Food) => void;
};

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getBadge(daysLeft: number): { className: string; label: string } {
  if (daysLeft < 0) return { className: "bg-danger-soft text-danger", label: "期限切れ" };
  if (daysLeft === 0) return { className: "bg-warn-soft text-warn", label: "今日が期限" };
  if (daysLeft <= 3) return { className: "bg-warn-soft text-warn", label: `あと${daysLeft}日` };
  return { className: "bg-chip text-chip-ink", label: `あと${daysLeft}日` };
}

export default function FoodItem({ food, onEdit }: Props) {
  // 冷凍品は期限バッジ不要
  const daysLeft = !food.frozen && food.expiryDate ? getDaysUntilExpiry(food.expiryDate) : null;
  const badge = daysLeft !== null ? getBadge(daysLeft) : null;

  const categoryLabel = food.category
    ? FOOD_CATEGORIES.find((c) => c.value === food.category)?.label ?? food.category
    : null;

  const shortDate = food.expiryDate
    ? (() => {
        const d = new Date(food.expiryDate);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      })()
    : null;

  const quantityLabel =
    food.quantity != null && food.unit ? `${food.quantity}${food.unit}`
    : food.quantity != null            ? `${food.quantity}`
    : food.unit                        ? food.unit
    : null;

  const sub = [
    food.frozen ? "冷凍" : null,
    categoryLabel,
    shortDate ? `${food.expiryType} ${shortDate}` : null,
    quantityLabel,
    food.notified ? "通知済" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="border-b border-divider last:border-b-0">
      <button
        type="button"
        onClick={() => onEdit(food)}
        aria-label={`${food.name}を編集`}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-medium">{food.name}</span>
          <span className="truncate text-xs text-muted">{sub}</span>
          {food.memo && <span className="truncate text-xs text-muted">{food.memo}</span>}
        </span>
        {food.frozen ? (
          <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-chip-ink">
            冷凍
          </span>
        ) : (
          badge && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )
        )}
      </button>
    </li>
  );
}
