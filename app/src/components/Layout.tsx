import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { backButtonBus } from '../lib/backButtonBus'
import { useStore } from '../store/useStore'

const LONG_PRESS_MS = 800

export default function Layout() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const downTime      = useRef<number>(0)
  const exitTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const activeRadio      = useStore(s => s.activeRadio)
  const radioNowPlaying  = useStore(s => s.radioNowPlaying)
  const isRadioPage      = location.pathname === '/radyo'

  useEffect(() => {
    // Capacitor back button — normal kısa basış
    const handler = App.addListener('backButton', () => {
      if (backButtonBus.handle()) return
      navigate('/')
    })

    // Android keyCode 4 = back tuşu — uzun basış tespiti
    const onDown = (e: KeyboardEvent) => {
      if (e.keyCode !== 4) return
      downTime.current = Date.now()
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => {
        App.exitApp() // 800ms basılı tutulunca çık
      }, LONG_PRESS_MS)
    }

    const onUp = (e: KeyboardEvent) => {
      if (e.keyCode !== 4) return
      clearTimeout(exitTimer.current) // Erken bırakılırsa çıkma
    }

    // Web/TV klavye geri (ESC, Samsung Back)
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 27 || e.keyCode === 10009) navigate('/')
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    window.addEventListener('keydown', onKey)

    return () => {
      handler.then(h => h.remove())
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
      window.removeEventListener('keydown', onKey)
      clearTimeout(exitTimer.current)
    }
  }, [navigate])

  return (
    <div className="flex flex-col min-h-screen bg-[#111] text-white overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {!isRadioPage && activeRadio && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2 bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-white/10">
          <span className="text-lg">📻</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{activeRadio.name}</div>
            {radioNowPlaying && (radioNowPlaying.title || radioNowPlaying.artist) && (
              <div className="text-xs text-white/50 truncate">
                {[radioNowPlaying.title, radioNowPlaying.artist].filter(Boolean).join(' — ')}
              </div>
            )}
          </div>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        </div>
      )}
    </div>
  )
}
