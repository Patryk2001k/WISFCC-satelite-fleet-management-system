import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [
    react(),
    cesium()
  ],
  worker: {
    format: 'es' // <-- Zmusza Vite do użycia nowoczesnego formatu ES dla wątków
  },
  build: {
    target: 'esnext' // <-- Pozwala na używanie najnowszego standardu JavaScript (w tym top-level await)
  }
})