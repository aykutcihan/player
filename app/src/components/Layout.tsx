import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Layout() {
  const navigate = useNavigate()

  // Geri tuşu → ana menüye dön
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 27 || e.keyCode === 10009) {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex flex-col min-h-screen bg-[#111] text-white overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
