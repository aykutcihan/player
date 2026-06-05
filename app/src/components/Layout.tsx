import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { backButtonBus } from '../lib/backButtonBus'

export default function Layout() {
  const navigate   = useNavigate()
  const pressTime  = useRef<number>(0)

  useEffect(() => {
    const handler = App.addListener('backButton', () => {
      // Sayfa bileşeni handle ettiyse → atla
      if (backButtonBus.handle()) return

      const now = Date.now()
      // Çift basış 2 sn içinde → uygulamadan çık
      if (pressTime.current && now - pressTime.current < 2000) {
        App.exitApp()
        return
      }
      pressTime.current = now
      navigate('/')
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 27 || e.keyCode === 10009) navigate('/')
    }
    window.addEventListener('keydown', onKey)

    return () => {
      handler.then(h => h.remove())
      window.removeEventListener('keydown', onKey)
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
