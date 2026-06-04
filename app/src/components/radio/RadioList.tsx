import { useMemo } from 'react'
import type { Channel } from '../../lib/m3u'

interface Props {
  channels: Channel[]
  active:   Channel | null
  onSelect: (ch: Channel) => void
}

export default function RadioList({ channels, active, onSelect }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of channels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [channels])

  return (
    <div>
      {[...groups.entries()].map(([group, chs]) => (
        <div key={group}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/30 bg-black/20 sticky top-0">
            {group}
          </div>
          {chs.map((ch, i) => (
            <div
              key={i}
              onClick={() => onSelect(ch)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-white/5 hover:bg-white/5 ${
                active?.url === ch.url ? 'bg-red-900/40' : ''
              }`}
            >
              {ch.logo
                ? <img src={ch.logo} alt="" className="w-8 h-8 object-contain rounded-full shrink-0 bg-white/10" />
                : <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-base">📻</div>
              }
              <div className="text-sm text-white/80 truncate">{ch.name}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
