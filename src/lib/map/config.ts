import { clientEnv } from "@/lib/env";

const withKey = (url: string) => url.replace("{key}", clientEnv.NEXT_PUBLIC_GEOCODING_API_KEY);

export const mapConfig = {
  tileUrl: withKey(clientEnv.NEXT_PUBLIC_MAP_TILE_URL),
  tileUrlDark: withKey(clientEnv.NEXT_PUBLIC_MAP_TILE_URL_DARK),
  attribution: clientEnv.NEXT_PUBLIC_MAP_ATTRIBUTION,
  // Picture tiles for satellite, when the vector map can't be drawn.
  satelliteTileUrl: withKey(
    "https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}{r}.jpg?key={key}",
  ),
};
