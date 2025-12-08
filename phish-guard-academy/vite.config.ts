import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/ocr_status': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/analyze_image': 'http://localhost:8000',
      '/annotated_image': 'http://localhost:8000',
      '/preprocessed_image': 'http://localhost:8000',
      '/debug_ocr': 'http://localhost:8000',
      '/feedback': 'http://localhost:8000',
      '/enrich_url': 'http://localhost:8000',
    }
  }
})
