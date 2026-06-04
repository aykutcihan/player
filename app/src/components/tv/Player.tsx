import { forwardRef } from 'react'
import type { Channel } from '../../lib/m3u'
import VideoPlayer, { type VideoPlayerHandle } from '../VideoPlayer'

interface Props {
  channel:       Channel
  showControls?: boolean
}

const Player = forwardRef<VideoPlayerHandle, Props>(({ channel, showControls }, ref) => {
  return (
    <div className="flex flex-col h-full bg-black">
      <VideoPlayer ref={ref} url={channel.url} showControls={showControls} />
    </div>
  )
})

Player.displayName = 'Player'
export default Player
