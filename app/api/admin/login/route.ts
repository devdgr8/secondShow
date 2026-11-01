import { NextResponse } from "next/server";
import { passwordMatches, startSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (!passwordMatches(body.password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  await startSession();
  return NextResponse.json({ ok: true });
}
