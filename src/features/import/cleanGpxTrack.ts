import { calculatePathDistanceMeters, calculateSegmentDistanceMeters, type GeoPoint } from './geo'

export interface CleanGpxTrackOptions {
  jumpDistanceMeters?: number
  minSegmentPoints?: number
  minSegmentDistanceMeters?: number
}

const DEFAULT_OPTIONS = {
  jumpDistanceMeters: 500,
  minSegmentPoints: 20,
  minSegmentDistanceMeters: 100,
} satisfies Required<CleanGpxTrackOptions>

export function cleanGpxTrack<TPoint extends GeoPoint>(
  points: TPoint[],
  options: CleanGpxTrackOptions = {},
): TPoint[][] {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options }
  const segments = splitSegments(points, resolvedOptions.jumpDistanceMeters)

  return segments.filter((segment) =>
    shouldKeepSegment(segment, resolvedOptions),
  )
}

function splitSegments<TPoint extends GeoPoint>(points: TPoint[], jumpDistanceMeters: number) {
  const segments: TPoint[][] = []
  let currentSegment: TPoint[] = []

  for (const point of points) {
    const previousPoint = currentSegment.at(-1)

    if (!previousPoint) {
      currentSegment.push(point)
      continue
    }

    const distanceMeters = calculateSegmentDistanceMeters(previousPoint, point)

    if (distanceMeters >= jumpDistanceMeters) {
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

function shouldKeepSegment<TPoint extends GeoPoint>(
  segment: TPoint[],
  options: Required<CleanGpxTrackOptions>,
) {
  return (
    segment.length >= options.minSegmentPoints &&
    calculatePathDistanceMeters(segment) >= options.minSegmentDistanceMeters
  )
}
