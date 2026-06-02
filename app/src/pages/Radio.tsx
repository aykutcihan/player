import { useStore } from '../store/useStore'
import RadioList   from '../components/radio/RadioList'
import RadioPlayer from '../components/radio/RadioPlayer'

export default function Radio() {
  const { radioChannels, activeRadio, setRadio } = useStore()
  return (
    <div className="flex h-[calc(100svh-48px)]">
      <div className="flex flex-col w-72 bg-[#1a1a1a] border-r border-white/10 shrink-0 overflow-y-auto">
        <RadioList
          channels={radioChannels}
          active={activeRadio}
          onSelect={setRadio}
        />
      </div>
      <div className="flex-1 flex items-center justify-center bg-[#111]">
        {activeRadio
          ? <RadioPlayer channel={activeRadio} />
          : <p className="text-white/40">Radyo seçin</p>
        }
      </div>
    </div>
  )
}
