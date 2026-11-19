import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/token";

// ログイン済み（署名と有効期限が正しいセッション cookie）でなければ、
// ページは /login へ、API は 401 を返す。
export function proxy(request: NextRequest) {
  const session = verifyToken(request.cookies.get("session")?.value);
  if (session) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

// /api/cron は Vercel Cron が Bearer CRON_SECRET で呼ぶ（各ルートが自前で認証する）。
// /login と静的ファイルは対象外。
export const config = {
  matcher: [
    "/((?!api/cron|login|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)",
  ],
};
