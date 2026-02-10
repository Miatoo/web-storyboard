import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow LAN access
    port: 5173,
    // Uncomment below for HTTPS (requires certificate)
    // https: {
    //   key: fs.readFileSync('./localhost+3-key.pem'),
    //   cert: fs.readFileSync('./localhost+3.pem'),
    // }
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
