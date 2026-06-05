import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, renameGroup, resolveChannels } = useFavorites()

  const [radioOpen,    setRadioOpen]    = useState(false)
  const [browseGroup,  setBrowseGroup]  = useState<string | null>(null)
  const [stripGroup,   setStripGroup]   = useState<string | null>(null) // alt şeritte gösterilen grup
  const [activeFav,    setActiveFav]    = useState<number | null>(null)
  const [picker,        setPicker]        = useState<Channel | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<Channel | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)
  const [editingFav,    setEditingFav]    = useState<number | null>(null)
  const [editName,      setEditName]      = useState('')

  const scrollRef      = useRef<HTMLDivElement>(null)
  const dropScrollRef  = useRef<HTMLDivElement>(null)
  const dropScrollPos  = useRef(0)
  const pickerRef      = useRef<Channel | null>(null)
  const timerRef       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong        = useRef(false)

  // pickerRef'i picker state ile senkron tut
  useEffect(() => { pickerRef.current = picker }, [picker])

  // Picker açılınca scroll pozisyonunu kaydet, kapanınca geri yükle
  useEffect(() => {
    if (picker) {
      dropScrollPos.current = dropScrollRef.current?.scrollLeft ?? 0
    } else if (dropScrollRef.current && dropScrollPos.current > 0) {
      dropScrollRef.current.scrollLeft = dropScrollPos.current
    }
  }, [picker])

  // Grup haritası
  const normalGroupMap = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const groupNames = useMemo(() => [...normalGroupMap.keys()], [normalGroupMap])

  // Alt şerit kanalları — fav veya seçili grup
  const stripChannels = useMemo((): Channel[] => {
    if (activeFav !== null) return resolveChannels(activeFav, radioChannels)
    if (stripGroup) return normalGroupMap.get(stripGroup) ?? []
    return []
  }, [activeFav, stripGroup, radioChannels, normalGroupMap, resolveChannels])

  // Aktif kanala scroll
  useEffect(() => {
    if (!activeRadio || !scrollRef.current) return
    const idx = stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeRadio, stripChannels])

  // Dropdown dışına tıklayınca kapat — picker açıksa kapatma
  useEffect(() => {
    const close = () => {
      if (pickerRef.current) return
      setRadioOpen(false)
      setBrowseGroup(null)
    }
    if (radioOpen) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [radioOpen])

  // Basılı tut → normal listede favoriye ekle, fav listesinde kaldır onayı
  const startPress = useCallback((ch: Channel, isFavStrip = false) => {
    didLong.current = false
    timerRef.current = setTimeout(() => {
      didLong.current = true
      if (isFavStrip) setRemoveConfirm(ch)
      else setPicker(ch)
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

  function commitRename() {
    if (editingFav !== null && editName.trim()) renameGroup(editingFav, editName.trim())
    setEditingFav(null)
  }

  // 📻 dropdown içindeki kanallar
  const dropChannels = useMemo((): Channel[] =>
    browseGroup ? (normalGroupMap.get(browseGroup) ?? []) : [],
    [browseGroup, normalGroupMap]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-[#111]">

      {/* Üst buton çubuğu — sadece 📻 */}
      <div className="flex items-center px-4 py-3 bg-[#1a1a1a] border-b border-white/10 shrink-0">

        {/* 📻 Radyo dropdown butonu */}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setRadioOpen(p => !p); setBrowseGroup(null); setStripGroup(null); setActiveFav(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              radioOpen
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
            }`}
          >
            <span className="text-xl">📻</span>
            <span>Radyo</span>
            <span className="text-[10px] opacity-60">{radioOpen ? '▲' : '▼'}</span>
          </button>

          {/* Dropdown */}
          {radioOpen && (
            <div
              className="absolute top-full left-0 mt-2 z-40 bg-[#222] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[280px]"
              onClick={e => e.stopPropagation()}
            >
              {!browseGroup ? (
                /* Grup listesi */
                <div className="grid grid-cols-2 gap-1 p-2 max-h-64 overflow-y-auto">
                  {groupNames.map(g => (
                    <button
                      key={g}
                      onClick={() => setBrowseGroup(g)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-700/50 text-white/70 hover:text-white text-xs font-medium transition-colors text-left"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              ) : (
                /* Kanal listesi */
                <>
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1 border-b border-white/5">
                    <button
                      onClick={() => setBrowseGroup(null)}
                      className="text-white/40 hover:text-white text-xs"
                    >← Gruplar</button>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/60 text-xs font-medium">{browseGroup}</span>
                  </div>
                  <div ref={dropScrollRef} className="flex gap-2 p-2 overflow-x-auto max-h-28" style={{ scrollbarWidth: 'none' }}>
                    {dropChannels.map((ch, i) => (
                      <button
                        key={i}
                        onMouseDown={() => startPress(ch)}
                        onMouseUp={() => { if (!didLong.current) { setRadioOpen(false); setStripGroup(browseGroup); setActiveFav(null) } endPress(ch) }}
                        onMouseLeave={cancelPress}
                        onTouchStart={() => startPress(ch)}
                        onTouchEnd={() => { if (!didLong.current) { setRadioOpen(false); setStripGroup(browseGroup); setActiveFav(null) } endPress(ch) }}
                        onTouchMove={cancelPress}
                        className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-16 ${
                          activeRadio?.tvgId === ch.tvgId
                            ? 'border-red-500 bg-red-900/40'
                            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {ch.logo
                          ? <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain rounded-lg"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          : <span className="text-xl">📻</span>
                        }
                        <span className="text-[8px] text-white/50 truncate w-14 text-center">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Üst kanal şeridi — grup veya fav kanalları */}
      {(activeFav !== null || stripGroup !== null) && (
        <div className="shrink-0 bg-[#161616] border-b border-white/10">
          {stripChannels.length === 0
            ? <div className="text-center py-3 text-white/20 text-xs">
                Kanallara basılı tutarak bu favoriye ekle
              </div>
            : <div
                ref={scrollRef}
                className="flex gap-2 px-3 py-2 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {stripChannels.map((ch, i) => (
                  <button
                    key={i}
                    onMouseDown={() => startPress(ch, activeFav !== null)}
                    onMouseUp={() => endPress(ch)}
                    onMouseLeave={cancelPress}
                    onTouchStart={() => startPress(ch, activeFav !== null)}
                    onTouchEnd={() => endPress(ch)}
                    onTouchMove={cancelPress}
                    className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-16 ${
                      activeRadio?.tvgId === ch.tvgId
                        ? activeFav !== null ? 'border-yellow-500 bg-yellow-900/30 scale-105' : 'border-red-500 bg-red-900/40 scale-105'
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
          }
        </div>
      )}

      {/* Ana alan — player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <div className="text-white/20 text-sm text-center space-y-2">
              <div className="text-4xl">📻</div>
              <div>Yukarıdan radyo seç</div>
            </div>
        }
      </div>

      {/* Alt favori butonları */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-[#1a1a1a] border-t border-white/10 shrink-0">
        {favGroups.map((g, i) => {
          const favTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
          const favLong = useRef(false)
          const favDown = () => {
            favLong.current = false
            favTimerRef.current = setTimeout(() => { favLong.current = true; setEditingFav(i); setEditName(g.name) }, LONG_PRESS_MS)
          }
          const favUp = () => {
            clearTimeout(favTimerRef.current)
            if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null); setRadioOpen(false) }
          }
          const favCancel = () => clearTimeout(favTimerRef.current)
          return (
            <button
              key={i}
              onMouseDown={favDown} onMouseUp={favUp} onMouseLeave={favCancel}
              onTouchStart={favDown} onTouchEnd={favUp} onTouchMove={favCancel}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all select-none ${
                activeFav === i
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/30'
                  : 'bg-white/8 text-yellow-400/70 hover:bg-white/12 hover:text-yellow-300'
              }`}
            >
              {editingFav === i
                ? <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename} onKeyDown={e => e.key === 'Enter' && commitRename()}
                    className="bg-transparent outline-none w-16" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
                : <span>{g.name}</span>
              }
            </button>
          )
        })}
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

      {/* Favoriden kaldır onayı */}
      {removeConfirm && activeFav !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setRemoveConfirm(null)}
        >
          <div
            className="bg-[#222] border border-white/10 rounded-2xl p-5 w-72 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm text-white/80 font-medium mb-1">
              {favGroups[activeFav]?.name}'den kaldır?
            </div>
            <div className="text-xs text-white/40 mb-4 truncate">{removeConfirm.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  removeFromGroup(activeFav, removeConfirm.tvgId)
                  setRemoveConfirm(null)
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                Evet
              </button>
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
              >
                Hayır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#333] text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
