import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, isDvrStream, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props {
  channel:   Channel
  onClose:   () => void
  onSeekTo?: (isoTime: string) => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function EpgOverlay({ channel, onClose, onSeekTo }: Props) {
  const [progs,      setProgs]      = useState<{ p: Programme; type: 'past'|'current'|'future' }[]>([])
  const [selected,   setSelected]   = useState<Programme | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const currentRef  = useRef<HTMLDivElement>(null)
  const focusedRef  = useRef<HTMLDivElement>(null)
  const dvr = isDvrStream(channel.url)

  useEffect(() => {
    fetchEpg(channel.tvgId).then(all => {
      const past     = pastProgrammes(all, 20).reverse()
      const current  = currentProgramme(all)
      const upcoming = upcomingProgrammes(all, 20)
      setProgs([
        ...past.map(p    => ({ p, type: 'past'    as const })),
        ...(current ? [{ p: current, type: 'current' as const }] : []),
        ...upcoming.map(p => ({ p, type: 'future'  as const })),
      ])
    })
  }, [channel.tvgId])

  // Şu anki programa scroll et
  useEffect(() => {
    setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' }), 100)
  }, [progs])

  // Odaklanan programa scroll et
  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIdx])

  // Şu anki programa odaklan (programlar yüklenince)
  useEffect(() => {
    const currentIdx = progs.findIndex(({ type }) => type === 'current')
    if (currentIdx >= 0) setFocusedIdx(currentIdx)
  }, [progs])

  // Klavye navigasyonu
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.keyCode === 40) { // Aşağı
        setFocusedIdx(i => Math.min(i + 1, progs.length - 1))
      } else if (e.keyCode === 38) { // Yukarı
        setFocusedIdx(i => Math.max(i - 1, 0))
      } else if (e.keyCode === 13) { // OK → detay göster/gizle
        const item = progs[focusedIdx]
        if (item) handleClick(item.p, item.type)
      } else if (e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 4 || e.keyCode === 37) {
        onClose() // ESC / Back / Sol → kapat
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, progs, focusedIdx])

  function handleClick(p: Programme, type: string) {
    if (type === 'past' && dvr && onSeekTo) {
      onSeekTo(p.start)
      onClose()
    } else {
      setSelected(s => s?.start === p.start ? null : p)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex" onClick={onClose}>
      {/* Yarı saydam arka plan */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col w-96 h-full bg-[#0f0f0f] border-r border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-8 h-8 object-contain rounded bg-white/10" />
            : <div className="w-8 h-8 rounded bg-white/10" />
          }
          <span className="text-white font-medium text-sm flex-1">{channel.name}</span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* Program listesi */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {progs.map(({ p, type }, i) => {
            const isCurrent = type === 'current'
            const isPast    = type === 'past'
            const isSelected = selected?.start === p.start

            return (
              <div key={i}
                ref={el => {
                  if (isCurrent && currentRef) (currentRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                  if (i === focusedIdx && focusedRef) (focusedRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                }}
              >
                <div
                  className={`flex gap-3 px-4 py-3 cursor-pointer border-b border-white/5 transition-colors ${
                    i === focusedIdx
                      ? 'bg-white/15 outline outline-1 outline-white/40'
                      : isCurrent
                      ? 'bg-red-900/30 border-l-2 border-l-red-500'
                      : isPast
                      ? 'hover:bg-white/5 opacity-70'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => handleClick(p, type)}
                >
                  {/* Saat */}
                  <div className="shrink-0 w-10 text-right">
                    <div className={`text-xs ${isCurrent ? 'text-red-400' : 'text-white/40'}`}>
                      {fmtTime(p.start)}
                    </div>
                  </div>

                  {/* Başlık + etiket */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isCurrent && <span className="text-[9px] text-red-400 font-bold">▶</span>}
                      {isPast && dvr && <span className="text-[10px] text-green-400">⏪</span>}
                      <span className={`text-sm font-medium truncate ${
                        isCurrent ? 'text-white' : isPast ? 'text-slate-300' : 'text-white/80'
                      }`}>
                        {p.title}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {fmtTime(p.start)} – {fmtTime(p.stop)}
                    </div>

                    {/* Detay */}
                    {isSelected && (
                      <div className="mt-2 text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">
                        {p.desc || <span className="italic text-white/25">Açıklama yok</span>}
                        {p.category && <div className="text-[10px] text-white/25 mt-1">{p.category}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Alt kapatma butonu */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
