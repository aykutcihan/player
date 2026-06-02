import type { Channel } from '../../lib/m3u'

interface Props {
  channels: Channel[]
  active:   Channel | null
  onSelect: (ch: Channel) => void
}

export default function ChannelList({ channels, active, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {channels.map((ch, i) => (
        <div
          key={i}
          onClick={() => onSelect(ch)}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-white/5 hover:bg-white/5 ${
            active?.tvgId === ch.tvgId ? 'bg-red-900/40' : ''
          }`}
        >
          {ch.logo
            ? <img src={ch.logo} alt="" className="w-8 h-8 object-contain rounded shrink-0 bg-white/10" />
            : <div className="w-8 h-8 rounded bg-white/10 shrink-0" />
          }
          <span className="text-sm text-white/80 truncate">{ch.name}</span>
        </div>
      ))}
      {channels.length === 0 && (
        <p className="text-white/30 text-xs p-4 text-center">Kanal yok</p>
      )}
    </div>
  )
}
