import { create } from 'zustand'
import { type Channel, parseM3U } from '../lib/m3u'
import { URLS } from '../lib/config'

const LAST_RADIO_KEY = 'radio_last_played'
const DEFAULT_RADIO_TVGID = 'muzikliste.radyovoyage'

interface Store {
  // Radyo
  radioChannels:   Channel[]
  activeRadio:     Channel | null
  radioNowPlaying: { title: string; artist: string } | null

  // Yükleme
  loaded: boolean

  // Actions
  loadAll:            () => Promise<void>
  setRadio:           (ch: Channel | null) => void
  setRadioNowPlaying: (info: { title: string; artist: string } | null) => void
}

export const useStore = create<Store>((set, get) => ({
  radioChannels:    [],
  activeRadio:      null,
  radioNowPlaying:  null,
  loaded:           false,

  loadAll: async () => {
    if (get().loaded) return
    try {
      const radiosRes  = await fetch(URLS.radios_playlist)
      const radiosText = radiosRes.ok ? await radiosRes.text() : ''
      const radios     = parseM3U(radiosText)

      const lastTvgId = localStorage.getItem(LAST_RADIO_KEY)
      const initialRadio =
        radios.find(c => c.tvgId === lastTvgId) ??
        radios.find(c => c.tvgId === DEFAULT_RADIO_TVGID) ??
        radios[0] ?? null

      set({
        radioChannels: radios,
        activeRadio:   initialRadio,
        loaded:        true,
      })
    } catch (e) {
      console.error('Veri yüklenemedi:', e)
      set({ loaded: true })
    }
  },

  setRadio:           (ch)   => {
    if (ch) localStorage.setItem(LAST_RADIO_KEY, ch.tvgId)
    set({ activeRadio: ch ?? null, radioNowPlaying: null })
  },
  setRadioNowPlaying: (info) => set({ radioNowPlaying: info }),
}))
