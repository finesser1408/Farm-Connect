export interface TownCoordinate {
  name: string;
  lat: number;
  lon: number;
}

/**
 * Town/city-level centroids in Zimbabwe for approximate straight-line distance
 * calculations only. Never stores or exposes street addresses or farm locations.
 */
export const ZIMBABWE_TOWNS: readonly TownCoordinate[] = [
  { name: "Beitbridge", lat: -22.2167, lon: 30.0 },
  { name: "Bindura", lat: -17.3019, lon: 31.3306 },
  { name: "Bulawayo", lat: -20.1325, lon: 28.6265 },
  { name: "Chegutu", lat: -18.1302, lon: 30.1407 },
  { name: "Chinhoyi", lat: -17.3667, lon: 30.2 },
  { name: "Chipinge", lat: -20.1883, lon: 32.6236 },
  { name: "Chiredzi", lat: -21.05, lon: 31.6667 },
  { name: "Chitungwiza", lat: -18.0127, lon: 31.0756 },
  { name: "Epworth", lat: -17.89, lon: 31.1475 },
  { name: "Gokwe", lat: -18.2048, lon: 28.9349 },
  { name: "Gwanda", lat: -20.9333, lon: 29.0 },
  { name: "Gweru", lat: -19.45, lon: 29.8167 },
  { name: "Harare", lat: -17.8292, lon: 31.0522 },
  { name: "Hwange", lat: -18.3645, lon: 26.4987 },
  { name: "Kadoma", lat: -18.3333, lon: 29.9153 },
  { name: "Kariba", lat: -16.5167, lon: 28.8 },
  { name: "Karoi", lat: -16.8099, lon: 29.6925 },
  { name: "Kwekwe", lat: -18.9281, lon: 29.8149 },
  { name: "Lupane", lat: -18.9315, lon: 27.807 },
  { name: "Marondera", lat: -18.1853, lon: 31.5519 },
  { name: "Masvingo", lat: -20.0637, lon: 30.8277 },
  { name: "Mutare", lat: -18.9707, lon: 32.6709 },
  { name: "Norton", lat: -17.8833, lon: 30.7 },
  { name: "Nyanga", lat: -18.2167, lon: 32.75 },
  { name: "Plumtree", lat: -20.4833, lon: 27.8167 },
  { name: "Redcliff", lat: -19.0333, lon: 29.7833 },
  { name: "Rusape", lat: -18.5278, lon: 32.1284 },
  { name: "Ruwa", lat: -17.8897, lon: 31.2447 },
  { name: "Shurugwi", lat: -19.6702, lon: 30.0059 },
  { name: "Victoria Falls", lat: -17.9243, lon: 25.8572 },
  { name: "Zvishavane", lat: -20.3267, lon: 30.0665 },
] as const;

const TOWN_LOOKUP = new Map<string, TownCoordinate>(
  ZIMBABWE_TOWNS.map((town) => [town.name.toLowerCase(), town]),
);

function normalizeLocation(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

/**
 * Matches a public town/city string against known Zimbabwe towns/cities.
 * Returns null if the location cannot be reliably matched.
 */
export function resolveKnownTown(location?: string | null): TownCoordinate | null {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  const direct = TOWN_LOOKUP.get(normalized);
  if (direct) return direct;

  // Handle common formats like "Harare, Zimbabwe" or "Mutare District"
  const primarySegment = normalized.split(",")[0]?.trim() || "";
  if (primarySegment && TOWN_LOOKUP.has(primarySegment)) {
    return TOWN_LOOKUP.get(primarySegment) || null;
  }

  const withoutDistrict = primarySegment.replace(/\s+(city|town|district|province)$/i, "").trim();
  if (withoutDistrict && TOWN_LOOKUP.has(withoutDistrict)) {
    return TOWN_LOOKUP.get(withoutDistrict) || null;
  }

  return null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates approximate straight-line (Haversine) distance in km between two
 * known town/city centroids. Returns null if either location is missing or unknown.
 */
export function calculateApproximateTownDistanceKm(
  customerTown?: string | null,
  farmerLocation?: string | null,
): number | null {
  const from = resolveKnownTown(customerTown);
  const to = resolveKnownTown(farmerLocation);
  if (!from || !to) return null;

  if (from.name === to.name) return 0;

  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_KM * c);
}

export function formatApproximateDistance(distanceKm: number | null): string | null {
  if (distanceKm === null) return null;
  if (distanceKm === 0) return "Same city/town (approx. straight-line)";
  return `~${distanceKm} km away (approx. straight-line)`;
}

