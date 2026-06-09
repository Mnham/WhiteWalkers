import { cleanGpxTrack } from './cleanGpxTrack'
import { calculatePathDistanceMeters, type GeoPoint } from './geo'

interface ParsedTrackPoint extends GeoPoint {
  lat: number
  lng: number
}

export interface ParsedGpxTrack {
  startedAt?: string
  distanceMeters: number
  durationSeconds: number
  points: ParsedTrackPoint[]
  segments: ParsedTrackPoint[][]
}

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

  const segments = cleanGpxTrack(points)

  if (segments.length === 0) {
    throw new Error('The GPX file does not contain enough usable track points after cleanup.')
  }

  return {
    startedAt: segments[0]?.[0]?.time ?? points[0].time,
    distanceMeters: calculateSegmentsDistanceMeters(segments),
    durationSeconds: calculateSegmentsDurationSeconds(segments),
    points: segments.flatMap((segment) => toParsedTrackPoints(segment)),
    segments: segments.map((segment) => toParsedTrackPoints(segment)),
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

function calculateSegmentsDistanceMeters(segments: GpxPoint[][]) {
  return segments.reduce((distance, segment) => distance + calculatePathDistanceMeters(segment), 0)
}

function calculateSegmentsDurationSeconds(segments: GpxPoint[][]) {
  return segments.reduce((duration, segment) => duration + calculateDurationSeconds(segment), 0)
}

function calculateDurationSeconds(points: GpxPoint[]) {
  const startTime = getTimestamp(points[0]?.time)
  const endTime = getTimestamp(points.at(-1)?.time)

  if (startTime === undefined || endTime === undefined || endTime < startTime) {
    return 0
  }

  return Math.round((endTime - startTime) / 1_000)
}

function toParsedTrackPoints(points: GpxPoint[]) {
  return points.map(({ lat, lng }) => ({ lat, lng }))
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

