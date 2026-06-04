import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavChannelList from '../components/radio/FavChannelList'
import FavPickerModal from '../components/radio/FavPickerModal'
import GroupWheel from '../components/tv/GroupWheel'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, reorderGroup, renameGroup, resolveChannels } = useFavorites()

  const [activeGroup, setActiveGroup] = useState<string>('__fav__0')
  const [uiVisible,   setUiVisible]   = useState(true)
  const [picker, setPicker]           = useState<Channel | null>(null)
  const [toast, setToast]             = useState<string | null>(null)
  const [editingFav, setEditingFav]   = useState<number | null>(null)
  const [editName, setEditName]       = useState('')

  const scrollRef  = useRef<HTMLDivElement>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong    = useRef(false)

  // Tüm grup listesi: favoriler + normal gruplar
  const normalGroupNames = useMemo(() => {
    const seen = new Set<string>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      seen.add(g)
    }
    return [...seen]
  }, [radioChannels])

  const allGroups = useMemo(() => [
    ...favGroups.map((g, i) => `⭐ ${g.name}__fav__${i}`),
    ...normalGroupNames,
  ], [favGroups, normalGroupNames])

  const isFavGroup = (g: string) => g.includes('__fav__')
  const favIdxOf   = (g: string) => parseInt(g.split('__fav__')[1])


  const isFavTab = isFavGroup(activeGroup)
  const favIdx   = isFavTab ? favIdxOf(activeGroup) : -1

  const normalGroupMap = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const visibleChannels = useMemo((): Channel[] => {
    if (isFavTab) return resolveChannels(favIdx, radioChannels)
    return normalGroupMap.get(activeGroup) ?? []
  }, [activeGroup, isFavTab, favIdx, normalGroupMap, radioChannels, resolveChannels])

  // UI göster/gizle
  const showUi = useCallback(() => {
    setUiVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setUiVisible(false), 4000)
  }, [])

  useEffect(() => { showUi() }, [])

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
    showToast(err ?? `${picker.name} → ${favGroups[groupIdx].name}`)
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

  return (
    <div
      className="relative flex flex-col h-[calc(100svh-48px)] bg-[#111] overflow-hidden"
      onMouseMove={showUi}
      onClick={showUi}
    >
      {/* Ana alan — player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <div className="text-white/20 text-sm text-center px-8">
              Soldan grup seç, alttaki listeden radyo tıkla
            </div>
        }
      </div>

      {/* Favori liste overlay */}
      {isFavTab && uiVisible && (
        <div className="absolute left-24 right-0 top-0 bottom-[88px] z-10 bg-[#111]/90 overflow-y-auto">
          <div className="max-w-sm mx-auto py-2">
            <div className="flex items-center justify-between px-4 py-2 text-xs text-yellow-400/60">
              <span>⭐ {favGroups[favIdx]?.name} · {visibleChannels.length}/10</span>
              <button onClick={() => startRename(favIdx)} className="hover:text-yellow-300">
                {editingFav === favIdx
                  ? <input autoFocus value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => e.key === 'Enter' && commitRename()}
                      className="bg-white/10 rounded px-2 outline-none text-white w-28"
                      onClick={e => e.stopPropagation()} />
                  : '✏️ Yeniden adlandır'
                }
              </button>
            </div>
            <FavChannelList
              channels={visibleChannels}
              active={activeRadio}
              onSelect={ch => setRadio(ch)}
              onRemove={tvgId => removeFromGroup(favIdx, tvgId)}
              onReorder={(o, n) => reorderGroup(favIdx, o, n)}
            />
          </div>
        </div>
      )}

      {/* Sol GroupWheel */}
      <GroupWheel
        groups={allGroups}
        active={activeGroup}
        onSelect={setActiveGroup}
        visible={uiVisible}
      />

      {/* Alt kanal şeridi */}
      {!isFavTab && (
        <div className={`shrink-0 bg-black/70 backdrop-blur-sm border-t border-white/10 transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
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
            {visibleChannels.length === 0 && (
              <div className="flex items-center justify-center w-full py-3 text-white/20 text-xs">
                Grup boş
              </div>
            )}
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
