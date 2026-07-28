import type {
    Feature,
    FeatureCollection,
    Geometry,
    MultiPolygon,
    Polygon,
    Position,
} from "geojson";

import level10Raw from "../assets/toronto-level-10.geojson.json";
import level8Raw from "../assets/toronto-level-8.geojson.json";
import waterRaw from "../assets/toronto-water-hires.geojson.json";
import streetsRaw from "../assets/toronto-streets.geojson.json";
import structuresRaw from "../assets/toronto-core-structures.geojson.json";
import parksRaw from "../assets/toronto-core-parks.geojson.json";
import coreWaterRaw from "../assets/toronto-core-water.geojson.json";
import coreRoadsRaw from "../assets/toronto-core-roads.geojson.json";
import pearsonRaw from "../assets/toronto-pearson.geojson.json";
import transitRaw from "../assets/toronto-transit.geojson.json";
import highwaysRaw from "../assets/toronto-highways.geojson.json";
import stationsRaw from "../assets/toronto-stations.geojson.json";
import highParkRaw from "../assets/toronto-highpark.geojson.json";

import {
    FERRY_ROUTES,
    LANDMARKS,
    MUNICIPALITIES,
    NEIGHBOURHOODS,
    RIVER_LABELS,
    SUPER_DISTRICTS,
} from "../data/places";
import {
    makeProjection,
    type LonLatTuple,
    type Projection,
} from "./projection";
import { FONT_FACE_CSS } from "./fonts";
import { FONTS, LABEL_STYLE, PALETTE } from "./style";
import { el, polyline, round, text, type Pt } from "./svg";
import { pointInPolygon, simpleCenter } from "./geometry";
import { depthContours } from "./bathymetry";
import {
    placeLabels,
    textWidth,
    type Box,
    type LabelInput,
    type PlacedLabel,
    type Rect,
} from "./labelEngine";

const level10 = level10Raw as unknown as FeatureCollection;
const level8 = level8Raw as unknown as FeatureCollection;
const water = waterRaw as unknown as FeatureCollection;
const streets = streetsRaw as unknown as FeatureCollection;
const structures = structuresRaw as unknown as FeatureCollection;
const parks = parksRaw as unknown as FeatureCollection;
const coreWater = coreWaterRaw as unknown as FeatureCollection;
const coreRoads = coreRoadsRaw as unknown as FeatureCollection;
const pearson = pearsonRaw as unknown as FeatureCollection;
const transit = transitRaw as unknown as FeatureCollection;
const highways = highwaysRaw as unknown as FeatureCollection;
const stations = stationsRaw as unknown as FeatureCollection;
const highPark = highParkRaw as unknown as FeatureCollection;

/** Colours for the rapid-transit lines (muted to sit on the sepia palette). */
const TRANSIT_STYLE: Record<string, { color: string; dash?: string; label: string }> = {
    "1": { color: "#b8922e", label: "LINE 1" },
    "2": { color: "#3f7d54", label: "LINE 2" },
    "4": { color: "#7a5aa0", label: "LINE 4" },
    "5": { color: "#c26a2e", label: "LINE 5 EGLINTON" },
    OL: { color: "#356fb0", label: "LINE 3 ONTARIO" },
    UP: { color: "#2f7d78", dash: "7 3.5", label: "UP EXPRESS" },
    GO: { color: "#4a7a3f", label: "GO" }, // station colour only (no line drawn)
};

/** Options controlling the enlarged inset ("minimap") of the core. */
export interface InsetOptions {
    /**
     * Display width of the minimap in map units (px). The panel is anchored to
     * the lower-right corner, so a smaller width shrinks it toward that corner;
     * its height follows automatically to preserve the shown region's aspect.
     */
    width?: number;
    /** Geographic upper-left (NW) corner of the region shown, as [lon, lat]. */
    topLeft?: LonLatTuple;
    /** Geographic lower-right (SE) corner of the region shown, as [lon, lat]. */
    bottomRight?: LonLatTuple;
}

export interface RenderOptions {
    width?: number;
    height?: number;
    /** Configure the enlarged inset of the Old Toronto core. */
    inset?: InsetOptions;
}

/** Defaults for the inset region + size (see InsetOptions). */
export const DEFAULT_INSET: Required<InsetOptions> = {
    width: 800,
    topLeft: [-79.421, 43.668],
    bottomRight: [-79.344, 43.622],
};

/**
 * Screen coordinates of the downtown core in the default-size render, used by the
 * viewer shell to open the map centred on downtown instead of empty suburbia.
 */
export function defaultViewAnchor(options: RenderOptions = {}): { x: number; y: number } {
    const W = options.width ?? 2000;
    const H = options.height ?? 1500;
    const margin = { top: 92, right: 92, bottom: 92, left: 92 };
    const proj = makeProjection({ w: W, h: H }, margin);
    const p = proj.project([-79.3835, 43.652]);
    return { x: p[0], y: p[1] };
}

// label priorities (higher = placed first, wins collisions)
const PRIO = {
    region: 100,
    municipality: 92,
    harbour: 80,
    superDistrict: 74,
    river: 66,
    neighbourhood: 60,
    landmarkIcon: 52,
    landmarkWater: 50,
    street: 44,
    highway: 30,
} as const;

/**
 * Render the entire historic-style Toronto poster as a self-contained SVG string.
 *
 *     import { renderTorontoMap } from "toronto-map-ai";
 *     const svg = renderTorontoMap();
 */
export function renderTorontoMap(options: RenderOptions = {}): string {
    const W = options.width ?? 2000;
    const H = options.height ?? 1500;
    const margin = { top: 92, right: 92, bottom: 92, left: 92 };
    const proj = makeProjection({ w: W, h: H }, margin);
    const { project, frame } = proj;

    const e0 = project([-79.38, 43.68]);
    const e1 = project([-79.37, 43.68]);
    const eastVec = unit([e1[0] - e0[0], e1[1] - e0[1]]);

    // decorative furniture positions (also used as label keep-out zones)
    const inset = layoutInset(proj, options.inset);
    const furniture = layoutFurniture(proj, inset.box);

    // ---- collect all labels and place them without overlap ----
    const munis = computeMunicipalities(proj);
    const inputs = collectLabelInputs(proj, eastVec);
    // transit-line labels are placed on top; reserve their boxes so map labels
    // don't get placed underneath them.
    const transitLabels = computeTransitLabels(proj);
    const keepOut: Box[] = [...furniture.map((f) => f.box), inset.box, ...transitLabels.map((t) => t.box)];
    const { placed: mapLabels, dropped } = placeLabels(inputs, frame as Rect, keepOut);

    // surrounding towns: dedicated layout (names packed along their border, tied
    // to short perpendicular arrows). They sit in the outer strip, so they only
    // need to avoid the furniture + inset.
    const muniLayouts = layoutMunicipalities(proj, munis, [...keepOut]);

    // ---- assemble ----
    const layers: string[] = [];
    layers.push(defs(proj, eastVec));
    layers.push(paperAndVignette(W, H));

    const mapContent: string[] = [];
    mapContent.push(regionsAndNeighbourhoods(proj));
    mapContent.push(waterLayer(proj, eastVec));
    mapContent.push(islandsLayer(proj));
    mapContent.push(highParkLayer(proj));
    mapContent.push(airportLayer(proj));
    mapContent.push(ferryLayer(proj));
    mapContent.push(highwaysLayer(proj));
    mapContent.push(streetsLayer(proj));
    mapContent.push(transitLayer(proj));
    mapContent.push(stationsLayer(proj));
    mapContent.push(landmarkMarkers(proj));
    mapContent.push(emitLeaders(mapLabels));
    mapContent.push(emitLabels(mapLabels));
    // transit labels on top of the map labels (their boxes were reserved above)
    mapContent.push(emitTransitLabels(transitLabels));
    layers.push(el("g", { "clip-path": "url(#frameClip)" }, mapContent.join("\n")));

    // surrounding towns (drawn above the map content)
    layers.push(drawMunicipalities(muniLayouts));

    // keystoned enlargement of the core, in the empty south-east lake
    layers.push(inset.draw());

    // decorative apparatus on top
    layers.push(decorativeBorder(frame));
    for (const f of furniture) layers.push(f.draw());

    if (dropped > 0) layers.push(`<!-- ${dropped} low-priority labels dropped to avoid overlap -->`);

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONTS.serif}">`,
        `<style>${FONT_FACE_CSS}</style>`,
        layers.join("\n"),
        `</svg>`,
    ].join("\n");
}

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------

function unit([x, y]: Pt): Pt {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
}
function perp([x, y]: Pt): Pt {
    return [-y, x];
}
function angleDeg([x, y]: Pt): number {
    return (Math.atan2(y, x) * 180) / Math.PI;
}

function geomPathD(geom: Geometry, proj: Projection): string {
    const rings: Position[][] = [];
    if (geom.type === "Polygon") rings.push(...(geom as Polygon).coordinates);
    else if (geom.type === "MultiPolygon")
        for (const poly of (geom as MultiPolygon).coordinates) rings.push(...poly);
    else return "";
    return rings
        .map((r) => polyline(r.map((p) => proj.project(p as LonLatTuple))) + " Z")
        .join(" ");
}


function isPolygonal(f: Feature): boolean {
    return f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon";
}

// ---------------------------------------------------------------------------
// defs
// ---------------------------------------------------------------------------

function defs(proj: Projection, _eastVec: Pt): string {
    const { frame } = proj;
    const lakeD = lakeOutlineD(proj);
    return el(
        "defs",
        {},
        [
            el(
                "clipPath",
                { id: "frameClip" },
                el("rect", { x: frame.x, y: frame.y, width: frame.w, height: frame.h })
            ),
            el("clipPath", { id: "lakeClip" }, el("path", { d: lakeD })),
            // diagonal hatch for the "stenciled" building footprints
            el(
                "pattern",
                { id: "bldgHatch", width: 3, height: 3, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" },
                el("rect", { width: 3, height: 3, fill: PALETTE.building }) +
                    el("line", { x1: 0, y1: 0, x2: 0, y2: 3, stroke: PALETTE.buildingInk, "stroke-width": 0.6, "stroke-opacity": 0.7 })
            ),
            el(
                "filter",
                { id: "feather", x: "-20%", y: "-20%", width: "140%", height: "140%" },
                el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 4 })
            ),
            el(
                "filter",
                { id: "blob", x: "-60%", y: "-60%", width: "220%", height: "220%" },
                el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 7 })
            ),
            el(
                "filter",
                { id: "grain" },
                el("feTurbulence", {
                    type: "fractalNoise",
                    baseFrequency: "0.9",
                    numOctaves: 2,
                    stitchTiles: "stitch",
                    result: "n",
                }) +
                    el("feColorMatrix", {
                        in: "n",
                        type: "matrix",
                        values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0",
                    })
            ),
            el(
                "radialGradient",
                { id: "vign", cx: "50%", cy: "50%", r: "72%" },
                el("stop", { offset: "62%", "stop-color": PALETTE.vignette, "stop-opacity": 0 }) +
                    el("stop", { offset: "100%", "stop-color": PALETTE.vignette, "stop-opacity": 0.28 })
            ),
            // soft, genuinely-blurred label halos (feMorphology grows the glyph
            // alpha, feGaussianBlur softens it, feFlood colours it). sRGB avoids
            // the linearRGB dark-fringe. Works in Firefox.
            haloFilter("haloPaper", PALETTE.paper),
            haloFilter("haloWater", PALETTE.water),
        ].join("\n")
    );
}

