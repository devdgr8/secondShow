export const SITE = {
  name: "Second Show",
  tagline: "Small films. Late nights. Free admission.",
};

const GB = 1024 ** 3;
const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const limits = {
  totalBytes: num(process.env.MAX_TOTAL_GB, 9.5) * GB,
  publicFileBytes: num(process.env.MAX_PUBLIC_FILE_GB, 4) * GB,
  maxPending: num(process.env.MAX_PENDING, 10),
  maxActivePublicUploads: num(process.env.MAX_ACTIVE_PUBLIC_UPLOADS, 5),
  publicUploadsOpen: process.env.PUBLIC_UPLOADS !== "closed",
};

export const isStorageConfigured = () =>
  Boolean(
    (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT) &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.SESSION_SECRET,
  );
