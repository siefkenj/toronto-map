import { defineConfig } from "vite";

// Library build: emits a compiled module exposing `renderTorontoMap`.
// The geojson assets are bundled in, so the output is self-contained.
export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "TorontoMapAI",
            fileName: "toronto-map-ai",
            formats: ["es", "umd"],
        },
        outDir: "dist-lib",
    },
});
