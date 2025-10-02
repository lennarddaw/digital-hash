import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
    include: ['onnxruntime-web']
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'transformers': ['@xenova/transformers']
        }
      }
    }
  },
  
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  
  worker: {
    format: 'es'
  }
})