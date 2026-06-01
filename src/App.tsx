import { useMemo, useRef, useState } from 'react'
import { TrackMap, type MapTrack } from './features/map/TrackMap'
import { TrackUpload } from './features/tracks/TrackUpload'
import type { ParsedGpxTrack } from './features/import/parseGpx'
import type { Track, TrackPoint } from './types/track'
import './App.css'

function App() {
  const [fitRequest, setFitRequest] = useState(0)
  const [selectedTrackId, setSelectedTrackId] = useState<number>()
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([])
  const nextTrackIdRef = useRef(1)
  const mapTracks = useMemo<MapTrack[]>(() => {
    const pointsByTrackId = new Map<number, TrackPoint[]>()

    for (const point of trackPoints) {
      const points = pointsByTrackId.get(point.trackId) ?? []
      points.push(point)
      pointsByTrackId.set(point.trackId, points)
    }

    return tracks
      .map((track) => {
        const points = pointsByTrackId.get(track.id) ?? []

        if (points.length === 0) {
          return undefined
        }

        return {
          id: track.id,
          positions: points.map((point) => [point.lat, point.lng] as [number, number]),
        }
      })
      .filter((track): track is MapTrack => Boolean(track))
  }, [tracks, trackPoints])
  const totalDistanceMeters =
    tracks.reduce((totalDistance, track) => totalDistance + track.distanceMeters, 0)
  const totalDurationSeconds =
    tracks.reduce((totalDuration, track) => totalDuration + track.durationSeconds, 0)

  function handleTracksImported(importedTracks: ParsedGpxTrack[]) {
    const importedAt = new Date().toISOString()
    const nextTracks: Track[] = []
    const nextTrackPoints: TrackPoint[] = []

    for (const parsedTrack of importedTracks) {
      const trackId = nextTrackIdRef.current++

      nextTracks.push({
        id: trackId,
        importedAt,
        startedAt: parsedTrack.startedAt,
        distanceMeters: parsedTrack.distanceMeters,
        durationSeconds: parsedTrack.durationSeconds,
      })

      nextTrackPoints.push(
        ...parsedTrack.points.map((point) => ({
          ...point,
          trackId,
        })),
      )
    }

    setTracks((currentTracks) => [...currentTracks, ...nextTracks].toSorted(compareTracksByDate))
    setTrackPoints((currentPoints) => [...currentPoints, ...nextTrackPoints])
  }

  function handleClearTracks() {
    setSelectedTrackId(undefined)
    setTracks([])
    setTrackPoints([])
  }

  return (
    <main className="app-shell">
      <TrackMap
        fitRequest={fitRequest}
        selectedTrackId={selectedTrackId}
        tracks={mapTracks}
      />

      <aside className="control-panel" aria-label="GPS track controls">
        <section className="panel-section stats-grid" aria-label="Статистика треков">
          <div className="stats-card">
            <div className="stats-metric">
              <strong>{tracks.length}</strong>
              <small>треков</small>
            </div>
            <div className="stats-divider" aria-hidden="true" />
            <div className="stats-metric">
              <strong>{formatDistance(totalDistanceMeters)}</strong>
              <small>километраж</small>
            </div>
            <div className="stats-divider" aria-hidden="true" />
            <div className="stats-metric">
              <strong>{formatDuration(totalDurationSeconds)}</strong>
              <small>длительность</small>
            </div>
          </div>
        </section>

        <section className="panel-section track-panel" aria-label="Список треков">
          <div className="track-panel-actions">
            <TrackUpload onTracksImported={handleTracksImported} />
            <button
              className="clear-tracks-button"
              disabled={tracks.length === 0}
              onClick={handleClearTracks}
              type="button"
            >
              Очистить треки
            </button>
          </div>
          <div className="track-list">
            {tracks.map((track) => (
              <button
                key={track.id}
                aria-pressed={selectedTrackId === track.id}
                className="track-list-item"
                onClick={() =>
                  setSelectedTrackId((currentTrackId) =>
                    currentTrackId === track.id ? undefined : track.id,
                  )
                }
                type="button"
              >
                <time dateTime={track.startedAt ?? track.importedAt}>
                  {formatDate(track.startedAt ?? track.importedAt)}
                </time>
                <strong>{formatDistance(track.distanceMeters)}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section map-actions-panel" aria-label="Управление картой">
          <button
            disabled={mapTracks.length === 0}
            onClick={() => setFitRequest((request) => request + 1)}
            type="button"
          >
            Центрировать карту по трекам
          </button>
        </section>
      </aside>
    </main>
  )
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters)} m`
  }

  return `${(distanceMeters / 1_000).toFixed(1)} km`
}

function formatDuration(durationSeconds: number) {
  return `${Math.round(durationSeconds / 3_600)} ч`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function compareTracksByDate(firstTrack: Track, secondTrack: Track) {
  const firstTime = getTrackSortTime(firstTrack)
  const secondTime = getTrackSortTime(secondTrack)

  return firstTime - secondTime
}

function getTrackSortTime(track: Track) {
  const timestamp = Date.parse(track.startedAt ?? track.importedAt)

  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

export default App
