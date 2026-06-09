export interface GeoPoint {
  lat: number
  lng: number
}

const EARTH_RADIUS_METERS = 6_371_000

export function calculateSegmentDistanceMeters(from: GeoPoint, to: GeoPoint) {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const halfChord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord))
}

export function calculatePathDistanceMeters(points: GeoPoint[]) {
  return points.reduce((distance, point, index) => {
    const previousPoint = points[index - 1]

    if (!previousPoint) {
      return distance
    }

    return distance + calculateSegmentDistanceMeters(previousPoint, point)
  }, 0)
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}
