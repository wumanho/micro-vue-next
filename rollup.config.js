import typescript from '@rollup/plugin-typescript'
import config from "./package.json"

export default {
    input: "./src/index.ts",
    output: [
        {
            format: "cjs",
            file: config.main
        },
        {
            format: "es",
            file: config.module
        }
    ],
    plugins: [typescript()]
}