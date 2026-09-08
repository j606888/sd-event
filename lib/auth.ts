import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SALT_ROUNDS = 10;
export const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

/**
 * 一般登入 session 的效期。proxy.ts 會在剩餘壽命不到一半時自動換發新 token
 * （滑動續期），所以「有在用的人」永遠不會被踢；這個上限只用來淘汰放著不管的 session。
 */
export const SESSION_TTL = "30d";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  encrypted: string
): Promise<boolean> {
  return bcrypt.compare(password, encrypted);
}

export type TokenPayload = {
  userId: number;
  email: string;
  /** 有值代表目前是總管理員模擬檢視中；userId 為被模擬者，此值為管理員本人 */
  impersonatorId?: number;
};

/** 模擬檢視的 token 效期，比一般登入短很多，而且不會被滑動續期延長 */
export const IMPERSONATION_TTL = "30m";
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 30;

export async function createToken(
  payload: TokenPayload,
  expiresIn: string = SESSION_TTL
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/** auth_token 的 cookie 屬性；route handler 與 proxy 共用，避免兩邊走鐘 */
export function authCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/**
 * 驗證 token，同時回傳 `exp`（unix 秒）供 proxy 判斷要不要續期。
 * 過期、簽章不符、格式錯誤一律回 null。
 */
export async function verifySession(
  token: string
): Promise<{ payload: TokenPayload; exp: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const email = payload.email as string;
    if (typeof userId !== "number" || typeof email !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    const impersonatorId = payload.impersonatorId;
    return {
      payload: {
        userId,
        email,
        ...(typeof impersonatorId === "number" ? { impersonatorId } : {}),
      },
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const verified = await verifySession(token);
  return verified?.payload ?? null;
}

/**
 * 有 cookie 但驗不過 → `expired`；完全沒 cookie → `anonymous`。
 * 分開兩者是為了不要對「從沒登入過就直接打網址」的人顯示「登入已過期」。
 */
export type SessionState =
  | { status: "valid"; session: TokenPayload }
  | { status: "expired" }
  | { status: "anonymous" };

export async function getSessionState(): Promise<SessionState> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { status: "anonymous" };
  const session = await verifyToken(token);
  if (!session) return { status: "expired" };
  return { status: "valid", session };
}

export async function getSession(): Promise<TokenPayload | null> {
  const state = await getSessionState();
  return state.status === "valid" ? state.session : null;
}

export async function setAuthCookie(
  token: string,
  maxAge: number = SESSION_MAX_AGE_SECONDS
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, authCookieOptions(maxAge));
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
