import { NextResponse } from "next/server";
import { addReport, getReports } from "@/lib/catalog";
import { isStorageConfigured, limits } from "@/lib/config";

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Reports are not set up yet." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const report = {
    film: text(body.film, 300),
    name: text(body.name, 120),
    email: text(body.email, 200),
    claim: text(body.claim, 3000),
    createdAt: new Date().toISOString(),
  };
  if (!report.film || !report.name || !report.claim || !/^\S+@\S+\.\S+$/.test(report.email)) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  if ((await getReports()).length >= limits.maxOpenReports) {
    return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  await addReport(report);
  return NextResponse.json({ ok: true });
}
