// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { calculatePathDistanceMeters, type GeoPoint } from './geo'
import { parseGpx } from './parseGpx'

interface TestGpxPoint extends GeoPoint {
  time?: string
}

function makeTimedWalkingSegment(startLat: number, startTime: Date, pointCount = 20): TestGpxPoint[] {
  return Array.from({ length: pointCount }, (_, index) => ({
    lat: startLat + index * 0.0001,
    lng: 37,
    time: new Date(startTime.getTime() + index * 60_000).toISOString(),
  }))
}

function makeWalkingSegment(startLat: number, pointCount = 20): TestGpxPoint[] {
  return Array.from({ length: pointCount }, (_, index) => ({
    lat: startLat + index * 0.0001,
    lng: 37,
  }))
}

function makeTrackGpx(points: TestGpxPoint[]) {
  return `<gpx version="1.1" creator="vitest"><trk><trkseg>${points
    .map(toTrackPointXml)
    .join('')}</trkseg></trk></gpx>`
}

function makeRouteGpx(points: TestGpxPoint[]) {
  return `<gpx version="1.1" creator="vitest"><rte>${points
    .map(toRoutePointXml)
    .join('')}</rte></gpx>`
}

function toTrackPointXml(point: TestGpxPoint) {
  return `<trkpt lat="${point.lat}" lon="${point.lng}">${toTimeXml(point)}</trkpt>`
}

function toRoutePointXml(point: TestGpxPoint) {
  return `<rtept lat="${point.lat}" lon="${point.lng}">${toTimeXml(point)}</rtept>`
}

function toTimeXml(point: TestGpxPoint) {
  return point.time ? `<time>${point.time}</time>` : ''
}

function stripTimes(points: TestGpxPoint[]): GeoPoint[] {
  return points.map(({ lat, lng }) => ({ lat, lng }))
}

describe('parseGpx', () => {
  it('splits large jumps and recalculates distance and duration inside kept segments', () => {
    const firstSegment = makeTimedWalkingSegment(55, new Date('2026-01-01T10:00:00.000Z'))
    const secondSegment = makeTimedWalkingSegment(55.02, new Date('2026-01-01T11:00:00.000Z'))
    const parsedTrack = parseGpx(makeTrackGpx([...firstSegment, ...secondSegment]))

    expect(parsedTrack.startedAt).toBe(firstSegment[0].time)
    expect(parsedTrack.segments).toEqual([stripTimes(firstSegment), stripTimes(secondSegment)])
    expect(parsedTrack.distanceMeters).toBeCloseTo(
      calculatePathDistanceMeters(firstSegment) + calculatePathDistanceMeters(secondSegment),
      5,
    )
    expect(parsedTrack.durationSeconds).toBe(38 * 60)
  })

  it('parses route points without timestamps and keeps duration at zero', () => {
    const points = makeWalkingSegment(55)
    const parsedTrack = parseGpx(makeRouteGpx(points))

    expect(parsedTrack.startedAt).toBeUndefined()
    expect(parsedTrack.segments).toEqual([stripTimes(points)])
    expect(parsedTrack.distanceMeters).toBeCloseTo(calculatePathDistanceMeters(points), 5)
    expect(parsedTrack.durationSeconds).toBe(0)
  })
})
