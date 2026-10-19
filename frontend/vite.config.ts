import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Настройки 2GIS берём из корневого .env (рядом с docker-compose) или из переменных окружения сборки.
  // frontend/.env, если он есть, имеет приоритет.
  const rootEnv = loadEnv(mode, '..', 'VITE_2GIS_')
  const localEnv = loadEnv(mode, process.cwd(), 'VITE_2GIS_')
  const mapglEnv = (name: string) => JSON.stringify(localEnv[name] || rootEnv[name] || '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_2GIS_KEY': mapglEnv('VITE_2GIS_KEY'),
      'import.meta.env.VITE_2GIS_STYLE_ID': mapglEnv('VITE_2GIS_STYLE_ID'),
      'import.meta.env.VITE_2GIS_STYLE_ID_DARK': mapglEnv('VITE_2GIS_STYLE_ID_DARK'),
    },
    server: {
      // В dev-режиме запросы к API идут на локальный бэкенд, как через nginx в Docker
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  }
})
