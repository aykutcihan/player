import type { NowPlaying } from './nowplaying'

const PROXY = 'https://radio-proxy.tvtakip24.workers.dev'

function powerSlug(tvgId: string) {
  return tvgId.replace('powerapp.', '')
}

// Power radyoları — anlık
export async function fetchPowerNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('powerapp.')) return null
  try {
    const r = await fetch(`${PROXY}/power/${powerSlug(tvgId)}`)
    if (!r.ok) return null
    const d = await r.json()
    if (d?.meta?.status !== 200) return null
    const timeline = d?.data?.timeline?.[0]
    if (!timeline) return null
    const raw    = timeline.artistTitle ?? ''
    const parts  = raw.includes(' - ') ? raw.split(' - ', 2) : ['', raw]
    const img    = d?.data?.image ?? {}
    return {
      title:    (parts[1]?.trim() || raw).trim(),
      artist:   parts[0].trim(),
      cover:    img.prefix ? img.prefix + '150x150' + img.suffix : '',
      progress: (timeline.duration ?? 0) - (timeline.remainingSeconds ?? 0),
      duration: timeline.duration ?? 0,
    }
  } catch { return null }
}

// Karnaval önbellek — tüm kanalları tek seferde çek
let karnavalCache: Record<string, NowPlaying> = {}
let karnavalTs = 0
const TTL = 28000

export async function fetchKarnavalNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('karnaval.')) return null
  try {
    const now = Date.now()
    if (now - karnavalTs > TTL) {
      const r = await fetch(`${PROXY}/karnaval`)
      if (r.ok) {
        const d = await r.json()
        if (d?.result && d?.data) {
          const fresh: Record<string, NowPlaying> = {}
          for (const [key, song] of Object.entries(d.data as Record<string, any>)) {
            const num = parseInt(key.replace('station_', ''))
            if (isNaN(num)) continue
            if (song?.title) {
              fresh[`karnaval.${num}`] = {
                title:    song.title ?? '',
                artist:   song.artist ?? '',
                cover:    song.album_cover_art ?? '',
                progress: song.progress ?? 0,
                duration: song.duration_sec ?? 0,
              }
            }
          }
          karnavalCache = fresh
          karnavalTs = now
        }
      }
    }
    return karnavalCache[tvgId] ?? null
  } catch { return null }
}
