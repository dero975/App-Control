import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vendor separati dal codice app: chunk stabili tra deploy (cache browser)
        // e caricamento piu snello. supabase-js e il costo fisso maggiore.
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react'
        },
      },
    },
  },
})
