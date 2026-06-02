const BASE = 'https://raw.githubusercontent.com/aykutcihan/epg-data/master'
const CDN  = 'https://cdn.jsdelivr.net/gh/aykutcihan/epg-data@master'

export const URLS = {
  playlist:      `${CDN}/playlist.m3u`,
  films:         `${CDN}/films.m3u`,
  radios:        `${BASE}/radios.xml`,
  epgIndex:      `${BASE}/epg/index.json`,
  epg:           (channelId: string) => `${BASE}/epg/${channelId}.json`,
  karnavalSongs: `${BASE}/karnaval-songs.json`,
  number1Songs:  `${BASE}/number1-songs.json`,
}
