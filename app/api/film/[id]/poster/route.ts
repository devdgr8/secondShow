import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getFilm, posterKey } from "@/lib/catalog";
import { bucket, r2 } from "@/lib/r2";

const URL_SECONDS = 60 * 60 * 24 * 6;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const film = await getFilm((await params).id);
  if (!film?.hasPoster || (film.status !== "live" && !(await isAdmin()))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = await getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: bucket(), Key: posterKey(film.id) }),
    { expiresIn: URL_SECONDS },
  );
  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, max-age=86400" },
  });
}
