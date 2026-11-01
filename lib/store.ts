import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { del, get, list, put } from "@vercel/blob";
import { usesBlob } from "./config";

const LOCAL_ROOT = join(process.cwd(), ".data");

const blobStore = {
  async keys(prefix: string) {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor });
      keys.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.cursor;
    } while (cursor);
    return keys;
  },
  async read(key: string) {
    // Reads skip the CDN so a publish shows straight away.
    const result = await get(key, { access: "private", useCache: false });
    if (result?.statusCode !== 200) return null;
    return new Response(result.stream).text();
  },
  async write(key: string, value: string) {
    await put(key, value, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
  remove: (key: string) => del(key),
};

const localStore = {
  async keys(prefix: string) {
    const names = await readdir(join(LOCAL_ROOT, prefix)).catch(() => []);
    return names.map((name) => `${prefix}${name}`);
  },
  read: (key: string) => readFile(join(LOCAL_ROOT, key), "utf8").catch(() => null),
  async write(key: string, value: string) {
    await mkdir(dirname(join(LOCAL_ROOT, key)), { recursive: true });
    await writeFile(join(LOCAL_ROOT, key), value);
  },
  remove: (key: string) => rm(join(LOCAL_ROOT, key), { force: true }),
};

const store = () => (usesBlob() ? blobStore : localStore);

export async function readAll<T>(prefix: string) {
  const keys = await store().keys(prefix);
  const texts = await Promise.all(keys.map((key) => store().read(key)));
  return texts.filter((text) => text !== null).map((text) => JSON.parse(text as string) as T);
}

export const writeJson = (key: string, value: unknown) => store().write(key, JSON.stringify(value));
export const remove = (key: string) => store().remove(key);
