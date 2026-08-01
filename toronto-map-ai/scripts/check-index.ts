/**
 * Dev check: the gazetteer panel prints every indexed feature, so every one of
 * them has to be findable on the sheet. The renderer works this out while it
 * lays the labels out and records the verdict in an SVG comment; this script
 * just surfaces it and fails the process if anything is unreachable.
 *
 * Features reduced to a bare numbered badge are fine — that is the documented
 * fallback for the crowded core, and they still carry a leader to their spot.
 *
 *     npx vite build --config vite.lib.config.ts && node scripts/check-index.ts
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BASE_HEIGHT, BASE_WIDTH, CANONICAL_RENDER } from "../src/tilePyramid.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const lib = await import(pathToFileURL(path.join(here, "../dist-lib/toronto-map-ai.js")).href);
const svg: string = lib.renderTorontoMap({ ...CANONICAL_RENDER, width: BASE_WIDTH, height: BASE_HEIGHT });

console.log((svg.match(/<!-- \d+ low-priority[^>]*-->/) ?? ["<!-- no labels dropped -->"])[0]);

const index = svg.match(/<!-- index:[\s\S]*?-->/);
if (!index) {
    console.error("no index-integrity comment found — did renderTorontoMap change?");
    process.exit(2);
}
console.log(index[0]);

if (index[0].includes("MISSING")) {
    console.error("\nFAIL: the panel lists entries that appear nowhere on the map.");
    process.exit(1);
}
console.log("\nOK: every indexed feature is on the sheet.");
