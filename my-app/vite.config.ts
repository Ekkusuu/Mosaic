import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load env variables from the repo root so frontend can read the main .env
  // Only variables prefixed with VITE_ are exposed to the client bundle
  envDir: '..',
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5178,
  },
})
