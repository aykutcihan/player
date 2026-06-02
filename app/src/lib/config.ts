const BASE = 'https://raw.githubusercontent.com/aykutcihan/epg-generator/master'
const CDN  = 'https://cdn.jsdelivr.net/gh/aykutcihan/epg-generator@master'

export const URLS = {
  playlist: `${CDN}/playlist.m3u`,
  films:    `${CDN}/films.m3u`,
  radios:   `${CDN}/radios.xml`,
  epgIndex: `${BASE}/epg/index.json`,
  epg:      (channelId: string) => `${BASE}/epg/${channelId}.json`,
}
