import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const NAV = [
  { to: '/tv',       label: '📺 TV'      },
  { to: '/radyo',    label: '📻 Radyo'   },
  { to: '/muzik',    label: '🎵 Müzik'   },
  { to: '/filmler',  label: '🎬 Filmler' },
]

export default function Layout() {
  const navigate = useNavigate()

  // Geri tuşu → ana menüye dön
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 27 || e.keyCode === 10009) { // ESC veya Samsung Back
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex flex-col min-h-screen bg-[#111] text-white">
      <nav className="flex gap-1 bg-[#1a1a1a] px-4 py-2 border-b border-white/10 shrink-0">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `px-4 py-2 rounded text-sm font-medium transition-colors ${
                isActive ? 'bg-red-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
