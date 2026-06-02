import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LiveTV  from './pages/LiveTV'
import Radio   from './pages/Radio'
import Music   from './pages/Music'
import Films   from './pages/Films'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore(s => s.loadAll)
  useEffect(() => { loadAll() }, [loadAll])

  return (
    <BrowserRouter basename="/epg-data">
      <Layout>
        <Routes>
          <Route path="/"        element={<LiveTV  />} />
          <Route path="/radyo"   element={<Radio   />} />
          <Route path="/muzik"   element={<Music   />} />
          <Route path="/filmler" element={<Films   />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
