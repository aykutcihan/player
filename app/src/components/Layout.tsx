import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',       label: '📺 Canlı TV' },
  { to: '/radyo',  label: '📻 Radyo'    },
  { to: '/muzik',  label: '🎵 Müzik'    },
  { to: '/filmler',label: '🎬 Filmler'  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#111] text-white">
      <nav className="flex gap-1 bg-[#1a1a1a] px-4 py-2 border-b border-white/10 shrink-0">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
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
        {children}
      </main>
    </div>
  )
}
