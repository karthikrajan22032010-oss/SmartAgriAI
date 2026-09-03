import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api requests to the backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // Make ESP32 IPs available as constants (read-only, not sensitive)
    __ESP32_IP__: JSON.stringify('192.168.150.103'),
    __ESP32_CAM_IP__: JSON.stringify('192.168.150.102'),
  },
})
