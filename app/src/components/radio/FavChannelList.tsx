import { useState, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Channel } from '../../lib/m3u'

interface ItemProps {
  channel:  Channel
  active:   boolean
  onSelect: (ch: Channel) => void
  onRemove: () => void
}

function SortableItem({ channel, active, onSelect, onRemove }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: channel.tvgId })

  const [confirm, setConfirm] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const didLong  = useRef(false)

  const startPress = () => {
    didLong.current = false
    timerRef.current = setTimeout(() => {
      didLong.current = true
      setConfirm(true)
    }, 500)
  }
  const endPress = () => {
    clearTimeout(timerRef.current)
    if (!didLong.current) onSelect(channel)
  }
  const cancelPress = () => clearTimeout(timerRef.current)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/5 select-none ${
          active ? 'bg-red-900/40' : 'hover:bg-white/5'
        }`}
      >
        {/* Sürükle tutacağı */}
        <span
          {...attributes}
          {...listeners}
          className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing text-lg leading-none"
        >
          ⠿
        </span>

        {/* Kanal — basılı tut = sil onayı, tek tık = çal */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={cancelPress}
        >
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-7 h-7 rounded-lg object-contain bg-white/10 shrink-0" />
            : <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">📻</div>
          }
          <span className="text-sm text-white/80 truncate">{channel.name}</span>
        </div>
      </div>

      {/* Silme onay dialogu */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setConfirm(false)}
        >
          <div
            className="bg-[#222] border border-white/10 rounded-2xl p-5 w-64 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm text-white/80 mb-1 font-medium">Favoriden kaldır?</div>
            <div className="text-xs text-white/40 mb-4 truncate">{channel.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirm(false); onRemove() }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                Evet
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
              >
                Hayır
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface Props {
  channels:  Channel[]
  active:    Channel | null
  onSelect:  (ch: Channel) => void
  onRemove:  (tvgId: string) => void
  onReorder: (oldIdx: number, newIdx: number) => void
}

export default function FavChannelList({ channels, active, onSelect, onRemove, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    const oldIdx = channels.findIndex(c => c.tvgId === a.id)
    const newIdx = channels.findIndex(c => c.tvgId === over.id)
    if (oldIdx !== -1 && newIdx !== -1) onReorder(oldIdx, newIdx)
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-white/20 text-xs text-center px-4">
        <span className="text-2xl mb-2">⭐</span>
        Kanallara basılı tutarak buraya ekle
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={channels.map(c => c.tvgId)} strategy={verticalListSortingStrategy}>
        {channels.map(ch => (
          <SortableItem
            key={ch.tvgId}
            channel={ch}
            active={active?.tvgId === ch.tvgId}
            onSelect={onSelect}
            onRemove={() => onRemove(ch.tvgId)}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
