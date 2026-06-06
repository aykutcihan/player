import { useMemo, useState, useRef, useCallback, useEffect } from 'react'

import { useStore } from '../store/useStore'
import RadioPlayer, { MarqueeText } from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'
import type { NowPlaying } from '../lib/nowplaying'
import type { Programme } from '../lib/epg'

const LONG_PRESS_MS = 500

function GroupIcon({ group }: { group: string }) {
  const p = { viewBox: "0 0 24 24", className: "w-[40%] h-[40%]", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (group) {
    case 'Pop':     return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'Rock':    return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    case 'Slow':    return <svg {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
    case 'Chill':   return <svg {...p}><path d="M6 20V11Q6 3 17 4"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="6" y1="20" x2="17" y2="20"/><line x1="9" y1="8" x2="9" y2="20"/><line x1="12" y1="6" x2="12" y2="20"/><line x1="15" y1="4.5" x2="15" y2="20"/></svg>
    case 'Dans':    return <svg {...p}><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="5" width="4" height="16" rx="1"/></svg>
    case 'Rap':     return <svg {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    case 'Haber':   return <svg {...p}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
    case 'Nostalji':return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
    case 'THM':     return <svg {...p}><ellipse cx="8" cy="17" rx="4" ry="3"/><line x1="11" y1="15" x2="19" y2="4"/><line x1="13" y1="12" x2="11" y2="10"/><line x1="15" y1="9" x2="13" y2="7"/><circle cx="20" cy="3" r="1.5"/></svg>
    case 'TSM':     return <svg {...p}><path d="M9 17H5a2 2 0 0 0-2 2"/><path d="M14 7.5c-1-2-4-1.5-5 0s0 4.5 2 5"/><path d="M5 17c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3-3 1.3-3 3zm12 0c0 1.7 1.3 3 3 3"/><path d="M17 17c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3z"/><path d="M14 7.5V17"/><path d="M9 12.5V17"/></svg>
    case 'Etnik':   return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'Fantazi': return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'Dini':    return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    case 'Yabancı': return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'Özgün':   return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg>
    default:        return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  }
}

export default function Radio() {
  const { radioChannels, activeRadio, setRadio, setRadioNowPlaying } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, resolveChannels } = useFavorites()

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  const [coverUrl,      setCoverUrl]      = useState('')
  const [song,          setSong]          = useState<NowPlaying | null>(null)
  const handleSongChange = useCallback((s: NowPlaying | null) => {
    setSong(s)
    setRadioNowPlaying(s?.title || s?.artist ? { title: s?.title ?? '', artist: s?.artist ?? '' } : null)
  }, [setRadioNowPlaying])
  const [program,       setProgram]       = useState<Programme | null>(null)
  const [logoErrors,    setLogoErrors]    = useState<Set<string>>(new Set())
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
  const favRef          = useRef<HTMLDivElement>(null)
  const favMidRef       = useRef<HTMLButtonElement>(null)
  const playBtnRef      = useRef<HTMLButtonElement>(null)
  const pickerRef       = useRef<Channel | null>(null)
  const mobPlayerArea   = useRef<HTMLDivElement>(null)
  const mobGroupArea    = useRef<HTMLDivElement>(null)
  const mobChArea       = useRef<HTMLDivElement>(null)
  const dskPlayerArea   = useRef<HTMLDivElement>(null)
  const dskGroupArea    = useRef<HTMLDivElement>(null)
  const dskChArea       = useRef<HTMLDivElement>(null)
  const fav0TimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fav1TimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fav2TimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const favTimerRefs = [fav0TimerRef, fav1TimerRef, fav2TimerRef]
  const fav0Long = useRef(false)
  const fav1Long = useRef(false)
  const fav2Long = useRef(false)
  const favLongs = [fav0Long, fav1Long, fav2Long]
  const chLongTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const chLongRef      = useRef(false)

  useEffect(() => { pickerRef.current = picker }, [picker])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

  // Çalan radyo değişince displayName güncelle, bekleyen timer'ı iptal et
  useEffect(() => {
    clearTimeout(nameTimerRef.current)
    setDisplayName(activeRadio?.name ?? '')
  }, [activeRadio])

  // Grup/fav değişince ilk kanal ortada başlasın
  useEffect(() => {
    if (stripChannels.length === 0) return
    const activeIdx = stripChannels.findIndex(c => c.tvgId === activeRadio?.tvgId)
    const startIdx = activeIdx >= 0 ? activeIdx : 0
    setChannelOffset((startIdx - 1 + stripChannels.length) % stripChannels.length)
  }, [stripGroup, activeFav])

  // Cover URL — şarkı kapağı yoksa kanal logosu
  useEffect(() => {
    setCoverUrl(song?.cover || activeRadio?.logo || '')
  }, [song, activeRadio])

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

  // Kanal butonları uzun basış — favori ekle / çıkar
  const chDown = useCallback((ch: Channel) => {
    chLongRef.current = false
    chLongTimerRef.current = setTimeout(() => {
      chLongRef.current = true
      if (activeFav !== null) setRemoveConfirm(ch)
      else setPicker(ch)
    }, LONG_PRESS_MS)
  }, [activeFav])
  const chUp     = useCallback(() => clearTimeout(chLongTimerRef.current), [])
  const chCancel = useCallback(() => clearTimeout(chLongTimerRef.current), [])

  // Merkezi section navigasyonu — per-button onKeyDown tarafından çağrılır
  const navigate = useCallback((from: 'player' | 'group' | 'fav' | 'channel', dir: 'up' | 'down') => {
    const hasChannel = stripChannels.length > 0 && (activeFav !== null || stripGroup !== null)
    const toPlayer = () => (playBtnRef.current ?? grpRef1.current)?.focus()
    if (dir === 'down') {
      if (from === 'player')  grpRef1.current?.focus()
      else if (from === 'group')   favMidRef.current?.focus()
      else if (from === 'fav')     hasChannel ? chRef1.current?.focus() : toPlayer()
      else if (from === 'channel') toPlayer()
    } else {
      if (from === 'player')       hasChannel ? chRef1.current?.focus() : favMidRef.current?.focus()
      else if (from === 'group')   toPlayer()
      else if (from === 'fav')     grpRef1.current?.focus()
      else if (from === 'channel') favMidRef.current?.focus()
    }
  }, [stripChannels.length, activeFav, stripGroup])

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
    <div className="relative flex flex-col h-screen overflow-hidden">

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

      {/* ── DİKEY LAYOUT (mobile) ── */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0 sm:hidden gap-1">

        <div ref={mobPlayerArea} className="shrink-0 relative">
          {activeRadio && isMobile
            ? <RadioPlayer
                channel={activeRadio}
                onPrev={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx - 1 + stripChannels.length) % stripChannels.length]) : undefined}
                onNext={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx + 1) % stripChannels.length]) : undefined}
                playBtnRef={playBtnRef}
                onSongChange={handleSongChange}
                onProgramChange={setProgram}
                onPlayKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); navigate('player', 'down') }
                  if (e.key === 'ArrowUp')   { e.preventDefault(); navigate('player', 'up') }
                }}
              />
            : !activeRadio
              ? <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-5xl opacity-20">📻</div>
                  <div className="text-white/25 text-sm font-medium">Radyo seçilmedi</div>
                  <div className="text-white/15 text-xs">Aşağıdan bir grup seç</div>
                </div>
              : null
          }
        </div>

        <div className="flex-1 min-h-0 text-center px-6 py-2 flex flex-col justify-center">
          {song && (song.title || song.artist) ? (
            <>
              {song.title && <MarqueeText text={song.title} className="text-xl font-bold text-white leading-tight drop-shadow-lg" />}
              {song.artist && <div className="text-sm text-white/60 mt-1 font-medium">{song.artist}</div>}
              {(song.duration ?? 0) > 0 && (
                <div className="mt-2 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-pink-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, ((song.progress ?? 0) / (song.duration ?? 1)) * 100)}%` }} />
                </div>
              )}
            </>
          ) : program ? (
            <>
              <MarqueeText text={program.title} className="text-xl font-bold text-white leading-tight drop-shadow-lg" />
              {program.desc && <div className="text-sm text-white/60 mt-1 font-medium line-clamp-2">{program.desc}</div>}
            </>
          ) : null}
        </div>

        <div ref={mobGroupArea} className="flex items-center justify-center gap-2 px-3 py-1 shrink-0">
          {visibleGroups.map((g, btnIdx) => (
            <button key={btnIdx} ref={isMobile ? grpRefs[btnIdx] : undefined}
              onClick={() => { setStripGroup(g); setActiveFav(null) }}
              onKeyDown={e => {
                if (e.key === 'ArrowRight') { e.preventDefault(); setGroupOffset(prev => (prev + 1) % groupNames.length); grpRef1.current?.focus() }
                if (e.key === 'ArrowLeft')  { e.preventDefault(); setGroupOffset(prev => (prev - 1 + groupNames.length) % groupNames.length); grpRef1.current?.focus() }
                if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('group', 'down') }
                if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('group', 'up') }
              }}
              className={`flex-none flex flex-col items-center justify-center gap-1 w-[25vw] h-[25vw] rounded-xl text-[3vw] font-semibold transition-all select-none text-center border ${stripGroup === g ? 'border-red-500 bg-red-800 text-white scale-105' : 'border-white/15 bg-transparent text-white'}`}
            >
              <GroupIcon group={g} />{g}
            </button>
          ))}
        </div>

        <div ref={isMobile ? favRef : undefined} className="flex items-center justify-center gap-2 px-3 py-1 shrink-0">
          {favGroups.map((_g, i) => {
            const favTimerRef = favTimerRefs[i]
            const favLong = favLongs[i]
            const favDown = () => { favLong.current = false; favTimerRef.current = setTimeout(() => { favLong.current = true }, LONG_PRESS_MS) }
            const favUp = () => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } }
            const favCancel = () => clearTimeout(favTimerRef.current)
            return (
              <button key={i} ref={i === 1 ? (isMobile ? favMidRef : undefined) : undefined}
                onClick={() => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } favLong.current = false }}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft')  { e.preventDefault(); (favRef.current?.children[(i - 1 + 3) % 3] as HTMLElement)?.focus() }
                  if (e.key === 'ArrowRight') { e.preventDefault(); (favRef.current?.children[(i + 1) % 3] as HTMLElement)?.focus() }
                  if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('fav', 'down') }
                  if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('fav', 'up') }
                }}
                onMouseDown={favDown} onMouseUp={favUp} onMouseLeave={favCancel}
                onTouchStart={favDown} onTouchEnd={favUp} onTouchMove={favCancel}
                className={`flex-none flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all select-none w-[25vw] h-[25vw] ${activeFav === i ? 'border-yellow-500 bg-yellow-800 scale-105' : 'border-white/15 bg-white/5'}`}
              >
                <span className="text-[14vw] leading-none" style={{ filter: i === 0 ? 'saturate(1.5) brightness(1.3)' : i === 1 ? 'hue-rotate(155deg) saturate(1.5)' : 'hue-rotate(60deg) saturate(1.8) brightness(0.9)' }}>⭐</span>
              </button>
            )
          })}
        </div>

        {(activeFav !== null || stripGroup !== null) && (
          <div ref={mobChArea} className="relative z-10 shrink-0">
            {stripChannels.length === 0
              ? <div className="text-center py-3 text-white/20 text-xs">Kanallara basılı tutarak bu favoriye ekle</div>
              : <div className="flex flex-col items-center gap-3 py-1">
                  <div className="flex items-center justify-center gap-2">
                    {visibleChannels.map(({ ch, idx }, btnIdx) => (
                      <button key={btnIdx} ref={isMobile ? chRefs[btnIdx] : undefined}
                        onClick={() => { if (!chLongRef.current) { setChannelOffset((idx - 1 + stripChannels.length) % stripChannels.length); setRadio(ch); chRef1.current?.focus() } }}
                        onKeyDown={e => {
                          if (e.key === 'ArrowRight') { e.preventDefault(); setChannelOffset(prev => (prev + 1) % stripChannels.length); chRef1.current?.focus() }
                          if (e.key === 'ArrowLeft')  { e.preventDefault(); setChannelOffset(prev => (prev - 1 + stripChannels.length) % stripChannels.length); chRef1.current?.focus() }
                          if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('channel', 'down') }
                          if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('channel', 'up') }
                        }}
                        onMouseDown={() => chDown(ch)} onMouseUp={chUp} onMouseLeave={chCancel}
                        onTouchStart={() => chDown(ch)} onTouchEnd={chUp} onTouchMove={chCancel}
                        onContextMenu={e => e.preventDefault()}
                        className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-[25vw] h-[25vw] justify-center overflow-hidden ${btnIdx === 1 ? (activeFav !== null ? 'border-yellow-500 bg-yellow-800 scale-105' : 'border-red-500 bg-red-800 scale-105') : 'border-white/15 bg-transparent'}`}
                      >
                        {ch.logo && !logoErrors.has(ch.tvgId)
                          ? <img src={ch.logo} alt={ch.name} className="w-[55%] h-[55%] object-contain rounded-lg pointer-events-none select-none" draggable={false} style={{ WebkitTouchCallout: 'none' }} onError={() => setLogoErrors(prev => new Set([...prev, ch.tvgId]))} />
                          : <span className="text-2xl">📻</span>
                        }
                        <MarqueeText text={ch.name} className="text-[2.8vw] text-white text-center leading-tight" />
                      </button>
                    ))}
                  </div>
                  <div className="text-lg font-bold text-white text-center truncate mb-8 w-[calc(3*4rem+2*0.5rem)] sm:w-[calc(3*5rem+2*0.5rem)]">{displayName}</div>
                </div>
            }
          </div>
        )}
      </div>

      {/* ── YATAY LAYOUT (md+) ── */}
      <div className="relative z-10 hidden sm:grid grid-cols-2 flex-1 min-h-0">

        {/* SOL: Grup + Fav + Kanal */}
        <div className="flex flex-col justify-center items-center gap-3 py-10 px-10 border-r border-white/10">

          <div ref={dskGroupArea} className="grid grid-cols-3 gap-2 w-full">
            {visibleGroups.map((g, btnIdx) => (
              <button key={btnIdx} ref={!isMobile ? grpRefs[btnIdx] : undefined}
                onClick={() => { setStripGroup(g); setActiveFav(null) }}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); setGroupOffset(prev => (prev + 1) % groupNames.length); grpRef1.current?.focus() }
                  if (e.key === 'ArrowLeft')  { e.preventDefault(); setGroupOffset(prev => (prev - 1 + groupNames.length) % groupNames.length); grpRef1.current?.focus() }
                  if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('group', 'down') }
                  if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('group', 'up') }
                }}
                className={`w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all select-none text-center border ${stripGroup === g ? 'border-red-500 bg-red-800 text-white scale-105' : 'border-white/15 bg-transparent text-white'}`}
              >
                <GroupIcon group={g} />{g}
              </button>
            ))}
          </div>

          <div ref={!isMobile ? favRef : undefined} className="grid grid-cols-3 gap-2 w-full">
            {favGroups.map((_g, i) => {
              const favTimerRef = favTimerRefs[i]
              const favLong = favLongs[i]
              const favDown = () => { favLong.current = false; favTimerRef.current = setTimeout(() => { favLong.current = true }, LONG_PRESS_MS) }
              const favUp = () => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } }
              const favCancel = () => clearTimeout(favTimerRef.current)
              return (
                <button key={i} ref={i === 1 ? (!isMobile ? favMidRef : undefined) : undefined}
                  onClick={() => { clearTimeout(favTimerRef.current); if (!favLong.current) { setActiveFav(prev => prev === i ? null : i); setStripGroup(null) } favLong.current = false }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('fav', 'down') }
                    if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('fav', 'up') }
                    if (e.key === 'ArrowLeft')  { e.preventDefault(); (favRef.current?.children[(i - 1 + 3) % 3] as HTMLElement)?.focus() }
                    if (e.key === 'ArrowRight') { e.preventDefault(); (favRef.current?.children[(i + 1) % 3] as HTMLElement)?.focus() }
                  }}
                  onMouseDown={favDown} onMouseUp={favUp} onMouseLeave={favCancel}
                  onTouchStart={favDown} onTouchEnd={favUp} onTouchMove={favCancel}
                  className={`w-full aspect-square flex flex-col items-center justify-center rounded-xl border transition-all select-none ${activeFav === i ? 'border-yellow-500 bg-yellow-800 scale-105' : 'border-white/15 bg-white/5'}`}
                >
                  <span className="text-4xl leading-none" style={{ filter: i === 0 ? 'saturate(1.5) brightness(1.3)' : i === 1 ? 'hue-rotate(155deg) saturate(1.5)' : 'hue-rotate(60deg) saturate(1.8) brightness(0.9)' }}>⭐</span>
                </button>
              )
            })}
          </div>

          {(activeFav !== null || stripGroup !== null) && (
            <div className="w-full">
              {stripChannels.length === 0
                ? <div className="text-center py-3 text-white/20 text-xs">Kanallara basılı tutarak bu favoriye ekle</div>
                : <div ref={dskChArea} className="grid grid-cols-3 gap-2 w-full">
                    {visibleChannels.map(({ ch, idx }, btnIdx) => (
                      <button key={btnIdx} ref={!isMobile ? chRefs[btnIdx] : undefined}
                        onClick={() => { if (!chLongRef.current) { setChannelOffset((idx - 1 + stripChannels.length) % stripChannels.length); setRadio(ch); chRef1.current?.focus() } }}
                        onKeyDown={e => {
                          if (e.key === 'ArrowRight') { e.preventDefault(); setChannelOffset(prev => (prev + 1) % stripChannels.length); chRef1.current?.focus() }
                          if (e.key === 'ArrowLeft')  { e.preventDefault(); setChannelOffset(prev => (prev - 1 + stripChannels.length) % stripChannels.length); chRef1.current?.focus() }
                          if (e.key === 'ArrowDown')  { e.preventDefault(); navigate('channel', 'down') }
                          if (e.key === 'ArrowUp')    { e.preventDefault(); navigate('channel', 'up') }
                        }}
                        onMouseDown={() => chDown(ch)} onMouseUp={chUp} onMouseLeave={chCancel}
                        onTouchStart={() => chDown(ch)} onTouchEnd={chUp} onTouchMove={chCancel}
                        onContextMenu={e => e.preventDefault()}
                        className={`w-full aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-xl border transition-all select-none overflow-hidden ${btnIdx === 1 ? (activeFav !== null ? 'border-yellow-500 bg-yellow-800 scale-105' : 'border-red-500 bg-red-800 scale-105') : 'border-white/15 bg-transparent'}`}
                      >
                        {ch.logo && !logoErrors.has(ch.tvgId)
                          ? <img src={ch.logo} alt={ch.name} className="w-[55%] aspect-square object-contain rounded-lg pointer-events-none" onError={() => setLogoErrors(prev => new Set([...prev, ch.tvgId]))} />
                          : <span className="text-2xl">📻</span>
                        }
                        <MarqueeText text={ch.name} className="text-[10px] text-white text-center leading-tight" />
                      </button>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>

        {/* SAĞ: Player + Şarkı + Radyo adı */}
        <div className="min-h-0 flex flex-col justify-center px-8 py-8">
          <div ref={dskPlayerArea} className="flex-none relative">
            {activeRadio && !isMobile
              ? <RadioPlayer
                  channel={activeRadio}
                  onPrev={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx - 1 + stripChannels.length) % stripChannels.length]) : undefined}
                  onNext={stripChannels.length > 1 ? () => setRadio(stripChannels[(currentStripIdx + 1) % stripChannels.length]) : undefined}
                  playBtnRef={playBtnRef}
                  onSongChange={handleSongChange}
                  onProgramChange={setProgram}
                  onPlayKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); navigate('player', 'down') }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); navigate('player', 'up') }
                  }}
                />
              : !activeRadio
                ? <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <div className="text-5xl opacity-20">📻</div>
                    <div className="text-white/25 text-sm font-medium">Radyo seçilmedi</div>
                  </div>
                : null
            }
          </div>

          <div className="shrink-0 text-center py-4 min-h-[70px] flex flex-col justify-center">
            {song && (song.title || song.artist) ? (
              <>
                {song.title && <MarqueeText text={song.title} className="text-[clamp(1.25rem,2.5vw,3rem)] font-bold text-white leading-tight drop-shadow-lg" />}
                {song.artist && <div className="text-[clamp(0.875rem,1.5vw,1.75rem)] text-white/60 mt-2 font-medium">{song.artist}</div>}
                {(song.duration ?? 0) > 0 && (
                  <div className="mt-3 h-1 bg-white/15 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-pink-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((song.progress ?? 0) / (song.duration ?? 1)) * 100)}%` }} />
                  </div>
                )}
              </>
            ) : program ? (
              <>
                <MarqueeText text={program.title} className="text-[clamp(1.25rem,2.5vw,3rem)] font-bold text-white leading-tight drop-shadow-lg" />
                {program.desc && <div className="text-[clamp(0.875rem,1.5vw,1.75rem)] text-white/60 mt-2 font-medium line-clamp-2">{program.desc}</div>}
              </>
            ) : null}
          </div>

          {(activeFav !== null || stripGroup !== null) && stripChannels.length > 0 && (
            <div className="shrink-0 text-center pb-2">
              <MarqueeText text={displayName} className="text-[clamp(1.5rem,3vw,4rem)] font-bold text-white drop-shadow-lg" />
            </div>
          )}
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
                onClick={() => { const err = removeFromGroup(activeFav, removeConfirm.tvgId); setRemoveConfirm(null); if (err) showToast(err) }}
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
