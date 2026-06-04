import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, isDvrStream, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props { channel: Channel; visible: boolean; onSeekTo?: (isoTime: string) => void; onLogoClick?: () => void }

const BOX_W = 140  // tüm kutular aynı genişlik

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function ProgramBox({ prog, type, isOpen, onToggle, isDvr }: {
  prog:     Programme | null
  type:     'past' | 'current' | 'future'
  isDvr?:  boolean
  isOpen:   boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [isOpen, onToggle])

  const bg = type === 'current'
    ? 'bg-red-900/50 border-red-500/60'
    : type === 'past'
    ? 'bg-slate-800/60 border-slate-600/30 hover:bg-slate-700/60'
    : 'bg-indigo-950/50 border-indigo-700/30 hover:bg-indigo-900/50'

  const titleColor = type === 'current' ? 'text-white'
    : type === 'past' ? 'text-slate-300' : 'text-indigo-200'

  return (
    <div className="relative shrink-0" style={{ width: BOX_W, height: 60 }}>
      <div
        className={`absolute inset-0 rounded-lg border ${bg} flex flex-col justify-center px-3 transition-colors ${
          prog ? 'cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => prog && onToggle()}
      >
        {type === 'current' && (
          <div className="text-[9px] text-red-400 font-semibold mb-0.5">▶ ŞU AN</div>
        )}
        {type === 'past' && isDvr && (
          <div className="text-[9px] text-green-400 mb-0.5">⏪ geri sar</div>
        )}
        <div className={`text-xs font-medium leading-tight line-clamp-2 ${titleColor}`}>
          {prog?.title ?? ''}
        </div>
        <div className="text-[9px] text-white/40 mt-0.5">
          {prog ? `${fmtTime(prog.start)}–${fmtTime(prog.stop)}` : ''}
        </div>
      </div>

      {isOpen && prog && (
        <div
          ref={ref}
          className="absolute bottom-full left-0 mb-2 w-72 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl"
          style={{ zIndex: 9999 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="text-sm font-semibold text-white mb-1">{prog.title}</div>
          <div className="text-xs text-white/50 mb-2">{fmtTime(prog.start)} – {fmtTime(prog.stop)}</div>
          {prog.desc
            ? <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">{prog.desc}</div>
            : <div className="text-xs text-white/25 italic border-t border-white/10 pt-2">Açıklama mevcut değil</div>
          }
          {prog.category && <div className="text-[10px] text-white/25 mt-2">{prog.category}</div>}
        </div>
      )}
    </div>
  )
}

export default function NowBar({ channel, visible, onSeekTo, onLogoClick }: Props) {
  const [items,   setItems]   = useState<{ prog: Programme; type: 'past'|'current'|'future' }[]>([])
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [show,    setShow]    = useState(false)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const pointerStart = useRef({ x: 0, y: 0, sl: 0, dragging: false })
  const currentIdxRef = useRef(0)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    setItems([]); setOpenIdx(null)
    if (!channel.tvgId) return
    fetchEpg(channel.tvgId).then(all => {
      const past     = pastProgrammes(all, 20).reverse()
      const current  = currentProgramme(all)
      const upcoming = upcomingProgrammes(all, 20)
      const list = [
        ...past.map(p => ({ prog: p, type: 'past'    as const })),
        ...(current ? [{ prog: current, type: 'current' as const }] : []),
        ...upcoming.map(p => ({ prog: p, type: 'future'  as const })),
      ]
      currentIdxRef.current = past.length
      setItems(list)
    })
  }, [channel.tvgId])

  // Current kutuyu görünüme getir — show=true olunca
  useEffect(() => {
    if (!show || items.length === 0 || !scrollRef.current) return
    const t = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = currentIdxRef.current * BOX_W
      }
    }, 50)
    return () => clearTimeout(t)
  }, [show, items])


  if (!show) return null

  return (
    <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-center pt-3 px-3 gap-2 group/bar">
        {/* Logo — tıklanabilir, hover'da büyür ve yer açar */}
        <div
          className="shrink-0 cursor-pointer group relative transition-all duration-200 w-10 hover:w-20"
          onClick={onLogoClick}
          style={{ height: 40 }}
        >
          {channel.logo
            ? <img src={channel.logo} alt=""
                className="absolute top-0 left-0 w-10 h-10 object-contain rounded bg-white/10 transition-all duration-200 group-hover:w-20 group-hover:h-20 group-hover:-top-5 group-hover:drop-shadow-lg" />
            : <div className="absolute top-0 left-0 w-10 h-10 rounded bg-white/10 flex items-center justify-center transition-all duration-200 group-hover:w-20 group-hover:h-20 group-hover:-top-5">
                <span className="text-white/40 text-[9px] group-hover:text-[13px]">{channel.name.slice(0,4)}</span>
              </div>
          }
          {/* Hover ipucu — logodan çıkıyor gibi */}
          <div
            className="absolute left-0 top-[44px] pointer-events-none whitespace-nowrap"
            style={{
              opacity: 0,
              transform: 'scale(0.4) translateY(-8px)',
              transformOrigin: 'top left',
              transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            ref={el => {
              if (el) {
                el.closest('.group')?.addEventListener('mouseenter', () => {
                  el.style.opacity = '1'
                  el.style.transform = 'scale(1) translateY(0)'
                })
                el.closest('.group')?.addEventListener('mouseleave', () => {
                  el.style.opacity = '0'
                  el.style.transform = 'scale(0.4) translateY(-8px)'
                })
              }
            }}
          >
            <div className="px-3 py-1.5 rounded-xl border border-white/25 bg-black/70 backdrop-blur-sm"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}
            >
              <span className="text-white/90 text-sm italic">detay için tıkla</span>
            </div>
          </div>
        </div>

        {/* Sağ ve sol gradient maskeler */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-2"
            style={{ height: 68, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', cursor: 'grab' }}
            onWheel={e => {
              e.preventDefault()
              if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY + e.deltaX
            }}
          >
            {items.map((item, i) => (
              <ProgramBox
                key={i}
                prog={item.prog}
                type={item.type}
                isOpen={openIdx === i}
                onToggle={() => {
                  if (item.type === 'past' && isDvrStream(channel.url) && onSeekTo) {
                    onSeekTo(item.prog.start)
                  } else {
                    setOpenIdx(idx => idx === i ? null : i)
                  }
                }}
                isDvr={isDvrStream(channel.url)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
