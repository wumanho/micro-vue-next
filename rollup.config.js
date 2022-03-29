import typescript from '@rollup/plugin-typescript'

export default {
    input: "./src/index.ts",
    output: [
        {
            format: "cjs",
            file: 'lib/vue-next.cjs.js'
        },
        {
            format: "es",
            file: 'lib/vue-next.esm.js'
        }
    ],
    plugins: [typescript()]
}