import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'

interface Props {
  channels: Channel[]
  active:   Channel | null
  onSelect: (ch: Channel) => void
  visible:  boolean
}

export default function ChannelStrip({ channels, active, onSelect, visible }: Props) {
  const scrollRef  = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  // Görünürlük — visible prop değişince fade in/out
  useEffect(() => {
    if (visible) {
      setShow(true)
    } else {
      const t = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(t)
    }
  }, [visible])

  // Aktif kanala scroll et
  useEffect(() => {
    if (!active || !scrollRef.current) return
    const idx = channels.findIndex(c => c.tvgId === active.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [active, channels])

  if (!show) return null

  return (
    <div
      className={`absolute bottom-[72px] left-0 right-0 z-20 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Gradient üst kenar */}
      <div className="h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Logo şeridi */}
      <div className="bg-black/70 backdrop-blur-sm px-4 py-3">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {channels.map((ch, i) => (
            <button
              key={i}
              onClick={() => onSelect(ch)}
              className={`flex-none w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all ${
                active?.tvgId === ch.tvgId
                  ? 'border-red-500 bg-red-900/40 scale-110'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              {ch.logo ? (
                <img
                  src={ch.logo}
                  alt={ch.name}
                  className="w-10 h-10 object-contain rounded"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                  <span className="text-white/40 text-[10px] text-center leading-tight px-1 truncate w-full text-center">
                    {ch.name.slice(0, 6)}
                  </span>
                </div>
              )}
              <span className="text-[9px] text-white/50 truncate w-14 text-center">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
