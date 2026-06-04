import { URLS } from './config'

export interface NowPlaying {
  title:    string
  artist:   string
  cover:    string
  progress?: number
  duration?: number
}

let karnavalCache: Record<string, NowPlaying> = {}
let number1Cache:  Record<string, NowPlaying> = {}
let powerCache:    Record<string, NowPlaying> = {}
let karnavalTs = 0
let number1Ts  = 0
let powerTs    = 0
const TTL = 28000

async function fetchJson(url: string): Promise<Record<string, NowPlaying>> {
  try {
    const r = await fetch(url + '?t=' + Math.floor(Date.now() / 30000))
    if (!r.ok) return {}
    return await r.json()
  } catch {
    return {}
  }
}

export async function fetchAllNowPlaying(): Promise<Record<string, NowPlaying>> {
  const now = Date.now()
  if (now - karnavalTs > TTL) {
    karnavalCache = await fetchJson(URLS.karnavalSongs)
    karnavalTs = now
  }
  if (now - number1Ts > TTL) {
    number1Cache = await fetchJson(URLS.number1Songs)
    number1Ts = now
  }
  if (now - powerTs > TTL) {
    powerCache = await fetchJson(URLS.powerSongs)
    powerTs = now
  }
  return { ...karnavalCache, ...number1Cache, ...powerCache }
}
