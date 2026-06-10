import { useState, useCallback, useEffect } from 'react'
import type { Channel } from './m3u'
import { RadioFavorites } from './radioFavoritesBridge'

export interface FavGroup {
  name: string
  channels: string[]  // tvgId listesi
}

const MAX = 10
const MIN = 3
const STORAGE_KEY = 'radio_favorites'

const DEFAULT_CHANNELS = ['karnaval.16', 'fenomen.fenomenturk', 'powerapp.powerpop']

const DEFAULT: FavGroup[] = [
  { name: 'Favori 1', channels: [...DEFAULT_CHANNELS] },
  { name: 'Favori 2', channels: [...DEFAULT_CHANNELS] },
  { name: 'Favori 3', channels: [...DEFAULT_CHANNELS] },
]

function load(): FavGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT
    // Boş grupları varsayılanlarla doldur
    return parsed.map((gr: FavGroup, i: number) =>
      gr.channels.length === 0 ? { ...gr, channels: [...DEFAULT[i].channels] } : gr
    )
  } catch {}
  return DEFAULT
}

function save(groups: FavGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  RadioFavorites.setFavorites({ groups }).catch(() => {})
}

export function useFavorites() {
  const [groups, setGroups] = useState<FavGroup[]>(load)

  // Mevcut favorileri Android Auto servisinin ilk kez okuyabilmesi icin native tarafa senkronla
  useEffect(() => {
    RadioFavorites.setFavorites({ groups }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback((next: FavGroup[]) => {
    setGroups(next)
    save(next)
  }, [])

  const addToGroup = useCallback((groupIdx: number, tvgId: string): string | null => {
    const g = groups[groupIdx]
    if (g.channels.length >= MAX) return `${g.name} dolu (max ${MAX})`
    if (g.channels.includes(tvgId)) return 'Zaten ekli'
    const next = groups.map((gr, i) =>
      i === groupIdx ? { ...gr, channels: [...gr.channels, tvgId] } : gr
    )
    update(next)
    return null
  }, [groups, update])

  const removeFromGroup = useCallback((groupIdx: number, tvgId: string): string | null => {
    if (groups[groupIdx].channels.length <= MIN) return `En az ${MIN} radyo olmalı`
    const next = groups.map((gr, i) =>
      i === groupIdx ? { ...gr, channels: gr.channels.filter(id => id !== tvgId) } : gr
    )
    update(next)
    return null
  }, [groups, update])

  const reorderGroup = useCallback((groupIdx: number, oldIdx: number, newIdx: number) => {
    const chs = [...groups[groupIdx].channels]
    const [moved] = chs.splice(oldIdx, 1)
    chs.splice(newIdx, 0, moved)
    const next = groups.map((gr, i) =>
      i === groupIdx ? { ...gr, channels: chs } : gr
    )
    update(next)
  }, [groups, update])

  const renameGroup = useCallback((groupIdx: number, name: string) => {
    const next = groups.map((gr, i) =>
      i === groupIdx ? { ...gr, name } : gr
    )
    update(next)
  }, [groups, update])

  const resolveChannels = useCallback((groupIdx: number, allChannels: Channel[]): Channel[] => {
    const ids = groups[groupIdx].channels
    return ids.flatMap(id => {
      const ch = allChannels.find(c => c.tvgId === id)
      return ch ? [ch] : []
    })
  }, [groups])

  return { groups, addToGroup, removeFromGroup, reorderGroup, renameGroup, resolveChannels }
}
