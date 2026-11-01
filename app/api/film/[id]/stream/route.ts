import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getFilm } from "@/lib/catalog";
import { bucket, r2 } from "@/lib/r2";

const URL_SECONDS = 60 * 60 * 6;

/** Sends the player straight to storage, so video never passes through Vercel. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const film = await getFilm((await params).id);
  if (!film || (film.status !== "live" && !(await isAdmin()))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = await getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: bucket(), Key: film.videoKey }),
    { expiresIn: URL_SECONDS },
  );
  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, max-age=3600" },
  });
}
