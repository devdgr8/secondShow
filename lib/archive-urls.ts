export const archivePage = (id: string) => `https://archive.org/details/${id}`;
export const posterUrl = (id: string) => `https://archive.org/services/img/${id}`;
export const fileUrl = (id: string, file: string) =>
  `https://archive.org/download/${id}/${file.split("/").map(encodeURIComponent).join("/")}`;
