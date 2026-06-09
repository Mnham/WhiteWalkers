import { describe, expect, it } from 'vitest'

import { cleanGpxTrack } from './cleanGpxTrack'
import { calculatePathDistanceMeters, type GeoPoint } from './geo'

function makeWalkingSegment(startLat: number, pointCount = 20): GeoPoint[] {
  return Array.from({ length: pointCount }, (_, index) => ({
    lat: startLat + index * 0.0001,
    lng: 37,
  }))
}

describe('cleanGpxTrack', () => {
  it('keeps a normal walking track as one segment', () => {
    const points = makeWalkingSegment(55)

    const result = cleanGpxTrack(points)

    expect(result).toEqual([points])
  })

  it('splits a large jump without adding that jump to kept segments', () => {
    const firstSegment = makeWalkingSegment(55)
    const secondSegment = makeWalkingSegment(55.02)
    const points = [...firstSegment, ...secondSegment]

    const result = cleanGpxTrack(points)

    const keptDistanceMeters = result.reduce(
      (distance, segment) => distance + calculatePathDistanceMeters(segment),
      0,
    )

    expect(result).toEqual([firstSegment, secondSegment])
    expect(keptDistanceMeters).toBeCloseTo(
      calculatePathDistanceMeters(firstSegment) + calculatePathDistanceMeters(secondSegment),
      5,
    )
  })

  it('drops short fragments after splitting but still reports excluded jumps', () => {
    const keptSegment = makeWalkingSegment(55)
    const shortTail = makeWalkingSegment(55.02, 5)
    const points = [...keptSegment, ...shortTail]

    const result = cleanGpxTrack(points)

    expect(result).toEqual([keptSegment])
  })
})
