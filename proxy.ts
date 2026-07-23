import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * 總管理員「模擬檢視」的唯讀防線。
 *
 * 專案內所有寫入都走 app/api/** 的 route handler（沒有 server actions），
 * 因此這裡擋掉非 GET 請求就等於擋掉全部寫入，不需逐一修改每支 route。
 * 這層只驗 JWT、不碰 DB（db driver 不能在 edge runtime 執行）。
 */

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** 模擬檢視中仍需放行的寫入端點：登出與結束模擬 */
const WRITE_ALLOWLIST = new Set([
  "/api/auth/logout",
  "/api/admin/impersonate/stop",
]);

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.next();

  const payload = await verifyToken(token);
  // 非模擬 session（或 token 無效）→ 行為完全不變，交給既有的 route 守衛處理
  if (!payload || typeof payload.impersonatorId !== "number") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // 模擬中不得進入總後台，必須先結束模擬
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/events", request.url));
  }

  if (
    !READ_ONLY_METHODS.has(request.method) &&
    !WRITE_ALLOWLIST.has(pathname)
  ) {
    return NextResponse.json(
      { error: "模擬檢視模式為唯讀，無法執行此操作" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
