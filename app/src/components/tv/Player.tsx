import { forwardRef, useEffect, useRef } from 'react'
import type { Channel } from '../../lib/m3u'
import VideoPlayer, { type VideoPlayerHandle } from '../VideoPlayer'
import { NativeVideo, isNativeVideoAvailable } from '../../lib/nativeVideo'

interface Props {
  channel:       Channel
  showControls?: boolean
}

const Player = forwardRef<VideoPlayerHandle, Props>(({ channel, showControls }, ref) => {
  const useNative = isNativeVideoAvailable()
  const prevUrl = useRef<string>('')

  useEffect(() => {
    if (!useNative) return
    if (prevUrl.current === channel.url) return
    prevUrl.current = channel.url

    // Native ExoPlayer ile oynat (CORS yok)
    NativeVideo.play({ url: channel.url }).catch(console.error)

    return () => {
      // Bileşen unmount olunca durdur
    }
  }, [channel.url, useNative])

  useEffect(() => {
    return () => {
      if (useNative) NativeVideo.stop().catch(() => {})
    }
  }, [useNative])

  if (useNative) {
    // Native player arkada çalışıyor, yükleme bitince WebView şeffaf olur
    return <div className="absolute inset-0" style={{ background: 'transparent' }} />
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <VideoPlayer ref={ref} url={channel.url} urls={channel.urls} showControls={showControls} />
    </div>
  )
})

Player.displayName = 'Player'
export default Player
