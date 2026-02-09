import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'
import path from 'path'
import commonjs from '@rollup/plugin-commonjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'src/main/index.ts',
        onstart(options) {
          // Start Electron when main process build is complete
          options.startup()
        },
        vite: {
            build: {
                outDir: 'dist/main',
                rollupOptions: {
                    // Externalize modules to avoid bundling issues
                    external: [
                        'gun', 'gun/sea', 'gun/lib/webrtc', 'gun/lib/radix', 'gun/lib/radisk', 'gun/lib/store', 'gun/lib/rindexed',
                        '@ai-sdk/gateway', '@vercel/oidc'
                    ]
                }
            },
            plugins: [
                commonjs({
                    ignoreDynamicRequires: true
                })
            ]
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
          // instead of restarting the entire Electron App.
          options.reload()
        },
        vite: {
            build: {
                outDir: 'dist/preload',
            }
        }
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'eventemitter3': path.resolve(__dirname, 'node_modules/eventemitter3/index.js'),
    },
  },
})
