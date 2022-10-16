import typescript from '@rollup/plugin-typescript'

export default {
    input: "./packages/vue/src/index.ts",
    output: [
        {
            format: "cjs",
            file: "packages/vue/dist/vue-next.cjs.js"
        },
        {
            format: "es",
            file: "packages/vue/dist/vue-next.esm.js"
        }
    ],
    plugins: [typescript()]
}
