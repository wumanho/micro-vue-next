import {defineConfig} from 'vitest/config'
import * as path from "path";

export default defineConfig({
  test: {
    globals: true
  },
  resolve: {
    alias: [
      {
        find: /@micro-vue-next\/(\w*)/,
        replacement: path.resolve(__dirname, "packages") + "/$1/src"
      }
    ]
  }
})
