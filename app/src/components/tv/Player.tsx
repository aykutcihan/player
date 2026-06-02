import type { Channel } from '../../lib/m3u'
import VideoPlayer from '../VideoPlayer'

interface Props {
  channel: Channel
}

export default function Player({ channel }: Props) {
  return (
    <div className="flex flex-col h-full bg-black">
      <VideoPlayer url={channel.url} title={channel.name} />
    </div>
  )
}
