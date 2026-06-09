import { calculatePathDistanceMeters, calculateSegmentDistanceMeters, type GeoPoint } from './geo'

const JUMP_DISTANCE_METERS = 500
const MIN_SEGMENT_POINTS = 20
const MIN_SEGMENT_DISTANCE_METERS = 100

export function cleanGpxTrack<TPoint extends GeoPoint>(points: TPoint[]): TPoint[][] {
  const segments = splitSegments(points)

  return segments.filter(shouldKeepSegment)
}

function splitSegments<TPoint extends GeoPoint>(points: TPoint[]) {
  const segments: TPoint[][] = []
  let currentSegment: TPoint[] = []

  for (const point of points) {
    const previousPoint = currentSegment.at(-1)

    if (!previousPoint) {
      currentSegment.push(point)
      continue
    }

    const distanceMeters = calculateSegmentDistanceMeters(previousPoint, point)

    if (distanceMeters >= JUMP_DISTANCE_METERS) {
      segments.push(currentSegment)
      currentSegment = [point]
      continue
    }

    currentSegment.push(point)
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

function shouldKeepSegment<TPoint extends GeoPoint>(segment: TPoint[]) {
  return (
    segment.length >= MIN_SEGMENT_POINTS &&
    calculatePathDistanceMeters(segment) >= MIN_SEGMENT_DISTANCE_METERS
  )
}
