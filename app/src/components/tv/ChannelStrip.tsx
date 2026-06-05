import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'

interface Props {
  channels: Channel[]
  active:   Channel | null
  focused?: Channel | null
  onSelect: (ch: Channel) => void
  visible:  boolean
}

export default function ChannelStrip({ channels, active, focused, onSelect, visible }: Props) {
  const scrollRef  = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  // Odaklanan kanala scroll et — focused veya visible değişince
  useEffect(() => {
    if (!scrollRef.current) return
    const target = focused ?? null
    if (!target) return
    const idx = channels.findIndex(c => c.tvgId === target.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [focused, channels, visible])

  if (!show) return null

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      <div className="bg-black/70 backdrop-blur-sm px-4 py-3">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {channels.map((ch, i) => {
            const isActive  = active?.tvgId === ch.tvgId  // aynı kanal tüm kopyalarda kırmızı
            const isFocused = focused?.url === ch.url      // sadece o tek kanal büyür
            return (
              <button
                key={i}
                onClick={() => onSelect(ch)}
                className={`flex-none w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all duration-200 ${
                  isFocused
                    ? 'border-white bg-white/20'
                    : isActive
                    ? 'border-red-500 bg-red-900/40'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
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
                  <span className="text-white/40 text-[9px] text-center leading-tight px-1 truncate w-full text-center">
                    {ch.name.slice(0, 6)}
                  </span>
                )}
                <span className="text-[8px] text-white/50 truncate w-14 text-center">{ch.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
