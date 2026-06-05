import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  groups:   string[]
  active:   string
  onSelect: (g: string) => void
  visible:  boolean
}

const ITEM_H   = 40   // her öğe yüksekliği px
const VISIBLE  = 5    // görünen öğe sayısı (tek sayı)
const HALF     = Math.floor(VISIBLE / 2)

export default function GroupWheel({ groups, active, onSelect, visible }: Props) {
  const [show,    setShow]    = useState(false)
  const [centerI, setCenterI] = useState(() => groups.indexOf(active))
  const isDrag   = useRef(false)
  const startY   = useRef(0)
  const startCI  = useRef(0)
  const dragDelta = useRef(0)
  const animRef  = useRef<number>(undefined)
  const n = groups.length

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  // Aktif grup değişince ortala
  useEffect(() => {
    const idx = groups.indexOf(active)
    if (idx >= 0) setCenterI(idx)
  }, [active, groups])

  const mod = (i: number) => ((i % n) + n) % n

  const onPointerDown = (e: React.PointerEvent) => {
    isDrag.current   = true
    startY.current   = e.clientY
    startCI.current  = centerI
    dragDelta.current = 0
    cancelAnimationFrame(animRef.current!)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrag.current) return
    const dy    = startY.current - e.clientY
    const steps = dy / ITEM_H
    dragDelta.current = steps
    const raw   = startCI.current + steps
    const clamp = mod(Math.round(raw))
    setCenterI(clamp)
  }

  const onPointerUp = useCallback(() => {
    if (!isDrag.current) return
    isDrag.current = false
    const snapped = mod(Math.round(startCI.current + dragDelta.current))
    setCenterI(snapped)
    onSelect(groups[snapped])
  }, [groups, n, onSelect])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const next = mod(centerI + (e.deltaY > 0 ? 1 : -1))
    setCenterI(next)
    onSelect(groups[next])
  }

  if (!show) return null

  // Görünecek öğe indexleri: center - HALF .. center + HALF
  const items = Array.from({ length: VISIBLE }, (_, i) => {
    const rel = i - HALF  // -2, -1, 0, 1, 2
    const idx = mod(centerI + rel)
    const dist = Math.abs(rel)
    const opacity = dist === 0 ? 1 : dist === 1 ? 0.68 : 0.42
    const scale   = dist === 0 ? 1 : dist === 1 ? 0.88 : 0.76
    const weight  = dist === 0 ? '700' : '400'
    const color   = dist === 0 ? '#fff' : '#ffffff'
    return { idx, rel, opacity, scale, weight, color }
  })

  return (
    <div
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-300 select-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="relative bg-black/85 rounded-r-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ width: 88, height: ITEM_H * VISIBLE, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Ortadaki vurgu şeridi */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-y border-red-500/50 bg-red-950/30"
          style={{ top: ITEM_H * HALF, height: ITEM_H }}
        />

        {/* Gradyan maskeler */}
        <div className="absolute inset-x-0 top-0 pointer-events-none z-20"
          style={{ height: ITEM_H * HALF, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
          style={{ height: ITEM_H * HALF, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />

        {/* Öğeler */}
        {items.map(({ idx, rel, opacity, scale, weight, color }) => (
          <div
            key={rel}
            onClick={() => { setCenterI(idx); onSelect(groups[idx]) }}
            className="absolute left-0 right-0 flex items-center justify-center transition-all duration-150"
            style={{
              height:    ITEM_H,
              top:       (rel + HALF) * ITEM_H,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <span style={{ fontWeight: weight, color, fontSize: 13, whiteSpace: 'nowrap' }}>
              {groups[idx] ? (groups[idx].includes('__fav__') ? groups[idx].split('__fav__')[0].trim() : groups[idx]) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
