import { useState, useCallback } from 'react'
import type { Channel } from './m3u'

export interface FavGroup {
  name: string
  channels: string[]  // tvgId listesi
}

const MAX = 10
const STORAGE_KEY = 'radio_favorites'

const DEFAULT: FavGroup[] = [
  { name: 'Favori 1', channels: [] },
  { name: 'Favori 2', channels: [] },
  { name: 'Favori 3', channels: [] },
]

function load(): FavGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length === 3) return parsed
  } catch {}
  return DEFAULT
}

function save(groups: FavGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

export function useFavorites() {
  const [groups, setGroups] = useState<FavGroup[]>(load)

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

  const removeFromGroup = useCallback((groupIdx: number, tvgId: string) => {
    const next = groups.map((gr, i) =>
      i === groupIdx ? { ...gr, channels: gr.channels.filter(id => id !== tvgId) } : gr
    )
    update(next)
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
