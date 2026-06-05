import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ITEMS = [
  { emoji: '📺', label: 'TV',    path: '/tv'      },
  { emoji: '📻', label: 'Radyo', path: '/radyo'   },
  { emoji: '🎵', label: 'Müzik', path: '/muzik'   },
  { emoji: '🎬', label: 'Film',  path: '/filmler' },
]

export default function Home() {
  const navigate  = useNavigate()
  const [focus, setFocus] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 37 || e.keyCode === 38) { // sol / yukarı
        setFocus(f => (f - 1 + ITEMS.length) % ITEMS.length)
      } else if (e.keyCode === 39 || e.keyCode === 40) { // sağ / aşağı
        setFocus(f => (f + 1) % ITEMS.length)
      } else if (e.keyCode === 13) { // Enter / OK
        navigate(ITEMS[focus].path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, navigate])

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] select-none">

      {/* Başlık */}
      <div className="mb-16 text-center">
        <div className="text-white/20 text-2xl tracking-widest uppercase mb-2">Hoş Geldiniz</div>
        <div className="text-white/60 text-base">Kategori seçin</div>
      </div>

      {/* Ana menü */}
      <div className="flex gap-8">
        {ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            onFocus={() => setFocus(i)}
            className={`flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border-2 transition-all duration-200 outline-none ${
              focus === i
                ? 'border-red-500 bg-red-600/20 scale-110 shadow-2xl shadow-red-900/50'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-7xl leading-none">{item.emoji}</span>
            <span className={`text-xl font-semibold transition-colors ${
              focus === i ? 'text-white' : 'text-white/50'
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Alt bilgi */}
      <div className="mt-16 text-white/20 text-sm">
        ← → ile seç &nbsp;·&nbsp; OK ile gir
      </div>
      <div style={{position:'fixed',bottom:4,right:4,color:'yellow',fontSize:12,background:'#000',padding:4}}>
        iW:{window.innerWidth} iH:{window.innerHeight} sW:{window.screen.width} sH:{window.screen.height}
      </div>
    </div>
  )
}
