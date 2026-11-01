export const SITE = {
  name: "Second Show",
  tagline: "Small films. Late nights. Free admission.",
};

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const limits = {
  maxPending: num(process.env.MAX_PENDING, 10),
  maxOpenReports: num(process.env.MAX_OPEN_REPORTS, 50),
  publicSubmissionsOpen: process.env.PUBLIC_UPLOADS !== "closed",
};

export const usesBlob = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Local development keeps the catalogue in a folder, so it needs no Blob store. */
export const isStorageConfigured = () =>
  Boolean(process.env.SESSION_SECRET) && (usesBlob() || process.env.NODE_ENV !== "production");
