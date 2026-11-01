import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteFilm, getFilm, saveFilm } from "@/lib/catalog";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id, action } = await request.json().catch(() => ({}));
  const film = await getFilm(String(id));
  if (!film) return NextResponse.json({ error: "Film not found." }, { status: 404 });

  if (action === "publish") await saveFilm({ ...film, status: "live" });
  else if (action === "unpublish") await saveFilm({ ...film, status: "pending" });
  else if (action === "delete") await deleteFilm(film.id);
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
