export interface Channel {
  tvgId:  string
  name:   string
  group:  string
  logo:   string
  url:    string
  urls:   string[]  // tüm kaynaklar, kaliteli önce sıralı
  source: string
}

export interface Film {
  title: string
  group: string
  logo:  string
  url:   string
}

// Güvenilirlik sırası — düşük = önce dene (hızlı başlangıç)
// Arka planda kalite kontrolü VideoPlayer tarafından yapılır
const SOURCE_PRIORITY: [string, number][] = [
  ['youtube',        0],  // IP bağımsız, her zaman çalışır
  ['googlevideo',    0],
  ['medya.trt',      0],  // TRT resmi CDN, token yok, en güvenilir
  ['ercdn',          1],  // token var ama IP bağımsız
  ['mncdn',          1],
  ['daioncdn',       2],
  ['tvkulesi',       3],  // IP bağlı, 4 saatte yenileniyor
  ['kavuntv',        4],  // IP bağlı, aylık yenileniyor
]

function sourcePriority(source: string, url: string): number {
  if (url.startsWith('http://192.168.')) return 999  // yerel ağ — en sona
  const s = (source + url).toLowerCase()
  for (const [key, val] of SOURCE_PRIORITY) {
    if (s.includes(key)) return val
  }
  return 99
}

function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /(\S+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) attrs[m[1]] = m[2]
  return attrs
}

interface RawEntry {
  tvgId:  string
  name:   string
  group:  string
  logo:   string
  url:    string
  source: string
}

export function parseM3U(text: string): Channel[] {
  const lines = text.split('\n').map(l => l.trim())
  const raw: RawEntry[] = []
  let extinf = ''
  let source = ''

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      extinf = line; source = ''
    } else if (line.startsWith('# source:')) {
      source = line.replace('# source:', '').trim()
    } else if (line.startsWith('http') && extinf) {
      const attrs = parseAttrs(extinf)
      const nameM = extinf.match(/,([^,]+)$/)
      raw.push({
        tvgId:  attrs['tvg-id']      ?? '',
        name:   nameM?.[1]?.trim()  ?? '',
        group:  attrs['group-title'] ?? '',
        logo:   attrs['tvg-logo']    ?? '',
        url:    line,
        source,
      })
      extinf = ''; source = ''
    }
  }

  // tvg-id + group bazlı gruplama
  const groups = new Map<string, RawEntry[]>()
  const order:  string[] = []

  for (const e of raw) {
    const key = e.tvgId ? `${e.tvgId}|${e.group}` : `__${e.name}|${e.group}|${e.url}`
    if (!groups.has(key)) { groups.set(key, []); order.push(key) }
    groups.get(key)!.push(e)
  }

  return order.map(key => {
    const entries = groups.get(key)!
    entries.sort((a, b) => sourcePriority(a.source, a.url) - sourcePriority(b.source, b.url))
    const best = entries[0]
    return {
      tvgId:  best.tvgId,
      name:   best.name,
      group:  best.group,
      logo:   best.logo,
      url:    best.url,
      urls:   entries.map(e => e.url),
      source: best.source,
    }
  })
}

export function parseFilms(text: string): Film[] {
  const lines  = text.split('\n').map(l => l.trim())
  const result: Film[] = []
  let extinf = ''

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      extinf = line
    } else if (line.startsWith('http') && extinf) {
      const attrs = parseAttrs(extinf)
      const nameM = extinf.match(/,([^,]+)$/)
      result.push({
        title: nameM?.[1]?.trim()   ?? '',
        group: attrs['group-title'] ?? 'Film',
        logo:  attrs['tvg-logo']    ?? '',
        url:   line,
      })
      extinf = ''
    }
  }
  return result
}
