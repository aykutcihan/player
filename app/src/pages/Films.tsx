import { useState } from 'react'
import { useStore } from '../store/useStore'
import VideoPlayer from '../components/VideoPlayer'

export default function Films() {
  const { films } = useStore()
  const [active, setActive] = useState<typeof films[0] | null>(null)

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Film listesi */}
      <div className="w-80 bg-[#1a1a1a] border-r border-white/10 shrink-0 overflow-y-auto">
        {films.map((f, i) => (
          <div
            key={i}
            onClick={() => setActive(f)}
            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-white/5 hover:bg-white/5 ${
              active?.url === f.url ? 'bg-red-900/30' : ''
            }`}
          >
            {f.logo && (
              <img src={f.logo} alt="" className="w-16 h-10 object-cover rounded shrink-0 bg-white/10" />
            )}
            <span className="text-sm text-white/80 line-clamp-2">{f.title}</span>
          </div>
        ))}
        {films.length === 0 && (
          <p className="text-white/30 text-sm p-4 text-center">Film listesi yükleniyor...</p>
        )}
      </div>

      {/* Player */}
      <div className="flex-1 bg-black flex items-center justify-center">
        {active
          ? <VideoPlayer url={active.url} title={active.title} />
          : <p className="text-white/30">Film seçin</p>
        }
      </div>
    </div>
  )
}
