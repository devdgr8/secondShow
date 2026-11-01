export const LICENSES = {
  "public-domain": "Public domain",
  "creative-commons": "Creative Commons",
  owner: "Shared by the rights holder",
} as const;
export type License = keyof typeof LICENSES;

export const GENRES = [
  "Drama",
  "Comedy",
  "Thriller",
  "Horror",
  "Romance",
  "Documentary",
  "Animation",
  "Sci-Fi",
  "Silent",
  "Noir",
  "Short",
  "Other",
] as const;

export type FilmDetails = {
  title: string;
  year: number | null;
  director: string;
  genre: string;
  synopsis: string;
  license: License;
  sourceUrl: string;
  submittedBy: string;
};

export type Film = FilmDetails & {
  id: string;
  status: "pending" | "live";
  videoKey: string;
  hasPoster: boolean;
  contentType: string;
  size: number;
  runtimeSec: number | null;
  createdAt: string;
};

export type Report = {
  key: string;
  film: string;
  name: string;
  email: string;
  claim: string;
  createdAt: string;
};
