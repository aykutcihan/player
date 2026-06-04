import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavChannelList from '../components/radio/FavChannelList'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, reorderGroup, renameGroup, resolveChannels } = useFavorites()

  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [picker, setPicker]           = useState<Channel | null>(null)
  const [toast, setToast]             = useState<string | null>(null)
  const [editingFav, setEditingFav]   = useState<number | null>(null)
  const [editName, setEditName]       = useState('')
  const [, setShowFavList] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong   = useRef(false)

  // Grup haritası
  const normalGroups = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const isFavTab = activeGroup?.startsWith('__fav__') ?? false
  const favIdx   = isFavTab ? parseInt(activeGroup!.replace('__fav__', '')) : -1

  const visibleChannels = useMemo((): Channel[] => {
    if (isFavTab) return resolveChannels(favIdx, radioChannels)
    if (!activeGroup) return []
    return normalGroups.get(activeGroup) ?? []
  }, [activeGroup, isFavTab, favIdx, normalGroups, radioChannels, resolveChannels])

  // Aktif kanala scroll
  useEffect(() => {
    if (!activeRadio || !scrollRef.current) return
    const idx = visibleChannels.findIndex(c => c.tvgId === activeRadio.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeRadio, visibleChannels])

  // Basılı tut
  const startPress = useCallback((ch: Channel) => {
    didLong.current = false
    timerRef.current = setTimeout(() => {
      didLong.current = true
      setPicker(ch)
    }, LONG_PRESS_MS)
  }, [])

  const endPress = useCallback((ch: Channel) => {
    clearTimeout(timerRef.current)
    if (!didLong.current) setRadio(ch)
  }, [setRadio])

  const cancelPress = useCallback(() => clearTimeout(timerRef.current), [])

  // Favori ekle
  const handlePick = useCallback((groupIdx: number) => {
    if (!picker) return
    const err = addToGroup(groupIdx, picker.tvgId)
    setPicker(null)
    showToast(err ? err : `${picker.name} → ${favGroups[groupIdx].name}`)
  }, [picker, addToGroup, favGroups])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function startRename(i: number) {
    setEditingFav(i)
    setEditName(favGroups[i].name)
  }
  function commitRename() {
    if (editingFav !== null && editName.trim()) renameGroup(editingFav, editName.trim())
    setEditingFav(null)
  }

  const groupNames = [...normalGroups.keys()]

  return (
    <div className="relative flex flex-col h-[calc(100svh-48px)] bg-[#111] overflow-hidden">

      {/* Üst grup sekme çubuğu */}
      <div className="flex items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm border-b border-white/10 overflow-x-auto shrink-0 scrollbar-none z-10">
        {/* Favori sekmeler */}
        {favGroups.map((g, i) => {
          const key = `__fav__${i}`
          const isActive = activeGroup === key
          return (
            <button
              key={key}
              onClick={() => { setActiveGroup(key); setShowFavList(false) }}
              onDoubleClick={() => startRename(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                isActive ? 'bg-yellow-500/80 text-black' : 'text-yellow-400/60 hover:text-yellow-300 hover:bg-white/10'
              }`}
            >
              ⭐
              {editingFav === i
                ? <input
                    autoFocus value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => e.key === 'Enter' && commitRename()}
                    className="bg-transparent outline-none w-16 text-black"
                    onClick={e => e.stopPropagation()}
                  />
                : g.name
              }
            </button>
          )
        })}

        <div className="w-px h-5 bg-white/10 shrink-0 mx-1" />

        {/* Normal gruplar */}
        {groupNames.map(g => (
          <button
            key={g}
            onClick={() => { setActiveGroup(g); setShowFavList(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeGroup === g
                ? 'bg-red-600 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Ana alan — player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <div className="text-white/20 text-sm text-center px-8">
              {activeGroup ? 'Alttaki listeden radyo seç' : 'Üstten grup seç'}
            </div>
        }
      </div>

      {/* Favori liste overlay (favori sekmesi seçilince açılır) */}
      {isFavTab && (
        <div className="absolute inset-x-0 bottom-[88px] top-10 z-20 bg-[#111]/95 overflow-y-auto">
          <div className="max-w-sm mx-auto py-2">
            <div className="flex items-center justify-between px-4 py-2 text-xs text-yellow-400/60">
              <span>⭐ {favGroups[favIdx]?.name} · {visibleChannels.length}/10</span>
              <div className="flex gap-2">
                <button onClick={() => startRename(favIdx)} className="hover:text-yellow-300">✏️ Yeniden adlandır</button>
              </div>
            </div>
            <FavChannelList
              channels={visibleChannels}
              active={activeRadio}
              onSelect={ch => { setRadio(ch) }}
              onRemove={tvgId => removeFromGroup(favIdx, tvgId)}
              onReorder={(o, n) => reorderGroup(favIdx, o, n)}
            />
          </div>
        </div>
      )}

      {/* Alt kanal şeridi */}
      {!isFavTab && visibleChannels.length > 0 && (
        <div className="shrink-0 bg-black/70 backdrop-blur-sm border-t border-white/10">
          <div
            ref={scrollRef}
            className="flex gap-2 px-3 py-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {(visibleChannels as Channel[]).map((ch, i) => (
              <button
                key={i}
                onMouseDown={() => startPress(ch)}
                onMouseUp={() => endPress(ch)}
                onMouseLeave={cancelPress}
                onTouchStart={() => startPress(ch)}
                onTouchEnd={() => endPress(ch)}
                onTouchMove={cancelPress}
                className={`flex-none w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all select-none ${
                  activeRadio?.tvgId === ch.tvgId
                    ? 'border-red-500 bg-red-900/40 scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {ch.logo
                  ? <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain rounded-lg"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  : <span className="text-xl">📻</span>
                }
                <span className="text-[8px] text-white/50 truncate w-14 text-center leading-tight">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Favori seçici modal */}
      {picker && (
        <FavPickerModal
          groups={favGroups}
          channelName={picker.name}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#333] text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
