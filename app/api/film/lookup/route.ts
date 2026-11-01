import { NextResponse } from "next/server";
import { lookUpFilm, LookupError, parseArchiveId } from "@/lib/archive";
import { getFilm } from "@/lib/catalog";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = parseArchiveId(body.link);
  if (!id) {
    return NextResponse.json({ error: "Paste a link to an archive.org film page." }, { status: 400 });
  }
  if (await getFilm(id)) {
    return NextResponse.json({ error: "This film has already been added." }, { status: 409 });
  }
  try {
    return NextResponse.json(await lookUpFilm(id));
  } catch (error) {
    if (error instanceof LookupError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
