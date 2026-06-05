import { useEffect, useState } from 'react'

interface Props {
  groups:   string[]
  active:   string
  onSelect: (g: string) => void
  visible:  boolean
  focused:  boolean  // sadece grup odaklandığında vurgu yap
}

export default function GroupStrip({ groups, active, onSelect, visible, focused }: Props) {
  const [show, setShow] = useState(false)
  const n = groups.length

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  if (!show || n === 0) return null

  const activeIdx = groups.indexOf(active)

  // Soldan başlayarak görünecek gruplar: aktif + sonraki 4
  const visibleGroups = Array.from({ length: Math.min(5, n) }, (_, i) => {
    const idx = (activeIdx + i) % n
    return { name: groups[idx], idx, pos: i }
  })

  return (
    <div
      className={`absolute left-0 right-0 z-20 flex items-center gap-2 px-4 py-2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ bottom: 220 }}
    >
      {visibleGroups.map(({ name, idx, pos }) => {
        const isActive = idx === activeIdx
        const displayName = name.includes('__fav__') ? name.split('__fav__')[0].trim() : name
        const opacity = pos === 0 ? 1 : pos === 1 ? 0.7 : pos === 2 ? 0.5 : 0.3

        return (
          <button
            key={idx}
            onClick={() => onSelect(name)}
            style={{ opacity }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              isActive && focused
                ? 'bg-red-600 text-white border border-red-400'
                : isActive
                ? 'bg-white/20 text-white border border-white/40'
                : 'bg-black/40 text-white/70 border border-white/10'
            }`}
          >
            {displayName}
          </button>
        )
      })}

      {/* Sağ taraf soluk geçiş */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />
    </div>
  )
}
