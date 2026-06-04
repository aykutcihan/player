import { useMemo, useState, useRef, useCallback } from 'react'
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
  const [picker, setPicker] = useState<Channel | null>(null)
  const [toast, setToast]   = useState<string | null>(null)
  const [editingFav, setEditingFav] = useState<number | null>(null)
  const [editName, setEditName]     = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong  = useRef(false)

  // Grup listesi: favori sekmeler + normal gruplar
  const normalGroups = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const isFavTab = activeGroup?.startsWith('__fav__')
  const favIdx   = isFavTab ? parseInt(activeGroup!.replace('__fav__', '')) : -1

  const visibleChannels = useMemo((): Channel[] => {
    if (isFavTab) return resolveChannels(favIdx, radioChannels)
    if (!activeGroup) return []
    return normalGroups.get(activeGroup) ?? []
  }, [activeGroup, isFavTab, favIdx, normalGroups, radioChannels, resolveChannels])

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

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current)
  }, [])

  // Favori ekleme
  const handlePick = useCallback((groupIdx: number) => {
    if (!picker) return
    const err = addToGroup(groupIdx, picker.tvgId)
    setPicker(null)
    if (err) showToast(err)
    else showToast(`${picker.name} → ${favGroups[groupIdx].name}`)
  }, [picker, addToGroup, favGroups])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Grup adı düzenleme
  function startRename(i: number) {
    setEditingFav(i)
    setEditName(favGroups[i].name)
  }
  function commitRename() {
    if (editingFav !== null && editName.trim()) renameGroup(editingFav, editName.trim())
    setEditingFav(null)
  }

  return (
    <div className="flex flex-col h-[calc(100svh-48px)]">

      {/* Üst sekme çubuğu */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border-b border-white/10 overflow-x-auto shrink-0 scrollbar-none">

        {/* Favori sekmeler */}
        {favGroups.map((g, i) => {
          const key = `__fav__${i}`
          const isActive = activeGroup === key
          return (
            <button
              key={key}
              onClick={() => { setActiveGroup(key); setRadio(null) }}
              onDoubleClick={() => startRename(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                isActive
                  ? 'bg-yellow-500/80 text-black'
                  : 'text-yellow-400/70 hover:text-yellow-300 hover:bg-white/10'
              }`}
            >
              ⭐
              {editingFav === i
                ? <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => e.key === 'Enter' && commitRename()}
                    className="bg-transparent outline-none w-20 text-black"
                    onClick={e => e.stopPropagation()}
                  />
                : g.name
              }
            </button>
          )
        })}

        <div className="w-px h-5 bg-white/10 shrink-0 mx-1" />

        {/* Normal gruplar */}
        {[...normalGroups.keys()].map(g => (
          <button
            key={g}
            onClick={() => { setActiveGroup(g); setRadio(null) }}
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

      {/* Alt alan */}
      <div className="flex flex-1 min-h-0">

        {/* Sol: kanal listesi */}
        {activeGroup && !activeRadio ? (
          <div className="w-56 shrink-0 bg-[#1a1a1a] border-r border-white/10 overflow-y-auto">

            {/* Favori grup başlığı */}
            {isFavTab && (
              <div className="px-3 py-1.5 text-[10px] text-yellow-400/50 border-b border-white/5 flex justify-between">
                <span>⭐ {favGroups[favIdx].name} · {visibleChannels.length}/10</span>
                <button onClick={() => startRename(favIdx)} className="hover:text-yellow-300">✏️</button>
              </div>
            )}

            {/* Favori liste (sürükle-bırak) */}
            {isFavTab && (
              <FavChannelList
                channels={visibleChannels}
                active={activeRadio}
                onSelect={setRadio}
                onRemove={tvgId => removeFromGroup(favIdx, tvgId)}
                onReorder={(o, n) => reorderGroup(favIdx, o, n)}
              />
            )}
            {!isFavTab && (visibleChannels as Channel[]).map((ch, i) => (
                <div
                  key={i}
                  onMouseDown={() => startPress(ch)}
                  onMouseUp={() => endPress(ch)}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress(ch)}
                  onTouchEnd={() => endPress(ch)}
                  onTouchMove={cancelPress}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5 transition-colors select-none cursor-pointer hover:bg-white/5"
                >
                  {ch.logo
                    ? <img src={ch.logo} alt="" className="w-8 h-8 object-contain rounded-lg shrink-0 bg-white/10" />
                    : <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">📻</div>
                  }
                  <div className="text-sm text-white/80 truncate">{ch.name}</div>
                </div>
            ))}
          </div>
        ) : null}

        {/* Sağ: player */}
        <div className="flex-1 flex items-center justify-center bg-[#111]">
          {activeRadio
            ? <RadioPlayer channel={activeRadio} />
            : <p className="text-white/30 text-sm">
                {activeGroup
                  ? isFavTab ? 'Kanala tıkla veya eklemek için basılı tut' : 'Soldan radyo seç (basılı tut = favorilere ekle)'
                  : 'Üstten grup seçin'}
              </p>
          }
        </div>
      </div>

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#333] text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
