export interface Channel {
  tvgId:    string
  name:     string
  group:    string
  logo:     string
  url:      string
  source:   string
}

export interface Film {
  title:  string
  group:  string
  logo:   string
  url:    string
}

function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /(\S+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) attrs[m[1]] = m[2]
  return attrs
}

export function parseM3U(text: string): Channel[] {
  const lines  = text.split('\n').map(l => l.trim())
  const result: Channel[] = []
  let extinf  = ''
  let source  = ''

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      extinf = line
      source = ''
    } else if (line.startsWith('# source:')) {
      source = line.replace('# source:', '').trim()
    } else if (line.startsWith('http') && extinf) {
      const attrs  = parseAttrs(extinf)
      const nameM  = extinf.match(/,([^,]+)$/)
      result.push({
        tvgId:  attrs['tvg-id']      ?? '',
        name:   nameM?.[1]?.trim()  ?? '',
        group:  attrs['group-title'] ?? '',
        logo:   attrs['tvg-logo']    ?? '',
        url:    line,
        source,
      })
      extinf = ''
      source = ''
    }
  }
  return result
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
