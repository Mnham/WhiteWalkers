import * as maplibregl from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import type { FilterSpecification, GeoJSONSource, StyleSpecification } from 'maplibre-gl'

type TrackPosition = [number, number]
type RouteFeatureCollection = FeatureCollection<
  LineString,
  {
    color: string
    trackId: number
  }
>

export interface MapTrack {
  id: number
  positions: TrackPosition[]
}

interface TrackMapProps {
  fitRequest?: number
  selectedTrackId?: number
  tracks?: MapTrack[]
}

const DEFAULT_CENTER: [number, number] = [90, 60]
const DEFAULT_ZOOM = 3
const FIT_BOUNDS_PADDING = {
  top: 48,
  bottom: 48,
  left: 500,
  right: 48,
}
const ROUTES_SOURCE_ID = 'routes'
const ROUTES_LAYER_ID = 'routes-line'
const SELECTED_ROUTE_CASING_LAYER_ID = 'routes-line-selected-casing'
const SELECTED_ROUTE_LAYER_ID = 'routes-line-selected'
const NO_SELECTED_TRACK_ID = -1
const ROUTE_COLOR = '#2563eb'

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-tiles',
      type: 'raster',
      source: 'osm-raster-tiles',
    },
  ],
}

const EMPTY_ROUTES: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function TrackMap({
  fitRequest = 0,
  selectedTrackId,
  tracks = [],
}: TrackMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const boundsPositions = useMemo(
    () => tracks.flatMap((track) => track.positions),
    [tracks],
  )
  const routeData = useMemo(() => createRouteGeoJson(tracks), [tracks])

  useEffect(() => {
    const container = mapContainerRef.current

    if (!container || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container,
      style: OSM_RASTER_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    let removed = false

    mapRef.current = map

    map.on('load', () => {
      if (removed || mapRef.current !== map) {
        return
      }

      map.addSource(ROUTES_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_ROUTES,
      })
      map.addLayer({
        id: ROUTES_LAYER_ID,
        type: 'line',
        source: ROUTES_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-opacity': 0.95,
          'line-width': 5,
        },
      })
      map.addLayer({
        id: SELECTED_ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTES_SOURCE_ID,
        filter: getSelectedTrackFilter(),
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#111827',
          'line-opacity': 0.85,
          'line-width': 11,
        },
      })
      map.addLayer({
        id: SELECTED_ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTES_SOURCE_ID,
        filter: getSelectedTrackFilter(),
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#22d3ee',
          'line-opacity': 1,
          'line-width': 7,
        },
      })

      setMapReady(true)
    })

    return () => {
      removed = true
      setMapReady(false)
      map.remove()

      if (mapRef.current === map) {
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const source = getGeoJsonSource(mapRef.current, ROUTES_SOURCE_ID)

    if (!mapReady || !source) {
      return
    }

    source.setData(routeData)
  }, [mapReady, routeData])

  useEffect(() => {
    const map = mapRef.current

    if (!mapReady || !map) {
      return
    }

    const selectedTrackFilter = getSelectedTrackFilter(selectedTrackId)

    map.setFilter(SELECTED_ROUTE_CASING_LAYER_ID, selectedTrackFilter)
    map.setFilter(SELECTED_ROUTE_LAYER_ID, selectedTrackFilter)
  }, [mapReady, selectedTrackId])

  useEffect(() => {
    const map = mapRef.current

    if (!mapReady || !map || boundsPositions.length === 0) {
      return
    }

    const bounds = new maplibregl.LngLatBounds()

    for (const [lat, lng] of boundsPositions) {
      bounds.extend([lng, lat])
    }

    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: 15 })
  }, [boundsPositions, fitRequest, mapReady])

  return <div ref={mapContainerRef} className="track-map" />
}

function createRouteGeoJson(tracks: MapTrack[]): RouteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: tracks
      .filter((track) => track.positions.length >= 2)
      .map((track) => {
        return {
          type: 'Feature',
          properties: {
            color: ROUTE_COLOR,
            trackId: track.id,
          },
          geometry: {
            type: 'LineString',
            coordinates: track.positions.map(([lat, lng]) => [lng, lat]),
          },
        }
      }),
  }
}

function getSelectedTrackFilter(selectedTrackId = NO_SELECTED_TRACK_ID): FilterSpecification {
  return ['==', ['get', 'trackId'], selectedTrackId]
}

function getGeoJsonSource(
  map: maplibregl.Map | null,
  sourceId: string,
): GeoJSONSource | undefined {
  return map?.getSource(sourceId) as GeoJSONSource | undefined
}
