import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home   from './pages/Home'
import LiveTV from './pages/LiveTV'
import Radio  from './pages/Radio'
import Music  from './pages/Music'
import Films  from './pages/Films'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore(s => s.loadAll)
  useEffect(() => { loadAll() }, [loadAll])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<Layout />}>
          <Route path="/tv"       element={<LiveTV />} />
          <Route path="/radyo"    element={<Radio  />} />
          <Route path="/muzik"    element={<Music  />} />
          <Route path="/filmler"  element={<Films  />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
