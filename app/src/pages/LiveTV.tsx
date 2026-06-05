import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import ChannelStrip from '../components/tv/ChannelStrip'
import GroupStrip   from '../components/tv/GroupStrip'
import NowBar       from '../components/tv/NowBar'
import EpgOverlay   from '../components/tv/EpgOverlay'
import Player       from '../components/tv/Player'
import type { VideoPlayerHandle } from '../components/VideoPlayer'
import { backButtonBus } from '../lib/backButtonBus'
import { NativeVideo, isNativeVideoAvailable } from '../lib/nativeVideo'

const HIDE_DELAY = 5000

type FocusZone = 'none' | 'channels' | 'epg' | 'groups'

export default function LiveTV() {
  const navigate = useNavigate()
  const { channels, activeChannel, channelGroup, setChannel, setGroup } = useStore()
  const playerRef  = useRef<VideoPlayerHandle>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [uiVisible,    setUiVisible]    = useState(false)
  const [focusZone,    setFocusZone]    = useState<FocusZone>('none')
  const [focusIdx,     setFocusIdx]     = useState(0)
  const [playIcon,     setPlayIcon]     = useState<'play' | 'pause' | null>(null)
  const [epgStep,      setEpgStep]      = useState(0)
  const [epgOnLogo,    setEpgOnLogo]    = useState(true)  // EPG'de logo mu program mı odaklı
  const [epgOpen,      setEpgOpen]      = useState(false)
  const [chLoading,    setChLoading]    = useState(false)
  const playIconTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const loadTimer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const groups        = [...new Set(channels.map(c => c.group))].filter(Boolean)
  const groupChannels = channels.filter(c => c.group === channelGroup)

  // Aktif kanal değişince odak indexini güncelle (url ile — tvg-id duplikat olabilir)
  useEffect(() => {
    const idx = channels.findIndex(c => c.url === activeChannel?.url)
    if (idx >= 0) setFocusIdx(idx)
  }, [activeChannel, channels])

  // Kanal değişince spinner — native event gelince kapat
  const listenerRef = useRef<{ remove: () => void } | null>(null)
  useEffect(() => {
    if (!activeChannel) return
    setChLoading(true)
    clearTimeout(loadTimer.current)

    // Eski listener'ı temizle
    if (listenerRef.current) { listenerRef.current.remove(); listenerRef.current = null }

    if (isNativeVideoAvailable()) {
      NativeVideo.addListener('videoState', (data: { state: string }) => {
        if (data.state === 'playing') {
          setChLoading(false)
          clearTimeout(loadTimer.current)
        }
      }).then(handle => { listenerRef.current = handle })
      // Max 5 saniye bekle
      loadTimer.current = setTimeout(() => setChLoading(false), 5000)
    } else {
      loadTimer.current = setTimeout(() => setChLoading(false), 300)
    }
    return () => {
      clearTimeout(loadTimer.current)
      if (listenerRef.current) { listenerRef.current.remove(); listenerRef.current = null }
    }
  }, [activeChannel?.url])

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
          // Yukarı → index ile sonraki kanal (findIndex sorunu yok)
          const newIdx = Math.min(channels.length - 1, focusIdx + 1)
          if (newIdx !== focusIdx) {
            setFocusIdx(newIdx)
            const next = channels[newIdx]
            if (next) { setChannel(next); setGroup(next.group) }
          }
        } else if (e.keyCode === 40) {
          // Aşağı → index ile önceki kanal
          const newIdx = Math.max(0, focusIdx - 1)
          if (newIdx !== focusIdx) {
            setFocusIdx(newIdx)
            const prev = channels[newIdx]
            if (prev) { setChannel(prev); setGroup(prev.group) }
          }
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
          setFocusZone('epg'); setEpgStep(0); setEpgOnLogo(true)
        } else if (e.keyCode === 13) {
          const ch = channels[focusIdx]
          if (ch) { setChannel(ch); setGroup(ch.group); closeUi() }
        }
        return
      }

      // ── GRUP ──────────────────────────────────────────────
      if (focusZone === 'epg') {
        if (epgOnLogo) {
          if (e.keyCode === 39) { setEpgOnLogo(false); setEpgStep(0) } // Sağ → programlara geç
          else if (e.keyCode === 13) setEpgOpen(true)                   // OK → tam EPG aç
          else if (e.keyCode === 38) setFocusZone('groups')             // Yukarı → gruplara
          else if (e.keyCode === 40) setFocusZone('channels')           // Aşağı → kanallara
        } else {
          if (e.keyCode === 39) setEpgStep(s => s + 1)                 // Sağ → ileri program
          else if (e.keyCode === 37) {
            if (epgStep > 0) setEpgStep(s => s - 1)
            else { setEpgOnLogo(true) }                                 // Sol sona gelince logoya dön
          }
          else if (e.keyCode === 38) setFocusZone('groups')
          else if (e.keyCode === 40) setFocusZone('channels')
        }
        return
      }

      if (focusZone === 'groups') {
        const n    = groups.length
        const gIdx = groups.indexOf(channelGroup)

        const goToScroll = () => {
          const firstInGroup = channels.findIndex(c => c.group === channelGroup)
          if (firstInGroup >= 0) setFocusIdx(firstInGroup)
          setFocusZone('channels')
        }

        if (e.keyCode === 39) {
          // Sağ → sonraki grup (sonsuz döngü)
          const next = groups[(gIdx + 1) % n]
          setGroup(next)
        } else if (e.keyCode === 37) {
          // Sol → önceki grup (sonsuz döngü)
          const prev = groups[(gIdx - 1 + n) % n]
          setGroup(prev)
        } else if (e.keyCode === 40) {
          setFocusZone('epg'); setEpgStep(0) // Aşağı → EPG'ye
        } else if (e.keyCode === 13) {
          goToScroll() // OK → kanala geç
        }
        // Yukarı gruplarda çalışmıyor
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
      {/* Player — kanal yoksa siyah */}
      {activeChannel
        ? <Player ref={playerRef} channel={activeChannel} showControls={false} />
        : <div className="absolute inset-0 bg-black" />
      }

      {/* Yükleniyor spinner — tam siyah arka plan */}
      {chLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-black">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
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

      {/* Yatay grup şeridi */}
      {groups.length > 0 && (
        <GroupStrip
          groups={groups}
          active={channelGroup}
          focused={focusZone === 'groups'}
          onSelect={g => { setGroup(g); setFocusZone('channels'); resetTimer() }}
          visible={uiVisible}
        />
      )}

      {/* NowBar — kanal şeridinin üstünde */}
      {/* EPG Overlay */}
      {epgOpen && activeChannel && (
        <EpgOverlay
          channel={activeChannel}
          onClose={() => setEpgOpen(false)}
          onSeekTo={t => playerRef.current?.seekToTime(t)}
        />
      )}

      {activeChannel && !epgOpen && (
        <NowBar
          channel={activeChannel}
          visible={uiVisible}
          bottomOffset={68}
          epgFocused={focusZone === 'epg'}
          epgStep={epgStep}
          epgOnLogo={epgOnLogo}
          onLogoClick={() => setEpgOpen(true)}
          onSeekTo={t => playerRef.current?.seekToTime(t)}
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
