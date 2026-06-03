const BASE = 'https://raw.githubusercontent.com/aykutcihan/tv-takip/main'

export const URLS = {
  playlist:      `${BASE}/playlist.m3u`,
  films:         `${BASE}/films.m3u`,
  radios:        `${BASE}/radios.xml`,
  epgIndex:      `${BASE}/epg/index.json`,
  epg:           (channelId: string) => `${BASE}/epg/${channelId}.json`,
  karnavalSongs: `${BASE}/karnaval-songs.json`,
  number1Songs:  `${BASE}/number1-songs.json`,
}
