import { useEffect, useState } from 'react'
import type { Channel } from '../../lib/m3u'
import { fetchEpg, currentProgramme, type Programme } from '../../lib/epg'

interface Props {
  channel: Channel
  visible: boolean
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function ChannelBanner({ channel, visible }: Props) {
  const [show,    setShow]    = useState(false)
  const [program, setProgram] = useState<Programme | null>(null)

  useEffect(() => {
    if (visible) setShow(true)
    else {
      const t = setTimeout(() => setShow(false), 400)
      return () => clearTimeout(t)
    }
  }, [visible])

  useEffect(() => {
    setProgram(null)
    if (!channel.tvgId) return
    fetchEpg(channel.tvgId).then(progs => setProgram(currentProgramme(progs)))
  }, [channel.tvgId])

  if (!show) return null

  const bannerH      = 25  // vh
  const nameFontSize = `min(5.25rem, calc(${bannerH}vh / ${channel.name.length}))`

  const progress = program ? (() => {
    const now   = Date.now()
    const start = new Date(program.start).getTime()
    const end   = new Date(program.stop).getTime()
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  })() : null

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex items-stretch gap-6 px-4 bg-black/30" style={{ height: `${bannerH}vh` }}>
        {/* Kanal adı — sol, aşağıdan yukarı, banner yüksekliğini tam doldurur */}
        <div
          className="shrink-0 flex items-center justify-center text-white font-black tracking-widest drop-shadow-lg"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: nameFontSize }}
        >
          {channel.name}
        </div>

        {/* Dikey ayraç */}
        <div className="w-px bg-white/20 self-stretch" />

        {/* Logo + program bilgisi + progress bar */}
        <div className="relative flex flex-col justify-center flex-1 gap-0">
          <div className="flex items-center gap-6 flex-1">
            <div className="shrink-0 w-36 h-36">
              {channel.logo
                ? <img src={channel.logo} alt="" className="w-full h-full object-contain drop-shadow-2xl" />
                : <div className="w-full h-full rounded-2xl bg-black/30 flex items-center justify-center">
                    <span className="text-white/50 text-xl font-bold">{channel.name.slice(0, 3)}</span>
                  </div>
              }
            </div>

            {program && (
              <div className="flex flex-col justify-center">
                <div className="text-white text-5xl font-semibold leading-tight drop-shadow-lg">
                  {program.title}
                </div>
                <div className="text-white/55 text-3xl mt-2">
                  {fmtTime(program.start)} – {fmtTime(program.stop)}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar — logo altından sağ kenara */}
          {progress !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
