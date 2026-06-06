import { useMemo, useState, useRef, useCallback, useEffect } from 'react'

import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500


export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, resolveChannels } = useFavorites()

  const [coverUrl,      setCoverUrl]      = useState('')
  const [stripGroup,    setStripGroup]    = useState<string | null>(null)
  const [activeFav,     setActiveFav]     = useState<number | null>(null)
  const [groupOffset,   setGroupOffset]   = useState(0)
  const [picker,        setPicker]        = useState<Channel | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<Channel | null>(null)
  const [toast,          setToast]          = useState<string | null>(null)
  const [channelOffset,  setChannelOffset]  = useState(0)
  const [displayName,    setDisplayName]    = useState<string>('')
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const grpRef0    = useRef<HTMLButtonElement>(null)
  const grpRef1    = useRef<HTMLButtonElement>(null)
  const grpRef2    = useRef<HTMLButtonElement>(null)
  const grpRefs    = [grpRef0, grpRef1, grpRef2]
  const chRef0     = useRef<HTMLButtonElement>(null)
  const chRef1     = useRef<HTMLButtonElement>(null)
  const chRef2     = useRef<HTMLButtonElement>(null)
  const chRefs     = [chRef0, chRef1, chRef2]
  const favRef     = useRef<HTMLDivElement>(null)
  const favMidRef  = useRef<HTMLButtonElement>(null)
  const playBtnRef = useRef<HTMLButtonElement>(null)
  const pickerRef  = useRef<Channel | null>(null)

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

  // Sayfa açılınca Pop ortada olacak şekilde offset ayarla, orta butona focus
  useEffect(() => {
    if (groupNames.length === 0) return
    const defaultGroup = groupNames.includes('Pop') ? 'Pop' : groupNames[0]
    setStripGroup(defaultGroup)
    const popIdx = groupNames.indexOf(defaultGroup)
    setGroupOffset((popIdx - 1 + groupNames.length) % groupNames.length)
    grpRef1.current?.focus()
  }, [groupNames.length])

  // Şerit kanalları — fav veya seçili grup
  const stripChannels = useMemo((): Channel[] => {
    if (activeFav !== null) return resolveChannels(activeFav, radioChannels)
    if (stripGroup) return normalGroupMap.get(stripGroup) ?? []
    return []
  }, [activeFav, stripGroup, radioChannels, normalGroupMap, resolveChannels])

  // Görünür 3 kanal (orta = seçili)
  const visibleChannels = useMemo(() =>
    stripChannels.length === 0 ? [] : [0, 1, 2].map(i => ({
      ch: stripChannels[(channelOffset + i) % stripChannels.length],
      idx: (channelOffset + i) % stripChannels.length,
    })),
  [stripChannels, channelOffset])

  const currentStripIdx = useMemo(() =>
    activeRadio ? stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId) : -1,
  [activeRadio, stripChannels])

  // Preview: gezinince ortadaki isim, 3s sonra çalana dön
  useEffect(() => {
    const midName = visibleChannels[1]?.ch.name ?? ''
    setDisplayName(midName)
    clearTimeout(nameTimerRef.current)
    nameTimerRef.current = setTimeout(() => {
      setDisplayName(activeRadio?.name ?? midName)
    }, 3000)
    return () => clearTimeout(nameTimerRef.current)
  }, [channelOffset])

  // Çalan radyo değişince displayName güncelle
  useEffect(() => {
    setDisplayName(activeRadio?.name ?? '')
  }, [activeRadio])

  // Grup/fav değişince ilk kanal ortada başlasın
  useEffect(() => {
    if (stripChannels.length === 0) return
    const activeIdx = stripChannels.findIndex(c => c.tvgId === activeRadio?.tvgId)
    const startIdx = activeIdx >= 0 ? activeIdx : 0
    setChannelOffset((startIdx - 1 + stripChannels.length) % stripChannels.length)
  }, [stripGroup, activeFav])

  // Çalan radyo değişince şeridi ortala
  useEffect(() => {
    if (!activeRadio || stripChannels.length === 0) return
    const idx = stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId)
    if (idx >= 0) setChannelOffset((idx - 1 + stripChannels.length) % stripChannels.length)
  }, [activeRadio?.tvgId])

  // Kanal şeridi açılınca orta butona focus
  useEffect(() => {
    if (activeFav === null && stripGroup === null) return
    chRef1.current?.focus()
  }, [stripGroup, activeFav])


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
          backgroundImage: coverUrl ? `url(${coverUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px)',
          transform: 'scale(1.05)',
          opacity: coverUrl ? 0.9 : 0,
        }}
      />
      <div className="absolute inset-0 bg-[#111]/75 pointer-events-none" />

      {/* Ana alan — player */}
      <div className="flex-1 min-h-0 relative">
        {activeRadio
          ? <RadioPlayer
              channel={activeRadio}
              onPrev={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx - 1 + stripChannels.length) % stripChannels.length]) : undefined}
              onNext={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx + 1) % stripChannels.length]) : undefined}
              playBtnRef={playBtnRef}
              onCoverChange={setCoverUrl}
              onPlayKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); grpRef1.current?.focus() }
              }}
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
      <div className="relative z-10 flex items-center justify-center gap-2 px-3 py-2 shrink-0">
        {visibleGroups.map((g, btnIdx) => (
          <button
            key={btnIdx}
            ref={grpRefs[btnIdx]}
            onClick={() => { setStripGroup(g === stripGroup ? null : g); setActiveFav(null) }}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { e.preventDefault(); setGroupOffset(prev => (prev + 1) % groupNames.length); grpRef1.current?.focus() }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); setGroupOffset(prev => (prev - 1 + groupNames.length) % groupNames.length); grpRef1.current?.focus() }
              if (e.key === 'ArrowUp')    { e.preventDefault(); playBtnRef.current?.focus() }
              if (e.key === 'ArrowDown')  { e.preventDefault(); favMidRef.current?.focus() }
            }}
            className={`flex-none flex items-center justify-center w-20 h-20 rounded-xl text-sm font-semibold transition-all select-none text-center border ${
              stripGroup === g
                ? 'border-red-500 bg-red-800 text-white scale-105'
                : 'border-white/15 bg-transparent text-white'
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
              ref={i === 1 ? favMidRef : undefined}
              onClick={() => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } favLong.current = false }}
              onKeyDown={e => {
                if (e.key === 'ArrowUp')    { e.preventDefault(); grpRef1.current?.focus() }
                if (e.key === 'ArrowDown' && (activeFav !== null || stripGroup !== null)) { e.preventDefault(); chRef1.current?.focus() }
                if (e.key === 'ArrowLeft')  { e.preventDefault(); (favRef.current?.children[(i - 1 + 3) % 3] as HTMLElement)?.focus() }
                if (e.key === 'ArrowRight') { e.preventDefault(); (favRef.current?.children[(i + 1) % 3] as HTMLElement)?.focus() }
              }}
              onMouseDown={favDown} onMouseUp={favUp} onMouseLeave={favCancel}
              onTouchStart={favDown} onTouchEnd={favUp} onTouchMove={favCancel}
              className={`flex-none flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all select-none w-20 h-20 ${
                activeFav === i
                  ? 'border-yellow-500 bg-yellow-800 scale-105'
                  : 'border-white/15 bg-white/5'
              }`}
            >
              <span
                className="text-6xl leading-none"
                style={{ filter: i === 0 ? 'saturate(1.5) brightness(1.3)' : i === 1 ? 'hue-rotate(155deg) saturate(1.5)' : 'hue-rotate(60deg) saturate(1.8) brightness(0.9)' }}
              >⭐</span>
            </button>
          )
        })}
      </div>

      {/* Kanal şeridi — grup carousel kopyası, 3 kanal, orta sabit */}
      {(activeFav !== null || stripGroup !== null) && (
        <div className="relative z-10 shrink-0">
          {stripChannels.length === 0
            ? <div className="text-center py-3 text-white/20 text-xs">Kanallara basılı tutarak bu favoriye ekle</div>
            : <div className="flex flex-col items-center gap-1 py-2">
                <div className="flex items-center justify-center gap-2">
                {visibleChannels.map(({ ch, idx }, btnIdx) => (
                  <button
                    key={btnIdx}
                    ref={chRefs[btnIdx]}
                    onClick={() => {
                      setChannelOffset((idx - 1 + stripChannels.length) % stripChannels.length)
                      setRadio(ch)
                      chRef1.current?.focus()
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); setChannelOffset(prev => (prev + 1) % stripChannels.length); chRef1.current?.focus() }
                      if (e.key === 'ArrowLeft')  { e.preventDefault(); setChannelOffset(prev => (prev - 1 + stripChannels.length) % stripChannels.length); chRef1.current?.focus() }
                      if (e.key === 'ArrowUp')    { e.preventDefault(); favMidRef.current?.focus() }
                    }}
                    className={`flex-none flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all select-none w-20 h-20 justify-center ${
                      btnIdx === 1
                        ? activeFav !== null ? 'border-yellow-500 bg-yellow-800 scale-105' : 'border-red-500 bg-red-800 scale-105'
                        : 'border-white/15 bg-transparent'
                    }`}
                  >
                    {ch.logo
                      ? <img src={ch.logo} alt={ch.name} className="w-11 h-11 object-contain rounded-lg"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <span className="text-2xl">📻</span>
                    }
                    <span className="text-[10px] text-white truncate w-full text-center leading-tight">{ch.name}</span>
                  </button>
                ))}
                </div>
                <div className="text-2xl font-bold text-white text-center transition-all duration-300 truncate" style={{ width: 'calc(3 * 80px + 2 * 8px)' }}>
                  {displayName}
                </div>
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
