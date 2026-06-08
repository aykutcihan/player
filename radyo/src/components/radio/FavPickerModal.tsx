import type { FavGroup } from '../../lib/useFavorites'

interface Props {
  groups:   FavGroup[]
  onPick:   (idx: number) => void
  onClose:  () => void
  channelName: string
}

export default function FavPickerModal({ groups, onPick, onClose, channelName }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#222] border border-white/10 rounded-2xl p-4 w-72 shadow-2xl mb-8 sm:mb-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-xs text-white/40 mb-3 truncate">
          Favorilere ekle: <span className="text-white/70">{channelName}</span>
        </div>
        <div className="flex flex-col gap-2">
          {groups.map((g, i) => (
            <button
              key={i}
              onClick={() => onPick(i)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-700/60 transition-colors text-sm text-white/80"
            >
              <span>⭐ {g.name}</span>
              <span className="text-white/30 text-xs">{g.channels.length}/10</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-xs text-white/30 hover:text-white/60 py-1"
        >
          İptal
        </button>
      </div>
    </div>
  )
}
