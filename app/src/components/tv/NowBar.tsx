import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props {
  channel: Channel
  visible: boolean
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function ProgramCard({
  prog, isCurrent, onClick
}: { prog: Programme; isCurrent: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none flex flex-col justify-center px-3 py-1.5 rounded-lg transition-all text-left ${
        isCurrent
          ? 'bg-red-900/50 border border-red-500/50 min-w-[160px]'
          : 'bg-white/5 border border-white/10 hover:bg-white/10 min-w-[130px]'
      }`}
      style={{ height: 56 }}
    >
      {isCurrent && (
        <div className="text-[9px] text-red-400 font-semibold mb-0.5">▶ ŞU AN</div>
      )}
      <div className={`font-medium leading-tight truncate max-w-[150px] ${
        isCurrent ? 'text-white text-xs' : 'text-white/60 text-[11px]'
      }`}>
        {prog.title}
      </div>
      <div className="text-[9px] text-white/40 mt-0.5">
        {fmtTime(prog.start)} – {fmtTime(prog.stop)}
      </div>
    </button>
  )
}

function ProgramDetail({ prog, onClose }: { prog: Programme; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref}
      className="absolute top-full left-0 mt-2 w-80 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl z-30">
      <div className="text-base font-semibold text-white mb-1">{prog.title}</div>
      <div className="text-xs text-white/50 mb-3">{fmtTime(prog.start)} – {fmtTime(prog.stop)}</div>
      {prog.desc
        ? <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-3">{prog.desc}</div>
        : <div className="text-xs text-white/25 italic border-t border-white/10 pt-3">Açıklama yok</div>
      }
      {prog.category && <div className="text-[10px] text-white/25 mt-2">{prog.category}</div>}
    </div>
  )
}

export default function NowBar({ channel, visible }: Props) {
  const [progs,   setProgs]   = useState<Programme[]>([])
  const [current, setCurrent] = useState<Programme | null>(null)
  const [detail,  setDetail]  = useState<Programme | null>(null)
  const [show,    setShow]    = useState(false)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLButtonElement>(null)
  const isDrag     = useRef(false)
  const startX     = useRef(0)
  const startSL    = useRef(0)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    if (!channel.tvgId) return
    setProgs([])
    setCurrent(null)
    fetchEpg(channel.tvgId).then(all => {
      const past     = pastProgrammes(all, 10)
      const cur      = currentProgramme(all)
      const upcoming = upcomingProgrammes(all, 10)
      const combined = [...past.reverse(), ...(cur ? [cur] : []), ...upcoming]
      setProgs(combined)
      setCurrent(cur)
    })
  }, [channel.tvgId])

  // Yüklenince "şu an"a scroll et
  useEffect(() => {
    if (!current || !scrollRef.current) return
    setTimeout(() => {
      const el = scrollRef.current?.querySelector('[data-current="true"]') as HTMLElement
      if (el && scrollRef.current) {
        scrollRef.current.scrollLeft = el.offsetLeft - 8
      }
    }, 50)
  }, [current, progs])

  const onPointerDown = (e: React.PointerEvent) => {
    isDrag.current = true
    startX.current = e.clientX
    startSL.current = scrollRef.current?.scrollLeft ?? 0
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrag.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = startSL.current - (e.clientX - startX.current)
  }
  const onPointerUp = () => { isDrag.current = false }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY * 0.8
  }

  if (!show) return null

  return (
    <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-center pt-3 px-3 gap-2">

        {/* Logo — sabit, üstte */}
        <div className="shrink-0 z-10">
          {channel.logo ? (
            <img src={channel.logo} alt={channel.name}
              className="w-10 h-10 object-contain rounded bg-white/10" />
          ) : (
            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
              <span className="text-white/50 text-[9px]">{channel.name.slice(0,4)}</span>
            </div>
          )}
        </div>

        {/* Soldan sağa kayan program şeridi */}
        <div className="relative flex-1 min-w-0">
          {/* Sol maske — logo arkasından çıkma efekti */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-10" />
          {/* Sağ maske */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent pointer-events-none z-10" />

          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', height: 64 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {progs.map((p, i) => {
              const isCur = current ? p.start === current.start : false
              return (
                <div key={i} className="relative" data-current={isCur ? 'true' : undefined}>
                  <ProgramCard
                    prog={p}
                    isCurrent={isCur}
                    onClick={() => setDetail(detail?.start === p.start ? null : p)}
                  />
                  {detail?.start === p.start && (
                    <ProgramDetail prog={p} onClose={() => setDetail(null)} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
