import { registerPlugin } from '@capacitor/core'

export interface NativeVideoPlugin {
  play(options: { url: string }): Promise<void>
  stop(): Promise<void>
  addListener(event: 'videoState', handler: (data: { state: string }) => void): Promise<{ remove: () => void }>
}

export const NativeVideo = registerPlugin<NativeVideoPlugin>('NativeVideo', {
  web: {
    play: async () => {},
    stop: async () => {},
    addListener: async () => ({ remove: () => {} }),
  },
})

export function isNativeVideoAvailable(): boolean {
  // NativeVideo native plugin stabil olmadığından web player kullanıyoruz
  return false
}
