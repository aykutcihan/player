import { useEffect, useRef, useState } from 'react'

interface Props {
  groups:   string[]
  active:   string
  onSelect: (g: string) => void
  visible:  boolean
}

export default function GroupWheel({ groups, active, onSelect, visible }: Props) {
  const [show,   setShow]   = useState(false)
  const [isDrag, setIsDrag] = useState(false)
  const startY   = useRef(0)
  const startOff = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ITEM_H = 44

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  // Aktif gruba scroll et
  useEffect(() => {
    const idx = groups.indexOf(active)
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = idx * ITEM_H - ITEM_H * 2
    }
  }, [active, groups])

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDrag(true)
    startY.current   = e.clientY
    startOff.current = scrollRef.current?.scrollTop ?? 0
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrag || !scrollRef.current) return
    const delta = startY.current - e.clientY
    scrollRef.current.scrollTop = startOff.current + delta
  }

  const onPointerUp = () => setIsDrag(false)

  if (!show) return null

  return (
    <div
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-300 select-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="bg-black/90 rounded-r-xl overflow-hidden"
        style={{ minWidth: '80px' }}>

        {/* Gradient üst */}
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10 rounded-tr-xl" />
        {/* Gradient alt */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10 rounded-br-xl" />

        <div
          ref={scrollRef}
          className="overflow-y-auto cursor-grab active:cursor-grabbing"
          style={{
            height: ITEM_H * 5,
            scrollbarWidth: 'none',
            scrollBehavior: 'smooth',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Üst boşluk */}
          <div style={{ height: ITEM_H * 2 }} />

          {groups.map(g => {
            const isActive = g === active
            return (
              <div
                key={g}
                onClick={() => onSelect(g)}
                style={{ height: ITEM_H }}
                className={`flex items-center px-4 cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'border-l-2 border-red-500 bg-red-900/30'
                    : 'border-l-2 border-transparent hover:bg-white/5'
                }`}
              >
                <span className={`font-medium whitespace-nowrap text-sm ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}>
                  {g}
                </span>
              </div>
            )
          })}

          {/* Alt boşluk */}
          <div style={{ height: ITEM_H * 2 }} />
        </div>
      </div>
    </div>
  )
}
