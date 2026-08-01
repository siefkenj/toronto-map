/**
 * Geometry of the pre-rendered raster pyramid.
 *
 * Shared by the build-time tile generator (scripts/prerender-tiles.ts) and the
 * viewer (routes/PreRendered.tsx) so the two can never disagree. Pure constants
 * — no asset imports — so Node can load it directly.
 *
 * Every level is a rasterization of ONE canonical SVG render at a different
 * scale, never a separate render. See CANONICAL_RENDER below for why.
 */

/**
 * The single set of options every view of the map is rendered with — the live
 * route and the tile pyramid alike.
 *
 * This has to be shared rather than duplicated. renderTorontoMap() lays labels
 * out for the canvas it is handed, so two renders with different options are
 * two different maps: at 2000x1500 with this inset it places 375 labels, at
 * 8192x6144 it places 483, and the inset panel changes size with it. Tiles
 * built per-level that way disagree with each other and with the live map.
 */
export interface PosterRenderOptions {
    inset?: { width?: number };
    index?: { sideColumn?: number };
}
export const CANONICAL_RENDER: PosterRenderOptions = { inset: { width: 660 }, index: { sideColumn: 1.4 } };

/**
 * Nominal size of the canonical render — its `viewBox`, and so the coordinate
 * system every tile coordinate is expressed in.
 */
export const NOMINAL_WIDTH = 2000;
export const NOMINAL_HEIGHT = 1500;

/**
 * Tile size is 500, not the more usual 512, so that level 0 is exactly the
 * SVG's own 2000x1500 user-unit space: base-level pixel == SVG coordinate, with
 * no scale factor to carry around, and no ragged part-tiles at the edges
 * (2000/500 = 4, 1500/500 = 3).
 */
export const TILE_SIZE = 500;

/** Pixel size of zoom level 0. Each level up doubles both dimensions. */
export const BASE_WIDTH = NOMINAL_WIDTH;
export const BASE_HEIGHT = NOMINAL_HEIGHT;

/**
 * Deepest level rendered to disk. Past this the viewer upscales the deepest
 * tiles it has. Since every level is the same vector artwork, this is purely a
 * question of how far you can zoom before the raster softens.
 *
 * z3 is 16000x12000 — 8x the nominal render, 768 tiles. Levels beyond z2 are
 * rasterized in chunks; see MAX_CHUNK_* in scripts/prerender-tiles.ts.
 */
export const MAX_NATIVE_ZOOM = 3;

/**
 * Extra zoom levels the viewer allows beyond the deepest rendered one, where it
 * upscales the deepest tiles it has.
 *
 * Two, not three: each level of overzoom doubles the blur, and at 8x the map is
 * an unreadable smear. With z3 rendered natively the maximum zoom is unchanged
 * from when z2 was the deepest — but every zoom below it is now backed by twice
 * the pixels, so the extra level buys detail rather than more blur.
 */
export const OVERZOOM_LEVELS = 2;

/** Directory (relative to the site root) holding `{z}/{x}/{y}.webp`. */
export const TILE_DIR = "tiles";

/** Quality passed to the WebP encoder. The poster is mostly flat paper, so
 *  even 80 keeps the engraved line work clean at a few KB per tile. */
export const WEBP_QUALITY = 80;

export interface LevelSize {
    width: number;
    height: number;
    cols: number;
    rows: number;
}

/** Pixel dimensions and tile grid of one zoom level. */
export function levelSize(z: number): LevelSize {
    const width = BASE_WIDTH * 2 ** z;
    const height = BASE_HEIGHT * 2 ** z;
    return { width, height, cols: width / TILE_SIZE, rows: height / TILE_SIZE };
}

/** Shape of `tiles/manifest.json`, written by the generator. */
export interface TileManifest {
    tileSize: number;
    baseWidth: number;
    baseHeight: number;
    maxNativeZoom: number;
    /** Where to open the map, in base-level pixels — the downtown core. */
    anchor: { x: number; y: number };
}
