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
  /** The film's Internet Archive identifier. */
  id: string;
  status: "pending" | "live";
  /** Playable files on Internet Archive, best first. */
  files: string[];
  runtimeSec: number | null;
  createdAt: string;
};

export type Report = {
  id: string;
  film: string;
  name: string;
  email: string;
  claim: string;
  createdAt: string;
};
