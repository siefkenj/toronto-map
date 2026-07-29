/**
 * Build-time generator for the raster tile pyramid served on `#/pre-rendered`.
 *
 * The poster is rendered to SVG exactly ONCE, with the same options the live
 * route uses. Each zoom level is that one SVG rasterized at a different scale
 * (its viewBox makes it resolution-independent), then sliced into WebP tiles at
 * `public/tiles/{z}/{x}/{y}.webp`.
 *
 * Rendering per level instead would produce a different map at every level:
 * renderTorontoMap lays labels out for the canvas it is handed, so the label
 * set, the inset panel and the relative line weights all shift with the size.
 * Zooming would then silently swap one map for another. One render, many
 * rasterizations: every level is the same artwork, and because Chromium
 * re-rasterizes the vectors at each scale, nothing softens on the way up.
 *
 * Why Chromium: the SVG carries its fonts as base64 @font-face payloads, which
 * the lightweight SVG rasterizers do not reliably honour. Chromium renders
 * exactly what the browser shows.
 *
 * Run via `npm run prerender` (wireit handles the dist-lib dependency).
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import {
    BASE_HEIGHT,
    BASE_WIDTH,
    CANONICAL_RENDER,
    MAX_NATIVE_ZOOM,
    TILE_SIZE,
    WEBP_QUALITY,
    levelSize,
    type PosterRenderOptions,
    type TileManifest,
} from "../src/tilePyramid.ts";

/** Tiles encoded concurrently. sharp releases the event loop, but each holds a
 *  decoded tile buffer, so this stays modest. */
const ENCODE_CONCURRENCY = 8;

/**
 * Largest region rasterized in a single screenshot. Deep levels are far too big
 * to capture at once — z3 is 16000x12000, which would be a ~770 MB decoded
 * frame — so they are captured as a grid of chunks and sliced chunk by chunk.
 *
 * Must be multiples of TILE_SIZE so chunk edges fall on tile boundaries.
 */
const MAX_CHUNK_WIDTH = 8000;
const MAX_CHUNK_HEIGHT = 6000;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const libEntry = path.join(projectRoot, "dist-lib", "toronto-map-ai.js");
const outDir = path.join(projectRoot, "public", "tiles");

// The renderer is loaded from the compiled library rather than from src/: the
// source imports .geojson.json without import attributes, which Node rejects,
// whereas the lib build has the data inlined. Typed structurally to avoid
// pulling the 6 MB of bundled geojson into this script's type graph.
interface RenderModule {
    renderTorontoMap: (options?: PosterRenderOptions) => string;
    defaultViewAnchor: (options?: PosterRenderOptions) => { x: number; y: number };
}

async function loadRenderer(): Promise<RenderModule> {
    try {
        return (await import(pathToFileURL(libEntry).href)) as RenderModule;
    } catch (cause) {
        throw new Error(
            `Could not load ${path.relative(projectRoot, libEntry)}. Run \`npm run build:lib\` first.`,
            { cause },
        );
    }
}

interface Chunk {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Split a level into rasterizable chunks. Edges land on tile boundaries, so
 * every tile falls entirely inside exactly one chunk.
 */
function chunkGrid(width: number, height: number): Chunk[] {
    if (MAX_CHUNK_WIDTH % TILE_SIZE !== 0 || MAX_CHUNK_HEIGHT % TILE_SIZE !== 0) {
        throw new Error("MAX_CHUNK_WIDTH/HEIGHT must be multiples of TILE_SIZE");
    }
    const chunks: Chunk[] = [];
    for (let top = 0; top < height; top += MAX_CHUNK_HEIGHT) {
        for (let left = 0; left < width; left += MAX_CHUNK_WIDTH) {
            chunks.push({
                left,
                top,
                width: Math.min(MAX_CHUNK_WIDTH, width - left),
                height: Math.min(MAX_CHUNK_HEIGHT, height - top),
            });
        }
    }
    return chunks;
}

/**
 * Rasterize one region of the poster scaled to `width` x `height`.
 *
 * The SVG is laid out at the full level size and shifted under a viewport the
 * size of the chunk, so Chromium only ever composites a chunk-sized frame — but
 * the vectors are still rasterized at the deep level's scale, which is the whole
 * point of going deeper.
 */
async function rasterizeChunk(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    svg: string,
    width: number,
    height: number,
    chunk: Chunk,
): Promise<Buffer> {
    const page = await browser.newPage({
        viewport: { width: chunk.width, height: chunk.height },
        deviceScaleFactor: 1,
    });
    try {
        // The CSS size overrides the SVG's width/height attributes, and its
        // viewBox scales the artwork to fit — so every level is the same drawing
        // re-rasterized from vectors, never an upscale of a smaller raster.
        // The poster paints its own paper background edge to edge; the white
        // page behind it only shows through if a render ever falls short.
        await page.setContent(
            `<style>html,body{margin:0;background:#fff;overflow:hidden}` +
                `#chunk{position:absolute;left:${-chunk.left}px;top:${-chunk.top}px}` +
                `svg{width:${width}px;height:${height}px;display:block}</style>` +
                `<div id="chunk">${svg}</div>`,
            { waitUntil: "load" },
        );
        // Passed as a string rather than a closure so this Node-side script does
        // not have to pull the DOM lib into its type graph. The poster's fonts
        // are base64 @font-face payloads; screenshotting before they resolve
        // gives a page of fallback serif.
        await page.evaluate("document.fonts.ready");
        return await page.screenshot({ type: "png" });
    } finally {
        await page.close();
    }
}

/** Run `task` over `items`, at most `limit` at a time. */
async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            await task(items[next++]);
        }
    });
    await Promise.all(workers);
}

