import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_TTL,
  authCookieOptions,
  createToken,
  verifySession,
} from "@/lib/auth";
import { PATHNAME_HEADER, SESSION_EXPIRED_HEADER } from "@/lib/request-path";
import { shouldRefreshSession } from "@/lib/session-refresh";

/**
 * 這層做三件事：
 *
 * 1. **一般 session 的滑動續期。** 只要有在用（打 API 或開後台頁面），token 過半
 *    壽命就自動換發，所以使用者不會莫名其妙被踢回登入頁。反過來說，token 已經
 *    失效時順手把 cookie 清掉，免得一顆死 token 每次都被送出來、讓 401 的狀態
 *    跨重整自我延續。
 *
 * 2. **把目前路徑轉交給 server component。** layout 的登入守衛要靠它組出
 *    `?next=`，把使用者送回原本想去的那一頁。
 *
 * 3. **總管理員「模擬檢視」的唯讀防線。** 專案內所有寫入都走 app/api/** 的
 *    route handler（沒有 server actions），因此擋掉非 GET 請求就等於擋掉全部寫入，
 *    不需逐一修改每支 route。
 *
 * 這層只驗 JWT、不碰 DB（db driver 不能在 edge runtime 執行）。
 */

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** 模擬檢視中仍需放行的寫入端點：登出與結束模擬 */
const WRITE_ALLOWLIST = new Set([
  "/api/auth/logout",
  "/api/admin/impersonate/stop",
]);

/**
 * 這些端點自己會寫 auth_token，proxy 不能在同一個 response 上動 cookie，
 * 否則兩個 Set-Cookie 會互相蓋掉 —— 最明顯的症狀是「帶著過期 cookie 登入，
 * 登入成功但立刻又變成未登入」。
 */
const COOKIE_WRITING_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/admin/impersonate",
  "/api/admin/impersonate/stop",
]);

/**
 * 放行，同時把 layout 需要的資訊帶給下游的 server component。
 *
 * 兩個 header 都一定要 set/delete，不能只在需要時 set —— 否則使用者自己送一個
 * 同名 header 就會被原樣轉交進來。
 */
function passThrough(request: NextRequest, expired = false) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    PATHNAME_HEADER,
    request.nextUrl.pathname + request.nextUrl.search
  );
  if (expired) {
    requestHeaders.set(SESSION_EXPIRED_HEADER, "1");
  } else {
    requestHeaders.delete(SESSION_EXPIRED_HEADER);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return passThrough(request);

  const { pathname } = request.nextUrl;
  const writesCookieItself = COOKIE_WRITING_PATHS.has(pathname);

  const verified = await verifySession(token);

  // token 已過期或驗不過（例如 JWT_SECRET 換過）→ 清掉 cookie。
  // 之後進任何後台頁面時 layout 的 server-side 守衛就會導向 /login。
  if (!verified) {
    const res = passThrough(request, true);
    if (!writesCookieItself) res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }

  const { payload, exp } = verified;

  // 模擬檢視中：走唯讀防線，而且一律不續期（30 分鐘上限是刻意的）
  if (typeof payload.impersonatorId === "number") {
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

    return passThrough(request);
  }

  const res = passThrough(request);

  if (
    !writesCookieItself &&
    shouldRefreshSession(exp, Math.floor(Date.now() / 1000), SESSION_MAX_AGE_SECONDS)
  ) {
    const fresh = await createToken(payload, SESSION_TTL);
    res.cookies.set(
      AUTH_COOKIE_NAME,
      fresh,
      authCookieOptions(SESSION_MAX_AGE_SECONDS)
    );
  }

  return res;
}

export const config = {
  // 後台頁面也納入，這樣 layout 才拿得到路徑；順帶讓「只開頁面、沒打 API」的
  // 操作也能觸發滑動續期。
  matcher: [
    "/api/:path*",
    "/admin",
    "/admin/:path*",
    "/events",
    "/events/:path*",
    "/teams",
    "/teams/:path*",
  ],
};
