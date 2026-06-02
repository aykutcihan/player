import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface Props {
  url:   string
  title?: string
}

export default function VideoPlayer({ url, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef   = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    hlsRef.current?.destroy()

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
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
}
