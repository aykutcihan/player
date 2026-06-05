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
  const cap = (window as any).Capacitor
  if (!cap) return false
  // isNativePlatform bir fonksiyon veya boolean olabilir
  const native = typeof cap.isNativePlatform === 'function'
    ? cap.isNativePlatform()
    : cap.isNativePlatform
  return !!native
}
