import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // В dev-режиме запросы к API идут на локальный бэкенд, как через nginx в Docker
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
