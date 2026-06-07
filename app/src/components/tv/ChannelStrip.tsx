import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'

const ITEM_W  = 64  // w-16  (px)
const ITEM_G  = 12  // gap-3 (px)
const STEP    = ITEM_W + ITEM_G  // 76px per kanal

interface Props {
  channels: Channel[]
  active:   Channel | null
  focused?: Channel | null
  onSelect: (ch: Channel) => void
  visible:  boolean
}

export default function ChannelStrip({ channels, active, focused, onSelect, visible }: Props) {
  const wrapRef      = useRef<HTMLDivElement>(null)   // overflow:hidden kap
  const [show,      setShow]      = useState(false)
  const [tx,        setTx]        = useState(0)        // translateX
  const [animate,   setAnimate]   = useState(false)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  // Focused kanal değişince translateX hesapla → tekerlek gibi ak
  useEffect(() => {
    const container = wrapRef.current
    if (!container) return
    const target = focused ?? active
    if (!target) return
    const idx = channels.findIndex(c => c.url === target.url)
    if (idx < 0) return

    const containerW   = container.offsetWidth
    const centerOffset = containerW / 2 - ITEM_W / 2
    const newTx        = centerOffset - idx * STEP

    setAnimate(!!focused)   // focused değişince smooth, ilk açılışta instant
    setTx(newTx)
  }, [focused, active, channels, show])

  if (!show) return null

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      <div className="bg-black/70 backdrop-blur-sm py-3 overflow-hidden" ref={wrapRef}>
        <div
          className="flex gap-3 pl-0"
          style={{
            transform:  `translateX(${tx}px)`,
            transition: animate ? 'transform 0.22s ease-out' : 'none',
            willChange: 'transform',
          }}
        >
          {channels.map((ch, i) => {
            const isActive  = active?.tvgId === ch.tvgId
            const isFocused = focused?.url  === ch.url
            return (
              <button
                key={i}
                onClick={() => onSelect(ch)}
                className={`flex-none w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all duration-200 ${
                  isFocused
                    ? 'border-white bg-white/20 scale-110'
                    : isActive
                    ? 'border-red-500 bg-red-900/40'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {ch.logo ? (
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    className="w-10 h-10 object-contain rounded"
                    onError={e => {
                      const t = e.target as HTMLImageElement
                      t.style.display = 'none'
                      t.nextElementSibling?.removeAttribute('hidden')
                    }}
                  />
                ) : null}
                <svg
                  style={{ display: ch.logo ? 'none' : undefined }}
                  viewBox="0 0 24 24"
                  className="w-8 h-8 text-white/20"
                  fill="currentColor"
                >
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                </svg>
                <span className="text-[8px] text-white/50 truncate w-14 text-center">{ch.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
