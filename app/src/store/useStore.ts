import { create } from 'zustand'
import { type Channel, type Film, parseM3U, parseFilms } from '../lib/m3u'
import { URLS } from '../lib/config'

interface Store {
  // Canlı TV
  channels:       Channel[]
  activeChannel:  Channel | null
  channelGroup:   string

  // Filmler
  films: Film[]

  // Radyo
  radioChannels:  Channel[]
  activeRadio:    Channel | null
  radioNowPlaying: { title: string; artist: string } | null

  // Yükleme
  loaded: boolean

  // Actions
  loadAll:           () => Promise<void>
  setChannel:        (ch: Channel) => void
  setGroup:          (g: string)   => void
  setRadio:          (ch: Channel | null) => void
  setRadioNowPlaying:(info: { title: string; artist: string } | null) => void
}

export const useStore = create<Store>((set, get) => ({
  channels:      [],
  activeChannel: null,
  channelGroup:  'Tümü',
  films:         [],
  radioChannels:    [],
  activeRadio:      null,
  radioNowPlaying:  null,
  loaded:           false,

  loadAll: async () => {
    if (get().loaded) return
    try {
      const [playlistRes, filmsRes, radiosRes] = await Promise.all([
        fetch(URLS.playlist),
        fetch(URLS.films),
        fetch(URLS.radios_playlist),
      ])
      const [playlistText, filmsText, radiosText] = await Promise.all([
        playlistRes.text(),
        filmsRes.text(),
        radiosRes.ok ? radiosRes.text() : Promise.resolve(''),
      ])
      const channels = parseM3U(playlistText)
      const radios   = parseM3U(radiosText)
      const films    = parseFilms(filmsText)

      set({
        channels,
        radioChannels: radios,
        films,
        activeChannel: channels[0] ?? null,
        activeRadio:   radios[0]   ?? null,
        loaded:        true,
      })
    } catch (e) {
      console.error('Veri yüklenemedi:', e)
      // TV'de hata durumunda state'i bozuk bırakma
      set({ loaded: true })
    }
  },

  setChannel:         (ch)   => set({ activeChannel: ch }),
  setGroup:           (g)    => set({ channelGroup: g }),
  setRadio:           (ch)   => set({ activeRadio: ch ?? null, radioNowPlaying: null }),
  setRadioNowPlaying: (info) => set({ radioNowPlaying: info }),
}))
