import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { defineConfig } from 'vitest/config'

const styleStub = fileURLToPath(new URL('./test/styleStub.ts', import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()], dts: 'src/types/auto-imports.d.ts' }),
    Components({ resolvers: [ElementPlusResolver()], dts: 'src/types/components.d.ts' })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    testTimeout: 20000,
    alias: [
      { find: /^element-plus\/es\/components\/.*\/style\/css$/, replacement: styleStub },
      { find: /^element-plus\/theme-chalk\/.*\.css$/, replacement: styleStub }
    ]
  }
})
