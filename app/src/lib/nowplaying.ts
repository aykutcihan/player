import { URLS } from './config'

export interface NowPlaying {
  title:    string
  artist:   string
  cover:    string
  progress: number
  duration: number
}

let cache: Record<string, NowPlaying> = {}
let lastFetch = 0

export async function fetchAllNowPlaying(): Promise<Record<string, NowPlaying>> {
  const now = Date.now()
  if (now - lastFetch < 28000) return cache  // 28s cache

  try {
    const r = await fetch(URLS.karnavalSongs + '?t=' + Math.floor(now / 30000))
    if (!r.ok) return cache
    cache = await r.json()
    lastFetch = now
  } catch { /* ignore */ }

  return cache
}
