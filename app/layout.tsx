import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavTabs from "@/components/NavTabs";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ストックまどの食品管理",
  description: "食品の消費期限・賞味期限を管理するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        {/* 共通ヘッダー */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-2 flex flex-col gap-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥬</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">ストックまどの食品管理</h1>
                <p className="text-xs text-gray-500">消費期限・賞味期限切れにさせないわ👧</p>
              </div>
            </div>
            <NavTabs />
          </div>
        </header>

        {/* ページコンテンツ */}
        <div className="flex-1 bg-linear-to-b from-green-50 to-gray-50">
          {children}
        </div>

        {/* フッター */}
        <footer className="text-center text-xs text-gray-400 py-6">
          <p>ストックまどの食品管理</p>
        </footer>
      </body>
    </html>
  );
}