function haloFilter(id: string, floodColor: string): string {
    return el(
        "filter",
        {
            id,
            x: "-35%",
            y: "-35%",
            width: "170%",
            height: "170%",
            "color-interpolation-filters": "sRGB",
        },
        el("feMorphology", { in: "SourceAlpha", operator: "dilate", radius: 1.1, result: "d" }) +
            el("feGaussianBlur", { in: "d", stdDeviation: 1.5, result: "b" }) +
            el("feFlood", { "flood-color": floodColor, "flood-opacity": 0.9, result: "c" }) +
            el("feComposite", { in: "c", in2: "b", operator: "in", result: "halo" }) +
            el(
                "feMerge",
                {},
                el("feMergeNode", { in: "halo" }) + el("feMergeNode", { in: "SourceGraphic" })
            )
    );
}

/** filter id for a given halo colour. */
function haloIdFor(color?: string): string | undefined {
    if (!color) return undefined;
    return color === PALETTE.water ? "haloWater" : "haloPaper";
}

function paperAndVignette(W: number, H: number): string {
    return [
        el("rect", { x: 0, y: 0, width: W, height: H, fill: PALETTE.paper }),
        el("rect", { x: 0, y: 0, width: W, height: H, filter: "url(#grain)", opacity: 0.6 }),
        el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#vign)" }),
    ].join("\n");
}

// ---------------------------------------------------------------------------
// regions + neighbourhoods (high-res boundaries)
// ---------------------------------------------------------------------------

function regionForCentroid(centroid: [number, number]): string {
    for (const r of level8.features) {
        if (r.geometry?.type === "Polygon" || r.geometry?.type === "MultiPolygon") {
            const polys =
                r.geometry.type === "Polygon"
                    ? [(r.geometry as Polygon).coordinates]
                    : (r.geometry as MultiPolygon).coordinates;
            for (const poly of polys)
                if (pointInPolygon(centroid, poly)) return (r.properties?.name as string) || "Old Toronto";
        }
    }
    return "Old Toronto";
}

function regionsAndNeighbourhoods(proj: Projection): string {
    const fills: string[] = [];
    const bounds: string[] = [];
    for (const f of level10.features) {
        if (!isPolygonal(f)) continue;
        const centroid = simpleCenter(
            (f.geometry as Polygon | MultiPolygon).coordinates as
                | Polygon["coordinates"]
                | MultiPolygon["coordinates"]
        );
        const region = regionForCentroid(centroid);
        const fill = PALETTE.regions[region] ?? PALETTE.regionDefault;
        const d = geomPathD(f.geometry, proj);
        fills.push(el("path", { d, fill, "fill-rule": "evenodd" }));
        bounds.push(
            el("path", {
                d,
                fill: "none",
                stroke: PALETTE.inkFaint,
                "stroke-width": 0.5,
                "stroke-opacity": 0.7,
            })
        );
    }
    return el("g", {}, fills.join("") + bounds.join(""));
}

// ---------------------------------------------------------------------------
// water
// ---------------------------------------------------------------------------

function lakeFeature(): Feature {
    const lake = water.features.find((f) => f.properties?.name === "Lake Ontario");
    if (!lake) throw new Error("Lake Ontario not found");
    return lake;
}
function lakeOutlineD(proj: Projection): string {
    return geomPathD(lakeFeature().geometry, proj);
}

function waterLayer(proj: Projection, _eastVec: Pt): string {
    const lakeD = lakeOutlineD(proj);
    const parts: string[] = [];
    parts.push(el("path", { d: lakeD, fill: PALETTE.water }));
    parts.push(el("g", { "clip-path": "url(#lakeClip)" }, depthContours(proj.project)));
    parts.push(
        el(
            "g",
            { "clip-path": "url(#lakeClip)" },
            el("path", {
                d: lakeD,
                fill: "none",
                stroke: PALETTE.waterDeep,
                "stroke-width": 9,
                "stroke-opacity": 0.5,
                filter: "url(#feather)",
            })
        )
    );
    parts.push(
        el("path", {
            d: lakeD,
            fill: "none",
            stroke: PALETTE.ink,
            "stroke-width": 1.1,
            "stroke-opacity": 0.75,
            // round joins/caps stop sharp shoreline vertices (e.g. the east-end
            // waterfront) from throwing off long miter "spikes".
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
        })
    );
    // rivers / creeks (high-res). Port Lands water is assembled from many abutting
    // OSM polygons; stroking each one draws internal borders that crosscut the Don
    // River mouth. Draw those fill-only (no stroke) so the channel reads as one
    // continuous stream; keep a thin outline on ordinary rivers/creeks.
    const rivers: string[] = [];
    for (const f of water.features) {
        const w = f.properties?.water as string | undefined;
        if (w === "river" || w === "canal") {
            const d = geomPathD(f.geometry, proj);
            if (!d) continue;
            const portlands = (f.properties as Record<string, unknown>)?.portlands === true;
            rivers.push(
                el("path", {
                    d,
                    fill: PALETTE.water,
                    stroke: portlands ? "none" : PALETTE.waterDeep,
                    "stroke-width": portlands ? undefined : 0.4,
                    "stroke-opacity": portlands ? undefined : 0.6,
                    "stroke-linejoin": "round",
                    "stroke-linecap": "round",
                })
            );
        }
    }
    return el("g", {}, parts.join("\n") + rivers.join(""));
}

/** Toronto Island landmasses drawn as land on top of the water. */
function islandsLayer(proj: Projection): string {
    const out: string[] = [];
    for (const f of water.features) {
        if (f.properties?.kind !== "island") continue;
        const d = geomPathD(f.geometry, proj);
        if (!d) continue;
        out.push(
            el("path", {
                d,
                fill: PALETTE.island,
                // match the lake/water-boundary shoreline stroke for consistency
                stroke: PALETTE.ink,
                "stroke-width": 1.1,
                "stroke-opacity": 0.75,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
            })
        );
    }
    return el("g", {}, out.join(""));
}

/** High Park: its boundary + ponds (Grenadier Pond etc.) on the big map. */
function highParkLayer(proj: Projection): string {
    const out: string[] = [];
    for (const fe of highPark.features) {
        if (fe.properties?.kind !== "park") continue;
        const d = geomPathD(fe.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, fill: PALETTE.park, "fill-opacity": 0.85, stroke: PALETTE.parkEdge, "stroke-width": 0.6, "stroke-linejoin": "round" }));
    }
    for (const fe of highPark.features) {
        if (fe.properties?.kind !== "water") continue;
        const d = geomPathD(fe.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, fill: PALETTE.water, stroke: PALETTE.waterDeep, "stroke-width": 0.4, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
    }
    return el("g", {}, out.join(""));
}

