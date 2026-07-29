# toronto-map-ai

A historic-style poster map of Toronto, rendered to SVG by JavaScript. The visual theme
blends the two reference maps chosen from `../historic-maps/`:

- **late-1800s manuscript** (`late1800s_railways_harbour.jpg`): aged paper, sepia ink,
  a soft blue watercolour harbour with a **feathered shoreline**.
- **1854 steel engraving** (`1854_map_of_toronto.png`): a scroll **title cartouche**,
  a **braided neatline** border, and engraved **water-lines** in the harbour.

It plots all the ★★★ ("essential") items from `../map-content-reference.md`: the six former
boroughs, colloquial neighbourhoods (Chinatown, Greektown, Little Italy/Jamaica/India,
Kensington, Distillery, Leslieville, Jane and Finch, …), the defining street spines
(Yonge, Bloor, Danforth, Queen, King, Dundas, College, Spadina, Bathurst, St. Clair,
Eglinton — real OSM geometry), skyline + waterfront landmarks, Lake Ontario, the rivers,
and the surrounding municipalities as margin "blobs" pointing outward.

## The single render function

The whole map is produced by one pure, framework-agnostic function that returns a
self-contained SVG string (data is bundled in — no runtime fetch, no React needed):

```ts
import { renderTorontoMap } from "toronto-map-ai";   // from the compiled module

const svg: string = renderTorontoMap({ width: 2000, height: 1500 });
document.querySelector("#map")!.innerHTML = svg;
```

- Source of truth: [`src/render/renderMap.ts`](src/render/renderMap.ts) → `renderTorontoMap()`.
- Public entry: [`src/index.ts`](src/index.ts) re-exports it.

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | Vite dev server; React shell (`src/main.tsx`) injects the SVG. |
| `npm run build` | Type-check + build the demo app into `dist/`. |
| `npm run build:lib` | Build the **compiled module** into `dist-lib/` (ESM `toronto-map-ai.js` + UMD). This is the artifact a future consumer imports `renderTorontoMap` from. |

## Layout

```
src/
  index.ts              public entry (exports renderTorontoMap)
  main.tsx              React shell for the dev preview
  render/
    renderMap.ts        THE render function (all layers + decorative apparatus)
    projection.ts       auto-fitting rotated affine projection (lon/lat → px)
    geometry.ts         Mat affine class + polygon helpers (from toronto-map)
    style.ts            palette + typography + label hierarchy
    svg.ts              SVG-string builders (el/text/path helpers)
  data/
    places.ts           curated ★★★ labels (regions, neighbourhoods, municipalities, landmarks, rivers)
  assets/
    toronto-level-10-simp.geojson.json   official neighbourhoods (fills + boundaries)
    toronto-level-8-simp.geojson.json    former boroughs (region tints + big labels)
    toronto-water-simp.geojson.json      Lake Ontario + rivers
    toronto-streets.geojson.json         major street spines (fetched from OSM, stitched + simplified)
```

## Self-contained output & fonts

The SVG returned by `renderTorontoMap()` is **entirely self-contained** — no external
requests of any kind. All geometry is bundled, and the web fonts are **embedded as
base64 `@font-face` rules inside the SVG** (see [`src/render/fonts.ts`](src/render/fonts.ts)):

- `IM Fell English` (regular + italic) — labels, water, streets
- `Playfair Display` 700 — display titles

Both are SIL Open Font License (OFL), free to embed and redistribute. The raw woff2 files
live in [`src/assets/fonts/`](src/assets/fonts/) purely as the source for regenerating
`fonts.ts`; nothing is fetched at runtime.

## Two views: live renderer and pre-rendered tiles

The app hash-routes between two ways of looking at the same map. Hash routing (not
history routing) keeps the build relocatable — it works from a project-pages subpath, a
custom domain, or `file://`, with no server rewrite rules. Both routes are lazy-loaded,
so neither pays for the other.

