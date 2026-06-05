import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  groups:   string[]
  active:   string
  onSelect: (g: string) => void
  visible:  boolean
}

const ITEM_H  = 44
const VISIBLE = 3
const HALF    = Math.floor(VISIBLE / 2)

export default function GroupWheel({ groups, active, onSelect, visible }: Props) {
  const [show,    setShow]    = useState(false)
  const [centerI, setCenterI] = useState(() => Math.max(0, groups.indexOf(active)))
  const isDrag    = useRef(false)
  const startY    = useRef(0)
  const startCI   = useRef(0)
  const dragDelta = useRef(0)
  const animRef   = useRef<number>(undefined)
  const n = groups.length

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    const idx = groups.indexOf(active)
    if (idx >= 0) setCenterI(idx)
  }, [active, groups])

  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i))

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
    setCenterI(clamp(Math.round(startCI.current + steps)))
  }

  const onPointerUp = useCallback(() => {
    if (!isDrag.current) return
    isDrag.current = false
    const snapped = clamp(Math.round(startCI.current + dragDelta.current))
    setCenterI(snapped)
    onSelect(groups[snapped])
  }, [groups, n, onSelect])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const next = clamp(centerI + (e.deltaY > 0 ? 1 : -1))
    setCenterI(next)
    onSelect(groups[next])
  }

  if (!show) return null

  const items = Array.from({ length: VISIBLE }, (_, i) => {
    const rel = i - HALF
    const idx = centerI + rel
    const valid = idx >= 0 && idx < n
    const dist  = Math.abs(rel)
    const opacity = !valid ? 0 : dist === 0 ? 1 : 0.5
    const scale   = dist === 0 ? 1 : 0.85
    const weight  = dist === 0 ? '700' : '400'
    return { idx, rel, opacity, scale, weight, valid }
  })

  return (
    <div
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-300 select-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="relative bg-black/85 rounded-r-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ width: 96, height: ITEM_H * VISIBLE, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Ortadaki vurgu */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-y border-red-500/50 bg-red-950/30"
          style={{ top: ITEM_H * HALF, height: ITEM_H }}
        />

        {/* Öğeler */}
        {items.map(({ idx, rel, opacity, scale, weight, valid }) => (
          <div
            key={rel}
            onClick={() => { if (valid) { setCenterI(idx); onSelect(groups[idx]) } }}
            className="absolute left-0 right-0 flex items-center justify-center transition-all duration-150"
            style={{
              height:    ITEM_H,
              top:       (rel + HALF) * ITEM_H,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            {valid && (
              <span style={{ fontWeight: weight, color: '#fff', fontSize: 13, whiteSpace: 'nowrap' }}>
                {groups[idx].includes('__fav__') ? groups[idx].split('__fav__')[0].trim() : groups[idx]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
