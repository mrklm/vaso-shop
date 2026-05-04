import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isElectron = process.env.ELECTRON === '1'
const isNetlify = process.env.NETLIFY === 'true'

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : isNetlify ? '/' : '/vaso-shop/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
