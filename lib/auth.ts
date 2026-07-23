import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SALT_ROUNDS = 10;
const COOKIE_NAME = "auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

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

/** 模擬檢視的 token 效期，比一般登入短很多 */
export const IMPERSONATION_TTL = "30m";
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 30;

export async function createToken(
  payload: TokenPayload,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const email = payload.email as string;
    if (typeof userId !== "number" || typeof email !== "string") return null;
    const impersonatorId = payload.impersonatorId;
    return {
      userId,
      email,
      ...(typeof impersonatorId === "number" ? { impersonatorId } : {}),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(
  token: string,
  maxAge: number = 60 * 60 * 24 * 7 // 7 days
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
