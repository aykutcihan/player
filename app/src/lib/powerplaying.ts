import type { NowPlaying } from './nowplaying'

const API_BASE = 'https://api.powergroup.com.tr/v3/Route/get?url=/radios/'
const POST_BODY = 'client=web&lang=tr&version=21&devicePlatform=1&deviceType=0'
const HEADERS = {
  'accept':           'application/json, text/javascript, */*; q=0.01',
  'content-type':     'application/x-www-form-urlencoded; charset=UTF-8',
  'origin':           'https://www.powerapp.com.tr',
  'referer':          'https://www.powerapp.com.tr/',
  'x-requested-with': 'XMLHttpRequest',
}

// powerapp.powerfmadver -> powerfmadver
function slug(tvgId: string) {
  return tvgId.replace('powerapp.', '')
}

export async function fetchPowerNowPlaying(tvgId: string): Promise<NowPlaying | null> {
  if (!tvgId.startsWith('powerapp.')) return null
  try {
    const r = await fetch(API_BASE + slug(tvgId), {
      method:  'POST',
      headers: HEADERS,
      body:    POST_BODY,
    })
    const d = await r.json()
    if (d?.meta?.status !== 200) return null

    const timeline = d?.data?.timeline?.[0]
    if (!timeline) return null

    const raw    = timeline.artistTitle ?? ''
    const parts  = raw.includes(' - ') ? raw.split(' - ', 2) : ['', raw]
    const artist = parts[0].trim()
    const title  = parts[1]?.trim() || raw.trim()

    const img = d?.data?.image ?? {}
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
