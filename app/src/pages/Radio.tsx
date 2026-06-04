import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, renameGroup, resolveChannels } = useFavorites()

  const [radioOpen,    setRadioOpen]    = useState(false)
  const [browseGroup,  setBrowseGroup]  = useState<string | null>(null)
  const [activeFav,    setActiveFav]    = useState<number | null>(null)
  const [picker,       setPicker]       = useState<Channel | null>(null)
  const [toast,        setToast]        = useState<string | null>(null)
  const [editingFav,   setEditingFav]   = useState<number | null>(null)
  const [editName,     setEditName]     = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong   = useRef(false)

  // Grup haritası
  const normalGroupMap = useMemo(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of radioChannels) {
      const g = ch.group || 'Diğer'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ch)
    }
    return map
  }, [radioChannels])

  const groupNames = useMemo(() => [...normalGroupMap.keys()], [normalGroupMap])

  // Alt şerit kanalları — aktif fav seçiliyse onun kanalları
  const stripChannels = useMemo((): Channel[] => {
    if (activeFav !== null) return resolveChannels(activeFav, radioChannels)
    return []
  }, [activeFav, radioChannels, resolveChannels])

  // Aktif kanala scroll
  useEffect(() => {
    if (!activeRadio || !scrollRef.current) return
    const idx = stripChannels.findIndex(c => c.tvgId === activeRadio.tvgId)
    if (idx < 0) return
    const el = scrollRef.current.children[idx] as HTMLElement
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeRadio, stripChannels])

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    const close = () => { setRadioOpen(false); setBrowseGroup(null) }
    if (radioOpen) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [radioOpen])

  // Basılı tut → favoriye ekle
  const startPress = useCallback((ch: Channel) => {
    didLong.current = false
    timerRef.current = setTimeout(() => {
      didLong.current = true
      setPicker(ch)
    }, LONG_PRESS_MS)
  }, [])

  const endPress = useCallback((ch: Channel) => {
    clearTimeout(timerRef.current)
    if (!didLong.current) setRadio(ch)
  }, [setRadio])

  const cancelPress = useCallback(() => clearTimeout(timerRef.current), [])

  // Favori ekle
  const handlePick = useCallback((groupIdx: number) => {
    if (!picker) return
    const err = addToGroup(groupIdx, picker.tvgId)
    setPicker(null)
    showToast(err ?? `${picker.name} → ${favGroups[groupIdx].name}`)
  }, [picker, addToGroup, favGroups])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function startRename(i: number, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingFav(i)
    setEditName(favGroups[i].name)
  }
  function commitRename() {
    if (editingFav !== null && editName.trim()) renameGroup(editingFav, editName.trim())
    setEditingFav(null)
  }

  // 📻 dropdown içindeki kanallar
  const dropChannels = useMemo((): Channel[] =>
    browseGroup ? (normalGroupMap.get(browseGroup) ?? []) : [],
    [browseGroup, normalGroupMap]
  )

  return (
    <div className="flex flex-col h-[calc(100svh-48px)] bg-[#111]">

      {/* Üst buton çubuğu */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-white/10 shrink-0">

        {/* 📻 Radyo dropdown butonu */}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setRadioOpen(p => !p); setBrowseGroup(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              radioOpen
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
            }`}
          >
            <span className="text-xl">📻</span>
            <span>Radyo</span>
            <span className="text-[10px] opacity-60">{radioOpen ? '▲' : '▼'}</span>
          </button>

          {/* Dropdown */}
          {radioOpen && (
            <div
              className="absolute top-full left-0 mt-2 z-40 bg-[#222] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[280px]"
              onClick={e => e.stopPropagation()}
            >
              {!browseGroup ? (
                /* Grup listesi */
                <div className="grid grid-cols-2 gap-1 p-2 max-h-64 overflow-y-auto">
                  {groupNames.map(g => (
                    <button
                      key={g}
                      onClick={() => setBrowseGroup(g)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-700/50 text-white/70 hover:text-white text-xs font-medium transition-colors text-left"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              ) : (
                /* Kanal listesi */
                <>
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1 border-b border-white/5">
                    <button
                      onClick={() => setBrowseGroup(null)}
                      className="text-white/40 hover:text-white text-xs"
                    >← Gruplar</button>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/60 text-xs font-medium">{browseGroup}</span>
                  </div>
                  <div className="flex gap-2 p-2 overflow-x-auto max-h-28" style={{ scrollbarWidth: 'none' }}>
                    {dropChannels.map((ch, i) => (
                      <button
                        key={i}
                        onMouseDown={() => startPress(ch)}
                        onMouseUp={() => { endPress(ch); setRadioOpen(false) }}
                        onMouseLeave={cancelPress}
                        onTouchStart={() => startPress(ch)}
                        onTouchEnd={() => { endPress(ch); setRadioOpen(false) }}
                        onTouchMove={cancelPress}
                        className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-16 ${
                          activeRadio?.tvgId === ch.tvgId
                            ? 'border-red-500 bg-red-900/40'
                            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {ch.logo
                          ? <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain rounded-lg"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          : <span className="text-xl">📻</span>
                        }
                        <span className="text-[8px] text-white/50 truncate w-14 text-center">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Favori butonlar — sadece tıklama, renk değişimi */}
        {favGroups.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveFav(prev => prev === i ? null : i)}
            onDoubleClick={e => startRename(i, e)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              activeFav === i
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/30'
                : 'bg-white/8 text-yellow-400/70 hover:bg-white/12 hover:text-yellow-300'
            }`}
          >
            <span>⭐</span>
            {editingFav === i
              ? <input
                  autoFocus value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => e.key === 'Enter' && commitRename()}
                  className="bg-transparent outline-none w-14"
                  onClick={e => e.stopPropagation()}
                />
              : <span>{g.name}</span>
            }
          </button>
        ))}
      </div>

      {/* Ana alan — player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <div className="text-white/20 text-sm text-center space-y-2">
              <div className="text-4xl">📻</div>
              <div>Üstten radyo seç</div>
            </div>
        }
      </div>

      {/* Alt kanal şeridi — aktif fav kanalları */}
      {activeFav !== null && (
        <div className="shrink-0 bg-black/70 backdrop-blur-sm border-t border-white/10">
          {stripChannels.length === 0
            ? <div className="text-center py-3 text-white/20 text-xs">
                Kanallara basılı tutarak bu favoriye ekle
              </div>
            : <div
                ref={scrollRef}
                className="flex gap-2 px-3 py-2 overflow-x-auto justify-center"
                style={{ scrollbarWidth: 'none' }}
              >
                {stripChannels.map((ch, i) => (
                  <button
                    key={i}
                    onMouseDown={() => startPress(ch)}
                    onMouseUp={() => endPress(ch)}
                    onMouseLeave={cancelPress}
                    onTouchStart={() => startPress(ch)}
                    onTouchEnd={() => endPress(ch)}
                    onTouchMove={cancelPress}
                    className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-16 ${
                      activeRadio?.tvgId === ch.tvgId
                        ? 'border-yellow-500 bg-yellow-900/30 scale-105'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {ch.logo
                      ? <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain rounded-lg"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <span className="text-xl">📻</span>
                    }
                    <span className="text-[8px] text-white/50 truncate w-14 text-center leading-tight">{ch.name}</span>
                  </button>
                ))}
              </div>
          }
        </div>
      )}

      {/* Favori seçici modal */}
      {picker && (
        <FavPickerModal
          groups={favGroups}
          channelName={picker.name}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#333] text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
