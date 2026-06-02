export interface NowPlaying {
  title:  string
  artist: string
  cover:  string
  progress: number
  duration: number
}

const KARNAVAL_API = 'https://karnaval.com/functions/v6/api.functions.php'
const HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://karnaval.com/',
}

// karnaval.{id} → station_N index
let stationOrder: number[] = []

async function loadStationOrder() {
  if (stationOrder.length > 0) return
  try {
    const r = await fetch('https://newapi.karnaval.com/station?activeOn=web')
    const data = await r.json()
    stationOrder = data.data.stations.map((s: { id: number }) => s.id)
  } catch { /* ignore */ }
}

let cachedSongs: Record<string, NowPlaying> = {}
let lastFetch = 0

export async function fetchAllNowPlaying(): Promise<Record<string, NowPlaying>> {
  const now = Date.now()
  if (now - lastFetch < 28000) return cachedSongs  // 28s cache

  await loadStationOrder()

  try {
    const r = await fetch(KARNAVAL_API, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        command: 'get_current_song',
        station_id: 'all',
        lastVersion: 0,
        custom_k_parameter: 'karnaval_web_v6',
      }),
    })
    const data = await r.json()
    if (!data.result) return cachedSongs

    const songs = data.data as Record<string, {
      title: string
      artist: string
      album_cover_art: string
      progress: number
      duration_sec: number
    }>

    const result: Record<string, NowPlaying> = {}
    Object.entries(songs).forEach(([key, song]) => {
      const idx = parseInt(key.replace('station_', '')) - 1
      const stationId = stationOrder[idx]
      if (stationId != null) {
        result[`karnaval.${stationId}`] = {
          title:    song.title    ?? '',
          artist:   song.artist   ?? '',
          cover:    song.album_cover_art ?? '',
          progress: song.progress ?? 0,
          duration: song.duration_sec ?? 0,
        }
      }
    })

    cachedSongs = result
    lastFetch = now
    return result
  } catch {
    return cachedSongs
  }
}
