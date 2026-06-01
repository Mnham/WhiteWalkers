export interface Track {
  id: number
  importedAt: string
  startedAt?: string
  distanceMeters: number
}

export interface TrackPoint {
  trackId: number
  lat: number
  lng: number
}
