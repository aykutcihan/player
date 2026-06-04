import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import type { Channel } from '../lib/m3u'

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const groupNames = [...groups.keys()]
  const visibleChannels = activeGroup ? (groups.get(activeGroup) ?? []) : []

  return (
    <div className="flex h-[calc(100svh-48px)]">

      {/* Grup listesi */}
      <div className="w-44 shrink-0 bg-[#1a1a1a] border-r border-white/10 overflow-y-auto">
        {groupNames.map(g => (
          <div
            key={g}
            onClick={() => { setActiveGroup(g); setRadio(null) }}
            className={`px-4 py-3 cursor-pointer text-sm font-medium border-b border-white/5 transition-colors ${
              activeGroup === g
                ? 'bg-red-700 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {g}
          </div>
        ))}
      </div>

      {/* Kanal listesi */}
      {!activeRadio && (
        <div className="flex-1 overflow-y-auto bg-[#111]">
          {!activeGroup ? (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Soldan grup seçin
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
              {visibleChannels.map((ch, i) => (
                <div
                  key={i}
                  onClick={() => setRadio(ch)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  {ch.logo
                    ? <img src={ch.logo} alt="" className="w-16 h-16 object-contain rounded-xl bg-white/10" />
                    : <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl">📻</div>
                  }
                  <div className="text-xs text-white/70 text-center leading-tight truncate w-full text-center">{ch.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player */}
      {activeRadio && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#111]">
          <button
            onClick={() => setRadio(null)}
            className="absolute top-16 left-48 m-4 text-white/40 hover:text-white text-sm"
          >
            ← Geri
          </button>
          <RadioPlayer channel={activeRadio} />
        </div>
      )}

    </div>
  )
}
