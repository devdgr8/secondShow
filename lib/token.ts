import { createHmac, timingSafeEqual } from "node:crypto";

const mac = (body: string) =>
  createHmac("sha256", process.env.SESSION_SECRET as string).update(body).digest("base64url");

/** Signs a payload so the browser can carry it without being able to change it. */
export function seal(payload: object, ttlSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function unseal<T>(token: unknown): T | null {
  if (typeof token !== "string" || !process.env.SESSION_SECRET) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(mac(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  return payload.exp > Date.now() / 1000 ? (payload as T) : null;
}
