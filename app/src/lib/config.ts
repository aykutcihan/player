const BASE = 'https://raw.githubusercontent.com/aykutcihan/tv-takip/main'

export const URLS = {
  playlist:         `${BASE}/playlist.m3u`,
  radios_playlist:  `${BASE}/radios_playlist.m3u`,
  films:            `${BASE}/films.m3u`,
  radios:           `${BASE}/radios.xml`,
  radiosEpgIndex:   `${BASE}/epg/index.json`,
  radiosEpg:        (id: string) => `${BASE}/epg/${id}.json`,
  epgIndex:      `${BASE}/epg/index.json`,
  epg:           (channelId: string) => `${BASE}/epg/${channelId}.json`,
  karnavalSongs: `${BASE}/karnaval-songs.json`,
  number1Songs:  `${BASE}/number1-songs.json`,
  powerSongs:    `${BASE}/power-songs.json`,
  turkuvazSongs: `${BASE}/turkuvaz-songs.json`,
}
