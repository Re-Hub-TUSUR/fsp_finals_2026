import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: false,
    // Сценарные тесты (квиз, сканер) проходят десятки кликов: под нагрузкой 5 секунд по умолчанию не хватает
    testTimeout: 15000,
  },
})
