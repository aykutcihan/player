import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import ChannelList  from '../components/tv/ChannelList'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupWheel   from '../components/tv/GroupWheel'
import NowBar       from '../components/tv/NowBar'
import EpgOverlay   from '../components/tv/EpgOverlay'
import Player       from '../components/tv/Player'
import EpgPanel     from '../components/tv/EpgPanel'
import type { VideoPlayerHandle } from '../components/VideoPlayer'
import type { Programme } from '../lib/epg'

const HIDE_DELAY = 3000

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef   = useRef<VideoPlayerHandle>(null)
  const hideTimer   = useRef<ReturnType<typeof setTimeout>>()
  const [uiVisible,  setUiVisible]  = useState(false)
  const [epgOpen,    setEpgOpen]    = useState(false)
  const groups = [...new Set(channels.map(c => c.group))].filter(Boolean)
  const groupChannels = channels.filter(c => c.group === channelGroup)

  const showUi = useCallback(() => {
    setUiVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setUiVisible(false), HIDE_DELAY)
  }, [])

  const hideUi = useCallback(() => {
    clearTimeout(hideTimer.current)
    setUiVisible(false)
  }, [])

  function handleSelectPast(prog: Programme) {
    playerRef.current?.seekToTime(prog.start)
  }

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

      {/* Orta: Player + kontroller + kanal şeridi */}
      <div
        className="relative flex flex-col flex-1 min-w-0"
        onMouseMove={showUi}
        onMouseEnter={showUi}
        onMouseLeave={hideUi}
      >
        {/* Player */}
        {activeChannel && (
          <Player ref={playerRef} channel={activeChannel} showControls={uiVisible} />
        )}

        {/* Üst bar: logo + şu an + sonraki */}
        {/* EPG Overlay — açıkken NowBar ve ChannelStrip gizlenir */}
        {epgOpen && activeChannel && (
          <EpgOverlay
            channel={activeChannel}
            onClose={() => setEpgOpen(false)}
            onSeekTo={t => { playerRef.current?.seekToTime(t) }}
          />
        )}

        {!epgOpen && activeChannel && (
          <NowBar
            channel={activeChannel}
            visible={uiVisible}
            onSeekTo={t => playerRef.current?.seekToTime(t)}
            onLogoClick={() => setEpgOpen(true)}
          />
        )}

        {/* Sol: Grup tekerleği */}
        {!epgOpen && (
          <GroupWheel
            groups={groups}
            active={channelGroup}
            onSelect={setGroup}
            visible={uiVisible}
          />
        )}

        {/* Kanal şeridi — kontrollerin ÜSTÜNDE */}
        {!epgOpen && (
          <ChannelStrip
            channels={groupChannels}
            active={activeChannel}
            onSelect={ch => { setChannel(ch); showUi() }}
            visible={uiVisible}
          />
        )}
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
