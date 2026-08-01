/**
 * Dev-only: render the poster once and rasterize it to a PNG so the result can
 * be eyeballed without starting the viewer. Not part of any build.
 *
 *     npx vite build --config vite.lib.config.ts && node scripts/preview.ts out.png [scale]
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { BASE_HEIGHT, BASE_WIDTH, CANONICAL_RENDER } from "../src/tilePyramid.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "preview.png";
const scale = Number(process.argv[3] ?? 1);

const lib = await import(pathToFileURL(path.join(here, "../dist-lib/toronto-map-ai.js")).href);
const svg = lib.renderTorontoMap({ ...CANONICAL_RENDER, width: BASE_WIDTH, height: BASE_HEIGHT });

const browser = await chromium.launch();
const page = await browser.newPage({
    viewport: { width: Math.round(BASE_WIDTH * scale), height: Math.round(BASE_HEIGHT * scale) },
    deviceScaleFactor: 1,
});
await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${BASE_WIDTH * scale}px;height:${BASE_HEIGHT * scale}px}</style>${svg}`
);
await page.waitForTimeout(600);
const buf = await page.screenshot({ type: "png" });
await browser.close();
await writeFile(path.resolve(out), buf);
console.log(`wrote ${out} (${Math.round(BASE_WIDTH * scale)}x${Math.round(BASE_HEIGHT * scale)})`);
