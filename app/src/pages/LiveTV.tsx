import { useStore } from '../store/useStore'
import ChannelList from '../components/tv/ChannelList'
import Player      from '../components/tv/Player'
import EpgPanel    from '../components/tv/EpgPanel'

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const groups = [...new Set(channels.map(c => c.group))].filter(Boolean)

  return (
    <div className="flex h-[calc(100svh-48px)]">
      {/* Sol: Kanal listesi */}
      <div className="flex flex-col w-64 bg-[#1a1a1a] border-r border-white/10 shrink-0">
        {/* Grup seçici */}
        <div className="flex overflow-x-auto gap-1 p-2 border-b border-white/10">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-3 py-1 rounded text-xs whitespace-nowrap shrink-0 ${
                channelGroup === g ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <ChannelList
          channels={channels.filter(c => c.group === channelGroup)}
          active={activeChannel}
          onSelect={setChannel}
        />
      </div>

      {/* Orta: Player */}
      <div className="flex flex-col flex-1 min-w-0">
        {activeChannel && <Player channel={activeChannel} />}
      </div>

      {/* Sağ: EPG */}
      <div className="w-72 bg-[#1a1a1a] border-l border-white/10 shrink-0 overflow-y-auto">
        {activeChannel && <EpgPanel channelId={activeChannel.tvgId} />}
      </div>
    </div>
  )
}
