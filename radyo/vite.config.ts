import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/tv-takip/radyo-app/',
  build: {
    target: ['es2015', 'chrome68'],
  },
})
