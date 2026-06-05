import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { backButtonBus } from '../lib/backButtonBus'

const LONG_PRESS_MS = 800

export default function Layout() {
  const navigate      = useNavigate()
  const downTime      = useRef<number>(0)
  const exitTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    </div>
  )
}
