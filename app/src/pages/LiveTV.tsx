import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import ChannelList  from '../components/tv/ChannelList'
import ChannelStrip from '../components/tv/ChannelStrip'
import Player       from '../components/tv/Player'
import EpgPanel     from '../components/tv/EpgPanel'
import type { VideoPlayerHandle } from '../components/VideoPlayer'
import type { Programme } from '../lib/epg'

const HIDE_DELAY = 3000 // 3 saniye hareketsizlikte gizle

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout>>()
  const [stripVisible, setStripVisible] = useState(false)
  const groups = [...new Set(channels.map(c => c.group))].filter(Boolean)

  const showStrip = useCallback(() => {
    setStripVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setStripVisible(false), HIDE_DELAY)
  }, [])

  function handleSelectPast(prog: Programme) {
    playerRef.current?.seekToTime(prog.start)
  }

  // Aktif gruptaki kanallar — strip için
  const groupChannels = channels.filter(c => c.group === channelGroup)

  return (
    <div className="flex h-[calc(100svh-48px)]">
      {/* Sol: Kanal listesi */}
      <div className="flex flex-col w-64 bg-[#1a1a1a] border-r border-white/10 shrink-0">
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
          channels={groupChannels}
          active={activeChannel}
          onSelect={setChannel}
        />
      </div>

      {/* Orta: Player + kanal şeridi */}
      <div
        className="relative flex flex-col flex-1 min-w-0"
        onMouseMove={showStrip}
        onMouseEnter={showStrip}
        onMouseLeave={() => {
          clearTimeout(hideTimer.current)
          setStripVisible(false)
        }}
      >
        {activeChannel && <Player ref={playerRef} channel={activeChannel} />}

        <ChannelStrip
          channels={groupChannels}
          active={activeChannel}
          onSelect={setChannel}
          visible={stripVisible}
        />
      </div>

      {/* Sağ: EPG */}
      <div className="w-72 bg-[#1a1a1a] border-l border-white/10 shrink-0 overflow-y-auto">
        {activeChannel && (
          <EpgPanel
            channelId={activeChannel.tvgId}
            streamUrl={activeChannel.url}
            onSelectPast={handleSelectPast}
          />
        )}
      </div>
    </div>
  )
}
