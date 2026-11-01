import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { seal, unseal } from "./token";

const COOKIE = "ss_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 14;

export async function isAdmin() {
  const store = await cookies();
  return Boolean(unseal<{ admin: boolean }>(store.get(COOKIE)?.value)?.admin);
}

export function passwordMatches(attempt: unknown) {
  const real = process.env.ADMIN_PASSWORD;
  if (typeof attempt !== "string" || !real || real.length < 12) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(attempt), hash(real));
}

export async function startSession() {
  (await cookies()).set(COOKIE, seal({ admin: true }, SESSION_SECONDS), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
