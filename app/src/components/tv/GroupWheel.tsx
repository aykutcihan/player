import { useEffect, useRef, useState } from 'react'

interface Props {
  groups:   string[]
  active:   string
  onSelect: (g: string) => void
  visible:  boolean
}

export default function GroupWheel({ groups, active, onSelect, visible }: Props) {
  const [show,    setShow]    = useState(false)
  const [offset,  setOffset]  = useState(0)   // px cinsinden scroll offset
  const [isDrag,  setIsDrag]  = useState(false)
  const startY    = useRef(0)
  const startOff  = useRef(0)
  const ITEM_H    = 68   // her öğenin piksel yüksekliği

  // Görünürlük
  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  // Aktif grup değişince ortala
  useEffect(() => {
    const idx = groups.indexOf(active)
    if (idx >= 0) setOffset(idx * ITEM_H)
  }, [active, groups])

  // Sürükleme
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDrag(true)
    startY.current   = e.clientY
    startOff.current = offset
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrag) return
    const delta  = startY.current - e.clientY
    const newOff = Math.max(0, Math.min((groups.length - 1) * ITEM_H, startOff.current + delta))
    setOffset(newOff)
  }

  const onPointerUp = () => {
    setIsDrag(false)
    // En yakın öğeye snap
    const idx = Math.round(offset / ITEM_H)
    const snapped = Math.max(0, Math.min(groups.length - 1, idx))
    setOffset(snapped * ITEM_H)
    onSelect(groups[snapped])
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const idx = Math.round(offset / ITEM_H) + (e.deltaY > 0 ? 1 : -1)
    const clamped = Math.max(0, Math.min(groups.length - 1, idx))
    setOffset(clamped * ITEM_H)
    onSelect(groups[clamped])
  }

  if (!show) return null

  // Görünür 3 öğe (merkez + 1 üst + 1 alt)
  const centerIdx = Math.round(offset / ITEM_H)

  return (
    <div
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-300 select-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Sürükleme alanı */}
      <div
        className="relative flex flex-col items-center cursor-grab active:cursor-grabbing bg-black/90 rounded-r-xl"
        style={{ height: ITEM_H * 3, touchAction: 'none', minWidth: '52px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Gradient maskeler */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

        {/* Ortadaki aktif öğe vurgusu */}
        <div className="absolute left-0 right-0 pointer-events-none z-10"
          style={{ top: ITEM_H, height: ITEM_H }}>
          <div className="h-full border-y-2 border-red-500 bg-red-900/40" />
        </div>

        {/* Öğeler */}
        {[-1, 0, 1].map(rel => {
          const idx = centerIdx + rel
          if (idx < 0 || idx >= groups.length) {
            return <div key={rel} style={{ height: ITEM_H }} />
          }
          const g = groups[idx]
          return (
            <div
              key={rel}
              onClick={() => onSelect(g)}
              style={{ height: ITEM_H }}
              className={`w-full flex items-center justify-center px-2 transition-all duration-200 ${
                rel === 0 ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <span
                className={`font-semibold whitespace-nowrap ${
                  rel === 0 ? 'text-white text-sm' : 'text-white/70 text-xs'
                }`}
                style={{  }}
              >
                {g}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
