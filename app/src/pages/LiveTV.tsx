import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupWheel   from '../components/tv/GroupWheel'
import NowBar       from '../components/tv/NowBar'
import EpgOverlay   from '../components/tv/EpgOverlay'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'

const HIDE_DELAY = 3000

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef   = useRef<VideoPlayerHandle>(null)
  const hideTimer   = useRef<ReturnType<typeof setTimeout>>()
  const [uiVisible, setUiVisible] = useState(false)
  const [epgOpen,   setEpgOpen]   = useState(false)
  const groups        = [...new Set(channels.map(c => c.group))].filter(Boolean)
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

  return (
    <div
      className="relative w-full h-[calc(100svh-48px)]"
      onMouseMove={showUi}
      onMouseEnter={showUi}
      onMouseLeave={hideUi}
    >
      {/* Player — tam ekran */}
      {activeChannel && (
        <Player ref={playerRef} channel={activeChannel} showControls={uiVisible} />
      )}

      {/* EPG Overlay */}
      {epgOpen && activeChannel && (
        <EpgOverlay
          channel={activeChannel}
          onClose={() => setEpgOpen(false)}
          onSeekTo={t => playerRef.current?.seekToTime(t)}
        />
      )}

      {/* NowBar — üst bar */}
      {!epgOpen && activeChannel && (
        <NowBar
          channel={activeChannel}
          visible={uiVisible}
          onSeekTo={t => playerRef.current?.seekToTime(t)}
          onLogoClick={() => setEpgOpen(true)}
        />
      )}

      {/* Grup tekerleği — sol */}
      {!epgOpen && (
        <GroupWheel
          groups={groups}
          active={channelGroup}
          onSelect={setGroup}
          visible={uiVisible}
        />
      )}

      {/* Kanal şeridi — alt */}
      {!epgOpen && (
        <ChannelStrip
          channels={groupChannels}
          active={activeChannel}
          onSelect={ch => { setChannel(ch); showUi() }}
          visible={uiVisible}
        />
      )}
    </div>
  )
}
