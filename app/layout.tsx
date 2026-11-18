import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/ui/AppHeader";
import BottomNav from "@/components/ui/BottomNav";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ストックまどの家庭あれこれ",
  description: "食品の消費期限・賞味期限を管理するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* スマホ幅の1カラムを中央に固定 */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas sm:border-x sm:border-line">
          <AppHeader />
          <div className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
            {children}
          </div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