async function main() {
    const { renderTorontoMap, defaultViewAnchor } = await loadRenderer();

    // Rebuild from scratch: a stale tile from an older render is invisible in
    // review but very visible in the map.
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    // Rendered once, reused for every level. Passing no width/height leaves the
    // renderer at its nominal 2000x1500 viewBox, which is the coordinate space
    // the pyramid is defined in.
    const svg = renderTorontoMap(CANONICAL_RENDER);

    const browser = await chromium.launch();
    let totalTiles = 0;
    let totalBytes = 0;

    try {
        for (let z = 0; z <= MAX_NATIVE_ZOOM; z++) {
            const { width, height, cols, rows } = levelSize(z);
            const started = performance.now();

            for (let x = 0; x < cols; x++) {
                await mkdir(path.join(outDir, String(z), String(x)), { recursive: true });
            }

            let levelBytes = 0;
            let rasterMs = 0;
            const chunks = chunkGrid(width, height);

            for (const chunk of chunks) {
                const chunkStarted = performance.now();
                const png = await rasterizeChunk(browser, svg, width, height, chunk);
                rasterMs += performance.now() - chunkStarted;

                // clone() reuses the single decoded copy of the chunk raster
                // rather than re-decoding it once per tile.
                const source = sharp(png);

                const tiles: Array<{ x: number; y: number }> = [];
                for (let y = chunk.top / TILE_SIZE; y < (chunk.top + chunk.height) / TILE_SIZE; y++) {
                    for (let x = chunk.left / TILE_SIZE; x < (chunk.left + chunk.width) / TILE_SIZE; x++) {
                        tiles.push({ x, y });
                    }
                }

                await mapLimit(tiles, ENCODE_CONCURRENCY, async ({ x, y }) => {
                    const buf = await source
                        .clone()
                        .extract({
                            // tile coordinates are level-global; the chunk raster
                            // starts at (chunk.left, chunk.top)
                            left: x * TILE_SIZE - chunk.left,
                            top: y * TILE_SIZE - chunk.top,
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                        })
                        .webp({ quality: WEBP_QUALITY })
                        .toBuffer();
                    await writeFile(path.join(outDir, String(z), String(x), `${y}.webp`), buf);
                    levelBytes += buf.length;
                });

                totalTiles += tiles.length;
            }

            totalBytes += levelBytes;
            const tileCount = cols * rows;
            console.log(
                `z${z}  ${width}x${height}  ${tileCount} tiles  ` +
                    `${(levelBytes / 1e6).toFixed(2)} MB  ` +
                    `(${chunks.length} chunk${chunks.length === 1 ? "" : "s"}, ` +
                    `raster ${(rasterMs / 1000).toFixed(1)}s, ` +
                    `slice ${((performance.now() - started - rasterMs) / 1000).toFixed(1)}s)`,
            );
        }
    } finally {
        await browser.close();
    }

    // Base-level pixel position of downtown, so the viewer can open where the
    // interactive map does instead of on empty suburbia. Level 0 is 1:1 with the
    // render's own coordinates, so this needs no rescaling.
    const anchor = defaultViewAnchor(CANONICAL_RENDER);
    const manifest: TileManifest = {
        tileSize: TILE_SIZE,
        baseWidth: BASE_WIDTH,
        baseHeight: BASE_HEIGHT,
        maxNativeZoom: MAX_NATIVE_ZOOM,
        anchor: { x: Math.round(anchor.x), y: Math.round(anchor.y) },
    };
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(
        `\n${totalTiles} tiles, ${(totalBytes / 1e6).toFixed(2)} MB total -> ` +
            `${path.relative(projectRoot, outDir)}`,
    );
}

await main();
