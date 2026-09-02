/**
 * Mint a short-lived auth_token for a given user, to debug as them.
 *
 * Usage (production):
 *   npm run mint-token:prod -- user@example.com
 *   npm run mint-token:prod -- 123            # by userId
 *
 * Usage (local):
 *   npm run mint-token -- user@example.com
 *
 * Then in the browser devtools console on the target site:
 *   document.cookie = "auth_token=<TOKEN>; path=/";
 * ...and reload. Remember to clear it (or just wait for it to expire) when done.
 */
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

const EXPIRES_IN = "2h"; // keep short — this grants full access to the account

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: mint-token <email | userId>");
    process.exit(1);
  }

  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    console.error("JWT_SECRET is not set. Did you run via dotenv -e .env.production?");
    process.exit(1);
  }

  const isNumeric = /^\d+$/.test(arg);
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(isNumeric ? eq(users.id, Number(arg)) : eq(users.email, arg))
    .limit(1);

  if (!user) {
    console.error(`No user found for ${isNumeric ? "id" : "email"} = ${arg}`);
    process.exit(1);
  }

  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(new TextEncoder().encode(secretStr));

  console.log(`\nUser:    #${user.id}  ${user.email}`);
  console.log(`Expires: in ${EXPIRES_IN}\n`);
  console.log("auth_token:\n");
  console.log(token);
  console.log(`\nPaste in devtools console on the target site, then reload:`);
  console.log(`  document.cookie = "auth_token=${token}; path=/";\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
