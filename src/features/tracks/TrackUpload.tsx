import { useState, type ChangeEvent } from 'react'
import { parseGpx, type ParsedGpxTrack } from '../import/parseGpx'

interface TrackUploadProps {
  onTracksImported: (tracks: ParsedGpxTrack[]) => void
}

type ImportStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'importing'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

const INITIAL_STATUS: ImportStatus = {
  kind: 'idle',
  message: 'Выберите GPX-файл для импорта маршрута.',
}

export function TrackUpload({ onTracksImported }: TrackUploadProps) {
  const [status, setStatus] = useState<ImportStatus>(INITIAL_STATUS)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])

    if (files.length === 0) {
      return
    }

    setStatus({
      kind: 'importing',
      message:
        files.length === 1
          ? `Импорт ${files[0].name}...`
          : `Импорт ${files.length.toLocaleString('ru-RU')} GPX-файлов...`,
    })

    try {
      let importedPointCount = 0
      const importedTracks: ParsedGpxTrack[] = []

      for (const file of files) {
        const parsedTrack = parseGpx(await file.text())
        importedTracks.push(parsedTrack)
        importedPointCount += parsedTrack.points.length
      }

      onTracksImported(importedTracks)
      setStatus({
        kind: 'success',
        message: `Импортировано файлов: ${files.length.toLocaleString('ru-RU')}, точек: ${importedPointCount.toLocaleString('ru-RU')}.`,
      })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Не удалось импортировать GPX-файл.',
      })
    } finally {
      input.value = ''
    }
  }

  return (
    <form className="track-upload">
      <label className="track-upload-button" htmlFor="gpx-upload">
        {status.kind === 'importing' ? 'Загрузка...' : 'Загрузить GPX'}
      </label>
      <input
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        disabled={status.kind === 'importing'}
        id="gpx-upload"
        multiple
        onChange={handleFileChange}
        type="file"
      />
      <p className="track-upload-status" aria-live="polite">
        {status.message}
      </p>
    </form>
  )
}
