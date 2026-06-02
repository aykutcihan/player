import { URLS } from './config'

export interface Programme {
  start:    string
  stop:     string
  title:    string
  subTitle?: string
  desc?:    string
  category?: string
}

export interface ChannelEpg {
  channel:    string
  name:       string
  updated:    string
  programmes: Programme[]
}

const cache = new Map<string, { data: ChannelEpg; ts: number }>()
const TTL = 5 * 60 * 1000 // 5 dakika

export async function fetchEpg(channelId: string): Promise<Programme[]> {
  const now = Date.now()
  const hit = cache.get(channelId)
  if (hit && now - hit.ts < TTL) return hit.data.programmes

  try {
    const res  = await fetch(URLS.epg(channelId))
    if (!res.ok) return []
    const data: ChannelEpg = await res.json()
    cache.set(channelId, { data, ts: now })
    return data.programmes
  } catch {
    return []
  }
}

export function currentProgramme(progs: Programme[]): Programme | null {
  const now = new Date().toISOString()
  return progs.find(p => p.start <= now && p.stop > now) ?? null
}

export function upcomingProgrammes(progs: Programme[], limit = 5): Programme[] {
  const now = new Date().toISOString()
  return progs.filter(p => p.start > now).slice(0, limit)
}
