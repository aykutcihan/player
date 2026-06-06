import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

function wrapFocus(ref: React.RefObject<HTMLDivElement | null>, idx: number, total: number, dir: 1 | -1) {
  const next = (idx + dir + total) % total
  ;(ref.current?.children[next] as HTMLElement)?.focus()
}

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, resolveChannels } = useFavorites()

  const [stripGroup,    setStripGroup]    = useState<string | null>(null)
  const [activeFav,     setActiveFav]     = useState<number | null>(null)
  const [groupOffset,   setGroupOffset]   = useState(0)
  const [picker,        setPicker]        = useState<Channel | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<Channel | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)

  const grpRef0       = useRef<HTMLButtonElement>(null)
  const grpRef1       = useRef<HTMLButtonElement>(null)
  const grpRef2       = useRef<HTMLButtonElement>(null)
  const grpRefs       = [grpRef0, grpRef1, grpRef2]
  const scrollRef     = useRef<HTMLDivElement>(null)
  const favRef        = useRef<HTMLDivElement>(null)
  const pickerRef  = useRef<Channel | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong    = useRef(false)

  useEffect(() => { pickerRef.current = picker }, [picker])

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

  // Görünür 3 grup (sonsuz döngü)
  const visibleGroups = useMemo(() =>
    groupNames.length === 0 ? [] : [0, 1, 2].map(i => groupNames[(groupOffset + i) % groupNames.length]),
  [groupNames, groupOffset])

  // Sayfa açılınca Pop grubu varsayılan seç, ilk grup butonu focus
  useEffect(() => {
    if (groupNames.length === 0) return
    setStripGroup(groupNames.includes('Pop') ? 'Pop' : groupNames[0])
    grpRef0.current?.focus()
  }, [groupNames.length])

  // Şerit kanalları — fav veya seçili grup
  const stripChannels = useMemo((): Channel[] => {
    if (activeFav !== null) return resolveChannels(activeFav, radioChannels)
    if (stripGroup) return normalGroupMap.get(stripGroup) ?? []
    return []
  }, [activeFav, stripGroup, radioChannels, normalGroupMap, resolveChannels])

  const currentStripIdx = useMemo(() =>
    activeRadio ? stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId) : -1,
  [activeRadio, stripChannels])

  // Aktif kanala scroll
  useEffect(() => {
    if (!activeRadio || !scrollRef.current) return
    const idx = stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeRadio, stripChannels])

  // Kanal şeridi açılınca ilk butona focus
  useEffect(() => {
    if (activeFav === null && stripGroup === null) return
    const btn = scrollRef.current?.querySelector('button') as HTMLElement | null
    btn?.focus()
  }, [stripGroup, activeFav])

  // Long-press handlers
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


  return (
    <div className="relative flex flex-col h-[calc(100vh-48px)] pt-3 gap-1">

      {/* Tüm ekran blur arka plan */}
      <div
        className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundImage: activeRadio?.logo ? `url(${activeRadio.logo})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(60px)',
          transform: 'scale(1.3)',
          opacity: activeRadio?.logo ? 0.35 : 0,
        }}
      />
      <div className="absolute inset-0 bg-[#111]/75 pointer-events-none" />

      {/* Ana alan — player */}
      <div className="flex-1 min-h-0 relative">
        {activeRadio
          ? <RadioPlayer
              channel={activeRadio}
              onPrev={currentStripIdx > 0 ? () => setRadio(stripChannels[currentStripIdx - 1]) : undefined}
              onNext={currentStripIdx < stripChannels.length - 1 ? () => setRadio(stripChannels[currentStripIdx + 1]) : undefined}
            />
          : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="text-5xl opacity-20">📻</div>
              <div className="text-white/25 text-sm font-medium">Radyo seçilmedi</div>
              <div className="text-white/15 text-xs">Aşağıdan bir grup seç</div>
            </div>
          )
        }
      </div>

      {/* Grup carousel — favorilerin üstünde, aynı boyut */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-3 shrink-0 bg-black/50 rounded-2xl mx-2">
        {visibleGroups.map((g, btnIdx) => (
          <button
            key={btnIdx}
            ref={grpRefs[btnIdx]}
            onClick={() => { setStripGroup(g === stripGroup ? null : g); setActiveFav(null) }}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { e.preventDefault(); setGroupOffset(prev => (prev + 1) % groupNames.length) }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); setGroupOffset(prev => (prev - 1 + groupNames.length) % groupNames.length) }
              if (e.key === 'ArrowDown')  { e.preventDefault(); (favRef.current?.querySelector('button') as HTMLElement)?.focus() }
            }}
            className={`flex-none flex items-center justify-center w-20 h-20 rounded-xl text-sm font-semibold transition-all select-none text-center border ${
              stripGroup === g
                ? 'border-red-500 bg-red-800 text-white scale-105'
                : 'border-white/20 bg-white/20 text-white/80 hover:bg-white/30 hover:text-white'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Alt favori butonları */}
      <div ref={favRef} className="flex items-center justify-center gap-2 px-3 py-2 shrink-0">
        {favGroups.map((_g, i) => {
          const favTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
          const favLong = useRef(false)
          const favDown = () => {
            favLong.current = false
            favTimerRef.current = setTimeout(() => { favLong.current = true }, LONG_PRESS_MS)
          }
          const favUp = () => {
            clearTimeout(favTimerRef.current)
            if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) }
          }
          const favCancel = () => clearTimeout(favTimerRef.current)
          return (
            <button
              key={i}
              onClick={() => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } favLong.current = false }}
              onKeyDown={e => {
                if (e.key === 'ArrowUp')   { e.preventDefault(); grpRef0.current?.focus() }
                if (e.key === 'ArrowDown' && (activeFav !== null || stripGroup !== null)) { e.preventDefault(); const idx = Math.max(0, currentStripIdx); (scrollRef.current?.children[idx] as HTMLElement)?.focus() }
              }}
              onMouseDown={favDown} onMouseUp={favUp} onMouseLeave={favCancel}
              onTouchStart={favDown} onTouchEnd={favUp} onTouchMove={favCancel}
              className={`flex-none flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all select-none w-20 h-20 ${
                activeFav === i
                  ? 'border-yellow-500 bg-yellow-800/80 scale-105'
                  : 'border-white/20 bg-white/20 hover:border-white/40 hover:bg-white/30'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="text-6xl leading-none">⭐</span>
                <span className="absolute text-base font-black text-yellow-900">{i + 1}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Kanal şeridi — en altta, varsayılan Pop */}
      {(activeFav !== null || stripGroup !== null) && (
        <div className="relative z-10 shrink-0 bg-black/60 rounded-2xl mx-2 mb-1">
          {stripChannels.length === 0
            ? <div className="text-center py-3 text-white/20 text-xs">Kanallara basılı tutarak bu favoriye ekle</div>
            : <div ref={scrollRef} className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {stripChannels.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => { clearTimeout(timerRef.current); if (!didLong.current) setRadio(ch); didLong.current = false }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); wrapFocus(scrollRef, i, stripChannels.length, 1) }
                      if (e.key === 'ArrowLeft')  { e.preventDefault(); wrapFocus(scrollRef, i, stripChannels.length, -1) }
                      if (e.key === 'ArrowUp')    { e.preventDefault(); (favRef.current?.querySelector('button') as HTMLElement)?.focus() }
                    }}
                    onMouseDown={() => startPress(ch, activeFav !== null)}
                    onMouseUp={() => endPress(ch)}
                    onMouseLeave={cancelPress}
                    onTouchStart={() => startPress(ch, activeFav !== null)}
                    onTouchEnd={() => endPress(ch)}
                    onTouchMove={cancelPress}
                    className={`flex-none flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all select-none w-20 ${
                      activeRadio?.tvgId === ch.tvgId
                        ? activeFav !== null ? 'border-yellow-500 bg-yellow-800/80 scale-105' : 'border-red-500 bg-red-800 scale-105'
                        : 'border-white/20 bg-white/20 hover:border-white/40 hover:bg-white/30'
                    }`}
                  >
                    {ch.logo
                      ? <img src={ch.logo} alt={ch.name} className="w-11 h-11 object-contain rounded-lg"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <span className="text-2xl">📻</span>
                    }
                    <span className="text-[10px] text-white/60 truncate w-full text-center leading-tight">{ch.name}</span>
                  </button>
                ))}
              </div>
          }
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
                onClick={() => { removeFromGroup(activeFav, removeConfirm.tvgId); setRemoveConfirm(null) }}
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
