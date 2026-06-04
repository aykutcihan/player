import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import Hls from 'hls.js'

export interface VideoPlayerHandle {
  seekToTime: (isoTime: string) => void
}

interface Props {
  url:    string
  title?: string
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ url, title }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef   = useRef<Hls | null>(null)

  useImperativeHandle(ref, () => ({
    seekToTime(isoTime: string) {
      const video = videoRef.current
      if (!video) return
      const targetTs  = new Date(isoTime).getTime() / 1000
      const nowTs     = Date.now() / 1000
      const offsetSec = nowTs - targetTs          // kaç saniye öncesi
      const duration  = video.duration            // DVR penceresi uzunluğu

      if (!isFinite(duration) || duration <= 0) return
      const seekPos = duration - offsetSec
      if (seekPos >= 0 && seekPos <= duration) {
        video.currentTime = seekPos
        video.play().catch(() => {})
      }
    }
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    hlsRef.current?.destroy()

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 3600,   // 1 saate kadar geri sarma
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
    } else {
      video.src = url
      video.play().catch(() => {})
    }

    return () => { hlsRef.current?.destroy() }
  }, [url])

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {title && (
        <div className="px-4 py-2 text-sm text-white/60 bg-black/50 shrink-0">
          {title}
        </div>
      )}
      <video
        ref={videoRef}
        className="flex-1 w-full h-full object-contain"
        controls
        playsInline
      />
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer
