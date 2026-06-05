import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupWheel   from '../components/tv/GroupWheel'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'

const HIDE_DELAY = 4000

type FocusZone = 'none' | 'channels' | 'groups'

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [uiVisible,  setUiVisible]  = useState(false)
  const [focusZone,  setFocusZone]  = useState<FocusZone>('none')
  const [focusIdx,   setFocusIdx]   = useState(0)

  const groups        = [...new Set(channels.map(c => c.group))].filter(Boolean)
  const groupChannels = channels.filter(c => c.group === channelGroup)

  // Aktif kanal değişince odak indexini güncelle
  useEffect(() => {
    const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
    if (idx >= 0) setFocusIdx(idx)
  }, [activeChannel, channels])

  const showUi = useCallback((zone: FocusZone = 'channels') => {
    setUiVisible(true)
    setFocusZone(zone)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setUiVisible(false)
      setFocusZone('none')
    }, HIDE_DELAY)
  }, [])

  const resetTimer = useCallback(() => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setUiVisible(false)
      setFocusZone('none')
    }, HIDE_DELAY)
  }, [])

  // Uzaktan kumanda navigasyonu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (![37, 38, 39, 40, 13].includes(e.keyCode)) return
      e.preventDefault()

      if (focusZone === 'none') {
        // UI kapalı
        if (e.keyCode === 38) {
          // Yukarı → önceki kanal (direkt)
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const prev = channels[idx - 1]
          if (prev) { setChannel(prev); setGroup(prev.group) }
        } else if (e.keyCode === 40) {
          // Aşağı → sonraki kanal (direkt)
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const next = channels[idx + 1]
          if (next) { setChannel(next); setGroup(next.group) }
        } else if (e.keyCode === 37 || e.keyCode === 39) {
          // Sol/Sağ → UI aç, kanal şeridine odaklan
          showUi('channels')
        }
        return
      }

      resetTimer()

      if (focusZone === 'channels') {
        if (e.keyCode === 39) {
          setFocusIdx(prev => Math.min(prev + 1, channels.length - 1))
        } else if (e.keyCode === 37) {
          setFocusIdx(prev => Math.max(prev - 1, 0))
        } else if (e.keyCode === 38) {
          // Yukarı → grup tekerleğine geç
          setFocusZone('groups')
        } else if (e.keyCode === 40) {
          // Aşağı → UI kapat
          setUiVisible(false)
          setFocusZone('none')
        } else if (e.keyCode === 13) {
          // OK → kanalı çal
          const ch = channels[focusIdx]
          if (ch) { setChannel(ch); setGroup(ch.group) }
        }
        return
      }

      if (focusZone === 'groups') {
        const gIdx = groups.indexOf(channelGroup)
        if (e.keyCode === 38) {
          const prev = groups[gIdx - 1]
          if (prev) setGroup(prev)
        } else if (e.keyCode === 40) {
          // Aşağı → kanal şeridine dön
          setFocusZone('channels')
        } else if (e.keyCode === 37) {
          // Sol → UI kapat
          setUiVisible(false)
          setFocusZone('none')
        } else if (e.keyCode === 13 || e.keyCode === 39) {
          const next = groups[gIdx + 1]
          if (next) setGroup(next)
          else setFocusZone('channels')
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusZone, focusIdx, channels, groups, activeChannel, channelGroup, setChannel, setGroup, showUi, resetTimer])

  const focusedChannel = channels[focusIdx] ?? null

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Player */}
      {activeChannel && (
        <Player ref={playerRef} channel={activeChannel} showControls={false} />
      )}

      {/* Grup tekerleği — sol */}
      {uiVisible && groups.length > 0 && (
        <GroupWheel
          groups={groups}
          active={channelGroup}
          onSelect={g => { setGroup(g); setFocusZone('channels') }}
          visible={uiVisible}
        />
      )}

      {/* Kanal şeridi — alt */}
      <ChannelStrip
        channels={groupChannels}
        active={activeChannel}
        focused={focusZone === 'channels' ? focusedChannel : null}
        onSelect={ch => { setChannel(ch); setGroup(ch.group); showUi('channels') }}
        visible={uiVisible}
      />
    </div>
  )
}
