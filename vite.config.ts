/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '../tflite_web_api_client': path.resolve(__dirname, 'node_modules/@tensorflow/tfjs-tflite/dist/tflite_web_api_client.js'),
      './tflite_web_api_client': path.resolve(__dirname, 'node_modules/@tensorflow/tfjs-tflite/dist/tflite_web_api_client.js'),
    }
  },
  plugins: [
    react(),
    legacy()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