| route | what it is | cost on the client |
| --- | --- | --- |
| `#/svg` | **live renderer** — `renderTorontoMap()` output driven by [`svg-pan-zoom`](https://github.com/bumbu/svg-pan-zoom) | ~3.5 MB JS, ~800 ms render, ~7,300 live `<path>` nodes |
| `#/pre-rendered` | **raster pyramid** of that same render, served as static WebP tiles and driven by [Leaflet](https://leafletjs.com/) | a few ~10 KB tiles, ~50 DOM nodes |

The two show the same map, pixel for pixel — the tiles are rasterizations of the live
route's own SVG, so zooming never reveals a different drawing.

**Where `/` lands depends on the host.** Deployed, it redirects to `#/pre-rendered`: most
visitors arrive on a phone and should not be handed a 3.5 MB bundle. Served from
localhost (or `127.0.0.1`, `[::1]`, `*.localhost`) it redirects to `#/svg` instead, since
that is the view being developed against and the one the tiles are generated from. Either
route is always reachable by its own path, on either host; only the redirect changes.

`#/` is the development view: it is the source of truth, and the tiles are generated from
it. It renders at native size inside a zoom/pan viewport — scroll or pinch to zoom, drag
to pan, double-click to zoom in. The map is **not** squashed to fit the window.
`renderTorontoMap()` itself just returns the SVG string; the pan/zoom wrapper is a viewing
concern in the app shell.

`#/pre-rendered` is the one to hand to a slow device. It keeps no vector geometry alive,
so panning and zooming never re-rasterize 400k coordinates.

## The tile pyramid

[`scripts/prerender-tiles.ts`](scripts/prerender-tiles.ts) renders the poster to SVG
**exactly once**, rasterizes that one SVG at each zoom level in headless Chromium, and
slices the results into `public/tiles/{z}/{x}/{y}.webp`. Geometry lives in
[`src/tilePyramid.ts`](src/tilePyramid.ts), shared by the generator and the viewer so the
two cannot disagree.

```
z0   2000x1500     12 tiles   0.20 MB   1 chunk
z1   4000x3000     48 tiles   0.55 MB   1 chunk
z2   8000x6000    192 tiles   1.37 MB   1 chunk
z3  16000x12000   768 tiles   3.40 MB   4 chunks
                 1020 tiles  ~5.5 MB total
```

Levels past z2 are too large to screenshot in one frame — z3 would be a ~770 MB
decoded page — so they are rasterized as a grid of chunks (`MAX_CHUNK_WIDTH` /
`MAX_CHUNK_HEIGHT`) whose edges fall on tile boundaries. The SVG is still laid out at
the full level size and merely shifted under a chunk-sized viewport, so the vectors are
rasterized at the deep level's scale rather than upscaled.

A few decisions worth knowing:

- **One render, many rasterizations — never one render per level.** This is the important
  one. `renderTorontoMap()` lays labels out for the canvas it is handed, so rendering per
  level yields a *different map* at each level: at 2000x1500 it places 375 labels, at
  8000x6000 it places 483, and the inset panel changes size too. Zooming would silently
  swap one map for another. Because the SVG has a `viewBox`, one render can be rasterized
  at 1x/2x/4x from vectors — identical artwork, and nothing softens on the way up.
- **Both views share `CANONICAL_RENDER`.** The options passed to `renderTorontoMap()`
  change the output, so the tiles are a faithful copy of the live route only while both
  sides pass the same ones. They import the same constant rather than repeating it.
- **Tiles are 500px, not 512.** That makes level 0 exactly the SVG's own 2000x1500
  user-unit space: base-level pixel == SVG coordinate, no scale factor to carry around,
  and no ragged part-tiles at the edges.
- **Depth only buys sharpness.** Every level is the same artwork, so each extra level
  just delays the point where the raster softens — at the cost of 4x the tiles. z3 is 8x
  the nominal render. Past it the viewer upscales, via `maxNativeZoom`.
- **Chromium, not a lightweight SVG rasterizer.** The fonts are base64 `@font-face`
  payloads, which the lighter rasterizers do not reliably honour.
- **The viewer never learns any geography.** Leaflet runs on `CRS.Simple`, whose
  coordinates are just pixels of the base render, so the 16° rotation baked into the
  projection is simply part of the picture. No reprojection, no lat/lng.

## Build

[wireit](https://github.com/google/wireit) wires the dependency graph, so the tiles are
regenerated whenever anything they derive from changes — and skipped entirely when it has
not (a no-op build is ~0.2s). It hashes file contents, not mtimes.

```
build:lib ──> prerender ──┬─> build
typecheck ────────────────┘
```

`typecheck` is deliberately *not* upstream of `build:lib`. wireit folds a dependency's
cache key into its dependents, so an all-of-`src` typecheck sitting above the library
build would make every viewer-side edit invalidate the tile pyramid and trigger a
two-minute re-render. `build:lib` therefore watches only what the library entry pulls in
(`src/index.ts`, `src/render/**`, `src/assets/**`), and `build` gates on typecheck
separately.

```bash
npm run build        # typecheck, lib, tiles, site
npm run dev          # tiles (cached) + dev server
npm run dev:nobuild  # dev server only, skip the tile build
npm run prerender    # tiles only
```

`npm run dev` regenerates the tiles first so `#/pre-rendered` is never stale, then starts
Vite. Thanks to the graph above, that costs ~0.1s unless you actually touched the poster;
`dev:nobuild` skips it entirely.

Tile generation needs the Chromium that Playwright manages:

```bash
npx playwright install chromium
```

`public/tiles/` is generated and git-ignored; CI builds it from scratch on every deploy.

## Notes / next steps

- The downtown core is label-dense (every ★★★ landmark clusters there). A future pass could
  add leader lines / collision avoidance, or gate landmark labels behind a zoom tier.
- Bureaucratic neighbourhood names are intentionally **not** drawn from the polygon data;
  labels come from the curated colloquial list per `map-content-reference.md` §10a.
