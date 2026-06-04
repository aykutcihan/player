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
    <div className="flex flex-col h-[calc(100svh-48px)]">

      {/* Üst grup sekmeleri */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border-b border-white/10 overflow-x-auto shrink-0 scrollbar-none">
        {groupNames.map(g => (
          <button
            key={g}
            onClick={() => { setActiveGroup(g); setRadio(null) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeGroup === g
                ? 'bg-red-600 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Alt alan */}
      <div className="flex flex-1 min-h-0">

        {/* Sol: radyo listesi */}
        {activeGroup && (
          <div className="w-56 shrink-0 bg-[#1a1a1a] border-r border-white/10 overflow-y-auto">
            {visibleChannels.map((ch, i) => (
              <div
                key={i}
                onClick={() => setRadio(ch)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-white/5 hover:bg-white/5 transition-colors ${
                  activeRadio?.url === ch.url ? 'bg-red-900/40' : ''
                }`}
              >
                {ch.logo
                  ? <img src={ch.logo} alt="" className="w-8 h-8 object-contain rounded-lg shrink-0 bg-white/10" />
                  : <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">📻</div>
                }
                <div className="text-sm text-white/80 truncate">{ch.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sağ: player veya boş */}
        <div className="flex-1 flex items-center justify-center bg-[#111]">
          {activeRadio
            ? <RadioPlayer channel={activeRadio} />
            : <p className="text-white/30 text-sm">
                {activeGroup ? 'Soldan radyo seçin' : 'Üstten grup seçin'}
              </p>
          }
        </div>

      </div>
    </div>
  )
}
