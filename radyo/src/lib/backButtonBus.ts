// Sayfa bileşenleri geri tuşunu intercept edebilir
// register() → true döndürürse Layout handle etmez

type Handler = () => boolean

let _handler: Handler | null = null

export const backButtonBus = {
  register(h: Handler)  { _handler = h },
  unregister()          { _handler = null },
  handle(): boolean     { return _handler ? _handler() : false },
  // eski API uyumu
  consume()             {},
  isConsumed()          { return false },
}
