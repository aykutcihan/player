import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type {
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderResponse,
  LoaderStats,
} from 'hls.js'

// CORS tarayıcı/WebView kısıtlamasıdır — native HTTP isteği buna tabi değildir.
// Native platformda manifest/segment istekleri CapacitorHttp ile yapılır, böylece
// Access-Control-Allow-Origin header'ı olmayan kaynaklar (ör. tvkulesi) da oynatılabilir.
export const useCapacitorHttpLoader = () => Capacitor.isNativePlatform()

// Cihazda Chrome DevTools erişimi olmadığı için son yükleme denemelerini
// hata ekranında gösterip teşhis koymaya yarar.
const debugLog: string[] = []
export function pushDebug(line: string) {
  debugLog.push(line)
  if (debugLog.length > 12) debugLog.shift()
}
export function getDebugLog(): string[] {
  return [`platform=${Capacitor.getPlatform()} native=${Capacitor.isNativePlatform()}`, ...debugLog]
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binStr = atob(base64)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  return bytes.buffer
}

function emptyStats(): LoaderStats {
  return {
    aborted: false,
    loaded: 0,
    retry: 0,
    total: 0,
    chunkCount: 0,
    bwEstimate: 0,
    loading:   { start: 0, first: 0, end: 0 },
    parsing:   { start: 0, end: 0 },
    buffering: { start: 0, first: 0, end: 0 },
  }
}

export class CapacitorHttpLoader implements Loader<LoaderContext> {
  context: LoaderContext | null = null
  stats: LoaderStats = emptyStats()
  private aborted = false

  load(context: LoaderContext, _config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) {
    this.context = context
    this.aborted = false
    this.stats = emptyStats()
    this.stats.loading.start = performance.now()

    const isBinary = context.responseType === 'arraybuffer'
    const shortUrl = context.url.length > 60 ? context.url.slice(0, 60) + '…' : context.url

    CapacitorHttp.get({
      url: context.url,
      headers: context.headers ?? {},
      responseType: isBinary ? 'arraybuffer' : 'text',
    }).then((res) => {
      if (this.aborted) return
      this.stats.loading.first = this.stats.loading.end = performance.now()

      if (res.status >= 400) {
        pushDebug(`HTTP ${res.status} ← ${shortUrl}`)
        callbacks.onError({ code: res.status, text: `HTTP ${res.status}` }, context, res, this.stats)
        return
      }

      const data: string | ArrayBuffer = isBinary
        ? base64ToArrayBuffer(res.data as string)
        : (typeof res.data === 'string' ? res.data : JSON.stringify(res.data))

      const size = isBinary ? (data as ArrayBuffer).byteLength : (data as string).length
      this.stats.loaded = this.stats.total = size
      pushDebug(`OK ${size}b ← ${shortUrl}`)

      const response: LoaderResponse = { url: res.url || context.url, data }
      callbacks.onSuccess(response, this.stats, context, res)
    }).catch((err) => {
      if (this.aborted) return
      const msg = err?.message ?? 'CapacitorHttp load error'
      pushDebug(`ERR ${msg} ← ${shortUrl}`)
      callbacks.onError({ code: 0, text: msg }, context, err, this.stats)
    })
  }

  abort() {
    this.aborted = true
    this.stats.aborted = true
  }

  destroy() {
    this.abort()
  }
}
