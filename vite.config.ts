import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { smtpServerPlugin } from './vite-plugin-smtp.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), smtpServerPlugin()],
})

