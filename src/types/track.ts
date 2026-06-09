export interface Track {
  id: number
  importedAt: string
  startedAt?: string
  distanceMeters: number
  durationSeconds: number
}

export interface TrackPoint {
  trackId: number
  segmentIndex: number
  lat: number
  lng: number
}
