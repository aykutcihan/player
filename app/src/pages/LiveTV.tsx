import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupWheel   from '../components/tv/GroupWheel'
import NowBar       from '../components/tv/NowBar'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'
import { backButtonBus } from '../lib/backButtonBus'

const HIDE_DELAY = 5000

type FocusZone = 'none' | 'channels' | 'groups'

export default function LiveTV() {
  const navigate = useNavigate()
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [uiVisible,    setUiVisible]    = useState(false)
  const [focusZone,    setFocusZone]    = useState<FocusZone>('none')
  const [focusIdx,     setFocusIdx]     = useState(0)
  const [playIcon,     setPlayIcon]     = useState<'play' | 'pause' | null>(null)
  const playIconTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const groups        = [...new Set(channels.map(c => c.group))].filter(Boolean)
  const groupChannels = channels.filter(c => c.group === channelGroup)

  // Aktif kanal değişince odak indexini güncelle (url ile — tvg-id duplikat olabilir)
  useEffect(() => {
    const idx = channels.findIndex(c => c.url === activeChannel?.url)
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
      // UI açıkken geri tuşu → UI kapat
      if (uiVisible && (e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 4)) {
        closeUi()
        return
      }

      if (focusZone === 'none') {
        if (e.keyCode === 38) {
          // Yukarı → listede sonraki kanal
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const next = channels[Math.min(channels.length - 1, idx + 1)]
          if (next && next.tvgId !== activeChannel?.tvgId) { setChannel(next); setGroup(next.group) }
        } else if (e.keyCode === 40) {
          // Aşağı → listede önceki kanal
          const idx = channels.findIndex(c => c.tvgId === activeChannel?.tvgId)
          const prev = channels[Math.max(0, idx - 1)]
          if (prev && prev.tvgId !== activeChannel?.tvgId) { setChannel(prev); setGroup(prev.group) }
        } else if (e.keyCode === 37 || e.keyCode === 39) {
          openUi('channels')
        } else if (e.keyCode === 13) {
          // OK → pause/play + emoji göster
          const video = document.querySelector('video') as HTMLVideoElement | null
          const wasPlaying = video ? !video.paused : true
          playerRef.current?.togglePlay?.()
          const icon = wasPlaying ? 'pause' : 'play' // toggle sonrası durum
          setPlayIcon(icon)
          clearTimeout(playIconTimer.current)
          playIconTimer.current = setTimeout(() => setPlayIcon(null), icon === 'play' ? 1000 : 999999)
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

    // Android geri tuşu — registry'e kaydet
    backButtonBus.register(() => {
      if (uiVisible) { closeUi(); return true } // handle edildi
      return false // Layout handle etsin
    })


    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      backButtonBus.unregister()
    }
  }, [focusZone, focusIdx, channels, groups, activeChannel, channelGroup,
      uiVisible, setChannel, setGroup, openUi, closeUi, resetTimer, navigate])

  const focusedChannel = channels[focusIdx] ?? null

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Player */}
      {activeChannel && (
        <Player ref={playerRef} channel={activeChannel} showControls={false} />
      )}

      {/* Pause/Play overlay */}
      {playIcon && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          {playIcon === 'pause' ? (
            <svg viewBox="0 0 24 24" className="w-28 h-28 drop-shadow-2xl" fill="rgba(255,255,255,0.85)">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-28 h-28 drop-shadow-2xl" fill="rgba(255,255,255,0.85)">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </div>
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

      {/* NowBar — kanal şeridinin üstünde */}
      {activeChannel && (
        <NowBar
          channel={activeChannel}
          visible={uiVisible}
          bottomOffset={104}
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
