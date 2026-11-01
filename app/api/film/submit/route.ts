import { NextResponse } from "next/server";
import { lookUpFilm, LookupError, parseArchiveId } from "@/lib/archive";
import { isAdmin } from "@/lib/auth";
import { getFilm, getFilms, parseDetails, saveFilm } from "@/lib/catalog";
import { isStorageConfigured, limits } from "@/lib/config";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  if (!isStorageConfigured()) return fail("The catalogue is not set up yet.", 503);
  const body = await request.json().catch(() => ({}));

  const admin = await isAdmin();
  if (!admin) {
    if (!limits.publicSubmissionsOpen) return fail("Submissions are closed right now.", 403);
    if (body.attested !== true) return fail("Please confirm you have the right to share this film.");
    const pending = (await getFilms()).filter((film) => film.status === "pending");
    if (pending.length >= limits.maxPending) {
      return fail("The review queue is full. Please try again in a few days.", 429);
    }
  }

  const parsed = parseDetails((body.details ?? {}) as Record<string, unknown>, !admin);
  if (!parsed.details) return fail(parsed.error as string);

  const id = parseArchiveId(body.link);
  if (!id) return fail("Paste a link to an archive.org film page.");
  if (await getFilm(id)) return fail("This film has already been added.", 409);

  try {
    // Read again here so the browser cannot choose which files get played.
    const { files, runtimeSec } = await lookUpFilm(id);
    const status = admin ? "live" : "pending";
    await saveFilm({
      ...parsed.details,
      id,
      status,
      files,
      runtimeSec,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id, status });
  } catch (error) {
    if (error instanceof LookupError) return fail(error.message, 422);
    console.error("submit", error);
    return fail("The catalogue did not respond. Please try again.", 502);
  }
}
