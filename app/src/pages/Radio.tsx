import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RadioPlayer from '../components/radio/RadioPlayer'
import FavPickerModal from '../components/radio/FavPickerModal'
import { useFavorites } from '../lib/useFavorites'
import type { Channel } from '../lib/m3u'

const LONG_PRESS_MS = 500

type MenuKey = 'radio' | 'fav0' | 'fav1' | 'fav2' | null

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  const { groups: favGroups, addToGroup, removeFromGroup, renameGroup, resolveChannels } = useFavorites()

  const [openMenu,   setOpenMenu]   = useState<MenuKey>(null)
  const [browseGroup, setBrowseGroup] = useState<string | null>(null) // 📻 içinde seçili grup
  const [picker, setPicker]         = useState<Channel | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [editingFav, setEditingFav] = useState<number | null>(null)
  const [editName, setEditName]     = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong  = useRef(false)

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

  // Menü toggle
  const toggle = (key: MenuKey) => {
    setOpenMenu(prev => prev === key ? null : key)
    setBrowseGroup(null)
  }

  // Dışa tıklayınca kapat
  useEffect(() => {
    const close = () => { setOpenMenu(null); setBrowseGroup(null) }
    if (openMenu) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [openMenu])

  // 📻 dropdown içeriği
  const dropdownChannels = useMemo((): Channel[] => {
    if (!openMenu) return []
    if (openMenu === 'radio') return browseGroup ? (normalGroupMap.get(browseGroup) ?? []) : []
    const idx = parseInt(openMenu.replace('fav', ''))
    return resolveChannels(idx, radioChannels)
  }, [openMenu, browseGroup, normalGroupMap, radioChannels, resolveChannels])

  // Basılı tut (favoriye ekle)
  const startPress = useCallback((ch: Channel) => {
    didLong.current = false
    timerRef.current = setTimeout(() => {
      didLong.current = true
      setPicker(ch)
    }, LONG_PRESS_MS)
  }, [])

  const endPress = useCallback((ch: Channel) => {
    clearTimeout(timerRef.current)
    if (!didLong.current) { setRadio(ch); setOpenMenu(null) }
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

  const favIdx = openMenu?.startsWith('fav') ? parseInt(openMenu.replace('fav', '')) : -1

  return (
    <div className="flex flex-col h-[calc(100svh-48px)] bg-[#111]">

      {/* Üst buton çubuğu */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-white/10 shrink-0">

        {/* 📻 Radyo butonu */}
        <button
          onClick={e => { e.stopPropagation(); toggle('radio') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
            openMenu === 'radio'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
          }`}
        >
          <span className="text-xl">📻</span>
          <span>Radyo</span>
          <span className="text-[10px] opacity-60">{openMenu === 'radio' ? '▲' : '▼'}</span>
        </button>

        {/* Favori butonlar */}
        {favGroups.map((g, i) => {
          const key = `fav${i}` as MenuKey
          const isOpen = openMenu === key
          return (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); toggle(key) }}
              onDoubleClick={e => startRename(i, e)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                isOpen
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/30'
                  : 'bg-white/8 text-yellow-400/80 hover:bg-white/12 hover:text-yellow-300'
              }`}
            >
              <span>⭐</span>
              {editingFav === i
                ? <input
                    autoFocus value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => e.key === 'Enter' && commitRename()}
                    className="bg-transparent outline-none w-16"
                    onClick={e => e.stopPropagation()}
                  />
                : <span>{g.name}</span>
              }
              <span className="text-[10px] opacity-60">{isOpen ? '▲' : '▼'}</span>
            </button>
          )
        })}
      </div>

      {/* Dropdown paneli */}
      {openMenu && (
        <div
          className="relative z-30 bg-[#1e1e1e] border-b border-white/10 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          {/* 📻 → grup listesi */}
          {openMenu === 'radio' && !browseGroup && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3 max-h-56 overflow-y-auto">
              {groupNames.map(g => (
                <button
                  key={g}
                  onClick={() => setBrowseGroup(g)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-700/50 text-white/70 hover:text-white text-xs font-medium transition-colors text-center"
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* 📻 → seçili grup kanalları */}
          {openMenu === 'radio' && browseGroup && (
            <>
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <button onClick={() => setBrowseGroup(null)}
                  className="text-white/40 hover:text-white text-xs flex items-center gap-1">
                  ← Gruplar
                </button>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/60 text-xs font-medium">{browseGroup}</span>
              </div>
              <ChannelGrid
                channels={dropdownChannels}
                active={activeRadio}
                onPress={startPress}
                onRelease={endPress}
                onCancel={cancelPress}
              />
            </>
          )}

          {/* Favori kanalları */}
          {openMenu?.startsWith('fav') && (
            <>
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-yellow-400/60 text-xs font-medium">
                  ⭐ {favGroups[favIdx]?.name} · {dropdownChannels.length}/10
                </span>
                <button onClick={e => startRename(favIdx, e)}
                  className="text-white/30 hover:text-white/60 text-xs">
                  ✏️ Yeniden adlandır
                </button>
              </div>
              {dropdownChannels.length === 0
                ? <div className="text-center py-6 text-white/20 text-xs">
                    Kanallara basılı tutarak buraya ekle
                  </div>
                : <ChannelGrid
                    channels={dropdownChannels}
                    active={activeRadio}
                    onPress={startPress}
                    onRelease={endPress}
                    onCancel={cancelPress}
                    onRemove={tvgId => removeFromGroup(favIdx, tvgId)}
                  />
              }
            </>
          )}
        </div>
      )}

      {/* Ana alan — player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <div className="text-white/20 text-sm text-center px-8 space-y-2">
              <div className="text-4xl">📻</div>
              <div>Üstten radyo seç</div>
            </div>
        }
      </div>

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

// Kanal ızgarası bileşeni
interface GridProps {
  channels:  Channel[]
  active:    Channel | null
  onPress:   (ch: Channel) => void
  onRelease: (ch: Channel) => void
  onCancel:  () => void
  onRemove?: (tvgId: string) => void
}

function ChannelGrid({ channels, active, onPress, onRelease, onCancel, onRemove }: GridProps) {
  return (
    <div className="flex gap-2 px-3 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {channels.map((ch, i) => (
        <div key={i} className="relative flex-none">
          <button
            onMouseDown={() => onPress(ch)}
            onMouseUp={() => onRelease(ch)}
            onMouseLeave={onCancel}
            onTouchStart={() => onPress(ch)}
            onTouchEnd={() => onRelease(ch)}
            onTouchMove={onCancel}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all select-none w-16 ${
              active?.tvgId === ch.tvgId
                ? 'border-red-500 bg-red-900/40'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            {ch.logo
              ? <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain rounded-lg"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span className="text-2xl">📻</span>
            }
            <span className="text-[8px] text-white/50 truncate w-14 text-center leading-tight">{ch.name}</span>
          </button>
          {onRemove && (
            <button
              onClick={() => onRemove(ch.tvgId)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center hover:bg-red-500"
            >✕</button>
          )}
        </div>
      ))}
    </div>
  )
}
