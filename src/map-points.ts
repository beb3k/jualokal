export type MapPoint = Readonly<{ lat: number; lng: number }>;

export type KmOffset = Readonly<{ eastKm: number; northKm: number }>;

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEGREE_LATITUDE = 111.32;

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

function normalizeLongitude(longitude: number) {
  return ((longitude + 540) % 360) - 180;
}

export function offsetPoint(
  origin: MapPoint,
  bearingDegrees: number,
  distanceKm: number,
): MapPoint {
  if (!Number.isFinite(distanceKm) || distanceKm === 0) {
    return { lat: origin.lat, lng: origin.lng };
  }

  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDegrees);
  const latitude = toRadians(origin.lat);
  const longitude = toRadians(origin.lng);
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );

  return {
    lat: toDegrees(nextLatitude),
    lng: normalizeLongitude(toDegrees(nextLongitude)),
  };
}

export function kmOffset(origin: MapPoint, point: MapPoint): KmOffset {
  const meanLatitude = toRadians((origin.lat + point.lat) / 2);
  return {
    eastKm: (point.lng - origin.lng) * KM_PER_DEGREE_LATITUDE * Math.cos(meanLatitude),
    northKm: (point.lat - origin.lat) * KM_PER_DEGREE_LATITUDE,
  };
}

export function offsetFromKm(
  origin: MapPoint,
  eastKm: number,
  northKm: number,
): MapPoint {
  const distanceKm = Math.hypot(eastKm, northKm);
  if (distanceKm === 0) return { lat: origin.lat, lng: origin.lng };

  const bearingDegrees = toDegrees(Math.atan2(eastKm, northKm));
  return offsetPoint(origin, bearingDegrees, distanceKm);
}
