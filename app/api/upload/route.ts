import { randomBytes } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  ListPartsCommand,
  PutObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { filmPrefix, getCatalog, parseDetails, posterKey, saveFilm } from "@/lib/catalog";
import { isStorageConfigured, limits } from "@/lib/config";
import { bucket, r2 } from "@/lib/r2";
import { seal, unseal } from "@/lib/token";

const MB = 1024 ** 2;
const MIN_PART = 16 * MB;
const MAX_PARTS = 9000;
const MAX_POSTER = 8 * MB;
const PART_URL_SECONDS = 60 * 60 * 6;
const PUBLIC_SESSION_SECONDS = 60 * 60 * 24;
const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 6;

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

type Session = {
  id: string;
  key: string;
  uploadId: string;
  size: number;
  contentType: string;
  partSize: number;
  partCount: number;
  admin: boolean;
};

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function start(body: Record<string, unknown>) {
  const size = Number(body.size);
  const contentType = String(body.contentType);
  const extension = VIDEO_TYPES[contentType];
  if (!extension) return fail("Only MP4, WebM and MOV files can play in a browser.");
  if (!Number.isSafeInteger(size) || size <= 0) return fail("That file looks empty.");

  const admin = await isAdmin();
  const { films, usedBytes } = await getCatalog();

  if (!admin) {
    if (!limits.publicUploadsOpen) return fail("Submissions are closed right now.", 403);
    if (body.attested !== true) return fail("Please confirm you have the right to share this film.");
    if (size > limits.publicFileBytes) {
      return fail(`Public submissions are limited to ${limits.publicFileBytes / 1024 ** 3} GB.`);
    }
    if (films.filter((film) => film.status === "pending").length >= limits.maxPending) {
      return fail("The review queue is full. Please try again in a few days.", 429);
    }
    const dayAgo = Date.now() - PUBLIC_SESSION_SECONDS * 1000;
    const active = await r2().send(
      new ListMultipartUploadsCommand({ Bucket: bucket(), Prefix: "movies/" }),
    );
    const recent = (active.Uploads ?? []).filter(
      (upload) => (upload.Initiated?.getTime() ?? 0) > dayAgo,
    );
    if (recent.length >= limits.maxActivePublicUploads) {
      return fail("Too many uploads are running. Please try again later.", 429);
    }
  }

  if (usedBytes + size > limits.totalBytes) {
    return fail("The cinema's storage is full, so this film will not fit.", 507);
  }

  const id = randomBytes(6).toString("hex");
  const key = `${filmPrefix(id)}film.${extension}`;
  const created = await r2().send(
    new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
  );

  const partSize = Math.max(MIN_PART, Math.ceil(size / MAX_PARTS));
  const session: Session = {
    id,
    key,
    uploadId: created.UploadId as string,
    size,
    contentType,
    partSize,
    partCount: Math.ceil(size / partSize),
    admin,
  };
  return NextResponse.json({
    token: seal(session, admin ? ADMIN_SESSION_SECONDS : PUBLIC_SESSION_SECONDS),
    partSize,
    partCount: session.partCount,
  });
}

async function sign(session: Session, body: Record<string, unknown>) {
  if (body.poster === true) {
    const url = await getSignedUrl(
      r2(),
      new PutObjectCommand({
        Bucket: bucket(),
        Key: posterKey(session.id),
        ContentType: "image/jpeg",
      }),
      { expiresIn: PART_URL_SECONDS },
    );
    return NextResponse.json({ url });
  }

  const numbers = body.partNumbers;
  if (!Array.isArray(numbers) || numbers.length === 0 || numbers.length > 32) {
    return fail("Bad part list.");
  }
  if (!numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= session.partCount)) {
    return fail("Part number out of range.");
  }
  const urls = await Promise.all(
    numbers.map(async (partNumber: number) => [
      partNumber,
      await getSignedUrl(
        r2(),
        new UploadPartCommand({
          Bucket: bucket(),
          Key: session.key,
          UploadId: session.uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: PART_URL_SECONDS },
      ),
    ]),
  );
  return NextResponse.json({ urls: Object.fromEntries(urls) });
}

async function listParts(session: Session) {
  const parts: { partNumber: number; etag: string; size: number }[] = [];
  let marker: string | undefined;
  do {
    const page = await r2().send(
      new ListPartsCommand({
        Bucket: bucket(),
        Key: session.key,
        UploadId: session.uploadId,
        PartNumberMarker: marker,
      }),
    );
    for (const part of page.Parts ?? []) {
      parts.push({
        partNumber: part.PartNumber as number,
        etag: part.ETag as string,
        size: part.Size as number,
      });
    }
    marker = page.IsTruncated ? page.NextPartNumberMarker : undefined;
  } while (marker);
  return NextResponse.json({ parts });
}

async function objectSize(key: string) {
  try {
    const head = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

async function complete(session: Session, body: Record<string, unknown>) {
  const parsed = parseDetails((body.details ?? {}) as Record<string, unknown>, !session.admin);
  if (!parsed.details) return fail(parsed.error as string);

  // A retry after a dropped response finds the film already assembled.
  if ((await objectSize(session.key)) === null) {
    const parts = body.parts as { partNumber: number; etag: string }[];
    if (!Array.isArray(parts) || parts.length !== session.partCount) {
      return fail("Some parts of the film are missing.");
    }
    await r2().send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket(),
        Key: session.key,
        UploadId: session.uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
        },
      }),
    );
  }

  // Part URLs cannot cap a part's length, so the true size is only known here.
  if ((await objectSize(session.key)) !== session.size) {
    await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: session.key }));
    return fail("The uploaded file did not match the one you picked.");
  }

  const posterSize = await objectSize(posterKey(session.id));
  if (posterSize !== null && posterSize > MAX_POSTER) {
    await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: posterKey(session.id) }));
  }

  const runtime = Number(body.runtimeSec);
  await saveFilm({
    ...parsed.details,
    id: session.id,
    status: session.admin ? "live" : "pending",
    videoKey: session.key,
    hasPoster: posterSize !== null && posterSize <= MAX_POSTER,
    contentType: session.contentType,
    size: session.size,
    runtimeSec: Number.isFinite(runtime) && runtime > 0 ? Math.round(runtime) : null,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id: session.id, status: session.admin ? "live" : "pending" });
}

async function abort(session: Session) {
  await r2().send(
    new AbortMultipartUploadCommand({
      Bucket: bucket(),
      Key: session.key,
      UploadId: session.uploadId,
    }),
  );
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isStorageConfigured()) return fail("Storage is not set up yet.", 503);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Bad request.");

  try {
    if (body.action === "start") return await start(body);

    const session = unseal<Session>(body.token);
    if (!session) return fail("This upload has expired. Please start again.", 410);

    switch (body.action) {
      case "sign":
        return await sign(session, body);
      case "parts":
        return await listParts(session);
      case "complete":
        return await complete(session, body);
      case "abort":
        return await abort(session);
      default:
        return fail("Unknown action.");
    }
  } catch (error) {
    if ((error as Error).name === "NoSuchUpload") {
      return fail("This upload has expired. Please start again.", 410);
    }
    console.error("upload", body.action, error);
    return fail("Storage did not respond. Please try again.", 502);
  }
}
