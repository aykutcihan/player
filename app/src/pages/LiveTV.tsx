import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupWheel   from '../components/tv/GroupWheel'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'

const HIDE_DELAY = 5000

type FocusZone = 'none' | 'channels' | 'groups'

export default function LiveTV() {
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [uiVisible, setUiVisible] = useState(false)
  const [focusZone, setFocusZone] = useState<FocusZone>('none')
  const [focusIdx,  setFocusIdx]  = useState(0)

  const groups        = [...new Set(channels.map(c => c.group))].filter(Boolean)
  const groupChannels = channels.filter(c => c.group === channelGroup)

  // Aktif kanal değişince odak indexini güncelle
  useEffect(() => {
    const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
    if (idx >= 0) setFocusIdx(idx)
  }, [activeChannel, channels])

  const closeUi = useCallback(() => {
    setUiVisible(false)
    setFocusZone('none')
    clearTimeout(hideTimer.current)
  }, [])

  const openUi = useCallback((zone: FocusZone = 'channels') => {
    setUiVisible(true)
    setFocusZone(zone)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(closeUi, HIDE_DELAY)
  }, [closeUi])

  const resetTimer = useCallback(() => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(closeUi, HIDE_DELAY)
  }, [closeUi])

  // Uzaktan kumanda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (![37, 38, 39, 40, 13].includes(e.keyCode)) return
      e.preventDefault()

      // ── UI KAPALI ──────────────────────────────────────────
      if (focusZone === 'none') {
        if (e.keyCode === 38) {
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const prev = channels[Math.max(0, idx - 1)]
          if (prev && prev.tvgId !== activeChannel?.tvgId) { setChannel(prev); setGroup(prev.group) }
        } else if (e.keyCode === 40) {
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const next = channels[Math.min(channels.length - 1, idx + 1)]
          if (next && next.tvgId !== activeChannel?.tvgId) { setChannel(next); setGroup(next.group) }
        } else if (e.keyCode === 37 || e.keyCode === 39) {
          openUi('channels')
        } else if (e.keyCode === 13) {
          // OK → pause/play
          playerRef.current?.togglePlay?.()
        }
        return
      }

      resetTimer()

      // ── SCROLL (KANAL ŞERİDİ) ──────────────────────────────
      if (focusZone === 'channels') {
        if (e.keyCode === 39) {
          setFocusIdx(prev => Math.min(prev + 1, channels.length - 1))
        } else if (e.keyCode === 37) {
          setFocusIdx(prev => Math.max(prev - 1, 0))
        } else if (e.keyCode === 38) {
          setFocusZone('groups')
        } else if (e.keyCode === 40) {
          closeUi()
        } else if (e.keyCode === 13) {
          const ch = channels[focusIdx]
          if (ch) { setChannel(ch); setGroup(ch.group); closeUi() }
        }
        return
      }

      // ── GRUP ──────────────────────────────────────────────
      if (focusZone === 'groups') {
        const gIdx = groups.indexOf(channelGroup)

        const goToScroll = (group?: string) => {
          const targetGroup = group ?? channelGroup
          // Grubun ilk kanalına odaklan
          const firstInGroup = channels.findIndex(c => c.group === targetGroup)
          if (firstInGroup >= 0) setFocusIdx(firstInGroup)
          setFocusZone('channels')
        }

        if (e.keyCode === 38) {
          const prev = groups[gIdx - 1]
          if (prev) setGroup(prev)
        } else if (e.keyCode === 40) {
          const next = groups[gIdx + 1]
          if (next) setGroup(next)
          else goToScroll() // son grup → scrola dön
        } else if (e.keyCode === 13) {
          goToScroll() // OK → grubu seç, scrola dön
        }
        // Sol/Sağ gruplarda çalışmıyor
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusZone, focusIdx, channels, groups, activeChannel, channelGroup,
      setChannel, setGroup, openUi, closeUi, resetTimer])

  const focusedChannel = channels[focusIdx] ?? null

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Player */}
      {activeChannel && (
        <Player ref={playerRef} channel={activeChannel} showControls={false} />
      )}

      {/* Grup tekerleği — sadece UI açıkken ve grup odaklanınca */}
      {uiVisible && groups.length > 0 && (
        <GroupWheel
          groups={groups}
          active={channelGroup}
          onSelect={g => { setGroup(g); setFocusZone('channels'); resetTimer() }}
          visible={uiVisible}
        />
      )}

      {/* Kanal şeridi */}
      <ChannelStrip
        channels={groupChannels}
        active={activeChannel}
        focused={focusZone === 'channels' ? focusedChannel : null}
        onSelect={ch => { setChannel(ch); setGroup(ch.group); closeUi() }}
        visible={uiVisible}
      />
    </div>
  )
}
