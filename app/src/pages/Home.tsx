import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const ITEMS = [
  { emoji: '📺', label: 'TV',    path: '/tv'      },
  { emoji: '📻', label: 'Radyo', path: '/radyo'   },
  { emoji: '🎵', label: 'Müzik', path: '/muzik'   },
  { emoji: '🎬', label: 'Film',  path: '/filmler' },
]

export default function Home() {
  const navigate   = useNavigate()
  const [focus, setFocus] = useState(0)
  const btnRefs    = useRef<(HTMLButtonElement | null)[]>([])

  // Sayfa açılınca ilk butona focus ver (TV remote için kritik)
  useEffect(() => {
    btnRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 37 || e.keyCode === 38) { // sol / yukarı
        setFocus(f => { const n = (f - 1 + ITEMS.length) % ITEMS.length; btnRefs.current[n]?.focus(); return n })
      } else if (e.keyCode === 39 || e.keyCode === 40) { // sağ / aşağı
        setFocus(f => { const n = (f + 1) % ITEMS.length; btnRefs.current[n]?.focus(); return n })
      } else if (e.keyCode === 13 || e.keyCode === 23) { // Enter / OK / DPAD_CENTER
        navigate(ITEMS[focus].path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a] select-none px-4">
      <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-8">
        {ITEMS.map((item, i) => (
          <button
            key={i}
            ref={el => { btnRefs.current[i] = el }}
            onClick={() => navigate(item.path)}
            onFocus={() => setFocus(i)}
            className={`flex items-center justify-center w-[40vw] h-[40vw] sm:w-[18vw] sm:h-[18vw] rounded-3xl border-2 transition-all duration-200 outline-none ${
              focus === i
                ? 'border-red-500 bg-red-600/20 scale-110 shadow-2xl shadow-red-900/50'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-[22vw] sm:text-[10vw] leading-none">{item.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
