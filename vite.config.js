import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('lightweight-charts')) {
            return 'vendor-charts'
          }
          if (id.includes('@microsoft/signalr')) {
            return 'vendor-signalr'
          }
          return undefined
        },
      },
    },
  },
})
