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
    const img = d?.data?.image ?? {}
    return {
      title:    (timeline.songTitle   ?? '').trim(),
      artist:   (timeline.artistTitle ?? '').trim(),
      cover:    img.prefix ? img.prefix + '150x150' + img.suffix : '',
      progress: (timeline.duration ?? 0) - (timeline.remainingSeconds ?? 0),
      duration: timeline.duration ?? 0,
    }
  } catch { return null }
}

// Radyohome kanalları — HLS EXTINF metadata (Worker üzerinden)
export async function fetchRadyohomeNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('radyohome.')) return null
  const slug = tvgId.replace('radyohome.', '')
  try {
    const r = await fetch(`${PROXY}/radyohome/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: d.cover || '' }
  } catch { return null }
}

// Radyo 7 kanalları — JSON API (Worker üzerinden)
export async function fetchRadyo7NowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('radyo7.')) return null
  const slug = tvgId.replace('radyo7.', '')
  try {
    const r = await fetch(`${PROXY}/radyo7/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: d.cover || '' }
  } catch { return null }
}

// Radyo Viva kanalları — HLS EXTINF metadata (Worker üzerinden)
export async function fetchVivaNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('viva.')) return null
  const slug = tvgId.replace('viva.', '')
  try {
    const r = await fetch(`${PROXY}/viva/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: d.cover || '' }
  } catch { return null }
}

// Radyo Fenomen kanalları — anlık şarkı (Worker üzerinden)
export async function fetchFenomenNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('fenomen.')) return null
  const slug = tvgId.replace('fenomen.', '')
  try {
    const r = await fetch(`${PROXY}/fenomen/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return {
      title:    d.title   || '',
      artist:   d.artist  || '',
      cover:    d.cover   || '',
      progress: d.progress ?? 0,
      duration: d.duration ?? 0,
    }
  } catch { return null }
}

// Radyo Özgür FM — ICY metadata (Worker üzerinden)
export async function fetchOzgurNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('ozgur.')) return null
  try {
    const r = await fetch(`${PROXY}/ozgur`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: '' }
  } catch { return null }
}

// Show Radyo — HLS EXTINF metadata (Worker üzerinden)
export async function fetchShowNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('show.')) return null
  const slug = tvgId.replace('show.', '')
  try {
    const r = await fetch(`${PROXY}/show/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: d.cover || '' }
  } catch { return null }
}

// Türkuvaz radyo şu an çalan
export async function fetchTurkuvazNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('turkuvaz.')) return null
  const slug = tvgId.replace('turkuvaz.', '')
  try {
    const r = await fetch(`${PROXY}/turkuvaz/${slug}`)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.title && !d.artist) return null
    return { title: d.title || '', artist: d.artist || '', cover: '' }
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

// RadioKing tabanlı radyolar — CORS açık, direkt çek
const RADIOKING_APIS: Record<string, string> = {
  'herkul.radyo': 'https://api.radioking.io/widget/radio/herkulradyo/track/current',
  'cihan.radyo':  'https://api.radioking.io/widget/radio/cihan-radyo/track/current',
  'cihan.sema':   'https://api.radioking.io/widgets/api/v1/radio/605425/track/current',
}

async function fetchRadioKingNowPlaying(apiUrl: string): Promise<NowPlaying | null> {
  try {
    const r = await fetch(apiUrl)
    if (!r.ok) return null
    const d = await r.json()
    const start    = d.started_at ? new Date(d.started_at).getTime() : 0
    const end      = d.end_at     ? new Date(d.end_at).getTime()     : 0
    const now      = Date.now()
    const duration = end > start ? (end - start) / 1000 : (d.duration ?? 0)
    const progress = start ? Math.max(0, (now - start) / 1000) : 0
    return {
      title:    d.album  || d.title  || '',
      artist:   d.artist || '',
      cover:    d.default_cover ? '' : (d.cover || ''),
      progress,
      duration,
    }
  } catch { return null }
}

export async function fetchHerkulNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  const api = RADIOKING_APIS[tvgId]
  if (!api) return null
  return fetchRadioKingNowPlaying(api)
}


