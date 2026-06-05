import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'

export default function Layout() {
  const navigate  = useNavigate()
  const pressTime = useRef<number>(0)

  useEffect(() => {
    // Capacitor Android geri tuşu
    // Tek basış → ana menü, çift basış (2 sn içinde) → çık
    const handler = App.addListener('backButton', () => {
      const now = Date.now()
      if (pressTime.current && now - pressTime.current < 2000) {
        // Çift basış → uygulamadan çık
        App.exitApp()
        return
      }
      pressTime.current = now
      navigate('/')
    })

    // Web/TV için klavye geri tuşu
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
