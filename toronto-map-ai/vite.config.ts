import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relocatable build: `vite build` emits relative asset URLs ("./assets/…") so
// dist/ runs from any location (domain root, a "/toronto-map/" project-pages
// subpath, a custom domain, file://). The dev/preview server keeps an absolute
// base ("/") — Vite's server expects that — and binds all interfaces
// (host: true) so the port forwarded out of the dev container is reachable.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    base: command === "build" ? "./" : "/",
    plugins: [react()],
    server: {
        host: true,
    },
    preview: {
        host: true,
    },
}));
