import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
        input: path.join(__dirname, 'main/index.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
        input: path.join(__dirname, 'preload/index.ts')
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: path.join(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    plugins: [react()]
  }
})
