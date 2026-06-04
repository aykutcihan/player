import type { NowPlaying } from './nowplaying'

// MacBook proxy adresi — hls_proxy.py üzerinden CORS sorununu aşar
const PROXY = 'http://192.168.1.141:8888/power/nowplaying'

function slug(tvgId: string) {
  return tvgId.replace('powerapp.', '')
}

export async function fetchPowerNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('powerapp.')) return null
  try {
    const r = await fetch(`${PROXY}/${slug(tvgId)}`)
    if (!r.ok) return null
    const d = await r.json()
    if (d?.meta?.status !== 200) return null

    const timeline = d?.data?.timeline?.[0]
    if (!timeline) return null

    const raw    = timeline.artistTitle ?? ''
    const parts  = raw.includes(' - ') ? raw.split(' - ', 2) : ['', raw]
    const artist = parts[0].trim()
    const title  = (parts[1]?.trim() || raw).trim()

    const img  = d?.data?.image ?? {}
    const logo = img.prefix ? img.prefix + '150x150' + img.suffix : ''

    return {
      title,
      artist,
      cover:    logo,
      progress: (timeline.duration ?? 0) - (timeline.remainingSeconds ?? 0),
      duration: timeline.duration ?? 0,
    }
  } catch {
    return null
  }
}
