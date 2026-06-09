export type TrackPosition = [number, number]
export type TrackSegment = TrackPosition[]

export interface Track {
  id: number
  importedAt: string
  startedAt?: string
  distanceMeters: number
  durationSeconds: number
  segments: TrackSegment[]
}