/** Sketch an airport (aprons + taxiways + runways) from a feature set. */
function sketchAirport(proj: Projection, features: Feature[], runwayW: number, taxiW: number): string {
    const out: string[] = [];
    for (const fe of features) {
        if (fe.properties?.kind !== "apron" || fe.geometry?.type !== "Polygon") continue;
        const d = geomPathD(fe.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, fill: PALETTE.island, "fill-opacity": 0.5, stroke: PALETTE.inkFaint, "stroke-width": 0.4, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
    }
    for (const fe of features) {
        if (fe.properties?.kind !== "taxiway" || fe.geometry?.type !== "LineString") continue;
        const pts = (fe.geometry as { coordinates: Position[] }).coordinates.map((p) => proj.project(p as LonLatTuple));
        out.push(el("path", { d: polyline(pts), fill: "none", stroke: PALETTE.inkFaint, "stroke-width": taxiW, "stroke-opacity": 0.55, "stroke-linecap": "round" }));
    }
    for (const fe of features) {
        if (fe.properties?.kind !== "runway" || fe.geometry?.type !== "LineString") continue;
        const pts = (fe.geometry as { coordinates: Position[] }).coordinates.map((p) => proj.project(p as LonLatTuple));
        out.push(el("path", { d: polyline(pts), fill: "none", stroke: PALETTE.ink, "stroke-width": runwayW, "stroke-opacity": 0.85, "stroke-linecap": "butt" }));
    }
    return el("g", {}, out.join(""));
}

/** Billy Bishop + Toronto Pearson, sketched on the main map. */
function airportLayer(proj: Projection): string {
    const out: string[] = [];
    out.push(sketchAirport(proj, structures.features, 1.6, 0.4));
    out.push(sketchAirport(proj, pearson.features, 1.8, 0.35));
    // Pearson label
    const pl = proj.project([-79.624, 43.6845]);
    out.push(text(pl[0], pl[1] - 14, "TORONTO PEARSON", {
        size: 8.5, fill: PALETTE.inkSoft, family: FONTS.serif, tracking: 1.2, weight: 500,
        halo: PALETTE.paper, haloId: "haloPaper",
    }));
    return el("g", {}, out.join(""));
}

/** Transit line key from a feature. */
function transitKey(fe: Feature): string {
    const kind = fe.properties?.kind as string;
    const ref = (fe.properties?.ref as string) ?? "";
    return kind === "up" ? "UP" : kind === "ontario" ? "OL" : ref;
}

/** Rapid transit lines, through any projection (main map or inset). */
function transitLines(project: (ll: LonLatTuple) => Pt, lineW: number, casW: number, dashScale = 1): string {
    const casings: string[] = [];
    const lines: string[] = [];
    for (const [key, chains] of transitChainsByKey) {
        const st = TRANSIT_STYLE[key];
        if (!st) continue;
        const dash = st.dash ? st.dash.split(" ").map((n) => Number(n) * dashScale).join(" ") : undefined;
        for (const chain of chains) {
            const d = polyline(chain.map((p) => project(p)));
            casings.push(el("path", { d, fill: "none", stroke: PALETTE.paper, "stroke-width": casW, "stroke-linecap": "round", "stroke-linejoin": "round" }));
            lines.push(el("path", { d, fill: "none", stroke: st.color, "stroke-width": lineW, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": dash }));
        }
    }
    return el("g", { opacity: 0.9 }, casings.join("")) + lines.join("");
}
function transitLayer(proj: Projection): string {
    return el("g", {}, transitLines(proj.project, 1.6, 3.4));
}

/** Rapid-transit lines by opening date, oldest → newest. Used to break ties when
 *  snapping an interchange onto a line: the older line wins. */
const TRANSIT_AGE_ORDER = ["1", "2", "4", "UP", "5", "OL"];

/** All drawn line geometries grouped by key (raw lon/lat; a line may have several
 *  branches). GO has no geometry, so it never appears here. */
const transitGeomByKey: Map<string, LonLatTuple[][]> = (() => {
    const m = new Map<string, LonLatTuple[][]>();
    for (const fe of transit.features) {
        if (fe.geometry?.type !== "LineString") continue;
        const key = transitKey(fe);
        if (!TRANSIT_STYLE[key]) continue;
        const arr = m.get(key) ?? [];
        arr.push((fe.geometry.coordinates as Position[]).map((p) => p as LonLatTuple));
        m.set(key, arr);
    }
    return m;
})();

/** Join polyline segments that share endpoints into maximal continuous chains.
 *  OSM route relations arrive as many little disjoint ways; without stitching, a
 *  dashed stroke restarts its dash pattern at every segment join (each <path>
 *  resets the dash), which is why the UP Express dashes looked ragged. */
function stitchLines(segs: LonLatTuple[][]): LonLatTuple[][] {
    const key = (p: LonLatTuple) => p[0].toFixed(6) + "," + p[1].toFixed(6);
    const at = new Map<string, number[]>();
    const touch = (k: string, i: number) => { const a = at.get(k) ?? []; a.push(i); at.set(k, a); };
    segs.forEach((s, i) => { if (s.length >= 2) { touch(key(s[0]), i); touch(key(s[s.length - 1]), i); } });
    const used = new Array(segs.length).fill(false);
    const chains: LonLatTuple[][] = [];
    for (let i = 0; i < segs.length; i++) {
        if (used[i] || segs[i].length < 2) continue;
        used[i] = true;
        let chain = segs[i].slice();
        for (let grow = true; grow; ) {
            grow = false;
            const tail = key(chain[chain.length - 1]);
            for (const j of at.get(tail) ?? []) {
                if (used[j]) continue;
                const s = segs[j];
                chain.push(...(key(s[0]) === tail ? s.slice(1) : [...s].reverse().slice(1)));
                used[j] = true; grow = true; break;
            }
        }
        for (let grow = true; grow; ) {
            grow = false;
            const head = key(chain[0]);
            for (const j of at.get(head) ?? []) {
                if (used[j]) continue;
                const s = segs[j];
                const add = key(s[s.length - 1]) === head ? s.slice(0, -1) : [...s].reverse().slice(0, -1);
                chain = [...add, ...chain];
                used[j] = true; grow = true; break;
            }
        }
        chains.push(chain);
    }
    return chains;
}

/** Each line as a few continuous chains (so dashed strokes flow across joins). */
const transitChainsByKey: Map<string, LonLatTuple[][]> = (() => {
    const m = new Map<string, LonLatTuple[][]>();
    for (const [k, segs] of transitGeomByKey) m.set(k, stitchLines(segs));
    return m;
})();

/** Nearest point on a set of polylines to `pt`, measured in metres (local
 *  equirectangular), returning the snapped lon/lat and that distance. */
function nearestOnLines(pt: LonLatTuple, lines: LonLatTuple[][]): { p: LonLatTuple; d: number } | null {
    const kx = Math.cos((pt[1] * Math.PI) / 180) * 111320;
    const ky = 111320;
    const px = pt[0] * kx, py = pt[1] * ky;
    let best: { p: LonLatTuple; d: number } | null = null;
    for (const line of lines) {
        for (let i = 1; i < line.length; i++) {
            const ax = line[i - 1][0] * kx, ay = line[i - 1][1] * ky;
            const bx = line[i][0] * kx, by = line[i][1] * ky;
            const dx = bx - ax, dy = by - ay;
            const len2 = dx * dx + dy * dy || 1;
            let t = ((px - ax) * dx + (py - ay) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const qx = ax + t * dx, qy = ay + t * dy;
            const d = Math.hypot(px - qx, py - qy);
            if (!best || d < best.d) best = { p: [qx / kx, qy / ky], d };
        }
    }
    return best;
}

/** Two candidate lines "comparably close" to a centroid snap to the older one if
 *  they are within this many metres of each other. */
const SNAP_TIE_M = 130;

/** Snap a station's centroid onto the actual line it serves — the nearest point
 *  on its own line geometry — preferring the older line when several are close. */
function snapStation(fe: Feature): LonLatTuple {
    const centroid = (fe.geometry as unknown as { coordinates: LonLatTuple }).coordinates;
    const keys = ((fe.properties?.lines as string[]) ?? []).filter((k) => transitGeomByKey.has(k));
    if (keys.length === 0) return centroid;
    const cands = keys
        .map((k) => ({ k, hit: nearestOnLines(centroid, transitGeomByKey.get(k)!) }))
        .filter((c): c is { k: string; hit: { p: LonLatTuple; d: number } } => c.hit !== null);
    if (cands.length === 0) return centroid;
    const minD = Math.min(...cands.map((c) => c.hit.d));
    const close = cands.filter((c) => c.hit.d <= minD + SNAP_TIE_M);
    close.sort((a, b) => TRANSIT_AGE_ORDER.indexOf(a.k) - TRANSIT_AGE_ORDER.indexOf(b.k));
    return close[0].hit.p;
}

const stationSnapCache = new Map<Feature, LonLatTuple>();
function snappedStation(fe: Feature): LonLatTuple {
    let s = stationSnapCache.get(fe);
    if (!s) { s = snapStation(fe); stationSnapCache.set(fe, s); }
    return s;
}

/**
 * A station diagram: one line-coloured dot, or — for an interchange — a paper
 * "stadium" (a rect whose corner radius equals half its height, giving perfect
 * semicircular ends) holding one dot per line.
 */
function drawStation(cx: number, cy: number, stopColors: string[], r: number): string {
    if (stopColors.length === 0) return "";
    if (stopColors.length === 1) {
        return el("circle", { cx, cy, r, fill: stopColors[0], stroke: PALETTE.paper, "stroke-width": r * 0.35 });
    }
    const gap = r * 0.45;
    const n = stopColors.length;
    const span = n * (2 * r) + (n - 1) * gap;
    const pad = r * 0.85;
    const h = 2 * (r + pad);
    const w = span + 2 * pad;
    const out = [el("rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: h / 2, ry: h / 2, fill: PALETTE.paper, stroke: PALETTE.ink, "stroke-width": r * 0.35 })];
    stopColors.forEach((c, i) => {
        out.push(el("circle", { cx: cx - span / 2 + r + i * (2 * r + gap), cy, r, fill: c }));
    });
    return out.join("");
}

/** Draw all stations through a projection (optionally filtered to a region). */
function drawStationsAt(project: (ll: LonLatTuple) => Pt, r: number, inside?: (p: Pt) => boolean): string {
    const out: string[] = [];
    for (const fe of stations.features) {
        if (fe.geometry?.type !== "Point") continue;
        const p = project(snappedStation(fe));
        if (inside && !inside(p)) continue;
        const keys = (fe.properties?.lines as string[]) ?? [];
        const cols = keys.map((k) => TRANSIT_STYLE[k]?.color).filter(Boolean) as string[];
        out.push(drawStation(p[0], p[1], cols, r));
    }
    return el("g", {}, out.join(""));
}
function stationsLayer(proj: Projection): string {
    return drawStationsAt(proj.project, 1.7);
}

interface TransitLabel { x: number; y: number; text: string; color: string; rotate: number; box: Box; }

/** AABB of a rotated middle-anchored label, for keep-out. */
function rotatedLabelBox(x: number, y: number, w: number, size: number, deg: number): Box {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const hw = w / 2 + 2;
    const corners: Pt[] = [[-hw, -size * 0.72], [hw, -size * 0.72], [hw, size * 0.28], [-hw, size * 0.28]];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [dx, dy] of corners) {
        const px = x + dx * c - dy * s;
        const py = y + dx * s + dy * c;
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    return { x0, y0, x1, y1 };
}

/** Label each line near BOTH termini, angled with the line (UP Express only on the
 *  airport side). */
const TRANSIT_LABEL_SIZE = 5.4;
function computeTransitLabels(proj: Projection): TransitLabel[] {
    const SIZE = TRANSIT_LABEL_SIZE;
    // gather, per line, all branch point-arrays and their two endpoints (with the
    // inward tangent at each endpoint)
    const byKey = new Map<string, { p: Pt; dir: Pt }[]>();
    const cloud = new Map<string, Pt[]>();
    for (const [key, chains] of transitChainsByKey) {
        if (!TRANSIT_STYLE[key]) continue;
        const eps = byKey.get(key) ?? [];
        const cl = cloud.get(key) ?? [];
        for (const chain of chains) {
            const pts = chain.map((p) => proj.project(p));
            if (pts.length < 2) continue;
            const n = pts.length;
            eps.push({ p: pts[0], dir: unit([pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]]) });
            eps.push({ p: pts[n - 1], dir: unit([pts[n - 2][0] - pts[n - 1][0], pts[n - 2][1] - pts[n - 1][1]]) });
            cl.push(...pts);
        }
        byKey.set(key, eps);
        cloud.set(key, cl);
    }
    const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const pearson = proj.project([-79.63, 43.68]);
    const out: TransitLabel[] = [];
    for (const [key, eps] of byKey) {
        const st = TRANSIT_STYLE[key];
        const cl = cloud.get(key)!;
        const cx = cl.reduce((s, p) => s + p[0], 0) / cl.length;
        const cy = cl.reduce((s, p) => s + p[1], 0) / cl.length;
        // the two termini: farthest endpoint from centroid, then farthest from it
        const A = eps.reduce((m, e) => (dist(e.p, [cx, cy]) > dist(m.p, [cx, cy]) ? e : m), eps[0]);
        const B = eps.reduce((m, e) => (dist(e.p, A.p) > dist(m.p, A.p) ? e : m), eps[0]);
        let ends = [A, B];
        if (key === "UP") ends = [dist(A.p, pearson) < dist(B.p, pearson) ? A : B];
        const w = textWidth(st.label, SIZE, 0.3);
        for (const E of ends) {
            let ang = angleDeg(E.dir);
            if (ang > 90) ang -= 180;
            else if (ang < -90) ang += 180;
            // offset perpendicular to the line by more than half the text height
            // plus the line's half-width, so the label never sits on the line
            const pp = perp(E.dir);
            const off = SIZE * 0.5 + 5;
            const x = E.p[0] + E.dir[0] * (w / 2 + 8) + pp[0] * off;
            const y = E.p[1] + E.dir[1] * (w / 2 + 8) + pp[1] * off;
            out.push({ x, y: y - 2, text: st.label, color: st.color, rotate: ang, box: rotatedLabelBox(x, y - 2, w, SIZE, ang) });
        }
    }
    return out;
}

function emitTransitLabels(labels: TransitLabel[]): string {
    return el("g", {}, labels.map((L) => text(L.x, L.y, L.text, {
        size: TRANSIT_LABEL_SIZE, fill: L.color, family: FONTS.serif, weight: 600, tracking: 0.3, rotate: L.rotate,
        halo: PALETTE.paper, haloId: "haloPaper",
    })).join(""));
}

/** Dotted, gently-curved ferry routes from the mainland terminal to the islands. */
function ferryLayer(proj: Projection): string {
    const out: string[] = [];
    // bow each route toward the open harbour so it reads as a ferry track
    const harbour = proj.project([-79.372, 43.626]);
    for (const [from, to] of FERRY_ROUTES) {
        const a = proj.project(from);
        const b = proj.project(to);
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const toH = unit([harbour[0] - mid[0], harbour[1] - mid[1]]);
        const c: Pt = [mid[0] + toH[0] * len * 0.16, mid[1] + toH[1] * len * 0.16];
        out.push(
            el("path", {
                d: `M ${round(a[0])} ${round(a[1])} Q ${round(c[0])} ${round(c[1])} ${round(b[0])} ${round(b[1])}`,
                fill: "none",
                stroke: PALETTE.ink,
                "stroke-width": 0.9,
                "stroke-opacity": 0.6,
                "stroke-dasharray": "1 3.5",
                "stroke-linecap": "round",
            })
        );
    }
    return el("g", {}, out.join(""));
}

// ---------------------------------------------------------------------------
// streets + markers
// ---------------------------------------------------------------------------

function streetsLayer(proj: Projection): string {
    // Draw every casing (pale underlay) first, then every ink line on top, so
    // that adjacent segments of a road join cleanly instead of a later segment's
    // casing punching a hole through an earlier segment's ink.
    const casings: string[] = [];
    const inks: string[] = [];
    for (const f of streets.features) {
        if (f.geometry?.type !== "MultiLineString") continue;
        for (const line of f.geometry.coordinates) {
            const d = polyline(line.map((p) => proj.project(p as LonLatTuple)));
            casings.push(
                el("path", {
                    d,
                    fill: "none",
                    stroke: PALETTE.paper,
                    "stroke-width": 3,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                })
            );
            inks.push(
                el("path", {
                    d,
                    fill: "none",
                    stroke: PALETTE.inkSoft,
                    "stroke-width": 1.2,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                })
            );
        }
    }
    // group-opacity on the casing layer: it composites once, so overlapping
    // segments of the same road don't stack into darker/lighter seams.
    return el("g", {}, el("g", { opacity: 0.75 }, casings.join("")) + inks.join(""));
}

/** Projected position of the Union Station subway marker (its snapped stadium),
 *  so the landmark label can sit over the transit marker rather than a red dot. */
function unionMarker(proj: Projection): Pt | null {
    const fe = stations.features.find((f) => ((f.properties?.lines as string[] | undefined) ?? []).includes("GO"));
    return fe && fe.geometry?.type === "Point" ? proj.project(snappedStation(fe)) : null;
}

/** Major highways (400-series, Gardiner, DVP, QEW, Allen) — drawn de-emphasized:
 *  a thin pale casing under a faint hairline, beneath the street network. */
function highwaysLayer(proj: Projection): string {
    const cas: string[] = [];
    const ink: string[] = [];
    for (const f of highways.features) {
        if (f.geometry?.type !== "MultiLineString") continue;
        for (const line of f.geometry.coordinates) {
            const d = polyline(line.map((p) => proj.project(p as LonLatTuple)));
            cas.push(el("path", { d, fill: "none", stroke: PALETTE.paper, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" }));
            ink.push(el("path", { d, fill: "none", stroke: PALETTE.inkFaint, "stroke-width": 1.1, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        }
    }
    // whole layer sits low in the stack and at reduced opacity so it reads as
    // background infrastructure, not a feature.
    return el("g", { opacity: 0.55 }, el("g", { opacity: 0.7 }, cas.join("")) + ink.join(""));
}

function landmarkMarkers(proj: Projection): string {
    const out: string[] = [];
    for (const d of LANDMARKS) {
        if (d.insetOnly) continue;
        // Union Station is marked by its subway station glyph, not a red dot.
        if (d.name === "Union Station") continue;
        // centeredLabel landmarks (e.g. Billy Bishop) show a name only, no dot.
        if (d.centeredLabel) continue;
        const p = proj.project(d.at);
        const col = d.kind === "water" ? PALETTE.accentBlue : PALETTE.accentRed;
        out.push(
            el("circle", { cx: p[0], cy: p[1], r: 2.2, fill: col, stroke: PALETTE.paper, "stroke-width": 0.7 })
        );
    }
    return el("g", {}, out.join(""));
}

// ---------------------------------------------------------------------------
// label collection
// ---------------------------------------------------------------------------

function collectLabelInputs(proj: Projection, eastVec: Pt): LabelInput[] {
    const inputs: LabelInput[] = [];
    const S = LABEL_STYLE;

    // regions (level-8 centroids) + Old Toronto
    const seen = new Set<string>();
    for (const r of level8.features) {
        const name = r.properties?.name as string;
        if (!name || seen.has(name) || !isPolygonal(r)) continue;
        seen.add(name);
        const c = simpleCenter(
            (r.geometry as Polygon | MultiPolygon).coordinates as
                | Polygon["coordinates"]
                | MultiPolygon["coordinates"]
        );
        inputs.push(areaLabel(`region:${name}`, name.toUpperCase(), proj.project(c as LonLatTuple), {
            size: S.region.size,
            tracking: S.region.tracking,
            fill: S.region.fill,
            weight: S.region.weight,
            family: FONTS.serif,
            priority: PRIO.region,
            allowDrop: false,
            halo: PALETTE.paper,
            haloWidth: 5,
        }));
    }
    inputs.push(areaLabel("region:Old Toronto", "OLD TORONTO", proj.project([-79.375, 43.66]), {
        size: S.region.size,
        tracking: S.region.tracking,
        fill: S.region.fill,
        weight: S.region.weight,
        family: FONTS.serif,
        priority: PRIO.region,
        allowDrop: false,
        halo: PALETTE.paper,
        haloWidth: 5,
    }));

    // Lake Ontario — large open-water label across the bottom of the map.
    // (The "Toronto Harbour" label now lives only in the enlarged inset.)
    inputs.push(areaLabel("water:LakeOntario", "LAKE ONTARIO", proj.project([-79.412, 43.598]), {
        size: 28,
        tracking: 10,
        fill: PALETTE.waterLabel,
        family: FONTS.italic,
        italic: true,
        weight: 500,
        rotate: angleDeg(eastVec),
        priority: PRIO.harbour,
        allowDrop: false,
        halo: PALETTE.water,
        haloWidth: 5,
    }));

    // super-districts
    for (const d of SUPER_DISTRICTS)
        inputs.push(areaLabel(`super:${d.name}`, d.name, proj.project(d.at), {
            size: S.superDistrict.size,
            tracking: S.superDistrict.tracking,
            fill: S.superDistrict.fill,
            weight: S.superDistrict.weight,
            family: FONTS.serif,
            priority: PRIO.superDistrict,
            halo: PALETTE.paper,
            haloWidth: 4,
        }));

    // rivers (italic)
    for (const d of RIVER_LABELS)
        inputs.push(areaLabel(`river:${d.name}`, d.name, proj.project(d.at), {
            size: S.river.size,
            tracking: S.river.tracking,
            fill: S.river.fill,
            family: FONTS.italic,
            italic: true,
            priority: PRIO.river,
            halo: PALETTE.paper,
            haloWidth: 3,
        }));

    // neighbourhoods
    for (const d of NEIGHBOURHOODS)
        inputs.push(areaLabel(`nbhd:${d.name}`, d.name, proj.project(d.at), {
            size: S.neighbourhood.size,
            tracking: S.neighbourhood.tracking,
            fill: S.neighbourhood.fill,
            family: FONTS.serif,
            priority: d.priority ?? PRIO.neighbourhood,
            halo: PALETTE.paper,
            haloWidth: 2.6,
        }));

    // landmarks (point labels beside their marker) — insetOnly ones are omitted
    // from the big map to declutter downtown (they still appear in the inset)
    for (const d of LANDMARKS) {
        if (d.insetOnly) continue;
        // Union Station: label sits centred just above its subway station marker.
        if (d.name === "Union Station") {
            const m = unionMarker(proj);
            if (m) {
                inputs.push(areaLabel("lm:Union Station", d.name, [m[0], m[1] - 9], {
                    size: S.landmark.size,
                    tracking: S.landmark.tracking,
                    fill: S.landmark.fill,
                    family: FONTS.serif,
                    priority: PRIO.landmarkIcon,
                    halo: PALETTE.paper,
                    haloWidth: 2.4,
                }));
            }
            continue;
        }
        // centeredLabel: no dot, name centred on the feature (e.g. Billy Bishop).
        if (d.centeredLabel) {
            inputs.push(areaLabel(`lm:${d.name}`, d.name, proj.project(d.at), {
                size: S.landmark.size,
                tracking: S.landmark.tracking,
                fill: S.landmark.fill,
                family: FONTS.serif,
                priority: PRIO.landmarkWater,
                halo: PALETTE.paper,
                haloWidth: 2.4,
            }));
            continue;
        }
        const p = proj.project(d.at);
        inputs.push({
            id: `lm:${d.name}`,
            text: d.name,
            anchor: p,
            kind: "point",
            size: S.landmark.size,
            tracking: S.landmark.tracking,
            fill: S.landmark.fill,
            family: FONTS.serif,
            priority: d.kind === "water" ? PRIO.landmarkWater : PRIO.landmarkIcon,
            halo: PALETTE.paper,
            haloWidth: 2.4,
        });
    }

    // street spines (rotated, along the longest polyline)
    for (const f of streets.features) {
        const line = longestLine(f);
        if (!line || line.length < 2) continue;
        const mid = Math.floor(line.length / 2);
        const a = proj.project(line[Math.max(0, mid - 1)] as LonLatTuple);
        const b = proj.project(line[Math.min(line.length - 1, mid)] as LonLatTuple);
        const p = proj.project(line[mid] as LonLatTuple);
        let ang = angleDeg(unit([b[0] - a[0], b[1] - a[1]]));
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        const name = ((f.properties?.name as string) ?? "").toUpperCase();
        inputs.push(areaLabel(`st:${name}`, name, [p[0], p[1] - 3], {
            size: S.street.size,
            tracking: S.street.tracking,
            fill: S.street.fill,
            family: FONTS.serif,
            italic: true,
            weight: 500,
            rotate: ang,
            priority: PRIO.street,
            halo: PALETTE.paper,
            haloWidth: 3,
        }));
    }

    // highway shields — small, faint, low priority so they yield to real labels
    for (const f of highways.features) {
        const line = longestLine(f);
        if (!line || line.length < 2) continue;
        const mid = Math.floor(line.length / 2);
        const a = proj.project(line[Math.max(0, mid - 1)] as LonLatTuple);
        const b = proj.project(line[Math.min(line.length - 1, mid)] as LonLatTuple);
        const p = proj.project(line[mid] as LonLatTuple);
        let ang = angleDeg(unit([b[0] - a[0], b[1] - a[1]]));
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        const label = ((f.properties?.label as string) ?? "").toUpperCase();
        inputs.push(areaLabel(`hwy:${f.properties?.ref}`, label, [p[0], p[1] - 3], {
            size: 6,
            tracking: 0.8,
            fill: PALETTE.inkFaint,
            family: FONTS.serif,
            weight: 600,
            rotate: ang,
            priority: PRIO.highway,
            allowDrop: true,
            halo: PALETTE.paper,
            haloWidth: 2.6,
        }));
    }

    // municipalities are laid out separately (see layoutMunicipalities) so their
    // names stay tied to their arrows and don't overlap.

    return inputs;
}

function areaLabel(
    id: string,
    text: string,
    at: Pt,
    o: {
        size: number;
        tracking?: number;
        fill: string;
        family: string;
        weight?: number | string;
        italic?: boolean;
        rotate?: number;
        priority: number;
        allowDrop?: boolean;
        halo?: string;
        haloWidth?: number;
    }
): LabelInput {
    return {
        id,
        text,
        anchor: at,
        kind: "area",
        textAnchor: "middle",
        size: o.size,
        tracking: o.tracking,
        fill: o.fill,
        weight: o.weight,
        italic: o.italic,
        rotate: o.rotate,
        family: o.family,
        priority: o.priority,
        allowDrop: o.allowDrop,
        halo: o.halo,
        haloWidth: o.haloWidth,
    };
}

function emitLabels(placed: PlacedLabel[]): string {
    const out = placed.map((p) =>
        text(p.x, p.y, p.text, {
            size: p.size,
            fill: p.fill,
            family: p.family,
            tracking: p.tracking,
            weight: p.weight,
            italic: p.italic,
            anchor: p.finalAnchor,
            rotate: p.rotate,
            halo: p.halo,
            haloWidth: p.haloWidth,
            haloId: haloIdFor(p.halo),
        })
    );
    return el("g", {}, out.join("\n"));
}

function emitLeaders(placed: PlacedLabel[]): string {
    const out: string[] = [];
    for (const p of placed) {
        if (!p.leader) continue;
        out.push(
            el("path", {
                d: polyline(p.leader),
                stroke: PALETTE.inkSoft,
                "stroke-width": 0.5,
                "stroke-opacity": 0.5,
                fill: "none",
            })
        );
    }
    return el("g", {}, out.join(""));
}

function longestLine(f: Feature): Position[] | null {
    if (f.geometry?.type !== "MultiLineString") return null;
    let best: Position[] | null = null;
    let bestLen = 0;
    for (const line of f.geometry.coordinates) {
        let len = 0;
        for (let i = 1; i < line.length; i++)
            len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
        if (len > bestLen) {
            bestLen = len;
            best = line as Position[];
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// surrounding municipalities (margin blobs)
// ---------------------------------------------------------------------------

interface MuniPlacement {
    name: string;
    /** where a ray from centre toward the town crosses the inner border line */
    borderPt: Pt;
    /** the town's projected position (may be outside the frame) */
    target: Pt;
    /** the town's true geographic position */
    at: LonLatTuple;
    /** optional manual pixel offset for the label */
    nudge?: [number, number];
}

/** Great-circle distance between two [lon,lat] points, kilometres. */
function haversineKm(a: LonLatTuple, b: LonLatTuple): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const la1 = toRad(a[1]);
    const la2 = toRad(b[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function computeMunicipalities(proj: Projection): MuniPlacement[] {
    const { frame } = proj;
    const cx = frame.x + frame.w / 2;
    const cy = frame.y + frame.h / 2;
    return MUNICIPALITIES.map((m) => {
        const target = proj.project(m.at);
        // the border crossing in the town's direction (extend the ray so it always
        // lands on the border, even when the town itself projects inside the frame)
        const dir = unit([target[0] - cx, target[1] - cy]);
        const borderPt = clampToRect([cx, cy], [cx + dir[0] * 1e5, cy + dir[1] * 1e5], frame as Rect);
        return { name: m.name, borderPt, target, at: m.at, nudge: m.nudge };
    });
}

/** A directional arrow whose head lands exactly on `to`. */
function arrowMark(from: Pt, to: Pt): string {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L;
    const uy = dy / L;
    const px = -uy;
    const py = ux;
    const hl = 7;
    const hw = 4;
    const base: Pt = [to[0] - ux * hl, to[1] - uy * hl];
    return (
        el("path", { d: polyline([from, base]), stroke: PALETTE.inkSoft, "stroke-width": 1.2, "stroke-opacity": 0.8, fill: "none", "stroke-linecap": "round" }) +
        el("path", {
            d: `M ${round(to[0])} ${round(to[1])} L ${round(base[0] + px * hw)} ${round(base[1] + py * hw)} L ${round(base[0] - px * hw)} ${round(base[1] - py * hw)} Z`,
            fill: PALETTE.inkSoft, "fill-opacity": 0.85,
        })
    );
}

interface MuniLayout {
    name: string;
    cx: number;
    cy: number;
    w: number;
    /** if false, the name sits over the town and no arrow is drawn */
    arrow: boolean;
    start?: Pt;
    tip?: Pt;
    /** distance to the town in km; only set (and labelled) when >= 5 */
    distKm?: number;
    dist?: { x: number; y: number; text: string };
}

const DIST_SIZE = 8.5;

/** leftmost projected x of the city land in the lower half of the map (the west
 *  border of southern Toronto), used to centre the Mississauga label. */
function southWestEdgeX(proj: Projection): number {
    const f = proj.frame;
    const yLo = f.y + f.h * 0.5;
    let minx = Infinity;
    for (const fe of level8.features) {
        const g = fe.geometry;
        if (!g) continue;
        const rings: Position[][] =
            g.type === "Polygon" ? (g as Polygon).coordinates
            : g.type === "MultiPolygon" ? (g as MultiPolygon).coordinates.flat() : [];
        for (const r of rings) for (const c of r) {
            const p = proj.project(c as LonLatTuple);
            if (p[1] >= yLo && p[0] < minx) minx = p[0];
        }
    }
    return isFinite(minx) ? minx : f.x + f.w * 0.25;
}

/**
 * Lay out the surrounding towns. A town whose position is on the map gets its name
 * placed over it (no arrow). Off-map towns are packed along the border they point
 * across (in crossing order); each gets an arrow aimed at the town and, when far
 * enough, a distance label placed by the same collision search so it never lands on
 * the arrow, a name, or another label.
 */
function layoutMunicipalities(proj: Projection, munis: MuniPlacement[], occupied: Box[]): MuniLayout[] {
    const S = LABEL_STYLE.municipality;
    const f = proj.frame;
    const size = S.size;
    const boxes: Box[] = [...occupied];
    const halfH = size * 0.62;
    const mkbox = (cx: number, cy: number, w: number): Box => ({ x0: cx - w / 2 - 5, y0: cy - halfH - 3, x1: cx + w / 2 + 5, y1: cy + halfH + 3 });
    const hits = (b: Box) => boxes.some((o) => !(b.x1 <= o.x0 || b.x0 >= o.x1 || b.y1 <= o.y0 || b.y0 >= o.y1));
    const inFrameBox = (b: Box) => b.x0 >= f.x && b.y0 >= f.y && b.x1 <= f.x + f.w && b.y1 <= f.y + f.h;

    const meta = munis.map((m) => ({ m, name: m.name.toUpperCase(), w: textWidth(m.name.toUpperCase(), size, S.tracking) * 1.15 + 10 }));
    const out: MuniLayout[] = [];

    // 1) towns whose projected position is ON the map: place the name over it, no arrow.
    const offMap: typeof meta = [];
    for (const it of meta) {
        const t = it.m.target;
        const onMap = t[0] > f.x && t[0] < f.x + f.w && t[1] > f.y && t[1] < f.y + f.h;
        if (!onMap) { offMap.push(it); continue; }
        const halfW = it.w / 2;
        const clampX = (x: number) => Math.min(Math.max(x, f.x + halfW + 6), f.x + f.w - halfW - 6);
        const clampY = (y: number) => Math.min(Math.max(y, f.y + halfH + 6), f.y + f.h - halfH - 6);
        let cx: number;
        let cy = clampY(t[1]);
        if (it.m.name === "Mississauga") {
            // centre the label in the west margin: midway between the map's left
            // border and the west edge of southern Toronto
            cx = (f.x + southWestEdgeX(proj)) / 2;
        } else {
            cx = clampX(t[0]);
            if (hits(mkbox(cx, cy, it.w))) {
                outer: for (const r of [1, 2, 3, 4]) {
                    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]] as const) {
                        const ncx = clampX(cx + dx * r * size * 1.6);
                        const ncy = clampY(cy + dy * r * size * 1.3);
                        if (!hits(mkbox(ncx, ncy, it.w))) { cx = ncx; cy = ncy; break outer; }
                    }
                }
            }
        }
        if (it.m.nudge) { cx += it.m.nudge[0]; cy += it.m.nudge[1]; }
        boxes.push(mkbox(cx, cy, it.w));
        out.push({ name: it.name, cx, cy, w: it.w, arrow: false });
    }

    // 2) off-map towns: pack per border in crossing order, well inside the neatline
    const pushTB = 54;
    const pushLR = 40;
    const sideOf = (bp: Pt): "top" | "bottom" | "left" | "right" =>
        Math.abs(bp[1] - f.y) < 1 ? "top" : Math.abs(bp[1] - (f.y + f.h)) < 1 ? "bottom" : Math.abs(bp[0] - f.x) < 1 ? "left" : "right";
    const offLayouts: MuniLayout[] = [];
    for (const side of ["top", "bottom", "left", "right"] as const) {
        const horiz = side === "top" || side === "bottom";
        const group = offMap
            .filter((it) => sideOf(it.m.borderPt) === side)
            .sort((a, b) => (horiz ? a.m.borderPt[0] - b.m.borderPt[0] : a.m.borderPt[1] - b.m.borderPt[1]));
        let cursor = -Infinity;
        for (const it of group) {
            const bp = it.m.borderPt;
            const half = horiz ? it.w / 2 : halfH;
            const minA = (horiz ? f.x : f.y) + half + 6;
            const maxA = (horiz ? f.x + f.w : f.y + f.h) - half - 6;
            const crossBase =
                side === "top" ? f.y + pushTB
                : side === "bottom" ? f.y + f.h - pushTB
                : side === "left" ? f.x + pushLR + it.w / 2
                : f.x + f.w - pushLR - it.w / 2;
            let along = Math.min(Math.max(Math.max(horiz ? bp[0] : bp[1], cursor + half + 16), minA), maxA);
            const at = (a: number): [number, number] => (horiz ? [a, crossBase] : [crossBase, a]);
            for (let guard = 0; guard < 400 && hits(mkbox(...at(along), it.w)); guard++) {
                along += 6;
                if (along > maxA) { along = maxA; break; }
            }
            let [cx, cy] = at(along);
            if (it.m.nudge) { cx += it.m.nudge[0]; cy += it.m.nudge[1]; }
            boxes.push(mkbox(cx, cy, it.w));
            cursor = along + half;
            // arrow tip = where the ray from this label toward the town crosses the
            // border, so the arrow line points straight at the town centre
            const tip = clampToRect([cx, cy], it.m.target, f as Rect);
            const u = unit([tip[0] - cx, tip[1] - cy]);
            const alongName = Math.abs(u[0]) * (it.w / 2 + 4) + Math.abs(u[1]) * (halfH + 4);
            const start: Pt = [cx + u[0] * alongName, cy + u[1] * alongName];
            // reserve the arrow so distance labels avoid it
            boxes.push({ x0: Math.min(start[0], tip[0]) - 2, y0: Math.min(start[1], tip[1]) - 2, x1: Math.max(start[0], tip[0]) + 2, y1: Math.max(start[1], tip[1]) + 2 });
            const distKm = haversineKm(proj.unproject([cx, cy]), it.m.at);
            const L: MuniLayout = { name: it.name, cx, cy, w: it.w, arrow: true, start, tip, distKm: Math.round(distKm) >= 5 ? distKm : undefined };
            out.push(L);
            offLayouts.push(L);
        }
    }

    // 3) distance labels, placed to avoid every name, arrow and each other
    for (const L of offLayouts) {
        if (L.distKm === undefined || !L.start || !L.tip) continue;
        const dtext = `${Math.round(L.distKm)} km`;
        const dw = textWidth(dtext, DIST_SIZE, 0);
        const dh = DIST_SIZE;
        const vx = L.tip[0] - L.start[0];
        const vy = L.tip[1] - L.start[1];
        const len = Math.hypot(vx, vy) || 1;
        const px = -vy / len;
        const py = vx / len;
        const dbox = (cx: number, cy: number): Box => ({ x0: cx - dw / 2 - 2, y0: cy - dh / 2 - 2, x1: cx + dw / 2 + 2, y1: cy + dh / 2 + 2 });
        let best: Pt | null = null;
        for (const t of [0.5, 0.62, 0.38, 0.75, 0.25]) {
            const bx = L.start[0] + vx * t;
            const by = L.start[1] + vy * t;
            for (const g of [dh * 0.55 + 5, dh * 0.55 + 12, dh * 0.55 + 20]) {
                for (const s of [1, -1]) {
                    const cx = bx + px * s * g;
                    const cy = by + py * s * g;
                    if (inFrameBox(dbox(cx, cy)) && !hits(dbox(cx, cy))) { best = [cx, cy]; break; }
                }
                if (best) break;
            }
            if (best) break;
        }
        if (!best) best = [(L.start[0] + L.tip[0]) / 2 + px * (dh * 0.55 + 6), (L.start[1] + L.tip[1]) / 2 + py * (dh * 0.55 + 6)];
        boxes.push(dbox(best[0], best[1]));
        L.dist = { x: best[0], y: best[1], text: dtext };
    }
    return out;
}

/** Draw the town shading, arrows (aimed at the town) and distance labels. */
function drawMunicipalities(layouts: MuniLayout[]): string {
    const S = LABEL_STYLE.municipality;
    const out: string[] = [];
    for (const L of layouts) {
        out.push(el("ellipse", { cx: L.cx, cy: L.cy, rx: L.w / 2 + 9, ry: S.size * 0.7 + 4, fill: PALETTE.inkFaint, "fill-opacity": 0.22, filter: "url(#blob)" }));
        if (L.arrow && L.start && L.tip) out.push(arrowMark(L.start, L.tip));
        if (L.dist) {
            out.push(text(L.dist.x, L.dist.y + DIST_SIZE * 0.34, L.dist.text, {
                size: DIST_SIZE, fill: PALETTE.inkSoft, family: FONTS.italic, italic: true, anchor: "middle",
                halo: PALETTE.paper, haloId: "haloPaper",
            }));
        }
        out.push(text(L.cx, L.cy + S.size * 0.34, L.name, {
            size: S.size, fill: S.fill, family: FONTS.serif, weight: 500, tracking: S.tracking, anchor: "middle",
            halo: PALETTE.paper, haloId: "haloPaper",
        }));
    }
    return el("g", {}, out.join(""));
}

function clampToRect(center: Pt, target: Pt, rect: Rect): Pt {
    const [cx, cy] = center;
    const dx = target[0] - cx;
    const dy = target[1] - cy;
    const left = rect.x,
        right = rect.x + rect.w,
        top = rect.y,
        bottom = rect.y + rect.h;
    if (target[0] >= left && target[0] <= right && target[1] >= top && target[1] <= bottom) return target;
    let t = 1;
    if (dx > 0) t = Math.min(t, (right - cx) / dx);
    if (dx < 0) t = Math.min(t, (left - cx) / dx);
    if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
    if (dy < 0) t = Math.min(t, (top - cy) / dy);
    return [cx + dx * t, cy + dy * t];
}

// ---------------------------------------------------------------------------
// decorative apparatus
// ---------------------------------------------------------------------------

interface Furniture {
    box: Box;
    draw: () => string;
}

function layoutFurniture(proj: Projection, insetBox: Box): Furniture[] {
    const { frame } = proj;
    const cart = { x: frame.x + 34, y: frame.y + 30, w: 430, h: 116 };
    // legend moved to the south-west lake (the south-east is now the inset)
    const legend = {
        x: frame.x + 150,
        y: frame.y + frame.h - 154 - 26,
        w: 214,
        h: 154,
    };
    const compass = { cx: frame.x + 78, cy: frame.y + frame.h - 236, R: 36 };
    const barLen = proj.pxPerKm * 5;
    // keep the scale bar in the open water to the LEFT of the inset panel
    const scaleCx = Math.min(frame.x + frame.w * 0.33, insetBox.x0 - barLen / 2 - 30);
    const scale = {
        x: scaleCx - barLen / 2,
        y: frame.y + frame.h - 52,
        w: barLen,
        h: 34,
    };
    return [
        { box: rectBox(cart), draw: () => titleCartouche(cart) },
        { box: rectBox(legend), draw: () => legendBox(legend) },
        {
            box: { x0: compass.cx - compass.R - 12, y0: compass.cy - compass.R - 24, x1: compass.cx + compass.R + 12, y1: compass.cy + compass.R + 12 },
            draw: () => compassRose(proj, compass),
        },
        { box: rectBox({ x: scale.x - 18, y: scale.y - 12, w: scale.w + 36, h: scale.h + 12 }), draw: () => scaleBar(proj, scale) },
    ];
}

function rectBox(r: Rect): Box {
    return { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
}

// ---------------------------------------------------------------------------
// enlarged inset of the Old Toronto core (undistorted square blow-up)
// ---------------------------------------------------------------------------

interface InsetLayout {
    box: Box;
    draw: () => string;
}

/**
 * Lay out the inset. The region shown is the projected bbox of the two
 * geographic corners (topLeft / bottomRight); the display width is anchored to
 * the frame's lower-right corner and the height follows to keep the region's
 * aspect (so the blow-up is an undistorted uniform scale).
 */
function layoutInset(mainProj: Projection, opts?: InsetOptions): InsetLayout {
    const f = mainProj.frame;
    const o = { ...DEFAULT_INSET, ...(opts ?? {}) };
    // project all FOUR corners of the lon/lat rectangle (the map grid is rotated,
    // so a two-corner bbox would be skewed) and take their axis-aligned bbox.
    const lonW = Math.min(o.topLeft[0], o.bottomRight[0]);
    const lonE = Math.max(o.topLeft[0], o.bottomRight[0]);
    const latN = Math.max(o.topLeft[1], o.bottomRight[1]);
    const latS = Math.min(o.topLeft[1], o.bottomRight[1]);
    const corners = ([
        [lonW, latN], [lonE, latN], [lonE, latS], [lonW, latS],
    ] as LonLatTuple[]).map((c) => mainProj.project(c));
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const region = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    const rw = region.x1 - region.x0;
    const rh = region.y1 - region.y0;
    const width = Math.max(120, o.width);
    const scale = width / rw; // uniform scale (undistorted)
    const height = rh * scale;
    const x1 = f.x + f.w - 30;
    const x0 = x1 - width;
    const y1 = f.y + f.h - 30;
    const y0 = y1 - height;
    const panel: Rect = { x: x0, y: y0, w: width, h: height };
    const box: Box = { x0, y0: y0 - 30, x1, y1: y1 + 22 };
    return { box, draw: () => drawInset(mainProj, panel, region, scale) };
}

function drawInset(
    mainProj: Projection,
    panel: Rect,
    region: { x0: number; y0: number; x1: number; y1: number },
    scale: number
): string {
    const ipx = ([sx, sy]: Pt): Pt => [panel.x + (sx - region.x0) * scale, panel.y + (sy - region.y0) * scale];
    const ip = (ll: LonLatTuple): Pt => ipx(mainProj.project(ll));
    const insetPxPerKm = mainProj.pxPerKm * scale;

    const near = (p: Pt, m = 40) =>
        p[0] >= panel.x - m && p[0] <= panel.x + panel.w + m && p[1] >= panel.y - m && p[1] <= panel.y + panel.h + m;
    const inRegion = (sp: Pt) => sp[0] >= region.x0 && sp[0] <= region.x1 && sp[1] >= region.y0 && sp[1] <= region.y1;

    const panelD = `M ${round(panel.x)} ${round(panel.y)} h ${round(panel.w)} v ${round(panel.h)} h ${round(-panel.w)} Z`;
    const out: string[] = [];

    // ---- indicator of the enlarged region on the main map + eye-guide lines ----
    const rTR: Pt = [region.x1, region.y0];
    const rBR: Pt = [region.x1, region.y1];
    const dash = { "stroke-dasharray": "5 4", stroke: PALETTE.ink, "stroke-width": 1, "stroke-opacity": 0.7, fill: "none" } as const;
    out.push(el("path", { d: polyline([[region.x0, region.y0], rTR, rBR, [region.x0, region.y1]]) + " Z", ...dash }));
    out.push(el("path", { d: polyline([rTR, [panel.x, panel.y]]), ...dash }));
    out.push(el("path", { d: polyline([rBR, [panel.x, panel.y + panel.h]]), ...dash }));

    // ---- panel background: crinkled paper ----
    out.push(el("clipPath", { id: "insetClip" }, el("path", { d: panelD })));
    out.push(el("path", { d: panelD, fill: PALETTE.paper }));
    out.push(el("path", { d: panelD, fill: PALETTE.paper, filter: "url(#grain)", opacity: 0.7 }));

    const g: string[] = [];

    // high-res water (accurate, UNsmoothed): fill (islands are holes), real depth
    // contours clipped to the water, then island land + a crisp shoreline.
    const waterFeat = coreWater.features.find((fe) => fe.properties?.kind === "water");
    const waterD = waterFeat ? insetGeomPathD(waterFeat.geometry as Geometry, ip) : "";
    if (waterD) {
        out.push(el("clipPath", { id: "insetWaterClip" }, el("path", { d: waterD, "clip-rule": "evenodd" })));
        g.push(el("path", { d: waterD, fill: PALETTE.water, "fill-rule": "evenodd" }));
        g.push(el("g", { "clip-path": "url(#insetWaterClip)" }, depthContours(ip, 1.6)));
    }
    for (const fe of coreWater.features) {
        if (fe.properties?.kind !== "island") continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (d) g.push(el("path", { d, fill: PALETTE.island }));
    }
    // Port Lands / naturalized Don River new waterways + rivers/canals — the same
    // hi-res water the main map draws (coreWater's shoreline doesn't include them).
    for (const fe of water.features) {
        const w = fe.properties?.water as string | undefined;
        const pl = (fe.properties as Record<string, unknown>)?.portlands === true;
        if (w !== "river" && w !== "canal" && !pl) continue;
        if (!featureNear(fe, ip, near)) continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (!d) continue;
        g.push(el("path", {
            d, "fill-rule": "evenodd", fill: PALETTE.water,
            stroke: pl ? "none" : PALETTE.waterDeep,
            "stroke-width": pl ? undefined : 0.5,
            "stroke-opacity": pl ? undefined : 0.6,
            "stroke-linejoin": "round", "stroke-linecap": "round",
        }));
    }
    if (waterD)
        g.push(el("path", { d: waterD, "fill-rule": "evenodd", fill: "none", stroke: PALETTE.ink, "stroke-width": 1, "stroke-opacity": 0.7, "stroke-linejoin": "round", "stroke-linecap": "round" }));

    // parks (accurate, unsmoothed) over land + islands
    const parkFeatures = parks.features.filter((fe) => featureNear(fe, ip, near));
    for (const fe of parkFeatures) {
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (d) g.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.park, "fill-opacity": 0.85, stroke: PALETTE.parkEdge, "stroke-width": 0.7, "stroke-linejoin": "round" }));
    }

    // high-res road network (unsmoothed, hierarchical, continues to the edges)
    g.push(insetRoads(ip, near));

    // structures: Billy Bishop aeroways + stenciled building footprints
    g.push(insetStructures(ip, near));

    // rapid transit lines + stations (enlarged for the zoomed panel)
    g.push(transitLines(ip, 2.4, 5, 1.7));
    g.push(drawStationsAt(ip, 2.7, (p) => near(p, 8)));

    out.push(el("g", { "clip-path": "url(#insetClip)" }, g.join("")));

    // ---- labels: streets (small, repeated) + parks + landmarks, no overlap ----
    const labelInputs: LabelInput[] = [];
    pushStreetLabels(labelInputs, ip, near);
    for (const fe of parkFeatures) {
        const name = (fe.properties?.name as string) ?? "";
        const lp = fe.properties?.labelPoint as LonLatTuple | undefined;
        if (!name || !lp) continue;
        const p = ip(lp);
        if (!near(p, -4)) continue;
        labelInputs.push(areaLabel(`inspk:${name}`, name, [p[0], p[1]], {
            size: 6.8, tracking: 0.2, fill: PALETTE.parkLabel, family: FONTS.italic, italic: true,
            priority: 42, halo: PALETTE.park, haloWidth: 2,
        }));
    }
    const markers: string[] = [];
    for (const d of LANDMARKS) {
        const sp = mainProj.project(d.at);
        if (!inRegion(sp)) continue;
        const p = ipx(sp);
        // Union is marked by its subway glyph; centeredLabel landmarks (Billy
        // Bishop) show a name only — neither gets a red/blue dot here.
        const noDot = d.name === "Union Station" || d.centeredLabel;
        if (!noDot && !coveredByFootprint(d.at)) {
            const col = d.kind === "water" ? PALETTE.accentBlue : PALETTE.accentRed;
            markers.push(el("circle", { cx: p[0], cy: p[1], r: 3, fill: col, stroke: PALETTE.paper, "stroke-width": 0.8 }));
        }
        if (d.centeredLabel) {
            labelInputs.push(areaLabel(`ins:${d.name}`, d.name, p, {
                size: 10, tracking: 0.1, fill: "#3a2c1c", family: FONTS.serif,
                priority: 58, halo: PALETTE.paper, haloWidth: 2.4,
            }));
            continue;
        }
        labelInputs.push({
            id: `ins:${d.name}`, text: d.name, anchor: p, kind: "point",
            size: 10, tracking: 0.1, fill: "#3a2c1c", family: FONTS.serif,
            priority: d.kind === "water" ? 58 : 60, halo: PALETTE.paper, haloWidth: 2.4,
        });
    }
    const { placed } = placeLabels(labelInputs, panel, []);
    out.push(el("g", { "clip-path": "url(#insetClip)" }, markers.join("") + emitLeaders(placed)));
    out.push(el("g", { "clip-path": "url(#insetClip)" }, emitLabels(placed)));

    // horizontal harbour label
    const wl = ip([-79.373, 43.6366]);
    if (near(wl, -20))
        out.push(text(wl[0], wl[1], "TORONTO HARBOUR", {
            size: 11, fill: PALETTE.waterLabel, family: FONTS.italic, italic: true, tracking: 2,
            halo: PALETTE.water, haloId: "haloWater",
        }));

    // ---- decorative frame + its own scale bar + title ----
    out.push(insetScaleBar(panel, insetPxPerKm));
    out.push(el("path", { d: panelD, fill: "none", stroke: PALETTE.ink, "stroke-width": 2.4 }));
    out.push(el("rect", { x: panel.x + 5, y: panel.y + 5, width: panel.w - 10, height: panel.h - 10, fill: "none", stroke: PALETTE.inkSoft, "stroke-width": 0.8 }));
    for (const c of [
        [panel.x, panel.y], [panel.x + panel.w, panel.y],
        [panel.x + panel.w, panel.y + panel.h], [panel.x, panel.y + panel.h],
    ] as Pt[])
        out.push(el("circle", { cx: c[0], cy: c[1], r: 4, fill: PALETTE.paper, stroke: PALETTE.ink, "stroke-width": 1.5 }));
    out.push(text(panel.x + panel.w / 2, panel.y - 12, "DOWNTOWN CORE", {
        size: 15, fill: PALETTE.ink, family: FONTS.display, weight: 700, tracking: 2,
        halo: PALETTE.paper, haloId: "haloPaper",
    }));
    return el("g", {}, out.join("\n"));
}

/** true if any projected vertex of the feature lies near the panel. */
function featureNear(fe: Feature, ip: (ll: LonLatTuple) => Pt, near: (p: Pt, m?: number) => boolean): boolean {
    const g = fe.geometry;
    if (!g) return false;
    const rings: Position[][] = [];
    if (g.type === "Polygon") rings.push(...(g as Polygon).coordinates);
    else if (g.type === "MultiPolygon") for (const poly of (g as MultiPolygon).coordinates) rings.push(...poly);
    else return false;
    for (const r of rings) for (const p of r) if (near(ip(p as LonLatTuple))) return true;
    return false;
}

/** does a building/apron footprint cover this lon/lat point? (suppresses the dot) */
function coveredByFootprint(ll: LonLatTuple): boolean {
    for (const fe of structures.features) {
        const k = fe.properties?.kind;
        if ((k === "building" || k === "apron") && fe.geometry?.type === "Polygon") {
            if (pointInPolygon(ll as [number, number], (fe.geometry as Polygon).coordinates)) return true;
        }
    }
    return false;
}

/** Billy Bishop runways/taxiways/aprons + "stenciled" building footprints. */
function insetStructures(ip: (ll: LonLatTuple) => Pt, near: (p: Pt, m?: number) => boolean): string {
    const out: string[] = [];
    // aprons first (light fill), then taxiways, runways, then buildings on top
    for (const fe of structures.features) {
        if (fe.properties?.kind !== "apron" || fe.geometry?.type !== "Polygon") continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (d) out.push(el("path", { d, fill: PALETTE.island, "fill-opacity": 0.5, stroke: PALETTE.inkFaint, "stroke-width": 0.5 }));
    }
    const lineOf = (fe: Feature) => (fe.geometry as { coordinates: Position[] }).coordinates.map((p) => ip(p as LonLatTuple));
    for (const fe of structures.features) {
        if (fe.properties?.kind !== "taxiway" || fe.geometry?.type !== "LineString") continue;
        const pts = lineOf(fe);
        if (!pts.some((p) => near(p))) continue;
        out.push(el("path", { d: polyline(pts), fill: "none", stroke: PALETTE.inkFaint, "stroke-width": 1.4, "stroke-opacity": 0.6, "stroke-linecap": "round" }));
    }
    for (const fe of structures.features) {
        if (fe.properties?.kind !== "runway" || fe.geometry?.type !== "LineString") continue;
        const pts = lineOf(fe);
        out.push(el("path", { d: polyline(pts), fill: "none", stroke: PALETTE.buildingInk, "stroke-width": 5, "stroke-opacity": 0.85, "stroke-linecap": "butt" }));
        out.push(el("path", { d: polyline(pts), fill: "none", stroke: PALETTE.paper, "stroke-width": 0.7, "stroke-dasharray": "5 5", "stroke-opacity": 0.9 }));
    }
    // stenciled buildings: hatch fill + dark outline
    for (const fe of structures.features) {
        if (fe.properties?.kind !== "building" || fe.geometry?.type !== "Polygon") continue;
        if (!featureNear(fe, ip, near)) continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (!d) continue;
        out.push(el("path", { d, fill: "url(#bldgHatch)", stroke: PALETTE.buildingInk, "stroke-width": 0.9, "stroke-linejoin": "round" }));
    }
    return out.join("");
}

/** High-res core road network, unsmoothed & hierarchical (casings then inks). */
function insetRoads(ip: (ll: LonLatTuple) => Pt, near: (p: Pt, m?: number) => boolean): string {
    const cas: string[] = [];
    // bucket ink strokes by opacity so each opacity level composites once (opaque
    // strokes inside a group with group-opacity) — no stacked seams where a road's
    // segments overlap.
    const inkByOp = new Map<number, string[]>();
    for (const fe of coreRoads.features) {
        if (fe.geometry?.type !== "LineString") continue;
        const cls = (fe.properties?.class as string) ?? "";
        const pts = (fe.geometry.coordinates as Position[]).map((p) => ip(p as LonLatTuple));
        if (!pts.some((p) => near(p, 30))) continue;
        const d = polyline(pts);
        let inkW = 0.55;
        let col: string = PALETTE.inkFaint;
        let casW = 0;
        let op = 0.7;
        if (cls === "motorway" || cls === "trunk" || cls === "primary") { inkW = 1.5; col = PALETTE.inkSoft; casW = 3.2; op = 0.9; }
        else if (cls === "secondary") { inkW = 1.2; col = PALETTE.inkSoft; casW = 2.6; op = 0.9; }
        else if (cls === "tertiary") { inkW = 0.95; col = PALETTE.inkSoft; casW = 2.0; op = 0.85; }
        if (casW > 0) cas.push(el("path", { d, fill: "none", stroke: PALETTE.paper, "stroke-width": casW, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        if (!inkByOp.has(op)) inkByOp.set(op, []);
        inkByOp.get(op)!.push(el("path", { d, fill: "none", stroke: col, "stroke-width": inkW, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    }
    let out = el("g", { opacity: 0.75 }, cas.join(""));
    // draw fainter roads first, more prominent (higher-opacity) roads on top
    for (const op of [...inkByOp.keys()].sort((a, b) => a - b)) {
        out += el("g", { opacity: op }, inkByOp.get(op)!.join(""));
    }
    return out;
}

let streetLabelSeq = 0;
/** Small road-name labels, repeated along each road and offset off the centreline.
 *  OSM road ways are per-block, so we place labels by each way's arc length
 *  (≥1 on any way long enough); repetition along a street comes from its many
 *  ways plus extra labels on long ways. */
function pushStreetLabels(
    labelInputs: LabelInput[],
    ip: (ll: LonLatTuple) => Pt,
    near: (p: Pt, m?: number) => boolean
): void {
    let budget = 1600; // cap candidates for perf
    for (const fe of coreRoads.features) {
        if (budget <= 0) break;
        const name = (fe.properties?.name as string) ?? "";
        if (!name || fe.geometry?.type !== "LineString") continue;
        const cls = (fe.properties?.class as string) ?? "";
        if (cls.endsWith("_link") || cls === "motorway") continue;
        const pts = (fe.geometry.coordinates as Position[]).map((p) => ip(p as LonLatTuple));
        if (pts.length < 2 || !pts.some((p) => near(p, 0))) continue;
        // cumulative arc length
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const L = cum[cum.length - 1];
        if (L < 42) continue; // skip tiny stubs
        let prio = 22;
        let interval = 340;
        if (cls === "primary") { prio = 34; interval = 250; }
        else if (cls === "secondary") { prio = 32; interval = 260; }
        else if (cls === "tertiary") { prio = 28; interval = 300; }
        const n = Math.max(1, Math.round(L / interval));
        for (let k = 0; k < n && budget > 0; k++) {
            const d = (L * (k + 0.5)) / n;
            let i = 1;
            while (i < cum.length - 1 && cum[i] < d) i++;
            const seg = cum[i] - cum[i - 1] || 1;
            const t = (d - cum[i - 1]) / seg;
            const a = pts[i - 1];
            const b = pts[i];
            const cx = a[0] + (b[0] - a[0]) * t;
            const cy = a[1] + (b[1] - a[1]) * t;
            if (!near([cx, cy], -8)) continue;
            const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const dir: Pt = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl];
            const perp: Pt = [-dir[1], dir[0]];
            let ang = angleDeg(dir);
            if (ang > 90) ang -= 180;
            else if (ang < -90) ang += 180;
            const off = 4; // sit beside, not on, the road it names
            labelInputs.push(
                areaLabel(`insst:${streetLabelSeq++}`, name, [cx + perp[0] * off, cy + perp[1] * off], {
                    size: 5.2, tracking: 0.1, fill: PALETTE.inkSoft, family: FONTS.italic, italic: true,
                    rotate: ang, priority: prio, halo: PALETTE.paper, haloWidth: 1.6,
                })
            );
            budget--;
        }
    }
}

/** A small scale bar inside the inset, bottom-left. */
function insetScaleBar(panel: Rect, pxPerKm: number): string {
    const km = 2;
    const seg = pxPerKm; // 1 km per segment
    const x = panel.x + 16;
    const y = panel.y + panel.h - 18;
    const out: string[] = [];
    for (let i = 0; i < km; i++)
        out.push(el("rect", { x: x + i * seg, y, width: seg, height: 5, fill: i % 2 === 0 ? PALETTE.ink : PALETTE.paper, stroke: PALETTE.ink, "stroke-width": 0.7 }));
    for (let i = 0; i <= km; i++)
        out.push(text(x + i * seg, y - 3, String(i), { size: 7, fill: PALETTE.ink, family: FONTS.serif }));
    out.push(text(x + (seg * km) / 2, y + 12, "KILOMETRES", { size: 7, fill: PALETTE.inkSoft, family: FONTS.serif, tracking: 1.5 }));
    return el("g", {}, out.join(""));
}

/** geomPathD but through the inset's uniform scale of the main projection. */
function insetGeomPathD(geom: Geometry, ip: (ll: LonLatTuple) => Pt): string {
    const rings: Position[][] = [];
    if (geom.type === "Polygon") rings.push(...(geom as Polygon).coordinates);
    else if (geom.type === "MultiPolygon")
        for (const poly of (geom as MultiPolygon).coordinates) rings.push(...poly);
    else return "";
    return rings
        .map((r) => polyline(r.map((p) => ip(p as LonLatTuple))) + " Z")
        .join(" ");
}

function decorativeBorder(frame: Rect): string {
    const out: string[] = [];
    const o = 18;
    const outer = { x: frame.x - o, y: frame.y - o, w: frame.w + o * 2, h: frame.h + o * 2 };
    out.push(el("rect", { x: outer.x, y: outer.y, width: outer.w, height: outer.h, fill: "none", stroke: PALETTE.ink, "stroke-width": 3 }));
    out.push(el("rect", { x: frame.x, y: frame.y, width: frame.w, height: frame.h, fill: "none", stroke: PALETTE.ink, "stroke-width": 1 }));
    out.push(zigzagRect(outer, frame, 14));
    for (const [rx, ry] of [
        [outer.x, outer.y],
        [outer.x + outer.w, outer.y],
        [outer.x, outer.y + outer.h],
        [outer.x + outer.w, outer.y + outer.h],
    ]) {
        out.push(el("circle", { cx: rx, cy: ry, r: 6, fill: PALETTE.paper, stroke: PALETTE.ink, "stroke-width": 2 }));
        out.push(el("circle", { cx: rx, cy: ry, r: 2, fill: PALETTE.ink }));
    }
    return el("g", {}, out.join(""));
}

function zigzagRect(outer: Rect, inner: Rect, step: number): string {
    // A continuous ring of outward-pointing triangles ("pinked" edge). Each side
    // is walked corner→corner with an EVEN number of teeth, so every corner lands
    // exactly on a valley on the mid-line and the two sides meeting there agree —
    // no overshoot or doubled peaks at the corners.
    const midTop = (outer.y + inner.y) / 2;
    const midBottom = (outer.y + outer.h + inner.y + inner.h) / 2;
    const midLeft = (outer.x + inner.x) / 2;
    const midRight = (outer.x + outer.w + inner.x + inner.w) / 2;
    const amp = (inner.y - outer.y) / 2 - 2;

    const TL: Pt = [midLeft, midTop];
    const TR: Pt = [midRight, midTop];
    const BR: Pt = [midRight, midBottom];
    const BL: Pt = [midLeft, midBottom];

    const pts: Pt[] = [];
    const edge = (a: Pt, b: Pt, out: Pt) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(2, 2 * Math.round(len / (2 * step))); // even teeth count
        for (let i = 0; i < n; i++) {
            const t = i / n;
            const off = i % 2 === 0 ? 0 : amp; // valley on the mid-line, peak outward
            pts.push([
                a[0] + (b[0] - a[0]) * t + out[0] * off,
                a[1] + (b[1] - a[1]) * t + out[1] * off,
            ]);
        }
    };
    edge(TL, TR, [0, -1]);
    edge(TR, BR, [1, 0]);
    edge(BR, BL, [0, 1]);
    edge(BL, TL, [-1, 0]);

    return el("path", {
        d: polyline(pts) + " Z",
        fill: "none",
        stroke: PALETTE.ink,
        "stroke-width": 0.9,
        "stroke-opacity": 0.85,
        "stroke-linejoin": "round",
    });
}

function titleCartouche(r: Rect): string {
    const { x, y, w, h } = r;
    const out: string[] = [];
    out.push(el("rect", { x, y, width: w, height: h, rx: 10, fill: PALETTE.paper, "fill-opacity": 0.85, stroke: PALETTE.ink, "stroke-width": 2 }));
    out.push(el("rect", { x: x + 6, y: y + 6, width: w - 12, height: h - 12, rx: 7, fill: "none", stroke: PALETTE.inkSoft, "stroke-width": 0.8 }));
    out.push(scroll(x + 16, y + h / 2, -1));
    out.push(scroll(x + w - 16, y + h / 2, 1));
    out.push(text(x + w / 2, y + 50, "CITY OF TORONTO", { size: 36, fill: PALETTE.ink, family: FONTS.display, tracking: 3, weight: 700 }));
    out.push(text(x + w / 2, y + 76, "AND ITS NEIGHBOURHOODS", { size: 14, fill: PALETTE.inkSoft, family: FONTS.serif, tracking: 6 }));
    out.push(text(x + w / 2, y + 98, "— Canada West —", { size: 12, fill: PALETTE.inkSoft, family: FONTS.italic, italic: true, tracking: 2 }));
    return el("g", {}, out.join("\n"));
}

function scroll(cx: number, cy: number, dir: number): string {
    const d = `M ${round(cx)} ${round(cy - 20)} q ${dir * 14} 7 0 20 q ${-dir * 11} 7 0 18`;
    return el("path", { d, fill: "none", stroke: PALETTE.inkSoft, "stroke-width": 1 });
}

function compassRose(proj: Projection, c: { cx: number; cy: number; R: number }): string {
    const { cx, cy, R } = c;
    const n = proj.north;
    const e = perp(n);
    const out: string[] = [];
    const pt = (a: Pt, r: number): Pt => [cx + a[0] * r, cy + a[1] * r];
    const shortR = R * 0.34;
    const diagNE = unit([n[0] + e[0], n[1] + e[1]]);
    const diagNW = unit([n[0] - e[0], n[1] - e[1]]);
    const diagSE = unit([-n[0] + e[0], -n[1] + e[1]]);
    const diagSW = unit([-n[0] - e[0], -n[1] - e[1]]);
    const star: Pt[] = [
        pt(n, R),
        pt(diagNE, shortR),
        pt(e, R),
        pt(diagSE, shortR),
        pt([-n[0], -n[1]], R),
        pt(diagSW, shortR),
        pt([-e[0], -e[1]], R),
        pt(diagNW, shortR),
    ];
    out.push(el("circle", { cx, cy, r: R + 8, fill: PALETTE.paper, "fill-opacity": 0.55, stroke: PALETTE.inkSoft, "stroke-width": 0.8 }));
    // graduated tick marks around the perimeter (every 15°, longer at the quarters)
    const ringR = R + 8;
    for (let i = 0; i < 24; i++) {
        const ang = (i * 15 * Math.PI) / 180;
        const dir: Pt = [Math.sin(ang), -Math.cos(ang)];
        const long = i % 6 === 0;
        const r0 = ringR - (long ? 6 : 3);
        const p0: Pt = [cx + dir[0] * r0, cy + dir[1] * r0];
        const p1: Pt = [cx + dir[0] * ringR, cy + dir[1] * ringR];
        out.push(
            el("path", {
                d: polyline([p0, p1]),
                stroke: PALETTE.ink,
                "stroke-width": long ? 1 : 0.6,
                "stroke-opacity": 0.75,
            })
        );
    }
    out.push(el("path", { d: polyline(star) + " Z", fill: PALETTE.ink, "fill-opacity": 0.85 }));
    out.push(el("path", { d: polyline([pt(n, R), pt(diagNE, shortR), [cx, cy], pt(diagNW, shortR)]) + " Z", fill: PALETTE.paper, stroke: PALETTE.ink, "stroke-width": 0.6 }));
    const nl = pt(n, R + 18);
    out.push(text(nl[0], nl[1] + 4, "N", { size: 15, fill: PALETTE.ink, family: FONTS.display, weight: 700 }));
    return el("g", {}, out.join("\n"));
}

function scaleBar(proj: Projection, r: Rect): string {
    const { pxPerKm } = proj;
    const km = 5;
    const seg = pxPerKm;
    const x = r.x;
    const y = r.y;
    const out: string[] = [];
    for (let i = 0; i < km; i++)
        out.push(el("rect", { x: x + i * seg, y, width: seg, height: 8, fill: i % 2 === 0 ? PALETTE.ink : PALETTE.paper, stroke: PALETTE.ink, "stroke-width": 1 }));
    for (let i = 0; i <= km; i++)
        out.push(text(x + i * seg, y - 5, String(i), { size: 11, fill: PALETTE.ink, family: FONTS.serif }));
    out.push(text(x + (seg * km) / 2, y + 24, "SCALE OF KILOMETRES", { size: 11, fill: PALETTE.inkSoft, family: FONTS.serif, tracking: 3 }));
    return el("g", {}, out.join("\n"));
}

function legendBox(r: Rect): string {
    const { x, y, w, h } = r;
    const out: string[] = [];
    out.push(el("rect", { x, y, width: w, height: h, rx: 6, fill: PALETTE.paper, "fill-opacity": 0.88, stroke: PALETTE.ink, "stroke-width": 1.4 }));
    out.push(text(x + w / 2, y + 22, "EXPLANATION", { size: 14, fill: PALETTE.ink, family: FONTS.display, tracking: 3, weight: 700 }));
    const rows: Array<[string, string]> = [
        ["swatch", "Former Borough"],
        ["line", "Principal Street"],
        ["dot", "Landmark"],
        ["water", "Lake, River & Harbour"],
        ["depth", "Depth contour (metres)"],
    ];
    let ry = y + 44;
    for (const [kind, label] of rows) {
        const gx = x + 18;
        if (kind === "swatch") out.push(el("rect", { x: gx, y: ry - 9, width: 18, height: 12, fill: PALETTE.regions["North York"], stroke: PALETTE.inkFaint, "stroke-width": 0.6 }));
        else if (kind === "line") out.push(el("path", { d: `M ${gx} ${ry - 3} L ${gx + 18} ${ry - 3}`, stroke: PALETTE.inkSoft, "stroke-width": 2 }));
        else if (kind === "dot") out.push(el("circle", { cx: gx + 9, cy: ry - 3, r: 3, fill: PALETTE.accentRed, stroke: PALETTE.paper, "stroke-width": 0.8 }));
        else if (kind === "depth") out.push(el("path", { d: `M ${gx} ${ry - 5} q 4.5 6 9 0 t 9 0`, fill: "none", stroke: PALETTE.waterDeep, "stroke-width": 1, "stroke-opacity": 0.8 }));
        else out.push(el("rect", { x: gx, y: ry - 9, width: 18, height: 12, fill: PALETTE.water, stroke: PALETTE.waterDeep, "stroke-width": 0.6 }));
        out.push(text(gx + 28, ry, label, { size: 12, fill: PALETTE.ink, family: FONTS.serif, anchor: "start" }));
        ry += 22;
    }
    return el("g", {}, out.join("\n"));
}
