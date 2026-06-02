import type { Channel } from '../../lib/m3u'

interface Props {
  channels: Channel[]
  active:   Channel | null
  onSelect: (ch: Channel) => void
}

export default function RadioList({ channels, active, onSelect }: Props) {
  return (
    <div>
      {channels.map((ch, i) => (
        <div
          key={i}
          onClick={() => onSelect(ch)}
          className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-white/5 hover:bg-white/5 ${
            active?.url === ch.url ? 'bg-red-900/40' : ''
          }`}
        >
          {ch.logo
            ? <img src={ch.logo} alt="" className="w-10 h-10 object-contain rounded-full shrink-0 bg-white/10" />
            : <div className="w-10 h-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-lg">📻</div>
          }
          <div className="min-w-0">
            <div className="text-sm text-white/80 truncate">{ch.name}</div>
            <div className="text-xs text-white/40 truncate">{ch.group}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
