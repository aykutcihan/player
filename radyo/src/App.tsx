import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Radio  from './pages/Radio'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore(s => s.loadAll)
  useEffect(() => { loadAll() }, [loadAll])

  return (
    <BrowserRouter basename="/tv-takip/radyo-app">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Radio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
