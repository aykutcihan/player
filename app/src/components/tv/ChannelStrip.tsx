import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'

const ITEM_W = 64   // w-16
const ITEM_G = 12   // gap-3
const STEP   = ITEM_W + ITEM_G  // 76px

interface Props {
  channels: Channel[]
  active:   Channel | null
  focused?: Channel | null
  onSelect: (ch: Channel) => void
  visible:  boolean
}

export default function ChannelStrip({ channels, active, focused, onSelect, visible }: Props) {
  const wrapRef     = useRef<HTMLDivElement>(null)
  const virtualRef  = useRef<number | null>(null)  // tripled array'deki sanal idx
  const prevRealRef = useRef<number>(-1)
  const resetTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [show, setShow] = useState(false)
  const [tx,   setTx]   = useState(0)
  const [anim, setAnim] = useState(false)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    const container = wrapRef.current
    if (!container) return
    const n = channels.length
    if (n === 0) return

    const target = focused ?? active
    if (!target) return
    const realIdx = channels.findIndex(c => c.url === target.url)
    if (realIdx < 0) return

    const containerW = container.offsetWidth || window.innerWidth
    const center     = containerW / 2 - ITEM_W / 2

    // Animasyonsuz jump — ilk açılış veya grup değişimi
    const doJump = (vIdx: number) => {
      clearTimeout(resetTimer.current)
      virtualRef.current   = vIdx
      prevRealRef.current  = realIdx
      setAnim(false)
      setTx(center - vIdx * STEP)
    }

    // Animasyonlu adım — normal navigasyon
    const doStep = (vIdx: number, wrapped: boolean) => {
      clearTimeout(resetTimer.current)
      virtualRef.current   = vIdx
      prevRealRef.current  = realIdx
      setAnim(true)
      setTx(center - vIdx * STEP)
      // Wrap olduktan sonra animasyon bitince sessizce ortaya reset
      if (wrapped) {
        resetTimer.current = setTimeout(() => {
          const mid = n + realIdx
          virtualRef.current = mid
          setAnim(false)
          setTx(center - mid * STEP)
        }, 260)
      }
    }

    // İlk render veya focused=null (sadece active geldi)
    if (virtualRef.current === null || !focused) {
      doJump(n + realIdx)
      return
    }

    const prev = prevRealRef.current
    const vIdx = virtualRef.current

    const goingRight = realIdx === (prev + 1) % n
    const goingLeft  = realIdx === (prev - 1 + n) % n

    if (goingRight) {
      doStep(vIdx + 1, realIdx < prev)   // realIdx < prev → wrap oldu
    } else if (goingLeft) {
      doStep(vIdx - 1, realIdx > prev)   // realIdx > prev → wrap oldu
    } else {
      doJump(n + realIdx)                // adjacent değil → jump
    }
  }, [focused, active, channels, show])

  if (!show) return null

  const n       = channels.length
  const tripled = n > 0 ? [...channels, ...channels, ...channels] : channels

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      <div className="bg-black/70 backdrop-blur-sm py-3 overflow-hidden" ref={wrapRef}>
        <div
          className="flex gap-3"
          style={{
            transform:  `translateX(${tx}px)`,
            transition: anim ? 'transform 0.22s ease-out' : 'none',
            willChange: 'transform',
          }}
        >
          {tripled.map((ch, i) => {
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
