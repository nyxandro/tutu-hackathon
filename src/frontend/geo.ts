/**
 * Работа с координатами на клиенте.
 *
 * Экспорты:
 * - distanceKm() — расстояние по большому кругу
 * - formatDistance() — человеческая подпись расстояния
 */

const EARTH_RADIUS_KM = 6371;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Ближе километра счёт идёт на сотни метров — так понятнее, идти пешком или нет. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} м от вас`;
  if (km < 10) return `${km.toFixed(1)} км от вас`;
  return `${Math.round(km)} км от вас`;
}
