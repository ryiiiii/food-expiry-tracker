import FoodList from "@/components/FoodList";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🥬</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800">ストックまどの食品管理</h1>
            <p className="text-xs text-gray-500">消費期限・賞味期限切れはもううんざりよ</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <FoodList />
      </main>

      {/* フッター */}
      <footer className="text-center text-xs text-gray-400 py-6">
        <p>ストックまどの食品管理</p>
      </footer>
    </div>
  );
}
