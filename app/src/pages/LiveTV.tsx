import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'

const HIDE_DELAY = 5000

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [uiVisible, setUiVisible] = useState(true)
  const [focusIdx,  setFocusIdx]  = useState(0) // odaklanan kanal indexi

  const groupChannels = channels.filter(c => c.group === channelGroup)

  // Aktif kanal değişince odağı senkronize et
  useEffect(() => {
    const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
    if (idx >= 0) setFocusIdx(idx)
  }, [activeChannel, channels])

  const showUi = useCallback(() => {
    setUiVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setUiVisible(false), HIDE_DELAY)
  }, [])

  const hideUi = useCallback(() => {
    clearTimeout(hideTimer.current)
    setUiVisible(false)
  }, [])

  // Uzaktan kumanda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ([37, 38, 39, 40, 13].includes(e.keyCode)) e.preventDefault()
      showUi()

      if (e.keyCode === 39 || e.keyCode === 40) {
        // Sağ/Aşağı → sonraki kanala odaklan
        setFocusIdx(prev => Math.min(prev + 1, channels.length - 1))
      } else if (e.keyCode === 37 || e.keyCode === 38) {
        // Sol/Yukarı → önceki kanala odaklan
        setFocusIdx(prev => Math.max(prev - 1, 0))
      } else if (e.keyCode === 13) {
        // OK/Enter → odaklanan kanalı çal
        const ch = channels[focusIdx]
        if (ch) { setChannel(ch); setGroup(ch.group) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showUi, channels, focusIdx, setChannel, setGroup])

  const focusedChannel = channels[focusIdx] ?? null

  return (
    <div
      className="relative w-full h-screen"
      onMouseMove={showUi}
      onMouseEnter={showUi}
      onMouseLeave={hideUi}
    >
      {/* Player */}
      {activeChannel && (
        <Player ref={playerRef} channel={activeChannel} showControls={false} />
      )}

      {/* Kanal şeridi — odak ve aktif gösterir */}
      <ChannelStrip
        channels={groupChannels}
        active={activeChannel}
        focused={focusedChannel}
        onSelect={ch => { setChannel(ch); setGroup(ch.group); showUi() }}
        visible={uiVisible}
      />
    </div>
  )
}
