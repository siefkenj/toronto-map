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

## Viewing: zoom & pan (not viewport-scaled)

The demo app renders the SVG at native size inside a zoom/pan viewport driven by
[`svg-pan-zoom`](https://github.com/bumbu/svg-pan-zoom) (see `src/main.tsx`) — scroll to
zoom, drag to pan, double-click to zoom in, with on-screen controls. The map is **not**
squashed to fit the window. `renderTorontoMap()` itself just returns the SVG string; the
pan/zoom wrapper is a viewing concern in the app shell.

## Notes / next steps

- The downtown core is label-dense (every ★★★ landmark clusters there). A future pass could
  add leader lines / collision avoidance, or gate landmark labels behind a zoom tier.
- Bureaucratic neighbourhood names are intentionally **not** drawn from the polygon data;
  labels come from the curated colloquial list per `map-content-reference.md` §10a.
