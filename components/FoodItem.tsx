"use client";

import { useState } from "react";

export type Food = {
  id: number;
  name: string;
  expiryType: string;
  expiryDate: string;
  quantity: number | null;
  unit: string | null;
  memo: string | null;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (id: number) => Promise<void>;
};

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusStyle(daysLeft: number): {
  bg: string;
  badge: string;
  label: string;
} {
  if (daysLeft < 0) {
    return {
      bg: "bg-gray-50 border-gray-200 opacity-60",
      badge: "bg-gray-500 text-white",
      label: `${Math.abs(daysLeft)}日前に期限切れ`,
    };
  }
  if (daysLeft === 0) {
    return {
      bg: "bg-red-50 border-red-300",
      badge: "bg-red-600 text-white",
      label: "今日が期限！",
    };
  }
  if (daysLeft === 1) {
    return {
      bg: "bg-orange-50 border-orange-300",
      badge: "bg-orange-500 text-white",
      label: "明日が期限",
    };
  }
  if (daysLeft <= 3) {
    return {
      bg: "bg-yellow-50 border-yellow-300",
      badge: "bg-yellow-500 text-white",
      label: `あと${daysLeft}日`,
    };
  }
  if (daysLeft <= 7) {
    return {
      bg: "bg-blue-50 border-blue-200",
      badge: "bg-blue-500 text-white",
      label: `あと${daysLeft}日`,
    };
  }
  return {
    bg: "bg-white border-gray-200",
    badge: "bg-green-500 text-white",
    label: `あと${daysLeft}日`,
  };
}

export default function FoodItem({ food, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const daysLeft = getDaysUntilExpiry(food.expiryDate);
  const { bg, badge, label } = getStatusStyle(daysLeft);

  const handleDelete = async () => {
    if (!confirm(`「${food.name}」を削除しますか？`)) return;
    setDeleting(true);
    await onDelete(food.id);
    setDeleting(false);
  };

  const formattedDate = new Date(food.expiryDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 数量・単位の表示文字列（どちらかだけでも表示）
  const quantityLabel =
    food.quantity != null && food.unit
      ? `${food.quantity} ${food.unit}`
      : food.quantity != null
      ? `${food.quantity}`
      : food.unit
      ? food.unit
      : null;

  return (
    <div className={`border rounded-xl p-4 transition-all ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 truncate">{food.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
              {food.expiryType}
            </span>
            {quantityLabel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                {quantityLabel}
              </span>
            )}
            {food.notified && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">
                📬 通知済
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{formattedDate}</p>
          {food.memo && (
            <p className="text-xs text-gray-500 mt-1 truncate">{food.memo}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${badge}`}>
            {label}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(food)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="編集"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="削除"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
