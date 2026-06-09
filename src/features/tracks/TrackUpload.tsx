import type { ChangeEvent } from 'react'
import { parseGpx, type ParsedGpxTrack } from '../import/parseGpx'

interface TrackUploadProps {
  onTracksImported: (tracks: ParsedGpxTrack[]) => void
}

export function TrackUpload({ onTracksImported }: TrackUploadProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])

    if (files.length === 0) {
      return
    }

    try {
      const importedTracks = await Promise.all(
        files.map(async (file): Promise<ParsedGpxTrack> => parseGpx(await file.text())),
      )

      onTracksImported(importedTracks)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось импортировать GPX-файл.')
    } finally {
      input.value = ''
    }
  }

  return (
    <form className="track-upload">
      <label className="track-upload-button" htmlFor="gpx-upload">
        Загрузить GPX
      </label>
      <input
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        id="gpx-upload"
        multiple
        onChange={handleFileChange}
        type="file"
      />
    </form>
  )
}
