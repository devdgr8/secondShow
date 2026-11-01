const CONCURRENT_PARTS = 4;
const SIGN_BATCH = 8;
const MAX_ATTEMPTS = 6;

export type Session = { token: string; partSize: number; partCount: number };
type Part = { partNumber: number; etag: string; size?: number };

export async function api<T = Record<string, never>>(path: string, body: object) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const upload = (body: object) => api<any>("/api/upload", body);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function putBlob(
  url: string,
  blob: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
  contentType?: string,
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    if (contentType) request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve(request.getResponseHeader("ETag") ?? "")
        : reject(new Error(`Storage answered ${request.status}`));
    request.onerror = () => reject(new Error("Network error"));
    request.onabort = () => reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", () => request.abort(), { once: true });
    request.send(blob);
  });
}

/** Sends every part not already stored and resolves with the full part list. */
export async function sendParts(
  file: File,
  session: Session,
  signal: AbortSignal,
  onProgress: (sentBytes: number) => void,
) {
  const { token, partSize, partCount } = session;
  const finished = new Map<number, string>();
  const live = new Map<number, number>();
  let completeBytes = 0;

  const { parts } = await upload({ action: "parts", token });
  for (const part of parts as Part[]) {
    const expected = Math.min(partSize, file.size - (part.partNumber - 1) * partSize);
    if (part.size === expected) {
      finished.set(part.partNumber, part.etag);
      completeBytes += expected;
    }
  }

  const queue = Array.from({ length: partCount }, (_, index) => index + 1).filter(
    (number) => !finished.has(number),
  );
  const urls = new Map<number, string>();
  const report = () =>
    onProgress(completeBytes + [...live.values()].reduce((sum, value) => sum + value, 0));
  report();

  const urlFor = async (number: number) => {
    if (!urls.has(number)) {
      const batch = [number, ...queue.slice(0, SIGN_BATCH - 1)];
      const signed = await upload({ action: "sign", token, partNumbers: batch });
      for (const [key, url] of Object.entries(signed.urls)) urls.set(Number(key), url as string);
    }
    return urls.get(number) as string;
  };

  const sendOne = async (number: number) => {
    const start = (number - 1) * partSize;
    const blob = file.slice(start, start + partSize);
    for (let attempt = 1; ; attempt++) {
      try {
        const etag = await putBlob(await urlFor(number), blob, signal, (loaded) => {
          live.set(number, loaded);
          report();
        });
        if (!etag) throw new Error("ETag hidden: the bucket's CORS rules are missing.");
        finished.set(number, etag);
        completeBytes += blob.size;
        live.delete(number);
        report();
        return;
      } catch (error) {
        live.delete(number);
        urls.delete(number);
        report();
        if (signal.aborted || attempt === MAX_ATTEMPTS) throw error;
        await wait(1000 * 2 ** attempt);
      }
    }
  };

  const worker = async () => {
    for (let number = queue.shift(); number; number = queue.shift()) await sendOne(number);
  };
  await Promise.all(Array.from({ length: CONCURRENT_PARTS }, worker));

  return [...finished].map(([partNumber, etag]) => ({ partNumber, etag }));
}

export async function sendPoster(token: string, poster: Blob, signal: AbortSignal) {
  const { url } = await upload({ action: "sign", token, poster: true });
  await putBlob(url, poster, signal, () => {}, "image/jpeg");
}

export const startUpload = (file: File, contentType: string, attested: boolean) =>
  upload({ action: "start", size: file.size, contentType, attested }) as Promise<Session>;

export const finishUpload = (
  token: string,
  parts: Part[],
  details: object,
  runtimeSec: number | null,
) => upload({ action: "complete", token, parts, details, runtimeSec }) as Promise<{
  id: string;
  status: "live" | "pending";
}>;

export const abortUpload = (token: string) => upload({ action: "abort", token });
