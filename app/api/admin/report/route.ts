import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteReport } from "@/lib/catalog";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Bad report." }, { status: 400 });
  }
  await deleteReport(id);
  return NextResponse.json({ ok: true });
}
