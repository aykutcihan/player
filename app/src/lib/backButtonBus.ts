// Geri tuşu olayını sayfa bileşenleri arasında koordine eder
let consumed = false

export const backButtonBus = {
  consume() { consumed = true; setTimeout(() => { consumed = false }, 100) },
  isConsumed() { return consumed },
}
