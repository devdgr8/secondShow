import { posterUrl } from "@/lib/archive-urls";
import type { Film } from "@/lib/types";

export function Poster({ film }: { film: Film }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="poster" src={posterUrl(film.id)} alt="" loading="lazy" />;
}
