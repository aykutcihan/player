import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props { channel: Channel; visible: boolean }

const BOX_W = 140  // tüm kutular aynı genişlik

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function ProgramBox({ prog, type, isOpen, onToggle }: {
  prog:     Programme | null
  type:     'past' | 'current' | 'future'
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

export default function NowBar({ channel, visible }: Props) {
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

      <div className="relative flex items-center pt-3 px-3 gap-2">
        {/* Logo */}
        <div className="shrink-0">
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-10 h-10 object-contain rounded bg-white/10" />
            : <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                <span className="text-white/40 text-[9px]">{channel.name.slice(0,4)}</span>
              </div>
          }
        </div>

        {/* Sağ ve sol gradient maskeler */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-2"
            style={{ height: 68, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', cursor: 'grab' }}
            onMouseDown={e => {
              pointerStart.current = { x: e.clientX, y: e.clientY, sl: scrollRef.current?.scrollLeft ?? 0, dragging: false }
            }}
            onMouseMove={e => {
              if (e.buttons !== 1) return
              const dx = e.clientX - pointerStart.current.x
              if (Math.abs(dx) > 5) {
                pointerStart.current.dragging = true
                if (scrollRef.current) scrollRef.current.scrollLeft = pointerStart.current.sl - dx
              }
            }}
            onMouseUp={() => { pointerStart.current.dragging = false }}
            onClickCapture={e => {
              if (pointerStart.current.dragging) {
                e.stopPropagation()
                pointerStart.current.dragging = false
              }
            }}
          >
            {items.map((item, i) => (
              <ProgramBox
                key={i}
                prog={item.prog}
                type={item.type}
                isOpen={openIdx === i}
                onToggle={() => setOpenIdx(idx => idx === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
