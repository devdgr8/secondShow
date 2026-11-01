import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteReport } from "@/lib/catalog";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { key } = await request.json().catch(() => ({}));
  if (typeof key !== "string" || !key.startsWith("reports/")) {
    return NextResponse.json({ error: "Bad report." }, { status: 400 });
  }
  await deleteReport(key);
  return NextResponse.json({ ok: true });
}
