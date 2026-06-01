interface ParsedTrackPoint {
  lat: number
  lng: number
}

export interface ParsedGpxTrack {
  startedAt?: string
  distanceMeters: number
  durationSeconds: number
  points: ParsedTrackPoint[]
}

const EARTH_RADIUS_METERS = 6_371_000

interface GpxPoint extends ParsedTrackPoint {
  time?: string
}

export function parseGpx(gpxText: string): ParsedGpxTrack {
  const document = new DOMParser().parseFromString(gpxText, 'application/xml')

  if (document.querySelector('parsererror')) {
    throw new Error('The GPX file is not valid XML.')
  }

  const pointElements = findElements(document, 'trkpt')
  const routePointElements = pointElements.length > 0 ? pointElements : findElements(document, 'rtept')
  const points = routePointElements
    .map(parsePoint)
    .filter((point): point is GpxPoint => Boolean(point))

  if (points.length === 0) {
    throw new Error('The GPX file does not contain any track points.')
  }

  return {
    startedAt: points[0].time,
    distanceMeters: calculateDistanceMeters(points),
    durationSeconds: calculateDurationSeconds(points),
    points: points.map(({ lat, lng }) => ({ lat, lng })),
  }
}

function parsePoint(element: Element): GpxPoint | undefined {
  const lat = Number(element.getAttribute('lat'))
  const lng = Number(element.getAttribute('lon'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined
  }

  return {
    lat,
    lng,
    time: getText(element, 'time'),
  }
}

function calculateDistanceMeters(points: ParsedTrackPoint[]) {
  return points.reduce((distance, point, index) => {
    const previousPoint = points[index - 1]

    if (!previousPoint) {
      return distance
    }

    return distance + calculateSegmentDistanceMeters(previousPoint, point)
  }, 0)
}

function calculateDurationSeconds(points: GpxPoint[]) {
  const startTime = getTimestamp(points[0]?.time)
  const endTime = getTimestamp(points.at(-1)?.time)

  if (startTime === undefined || endTime === undefined || endTime < startTime) {
    return 0
  }

  return Math.round((endTime - startTime) / 1_000)
}

function calculateSegmentDistanceMeters(from: ParsedTrackPoint, to: ParsedTrackPoint) {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const halfChord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord))
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function getTimestamp(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

function findElements(root: Document | Element, tagName: string) {
  const elements = Array.from(root.getElementsByTagName(tagName))

  if (elements.length > 0) {
    return elements
  }

  return Array.from(root.getElementsByTagNameNS('*', tagName))
}

function getText(root: Document | Element | undefined, tagName: string) {
  const value = root ? findElements(root, tagName)[0]?.textContent?.trim() : undefined

  return value === '' ? undefined : value
}

