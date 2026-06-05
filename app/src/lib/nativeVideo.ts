import { registerPlugin } from '@capacitor/core'

export interface NativeVideoPlugin {
  play(options: { url: string }): Promise<void>
  stop(): Promise<void>
}

export const NativeVideo = registerPlugin<NativeVideoPlugin>('NativeVideo', {
  // Web fallback — native olmayan ortamda (browser/Tizen) hiçbir şey yapma
  web: {
    play: async () => {},
    stop: async () => {},
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
