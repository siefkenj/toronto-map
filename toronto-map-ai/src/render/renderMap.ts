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
import bigParksRaw from "../assets/toronto-parks.geojson.json";
import beachesRaw from "../assets/toronto-beaches.geojson.json";
import waterwaysRaw from "../assets/toronto-waterways.geojson.json";
import islandParksRaw from "../assets/toronto-island-parks.geojson.json";
import arterialsRaw from "../assets/toronto-arterials.geojson.json";

import { BOROUGHS, GAZETTEER, POPULATION_YEAR, TORONTO, TOWNS, gazetteerEntry, type GazetteerEntry, type GazetteerKind } from "../data/gazetteer";
import {
    FERRY_ROUTES,
    LANDMARKS,
    MUNICIPALITIES,
    NEIGHBOURHOODS,
    PARK_LABELS,
    RIVER_LABELS,
    SUPER_DISTRICTS,
} from "../data/places";
import {
    CITY_ROT,
    CONTENT_BOUNDS,
    makeProjection,
    type LonLatTuple,
    type Projection,
} from "./projection";
import { FONT_FACE_CSS } from "./fonts";
import { FONTS, LABEL_STYLE, PALETTE } from "./style";
import { breakLines, layoutItemsFromString, positionItems } from "tex-linebreak";
import { el, esc, polyline, round, text, type Pt } from "./svg";
import { pointInPolygon, simpleCenter } from "./geometry";
import { depthContours } from "./bathymetry";
import {
    badgeAdvance,
    badgeGeometry,
    boxesOverlap,
    charAdvance,
    labelBox,
    placeLabels,
    textWidth,
    type Box,
    type LabelBadge,
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
const bigParks = bigParksRaw as unknown as FeatureCollection;
const beaches = beachesRaw as unknown as FeatureCollection;
const waterways = waterwaysRaw as unknown as FeatureCollection;
const islandParks = islandParksRaw as unknown as FeatureCollection;
const arterials = arterialsRaw as unknown as FeatureCollection;

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
     * Display width of the minimap in map units (px), anchored to the map's
     * bottom-right corner — so a smaller width shrinks it toward that corner and
     * its height follows to preserve the shown region's aspect.
     *
     * The whole panel is scaled, type and line weights included, so changing
     * this makes the minimap bigger or smaller rather than cramming the same
     * labels into less room. Capped by the space the slot has: past roughly the
     * frame's width × 0.28 it stops growing, because it would otherwise run off
     * the sheet.
     */
    width?: number;
    /** Geographic upper-left (NW) corner of the region shown, as [lon, lat]. */
    topLeft?: LonLatTuple;
    /** Geographic lower-right (SE) corner of the region shown, as [lon, lat]. */
    bottomRight?: LonLatTuple;
}

export interface IndexOptions {
    /**
     * Width of the gazetteer's last column — the one carrying the city, its
     * boroughs and the surrounding towns — as a multiple of one index column.
     * 1 makes it the same width as an index column, 2 twice as wide, and so on.
     *
     * The four index columns divide whatever is left, so widening this narrows
     * them. Type size is not fixed: the panel solves for the largest size at
     * which every division still fits, so a badly proportioned column shows up
     * as smaller type across the whole panel rather than as an overflow. Around
     * 2 the two divisions run out of copy at the same depth, which is where the
     * size peaks; see SIDE_COL_RATIO.
     */
    sideColumn?: number;
}

/** Default proportions for the gazetteer panel (see IndexOptions). */
export const DEFAULT_INDEX: Required<IndexOptions> = {
    sideColumn: 2,
};

export interface RenderOptions {
    width?: number;
    height?: number;
    /** Configure the enlarged inset of the Old Toronto core. */
    inset?: InsetOptions;
    /** Configure the proportions of the gazetteer panel. */
    index?: IndexOptions;
}

/**
 * Defaults for the inset region + size (see InsetOptions).
 *
 * The width matches CANONICAL_RENDER's, so a bare renderTorontoMap() gives the
 * poster as drawn. It used to read 800 back when the slot clamped anything past
 * ~550 to the same panel; now that the inset really does grow, a default that
 * large would silently render a different sheet from the one on the wall.
 */
export const DEFAULT_INSET: Required<InsetOptions> = {
    width: 560,
    topLeft: [-79.421, 43.668],
    bottomRight: [-79.344, 43.622],
};

/**
 * Page layout, in map units.
 *
 * The map frame carries only a narrow strip of blank paper on the top and
 * sides — the same width as the zig-zag band drawn just inside the neatline, so
 * the two read as one border rather than as a wide mat. The whole bottom strip
 * is instead given over to the index band, which holds the enlarged core, the
 * legend apparatus and the numbered gazetteer.
 *
 * The frame that leaves is much wider than the city's own 1.35:1 aspect, so the
 * projection covers it (see FitMode) and the surplus — all of it open lake —
 * falls off the bottom edge.
 */
const PAGE = {
    /** blank paper between the sheet edge and the outer neatline */
    margin: 36,
    /**
     * Height of the bottom band, measured from the neatline down to the sheet
     * edge — and so the one number that sets how tall the index panel is. The
     * panel gets `band` less 68 (this margin, the border offset and its own air
     * above), which is 282 at 350; the map frame gets the rest, and everything
     * the band takes comes off the bottom of the lake.
     *
     * Bounded by real map content: the tip of the Leslie Street Spit (Tommy
     * Thompson Park) projects to y≈1117 on the 2000×1500 sheet against a frame
     * bottom of 1500 − band, so 383 puts the edge exactly on the tip and
     * anything past that cuts the park off. 350 leaves 33px of open water below
     * it. Type size in the panel rises as the band grows: 4.0 at 350, 4.3 at
     * 370, 4.5 at 383.
     */
    band: 350,
} as const;

/** How far the outer neatline sits outside the map frame (the zig-zag band's width). */
const BORDER_OFFSET = 18;

/**
 * Blank paper actually left at the edge of the sheet.
 *
 * PAGE.margin is not that number: it insets the map *frame*, and the border is
 * then drawn BORDER_OFFSET outside the frame, so what shows at the top and
 * sides is the difference. Anything in the bottom band has no border reaching
 * out past it, so it has to stop at this line itself or it prints a margin
 * twice the size of the one above it.
 */
const PAPER_EDGE = PAGE.margin - BORDER_OFFSET;

/** Frame margins for the main map. Shared so the viewer's anchor can't drift. */
function pageMargin(): { top: number; right: number; bottom: number; left: number } {
    return { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.band, left: PAGE.margin };
}

/**
 * Screen coordinates of the downtown core in the default-size render, used by the
 * viewer shell to open the map centred on downtown instead of empty suburbia.
 */
export function defaultViewAnchor(options: RenderOptions = {}): { x: number; y: number } {
    const W = options.width ?? 2000;
    const H = options.height ?? 1500;
    const proj = makeProjection({ w: W, h: H }, pageMargin(), CONTENT_BOUNDS, CITY_ROT, "cover-top");
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
    park: 56,
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
    const proj = makeProjection({ w: W, h: H }, pageMargin(), CONTENT_BOUNDS, CITY_ROT, "cover-top");
    const { project, frame } = proj;

    const e0 = project([-79.38, 43.68]);
    const e1 = project([-79.37, 43.68]);
    const eastVec = unit([e1[0] - e0[0], e1[1] - e0[1]]);

    // ---- the enlarged core ----
    // Anchored to the map's bottom-right, where the only open water left after
    // the crop is. It is too tall for that wedge on its own, so it deliberately
    // overruns the neatline and hangs down into the band; drawn last (below) so
    // it sits over the border rather than under it. Its foot lands on PAPER_EDGE
    // like everything else in the band, so the inset, the legend box and the
    // gazetteer panel all finish on one line above the sheet's bottom margin.
    const inset = layoutInset(proj, options.inset, {
        x: frame.x + frame.w * 0.72,
        y: frame.y + frame.h * 0.78,
        w: frame.w * 0.28 + 12,
        h: H - PAPER_EDGE - (frame.y + frame.h * 0.78),
    });

    // ---- the bottom band: legend apparatus | gazetteer ----
    // Its top clears the outer neatline (the frame's decorative border sticks
    // out by BORDER_OFFSET) plus a little air, and it stops short of the inset
    // hanging into it from the right. Its foot goes down to PAPER_EDGE, not to
    // PAGE.margin: the band has no border reaching out past it, so stopping at
    // the frame's own inset would leave twice the paper below the panel that
    // the neatline leaves above the map.
    const bandTop = frame.y + frame.h + BORDER_OFFSET + 14;
    const bandRow: Rect = { x: frame.x, y: bandTop, w: frame.w, h: H - PAPER_EDGE - bandTop };
    const GAP = 26;
    const legendCol: Rect = { x: bandRow.x, y: bandRow.y, w: 226, h: bandRow.h };
    const indexPanel: Rect = {
        x: legendCol.x + legendCol.w + GAP,
        y: bandRow.y,
        w: inset.panel.x - GAP - (legendCol.x + legendCol.w + GAP),
        h: bandRow.h,
    };

    // decorative furniture (the cartouche and the scale bar are label keep-outs;
    // the legend and compass sit off the map in the band and cannot collide)
    const furniture = layoutFurniture(proj, legendCol);

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
    // islands (sand landmass) sit under the parks so island parks (e.g. Toronto
    // Island) show as green over the sand; beaches then re-expose sand at the
    // shore, and waterways (rivers/ravine creeks) draw on top of the park green.
    mapContent.push(islandsLayer(proj));
    mapContent.push(bigParksLayer(proj));
    mapContent.push(highParkLayer(proj));
    // after the citywide parks, so the islands' own park/non-park shading wins
    mapContent.push(islandParksLayer(proj));
    mapContent.push(beachesLayer(proj));
    mapContent.push(waterwaysLayer(proj));
    mapContent.push(airportLayer(proj));
    mapContent.push(ferryLayer((ll) => proj.project(ll)));
    mapContent.push(highwaysLayer(proj));
    mapContent.push(arterialsLayer(proj));
    mapContent.push(streetsLayer(proj));
    mapContent.push(transitLayer(proj));
    mapContent.push(stationsLayer(proj));
    const labelledLandmarks = new Set(
        mapLabels.filter((p) => p.id.startsWith("lm:") && p.badge).map((p) => p.id.slice(3))
    );
    mapContent.push(landmarkMarkers(proj, labelledLandmarks));
    // curved road labels bend along each road, avoiding the placed labels. Streets
    // reserve first (they matter more), then highways yield to them.
    const roadLabelKeepOut = [...keepOut, ...mapLabels.map(labelBox)];
    const streetItems = streets.features.map((f) => ({ name: (f.properties?.name as string) ?? "", chains: mergedChainsOf(f) }));
    // highways draw raw (all lanes), but for LABEL placement we use the merged
    // centreline so the name has one long line to sit on instead of a stub.
    const hwyItems = highways.features
        .filter((f) => f.geometry?.type === "MultiLineString")
        .map((f) => ({ name: (f.properties?.label as string) ?? "", chains: mergedChainsOf(f) }));
    // arterials are the lowest tier: small and subdued, and they yield to both
    // the spine streets and the highways (whose boxes are reserved first).
    const artItems = arterials.features
        .filter((f) => f.geometry?.type === "MultiLineString")
        .map((f) => ({ name: (f.properties?.name as string) ?? "", chains: mergedChainsOf(f) }));
    mapContent.push(curvedRoadLabels(proj, streetItems, { size: LABEL_STYLE.street.size, tracking: LABEL_STYLE.street.tracking ?? 1, fill: LABEL_STYLE.street.fill, weight: 500, italic: true }, frame as Rect, roadLabelKeepOut));
    mapContent.push(curvedRoadLabels(proj, hwyItems, { size: 6, tracking: 0.8, fill: PALETTE.inkFaint, weight: 600, italic: false }, frame as Rect, roadLabelKeepOut));
    mapContent.push(curvedRoadLabels(proj, artItems, { size: 4.6, tracking: 0.35, fill: PALETTE.inkFaint, weight: 400, italic: true, upper: false }, frame as Rect, roadLabelKeepOut));
    mapContent.push(emitLeaders(mapLabels));
    mapContent.push(emitLabels(mapLabels));
    // transit labels on top of the map labels (their boxes were reserved above)
    mapContent.push(emitTransitLabels(transitLabels));
    layers.push(el("g", { "clip-path": "url(#frameClip)" }, mapContent.join("\n")));

    // surrounding towns (drawn above the map content)
    layers.push(drawMunicipalities(muniLayouts));

    // ---- bottom band contents ----
    layers.push(gazetteerPanel(indexPanel, options.index));

    // decorative apparatus on top
    layers.push(decorativeBorder(frame));

    // the enlarged core last of all: it overhangs the neatline, so it has to be
    // drawn over the border rather than clipped behind it
    layers.push(inset.draw());
    for (const f of furniture) layers.push(f.draw());

    if (dropped > 0) layers.push(`<!-- ${dropped} low-priority labels dropped to avoid overlap -->`);

    // Index integrity. The gazetteer panel prints every entry, so every entry
    // has to be findable on the sheet. Anything reduced to a bare badge is fine
    // (that is the documented fallback); anything ABSENT is a defect, and is
    // called out here rather than silently shipping an unfollowable number.
    // Runs after inset.draw() above, which is what fills inset.labelled.
    const named = new Set<string>();
    const badgeOnly = new Set<string>();
    for (const p of mapLabels) {
        if (!p.badge) continue;
        (p.text ? named : badgeOnly).add(p.id.replace(/^(?:nbhd|lm):/, ""));
    }
    for (const n of inset.labelled) named.add(n);
    // the towns are laid out by their own packer, which never drops one
    for (const L of muniLayouts) named.add(L.name);
    const absent = [...GAZETTEER, ...TOWNS].filter(
        (e) => !named.has(e.name) && !named.has(e.name.toUpperCase()) && !badgeOnly.has(e.name)
    );
    layers.push(
        `<!-- index: ${named.size} named, ${badgeOnly.size} badge-only` +
            (badgeOnly.size ? ` (${[...badgeOnly].join(", ")})` : "") +
            (absent.length ? `; MISSING ${absent.map((e) => `${e.label} ${e.name}`).join(", ")}` : "; none missing") +
            ` -->`
    );

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONTS.serif}">`,
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
            // river-mouth seams: each outline erased where it meets the other
            // river-mouth seams: the coast stops exactly at the width of the mouth,
            // and a river's own outline stops where it reaches the coast. (The lake
            // side has to stay a dilated stroke: the lake outline runs behind the
            // Port Lands, so an area test there swallows the slips.)
            // The two directions need different growth. A river genuinely crosses
            // the coast (the asset extrudes each mouth past it), so erasing the
            // coast needs no growth at all — and must not have any, or it eats a
            // margin along the coast either side and leaves an unoutlined nub of
            // land at each corner. The lake does NOT reach back into the river, so
            // erasing the river's outline does need growth, or the outer half of
            // its mouth-edge stroke survives and caps the opening.
            // water boundaries are drawn on the land side only, so they stop dead
            // at the water's edge — including across every river mouth
            landMask("landOnly", [lakeD, waterwaysOutlineD(proj)], frame as Rect),
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


/**
 * Which former borough a neighbourhood belongs to, by majority vote of its
 * outline vertices. A single centroid test misassigns the L- and U-shaped
 * neighbourhoods (whose centroid can fall outside the polygon entirely), so
 * sample the outline instead. Memoised — this runs over every neighbourhood.
 */
/** Which former borough contains a single lon/lat point. */
function boroughAtPoint(pt: [number, number]): string | null {
    for (const r of level8.features) {
        if (!isPolygonal(r)) continue;
        const rg = r.geometry as Polygon | MultiPolygon;
        const polys = rg.type === "Polygon" ? [rg.coordinates] : rg.coordinates;
        if (polys.some((poly) => pointInPolygon(pt, poly))) return (r.properties?.name as string) || null;
    }
    return null;
}

const boroughCache = new Map<Feature, string>();
/**
 * Which former borough a neighbourhood belongs to, by majority vote of sample
 * points taken INSIDE it.
 *
 * The vote used to be over the neighbourhood's outline instead, which gets the
 * answer wrong wherever a neighbourhood abuts a borough line: its edge vertices
 * sit ON that line, so roughly half of them test as the borough next door. Seven
 * neighbourhoods lying wholly inside Etobicoke — Kingsway South, Stonegate-
 * Queensway, Edenbridge-Humber Valley among them — were washed as York, North
 * York or Old Toronto, which dragged Etobicoke's apparent edge well west of the
 * Humber. Sampling the interior asks the question the wash is actually posing:
 * which borough does most of this neighbourhood lie in.
 *
 * Memoised — this runs over every neighbourhood.
 */
function boroughOfNeighbourhood(f: Feature): string {
    const hit = boroughCache.get(f);
    if (hit) return hit;
    const g = f.geometry as Polygon | MultiPolygon;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const poly of polys) for (const p of poly[0]) {
        x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
        y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
    const N = 18;
    const votes = new Map<string, number>();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const pt: [number, number] = [x0 + ((i + 0.5) / N) * (x1 - x0), y0 + ((j + 0.5) / N) * (y1 - y0)];
        if (!polys.some((poly) => pointInPolygon(pt, poly))) continue;
        const name = boroughAtPoint(pt) ?? "Old Toronto";
        votes.set(name, (votes.get(name) ?? 0) + 1);
    }
    // a sliver too thin for the grid to land in falls back to its own centre
    let best = votes.size ? "" : (boroughAtPoint(simpleCenter(g.coordinates)) ?? "Old Toronto");
    let bestN = -1;
    for (const [k, n] of votes) if (n > bestN) { bestN = n; best = k; }
    boroughCache.set(f, best);
    return best;
}

function regionsAndNeighbourhoods(proj: Projection): string {
    // Neighbourhoods contribute their region tint only — no boundaries are drawn
    // for them at all; the sole administrative outlines are the former boroughs.
    // Each neighbourhood is washed with the tint of the borough it mostly lies in.
    //
    // Filling the borough polygons directly would be more literally accurate, but
    // the former-borough lines don't respect today's neighbourhoods — the old York
    // boundary, for instance, runs straight through the middle of Runnymede-Bloor
    // West Village — so it lays a hard colour edge across the interior of a
    // neighbourhood with no street or ravine to explain it. With the boundaries
    // themselves not drawn, snapping the wash to neighbourhood outlines keeps
    // every colour break on a real feature.
    const fills: string[] = [];
    for (const f of level10.features) {
        if (!isPolygonal(f)) continue;
        const fill = PALETTE.regions[boroughOfNeighbourhood(f)] ?? PALETTE.regionDefault;
        const d = geomPathD(f.geometry, proj);
        if (d) fills.push(el("path", { d, fill, "fill-rule": "evenodd" }));
    }
    return el("g", {}, fills.join(""));
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

/** Visible width of the drawn coastline, and of the thinner outline around
 *  rivers. Both are stroked at TWICE these values and clipped to land, so the
 *  land-side half that survives is the width named here — see landMask. */
const SHORE_INK = 1.1;
const INSET_SHORE_INK = 1;
const RIVER_INK = 0.4;
const INSET_RIVER_INK = 0.5;

/** The soft shaded band that hugs the shore. Always used inside a clip that says
 *  which water it may darken — the lake, or (across a mouth) the rivers. */
function shoreFeather(shoreD: string): string {
    return el("path", {
        d: shoreD,
        fill: "none",
        stroke: PALETTE.waterDeep,
        "stroke-width": 9,
        "stroke-opacity": 0.5,
        filter: "url(#feather)",
    });
}

function waterLayer(proj: Projection, _eastVec: Pt): string {
    const lakeD = lakeOutlineD(proj);
    const parts: string[] = [];
    parts.push(el("path", { d: lakeD, fill: PALETTE.water }));
    parts.push(el("g", { "clip-path": "url(#lakeClip)" }, depthContours(proj.project)));
    parts.push(el("g", { "clip-path": "url(#lakeClip)" }, shoreFeather(lakeD)));
    // masked so the shoreline opens into the river/channel mouths (see seamMask)
    parts.push(
        el(
            "g",
            { mask: "url(#landOnly)" },
            el("path", {
                d: lakeD,
                fill: "none",
                stroke: PALETTE.ink,
                "stroke-width": SHORE_INK * 2,
                "stroke-opacity": 0.75,
                // round joins/caps stop sharp shoreline vertices (e.g. the east-end
                // waterfront) from throwing off long miter "spikes".
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
            })
        )
    );
    return el("g", {}, parts.join("\n"));
}

/**
 * A mask that exposes only LAND — everything the given water shapes do not cover.
 *
 * The water boundaries are drawn through it, and that is what makes river mouths
 * come out right. Previously the coast was stroked ON the shared edge between the
 * lake and a river, straddling it. The two polygons abut exactly there, so the
 * river's fill covered only the inner half of that stroke and the outer half
 * survived as a spike jutting into open water; widening the erase to catch it then
 * ate a margin of coast either side and left an unoutlined nub of land at the
 * corner. There is no width that avoids both.
 *
 * Drawn against land instead, the boundary cannot enter the water at all, so it
 * stops exactly at the water's edge — at a mouth, and everywhere else — with no
 * spike and no nub, and no dependence on the two polygons overlapping. Strokes
 * using this are doubled in width, since only the land-side half is kept.
 */
function landMask(id: string, waterDs: string[], box: Rect): string {
    return el(
        "mask",
        { id, maskUnits: "userSpaceOnUse", x: box.x, y: box.y, width: box.w, height: box.h },
        el("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: "#fff" }) +
            waterDs.filter(Boolean).map((d) => el("path", { d, fill: "#000", "fill-rule": "evenodd" })).join("")
    );
}

/** Every waterway outline as one path, for the land mask (see landMask). */
function waterwaysOutlineD(proj: Projection): string {
    return waterways.features
        .map((f) => geomPathD(f.geometry as Geometry, proj))
        .filter(Boolean)
        .join(" ");
}

/** Rivers / creeks (high-res), drawn as their own overlay so waterways sit on
 *  top of the parks/ravine green they run through (Don, Humber, creeks, the
 *  Port Lands channels) instead of being buried under it.
 *
 *  The source OSM riverbanks are hundreds of abutting polygons; stroking each
 *  one draws internal seams that crosscut the channel. The asset is pre-dissolved
 *  (unioned) into one MultiPolygon, so a single fill + thin outline reads as
 *  continuous streams with no internal borders. */
function waterwaysLayer(proj: Projection): string {
    const parts: string[] = [];
    // fill and outline are separate passes: the fill is the same wash as the lake
    // and runs right into it, but the outline must stop at the mouths.
    const outlines: string[] = [];
    for (const f of waterways.features) {
        const d = geomPathD(f.geometry as Geometry, proj);
        if (!d) continue;
        parts.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.water }));
        outlines.push(
            el("path", {
                d,
                fill: "none",
                stroke: PALETTE.waterDeep,
                "stroke-width": RIVER_INK * 2,
                "stroke-opacity": 0.6,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
            })
        );
    }
    // The lake carries a soft shaded band along its shore (see waterLayer). It is
    // clipped to the lake, so it used to stop dead at a river mouth and leave the
    // inland water a good 20 RGB steps lighter than the lake right beside it. Draw
    // it again, clipped to the rivers, so the band runs through the opening and the
    // two waters read as one. It is drawn after the fill because the fill would
    // otherwise cover it.
    const allD = waterwaysOutlineD(proj);
    if (allD) {
        parts.push(el("clipPath", { id: "waterwaysClip" }, el("path", { d: allD, "clip-rule": "evenodd" })));
        parts.push(
            el("g", { "clip-path": "url(#waterwaysClip)" }, shoreFeather(lakeOutlineD(proj)))
        );
    }
    parts.push(el("g", { mask: "url(#landOnly)" }, outlines.join("")));
    return el("g", {}, parts.join(""));
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

/** The Toronto Islands are overwhelmingly parkland, so they are shaded park-green
 *  wholesale ("island-green" = the islands' landmass) and the few things that are
 *  NOT park — Billy Bishop airport and the Ward's/Algonquin cottage communities
 *  ("island-nonpark") — are overlaid back in the land tint. Doing it this way
 *  round avoids the ragged gaps left by patching together individual OSM park
 *  polygons. Sandy beaches then draw on top at the shore. */
function islandParksLayer(proj: Projection): string {
    const out: string[] = [];
    const byKind = (k: string) => islandParks.features.find((f) => f.properties?.kind === k);
    // Opaque, and the dissolved outline carries the shoreline stroke: the source
    // landmass is 14 overlapping polygons, so painting over them opaquely is what
    // hides their internal outlines and leaves one clean island edge.
    const green = byKind("island-green");
    if (green) {
        const d = geomPathD(green.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.park, stroke: PALETTE.ink, "stroke-width": 1.1, "stroke-opacity": 0.75, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    const nonpark = byKind("island-nonpark");
    if (nonpark) {
        const d = geomPathD(nonpark.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.island, stroke: PALETTE.parkEdge, "stroke-width": 0.3, "stroke-opacity": 0.5, "stroke-linejoin": "round" }));
    }
    return el("g", {}, out.join(""));
}

/** Major green spaces across the whole city (parks, ravines, cemeteries) — big
 *  shapes only, filled like High Park. No labels: names come solely from the
 *  curated places list, so an un-listed park stays an unlabelled green mass. */
function bigParksLayer(proj: Projection): string {
    const out: string[] = [];
    for (const fe of bigParks.features) {
        const d = geomPathD(fe.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.park, "fill-opacity": 0.85, stroke: PALETTE.parkEdge, "stroke-width": 0.5, "stroke-linejoin": "round" }));
    }
    return el("g", {}, out.join(""));
}

/** Sandy beaches (Woodbine, Cherry, Sunnyside, the island beaches, Bluffer's …).
 *  Drawn above the parks so beach sand isn't buried under the park green that
 *  the waterfront parks overlap. No labels — names come from the places list. */
function beachesLayer(proj: Projection): string {
    const out: string[] = [];
    for (const fe of beaches.features) {
        const d = geomPathD(fe.geometry as Geometry, proj);
        if (d) out.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.beach, stroke: PALETTE.beachEdge, "stroke-width": 0.4, "stroke-linejoin": "round" }));
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

/**
 * Dotted, gently-curved ferry routes from the mainland terminal to the islands.
 * Takes a bare projection function (not a Projection) so the enlarged inset can
 * draw the same tracks through its own scale; `s` scales the stroke and the dash
 * rhythm with the zoom.
 */
function ferryLayer(project: (ll: LonLatTuple) => Pt, s = 1): string {
    const out: string[] = [];
    // bow each route toward the open harbour so it reads as a ferry track
    const harbour = project([-79.372, 43.626]);
    for (const [from, to] of FERRY_ROUTES) {
        const a = project(from);
        const b = project(to);
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const toH = unit([harbour[0] - mid[0], harbour[1] - mid[1]]);
        const c: Pt = [mid[0] + toH[0] * len * 0.16, mid[1] + toH[1] * len * 0.16];
        out.push(
            el("path", {
                d: `M ${round(a[0])} ${round(a[1])} Q ${round(c[0])} ${round(c[1])} ${round(b[0])} ${round(b[1])}`,
                fill: "none",
                stroke: PALETTE.ink,
                "stroke-width": round(0.9 * s),
                "stroke-opacity": 0.6,
                "stroke-dasharray": `${round(1 * s)} ${round(3.5 * s)}`,
                "stroke-linecap": "round",
            })
        );
    }
    return el("g", {}, out.join(""));
}

// ---------------------------------------------------------------------------
// streets + markers
// ---------------------------------------------------------------------------

// OSM arterials arrive as many disjoint ways, and divided stretches split into
// two offset carriageways whose ends stagger and overlap — so endpoint-stitching
// leaves a street as fragments that render with uneven width (round-cap "beads")
// and gaps. Instead we reconstruct a single CENTRELINE per street: resample all
// pieces to points, collapse them laterally onto a coarse grid (which merges the
// parallel carriageways into one node per ~cell), link nearby nodes, and take the
// longest path through each connected component. The result is one clean line per
// contiguous run, with genuinely separate pieces kept as separate components.

/** Ramer–Douglas–Peucker on metre-space points. */
function rdpSimplify(pts: Pt[], eps: number): Pt[] {
    if (pts.length < 3) return pts;
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack: [number, number][] = [[0, pts.length - 1]];
    while (stack.length) {
        const [i, j] = stack.pop()!;
        const a = pts[i], b = pts[j];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const nrm = Math.hypot(dx, dy) || 1e-9;
        let dmax = 0, idx = -1;
        for (let k = i + 1; k < j; k++) {
            const d = Math.abs((pts[k][0] - a[0]) * dy - (pts[k][1] - a[1]) * dx) / nrm;
            if (d > dmax) { dmax = d; idx = k; }
        }
        if (dmax > eps && idx >= 0) { keep[idx] = true; stack.push([i, idx], [idx, j]); }
    }
    return pts.filter((_, k) => keep[k]);
}

/** Arc-length moving average: attenuates the high-frequency grid scatter of a
 *  reconstructed centreline while preserving its large-scale curves. Endpoints
 *  are pinned so the line still meets its true termini. */
function smoothPath(pts: Pt[], windowM: number): Pt[] {
    const n = pts.length;
    if (n < 3) return pts;
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const out: Pt[] = [pts[0]];
    for (let i = 1; i < n - 1; i++) {
        let sx = 0, sy = 0, sw = 0;
        for (let j = 0; j < n; j++) {
            const d = Math.abs(cum[j] - cum[i]);
            if (d > windowM) continue;
            const w = 1 - d / windowM; // triangular weight
            sx += pts[j][0] * w; sy += pts[j][1] * w; sw += w;
        }
        out.push(sw > 0 ? [sx / sw, sy / sw] : pts[i]);
    }
    out.push(pts[n - 1]);
    return out;
}

/** Reconstruct clean centrelines from a street's many raw pieces. */
function centrelineChains(rawll: LonLatTuple[][], stepM = 12, cellM = 46, maxLinkM = 460): LonLatTuple[][] {
    const chains = rawll.filter((c) => c.length >= 2);
    if (chains.length === 0) return [];
    const lat0 = chains[0][0][1];
    const kx = Math.cos((lat0 * Math.PI) / 180) * 111320, ky = 111320;
    // 1. resample every stepM metres
    const pts: Pt[] = [];
    for (const c of chains) {
        const mc = c.map((p): Pt => [p[0] * kx, p[1] * ky]);
        for (let i = 1; i < mc.length; i++) {
            const a = mc[i - 1], b = mc[i];
            const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const n = Math.max(1, Math.floor(d / stepM));
            for (let t = 0; t <= n; t++) pts.push([a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n]);
        }
    }
    // 2. one node per occupied grid cell (collapses lateral carriageways)
    const cells = new Map<string, { x: number; y: number; n: number }>();
    for (const [x, y] of pts) {
        const k = Math.floor(x / cellM) + "," + Math.floor(y / cellM);
        let o = cells.get(k);
        if (!o) { o = { x: 0, y: 0, n: 0 }; cells.set(k, o); }
        o.x += x; o.y += y; o.n++;
    }
    const nodes: Pt[] = [...cells.values()].map((o) => [o.x / o.n, o.y / o.n]);
    const N = nodes.length;
    if (N < 2) return [];
    // 3. link nodes within maxLinkM, using a grid index so it stays near-linear
    const ml2 = maxLinkM * maxLinkM;
    const gi = new Map<string, number[]>();
    for (let i = 0; i < N; i++) {
        const k = Math.floor(nodes[i][0] / maxLinkM) + "," + Math.floor(nodes[i][1] / maxLinkM);
        let a = gi.get(k); if (!a) { a = []; gi.set(k, a); } a.push(i);
    }
    const adj: Array<Array<[number, number]>> = Array.from({ length: N }, () => []);
    for (let i = 0; i < N; i++) {
        const gx = Math.floor(nodes[i][0] / maxLinkM), gy = Math.floor(nodes[i][1] / maxLinkM);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            const arr = gi.get((gx + dx) + "," + (gy + dy)); if (!arr) continue;
            for (const j of arr) {
                if (j <= i) continue;
                const d2 = (nodes[i][0] - nodes[j][0]) ** 2 + (nodes[i][1] - nodes[j][1]) ** 2;
                if (d2 <= ml2) { const d = Math.sqrt(d2); adj[i].push([d, j]); adj[j].push([d, i]); }
            }
        }
    }
    // 4. per component: Prim MST, then its weighted-longest path (diameter)
    const seen = new Array(N).fill(false);
    const out: LonLatTuple[][] = [];
    for (let s = 0; s < N; s++) {
        if (seen[s]) continue;
        seen[s] = true;
        const mst = new Map<number, Array<[number, number]>>();
        const link = (a: number, b: number, w: number) => { (mst.get(a) ?? mst.set(a, []).get(a)!).push([b, w]); };
        const heap: Array<[number, number, number]> = [];
        const push = (t: [number, number, number]) => { heap.push(t); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
        const pop = (): [number, number, number] => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = 2 * i + 2; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
        const comp = [s];
        for (const [d, j] of adj[s]) push([d, s, j]);
        while (heap.length) {
            const [d, a, b] = pop();
            if (seen[b]) continue;
            seen[b] = true; comp.push(b); link(a, b, d); link(b, a, d);
            for (const [d2, c] of adj[b]) if (!seen[c]) push([d2, b, c]);
        }
        if (comp.length < 2) continue;
        const farthest = (src: number): { f: number; par: Map<number, number | null> } => {
            const dist = new Map<number, number>([[src, 0]]);
            const par = new Map<number, number | null>([[src, null]]);
            const stack = [src];
            while (stack.length) {
                const u = stack.pop()!;
                for (const [v, w] of mst.get(u) ?? []) if (!dist.has(v)) { dist.set(v, dist.get(u)! + w); par.set(v, u); stack.push(v); }
            }
            let f = src, fd = -1;
            for (const [k, dv] of dist) if (dv > fd) { fd = dv; f = k; }
            return { f, par };
        };
        const a = farthest(s).f;
        const { f: b, par } = farthest(a);
        const path: number[] = [];
        for (let cur: number | null = b; cur !== null; cur = par.get(cur) ?? null) path.push(cur);
        const smooth = smoothPath(path.map((i) => nodes[i]), 110);
        const simp = rdpSimplify(smooth, 5);
        out.push(simp.map((p): LonLatTuple => [Math.round((p[0] / kx) * 1e6) / 1e6, Math.round((p[1] / ky) * 1e6) / 1e6]));
    }
    return out;
}

/** Total length of a set of lon/lat chains, in metres. */
function chainsLengthM(chains: LonLatTuple[][]): number {
    let total = 0;
    for (const c of chains) {
        for (let i = 1; i < c.length; i++) {
            const kx = Math.cos((c[i][1] * Math.PI) / 180) * 111320;
            total += Math.hypot((c[i][0] - c[i - 1][0]) * kx, (c[i][1] - c[i - 1][1]) * 111320);
        }
    }
    return total;
}

/**
 * Join chains whose endpoints nearly touch — the same street split by a junction
 * or a simplification artefact. The centreline reconstruction bridges these
 * implicitly (its kNN graph links across gaps), so the stitched branch has to do
 * it explicitly or the road shows false breaks. Repeatedly joins the closest
 * pair within `maxGapM`; chain counts per street are small, so O(n²) is fine.
 */
function bridgeChains(chains: LonLatTuple[][], maxGapM: number): LonLatTuple[][] {
    const out = chains.map((c) => c.slice());
    const gap = (p: LonLatTuple, q: LonLatTuple) => {
        const kx = Math.cos((p[1] * Math.PI) / 180) * 111320;
        return Math.hypot((p[0] - q[0]) * kx, (p[1] - q[1]) * 111320);
    };
    for (;;) {
        let bi = -1, bj = -1, bd = maxGapM, bmode = 0;
        for (let i = 0; i < out.length; i++) {
            for (let j = i + 1; j < out.length; j++) {
                const A = out[i], B = out[j];
                const ends: Array<[LonLatTuple, LonLatTuple]> = [
                    [A[A.length - 1], B[0]],
                    [A[A.length - 1], B[B.length - 1]],
                    [A[0], B[0]],
                    [A[0], B[B.length - 1]],
                ];
                for (let m = 0; m < 4; m++) {
                    const d = gap(ends[m][0], ends[m][1]);
                    if (d < bd) { bd = d; bi = i; bj = j; bmode = m; }
                }
            }
        }
        if (bi < 0) break;
        const A = out[bi], B = out[bj];
        out[bi] =
            bmode === 0 ? A.concat(B)
            : bmode === 1 ? A.concat(B.slice().reverse())
            : bmode === 2 ? A.slice().reverse().concat(B)
            : B.concat(A);
        out.splice(bj, 1);
    }
    return out;
}

const mergedChainsCache = new Map<Feature, LonLatTuple[][]>();
/**
 * Drawable centreline(s) for a road feature, computed once.
 *
 * The centreline reconstruction exists to collapse divided carriageways into one
 * line, but it resamples onto a ~46 m grid, so on a road that has no duplicate
 * carriageways it doesn't merge anything — it just replaces good geometry with
 * grid-snapped facets, which is what makes those roads look jagged. So: run it,
 * and keep it only when it genuinely collapsed duplicates (the result is much
 * shorter than the stitched input). Otherwise the stitched geometry is used,
 * which is strictly more faithful.
 */
function mergedChainsOf(f: Feature): LonLatTuple[][] {
    let c = mergedChainsCache.get(f);
    if (!c) {
        const raw = f.geometry?.type === "MultiLineString"
            ? (f.geometry.coordinates as Position[][]).map((l) => l.map((p) => p as LonLatTuple))
            : [];
        // stubs are slip lanes / service spurs, not the street: the reconstruction
        // drops them implicitly (it keeps only the longest path per component), so
        // the stitched branch has to drop them explicitly or they show as orphans.
        const stitched = bridgeChains(stitchLines(raw).filter((l) => l.length >= 2), 300)
            .filter((l) => chainsLengthM([l]) >= 250);
        const rec = centrelineChains(raw);
        const merged = chainsLengthM(rec) < chainsLengthM(stitched) * 0.75;
        c = merged || stitched.length === 0 ? rec : stitched;
        mergedChainsCache.set(f, c);
    }
    return c;
}

/** Secondary tier: the city's arterial grid (Finch, Lawrence, Kipling, Kennedy …),
 *  clipped to the city limits so the surrounding towns stay empty paper. Drawn
 *  lighter and thinner than the spine streets, and unlabelled — they supply the
 *  street network's texture without competing with the named roads. */
function arterialsLayer(proj: Projection): string {
    const casings: string[] = [];
    const inks: string[] = [];
    for (const f of arterials.features) {
        if (f.geometry?.type !== "MultiLineString") continue;
        for (const line of mergedChainsOf(f)) {
            const d = polyline(line.map((p) => proj.project(p)));
            casings.push(
                el("path", {
                    d,
                    fill: "none",
                    stroke: PALETTE.paper,
                    "stroke-width": 1.9,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                })
            );
            inks.push(
                el("path", {
                    d,
                    fill: "none",
                    stroke: PALETTE.inkFaint,
                    "stroke-width": 0.65,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                })
            );
        }
    }
    return el("g", {}, el("g", { opacity: 0.7 }, casings.join("")) + el("g", { opacity: 0.9 }, inks.join("")));
}

function streetsLayer(proj: Projection): string {
    // Draw every casing (pale underlay) first, then every ink line on top, so
    // that adjacent segments of a road join cleanly instead of a later segment's
    // casing punching a hole through an earlier segment's ink.
    const casings: string[] = [];
    const inks: string[] = [];
    for (const f of streets.features) {
        if (f.geometry?.type !== "MultiLineString") continue;
        for (const line of mergedChainsOf(f)) {
            const d = polyline(line.map((p) => proj.project(p)));
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
        // Highways are drawn RAW (every carriageway/lane), never merged.
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

/**
 * Landmark dots. A landmark whose name found a place on the map is marked by
 * its numbered badge instead — that is the whole point of the badge carrying
 * the marker colour — so only the ones the placement engine had to drop still
 * need a dot of their own.
 */
function landmarkMarkers(proj: Projection, labelled: Set<string>): string {
    const out: string[] = [];
    for (const d of LANDMARKS) {
        if (d.insetOnly) continue;
        // Union Station is marked by its subway station glyph, not a red dot.
        if (d.name === "Union Station") continue;
        // centeredLabel landmarks (e.g. Billy Bishop) show a name only, no dot.
        if (d.centeredLabel) continue;
        if (labelled.has(d.name)) continue;
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

// _eastVec: the lake label was the last caller to need the grid bearing, and it
// is set horizontally now. Kept (like defs/waterLayer) so the call sites stay
// uniform and a rotated label can reach for it again.
function collectLabelInputs(proj: Projection, _eastVec: Pt): LabelInput[] {
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

    // Lake Ontario — set horizontally in the open water off the Etobicoke shore,
    // in the clear band between the shoreline and the scale bar. Unrotated: the
    // lake is not part of the city grid, so it reads better level with the page
    // than raked over to the map's 16-degree rotation.
    //
    // Smaller and less tracked than an open-water name would normally be. That
    // band is only ~269 px of clear water — the shore closes in from the left and
    // the inset's region rectangle bounds it on the right — and the name has to
    // fit inside it. These were measured off the raster rather than predicted:
    // textWidth under-measures this face by about a tenth, enough to push the
    // final O over the region rectangle at the size this label used to be.
    //
    // noLeader: its anchor is just a point picked out in open water, so if the
    // name ever has to move, a leader back to it is a line drawn to nothing.
    inputs.push(areaLabel("water:LakeOntario", "LAKE ONTARIO", proj.project([-79.4568, 43.6023]), {
        size: 24,
        tracking: 5,
        fill: PALETTE.waterLabel,
        family: FONTS.italic,
        italic: true,
        weight: 500,
        priority: PRIO.harbour,
        allowDrop: false,
        noLeader: true,
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

    // big parks / green spaces (the parks layer itself is unnamed — see PARK_LABELS)
    for (const d of PARK_LABELS)
        inputs.push(areaLabel(`park:${d.name}`, d.name, proj.project(d.at), {
            size: S.park.size,
            tracking: S.park.tracking,
            fill: S.park.fill,
            family: FONTS.italic,
            italic: true,
            priority: d.priority ?? PRIO.park,
            halo: PALETTE.paper,
            haloWidth: 3,
        }));

    // Neighbourhoods. Every one is named on the sheet — these are the poster's
    // subject, so where the core is too tight for both a neighbourhood and a
    // landmark, the landmark is the one that gives way to a bare badge.
    for (const d of NEIGHBOURHOODS)
        inputs.push(areaLabel(`nbhd:${d.name}`, d.name, proj.project(d.at), {
            badge: badgeFor(d.name),
            nameRequired: true,
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
                    badge: badgeFor(d.name),
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
                badge: badgeFor(d.name),
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
            badge: badgeFor(d.name),
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

    // street spines are labelled separately as curved text-on-path so the name
    // bends with the road (see curvedStreetLabels); they are not fed to the
    // straight-box engine here.

    // highways are labelled as curved text-on-path too (see curvedRoadLabels),
    // not through the straight-box engine.

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
        badge?: LabelBadge;
        nameRequired?: boolean;
        noLeader?: boolean;
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
        badge: o.badge,
        nameRequired: o.nameRequired,
        noLeader: o.noLeader,
    };
}

function emitLabels(placed: PlacedLabel[]): string {
    const out: string[] = [];
    for (const p of placed) {
        const adv = badgeAdvance(p);
        let tx = p.x;
        let anchor = p.finalAnchor;
        if (adv > 0 && !p.rotate) {
            // The placement engine reserved room for the badge inside the label's
            // box, so re-derive that box's left edge and lay the two out from it.
            const w = textWidth(p.text, p.size, p.tracking) + adv;
            const left = anchor === "start" ? p.x : anchor === "end" ? p.x - w : p.x - w / 2;
            out.push(indexBadge(p.size, left, p.y, p.badge!));
            tx = left + adv;
            anchor = "start";
        }
        // a badge-only fallback (see placeLabels) has nothing left to typeset
        if (!p.text) continue;
        out.push(
            text(tx, p.y, p.text, {
                size: p.size,
                fill: p.fill,
                family: p.family,
                tracking: p.tracking,
                weight: p.weight,
                italic: p.italic,
                anchor,
                rotate: p.rotate,
                halo: p.halo,
                haloWidth: p.haloWidth,
                haloId: haloIdFor(p.halo),
            })
        );
    }
    return el("g", {}, out.join("\n"));
}

/**
 * Badge colour by series, echoing the marker colours used elsewhere: red for
 * the built landmarks, blue for the waterfront ones, plain ink for the
 * neighbourhoods (which never had a marker of their own).
 */
function badgeColour(kind: GazetteerKind): string {
    if (kind === "landmark") return PALETTE.accentRed;
    if (kind === "waterfront") return PALETTE.accentBlue;
    // Neighbourhoods and towns are the numerous series — forty-eight and
    // eighteen of them — so a solid disc each turns the sheet into a field of
    // dots and pulls the eye off the map. They are drawn as a ring with the
    // figure in ink instead (see indexBadge). The neighbourhood discs are washed
    // rather than opaque, so the borough tint and street grid still read through
    // them while the figure keeps enough paper behind it to stay legible; the
    // towns take a solid paper fill because they sit on the margin, where a wash
    // over bare paper would be the same thing.
    return kind === "neighbourhood" ? BADGE_WASH : PALETTE.paper;
}

/** The badge for a named feature, or undefined if it isn't in the index. */
function badgeFor(name: string): LabelBadge | undefined {
    const e = gazetteerEntry(name);
    return e ? { label: e.label, color: badgeColour(e.kind) } : undefined;
}

/**
 * Sentinel colour for a washed badge: paper, but let through enough of what is
 * under it that the map still reads. Kept as a marker rather than a plain
 * colour + opacity pair so a badge stays describable by its `color` alone.
 */
const BADGE_WASH = "wash";

/** How much of the map shows through a washed badge (see BADGE_WASH). */
const BADGE_WASH_OPACITY = 0.45;

/**
 * A filled disc carrying the feature's gazetteer number. On the map this sits
 * just before the name; for landmarks it is also the marker, which is why it
 * takes the colour the dot would have had.
 */
function indexBadge(size: number, left: number, baseline: number, b: LabelBadge): string {
    const { cx, cy, r } = badgeGeometry(size, left, baseline);
    // A pale badge is an outlined disc with the figure in ink; a saturated one is
    // filled, with the figure reversed out. Either way the ring keeps it legible
    // over whatever the map puts underneath.
    const wash = b.color === BADGE_WASH;
    const pale = wash || b.color === PALETTE.paper;
    return (
        el("circle", {
            cx: round(cx), cy: round(cy), r: round(r),
            fill: wash ? PALETTE.paper : b.color,
            ...(wash ? { "fill-opacity": BADGE_WASH_OPACITY } : {}),
            stroke: pale ? PALETTE.ink : PALETTE.paper,
            "stroke-width": round(r * (pale ? 0.16 : 0.24)),
        }) +
        text(cx, cy + r * 0.37, b.label, {
            size: r * (b.label.length > 1 ? 1.04 : 1.16),
            fill: pale ? PALETTE.ink : PALETTE.paper,
            family: FONTS.serif,
            weight: 700,
            anchor: "middle",
        })
    );
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

function longestOf(chains: LonLatTuple[][] | Position[][]): Position[] | null {
    let best: Position[] | null = null;
    let bestLen = 0;
    for (const line of chains) {
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
/** Point at arc-length `d` along a projected polyline with cumulative lengths. */
function pointAtArc(pts: Pt[], cum: number[], d: number): Pt {
    if (d <= 0) return pts[0];
    if (d >= cum[cum.length - 1]) return pts[pts.length - 1];
    let i = 1;
    while (i < cum.length && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}

/** Sub-polyline of a projected line between two arc-lengths (inclusive ends). */
function subPolyline(pts: Pt[], cum: number[], dS: number, dE: number): Pt[] {
    const out: Pt[] = [pointAtArc(pts, cum, dS)];
    for (let i = 0; i < pts.length; i++) if (cum[i] > dS && cum[i] < dE) out.push(pts[i]);
    out.push(pointAtArc(pts, cum, dE));
    return out;
}

/**
 * Street names as curved text bent along the road centreline. Following the
 * road (rather than a single straight baseline over a curving street) keeps the
 * name off the line's awkward crossings; a paper halo knocks the road out from
 * under the glyphs. Each label finds the straightest, most central window that
 * clears already-placed labels.
 */
interface CurvedLabelStyle { size: number; tracking: number; fill: string; weight: number | string; italic: boolean; /** upper-case the name (default true) */ upper?: boolean; }

/**
 * Road names as curved text bent along the centreline. Following the road (not a
 * single straight baseline over a curving street) keeps the name off the line's
 * awkward crossings; the baseline is pushed slightly off the centreline so the
 * glyphs + paper glow clear the road. `occupied` is mutated so successive calls
 * (streets, then highways) don't collide. Used for streets AND highways so the
 * curved treatment is uniform across every road.
 */
function curvedRoadLabels(
    proj: Projection,
    items: { name: string; chains: LonLatTuple[][] }[],
    style: CurvedLabelStyle,
    frame: Rect,
    occupied: Box[]
): string {
    const inFrame = (x: number, y: number) => x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
    const { size, tracking, fill, weight, italic } = style;
    // perpendicular baseline offset so glyph + glow clear the road line
    const off = size * (1.15 / 3);
    const texts: string[] = [];
    // longest roads first, so trunk roads win the good positions
    const feats = items
        .map((it) => ({ it, line: longestOf(it.chains) }))
        .filter((o) => o.line && o.line.length >= 2)
        .sort((a, b) => (b.line!.length) - (a.line!.length));
    for (const { it, line } of feats) {
        const name = (style.upper ?? true) ? it.name.toUpperCase() : it.name;
        if (!name) continue;
        const pts = (line as LonLatTuple[]).map((p) => proj.project(p));
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const L = cum[cum.length - 1];
        const w = textWidth(name, size, tracking);
        const need = w + 6;
        if (L < need + 4) continue;
        // Search windows from the road's middle outward. Prefer the flattest spot
        // (lowest curvature); if none is straight enough, fall back to the least
        // curved found and rely on adaptive kerning below to stop overlaps.
        const half = need / 2;
        const stepC = Math.max(12, w * 0.3);
        const devOf = (wp: Pt[]): number => {
            const ex = wp[wp.length - 1][0] - wp[0][0], ey = wp[wp.length - 1][1] - wp[0][1];
            const c2 = ex * ex + ey * ey || 1;
            let dev = 0;
            for (const p of wp) {
                const t = ((p[0] - wp[0][0]) * ex + (p[1] - wp[0][1]) * ey) / c2;
                dev = Math.max(dev, Math.hypot(p[0] - (wp[0][0] + t * ex), p[1] - (wp[0][1] + t * ey)));
            }
            return dev;
        };
        type Cand = { dS: number; dE: number; rev: boolean; boxes: Box[]; dev: number };
        let chosen: Cand | null = null;
        let fallback: Cand | null = null;
        outer:
        for (let d0 = 0; d0 <= L / 2 + stepC; d0 += stepC) {
            for (const c of d0 === 0 ? [L / 2] : [L / 2 - d0, L / 2 + d0]) {
                const dS = c - half, dE = c + half;
                if (dS < 3 || dE > L - 3) continue;
                const wp = subPolyline(pts, cum, dS, dE);
                const dev = devOf(wp);
                const rev = wp[wp.length - 1][0] - wp[0][0] < 0;
                // collision boxes on the offset side; also require them inside frame
                const boxes: Box[] = [];
                let ok = true;
                const nB = Math.max(2, Math.ceil((dE - dS) / (size * 0.9)));
                for (let k = 0; k <= nB && ok; k++) {
                    const a = dS + ((dE - dS) * k) / nB;
                    const [x, y] = pointAtArc(pts, cum, a);
                    const [ax, ay] = pointAtArc(pts, cum, Math.max(0, a - 1));
                    const [bx, by] = pointAtArc(pts, cum, Math.min(L, a + 1));
                    let [tx, ty] = unit([bx - ax, by - ay]);
                    if (rev) { tx = -tx; ty = -ty; }
                    const ox = x + ty * off, oy = y - tx * off;
                    if (!inFrame(ox, oy)) { ok = false; break; }
                    boxes.push({ x0: ox - size * 0.6, y0: oy - size * 0.7, x1: ox + size * 0.6, y1: oy + size * 0.7 });
                }
                if (!ok || boxes.some((b) => occupied.some((o) => boxesOverlap(b, o)))) continue;
                const cand: Cand = { dS, dE, rev, boxes, dev };
                if (!fallback || dev < fallback.dev) fallback = cand;
                if (dev <= size * 0.5) { chosen = cand; break outer; } // genuinely flat — done
            }
        }
        if (!chosen) chosen = fallback;
        if (!chosen) continue;
        // Anything CLOSE to straight is drawn perfectly straight: bending text
        // along a nearly-straight road only makes it look unsteady. Only a window
        // whose sag exceeds this is worth curving + kerning.
        const straightMode = chosen.dev <= Math.max(size * 1.1, w * 0.045);
        occupied.push(...chosen.boxes);
        const chars = [...name];
        const advances = chars.map((c) => charAdvance(c, style.italic ? "italic" : "serif") * size);
        const wordLen = advances.reduce((s, a) => s + a, 0) + tracking * (chars.length - 1);
        // Glyphs are collected and emitted as ONE filtered group per label. Halo-ing
        // each glyph individually paints glyph n+1's halo over glyph n's ink, which
        // reads as the letters eating each other; one group = one halo behind the
        // whole word, all ink on top.
        const glyphs: string[] = [];

        if (straightMode) {
            // low curvature: straight baseline along the window chord, so gentle
            // wiggles in the centreline don't wobble the text (e.g. Eglinton Ave.)
            const [sx, sy] = pointAtArc(pts, cum, chosen.dS);
            const [ex, ey] = pointAtArc(pts, cum, chosen.dE);
            let [dx, dy] = unit([ex - sx, ey - sy]);
            if (dx < 0) { dx = -dx; dy = -dy; }
            const ang = angleDeg([dx, dy]);
            const nx = dy, ny = -dx; // "up" normal
            const [mx, my] = pointAtArc(pts, cum, (chosen.dS + chosen.dE) / 2);
            let c = -wordLen / 2;
            for (let i = 0; i < chars.length; i++) {
                const cc = c + advances[i] / 2;
                if (chars[i] !== " ")
                    glyphs.push(text(mx + dx * cc + nx * off, my + dy * cc + ny * off, chars[i], {
                        size, fill, family: FONTS.serif, italic, weight,
                        anchor: "middle", rotate: ang,
                    }));
                c += advances[i] + tracking;
            }
            texts.push(el("g", { filter: "url(#haloPaper)" }, glyphs.join("")));
            continue;
        }

        // curved placement: window extended so kerning has room to spread the word
        const ext = need * 0.7;
        let wp = subPolyline(pts, cum, Math.max(0, chosen.dS - ext), Math.min(L, chosen.dE + ext));
        if (chosen.rev) wp = wp.slice().reverse();
        const wcum = [0];
        for (let i = 1; i < wp.length; i++) wcum.push(wcum[i - 1] + Math.hypot(wp[i][0] - wp[i - 1][0], wp[i][1] - wp[i - 1][1]));
        const WL = wcum[wcum.length - 1];
        // tangent smoothed over ~half a glyph so a single centreline vertex can't
        // spike the angle (used for both rotation and kerning)
        const DA = size * 0.6;
        const angAt = (a: number): number => {
            const [ax, ay] = pointAtArc(wp, wcum, Math.max(0, a - DA));
            const [bx, by] = pointAtArc(wp, wcum, Math.min(WL, a + DA));
            return Math.atan2(by - ay, bx - ax);
        };
        // Curvature-adaptive kerning: where the road bends toward the text side
        // (concave) the glyph tops converge, so widen the gap there by the arc the
        // bend eats up over the glyph height — letters never overlap on a bend.
        const H = off + size * 0.78;
        const baseCentres: number[] = [];
        let acc0 = 0;
        for (let i = 0; i < chars.length; i++) { baseCentres.push(acc0 + advances[i] / 2); acc0 += advances[i] + tracking; }
        const extras = new Array(chars.length).fill(0);
        for (let i = 0; i < chars.length - 1; i++) {
            let dth = angAt(baseCentres[i + 1]) - angAt(baseCentres[i]);
            while (dth > Math.PI) dth -= 2 * Math.PI;
            while (dth < -Math.PI) dth += 2 * Math.PI;
            const thm = angAt((baseCentres[i] + baseCentres[i + 1]) / 2);
            const nx = Math.sin(thm), ny = -Math.cos(thm); // "up" normal (text side)
            const dTx = Math.cos(angAt(baseCentres[i + 1])) - Math.cos(angAt(baseCentres[i]));
            const dTy = Math.sin(angAt(baseCentres[i + 1])) - Math.sin(angAt(baseCentres[i]));
            if (dTx * nx + dTy * ny > 0) extras[i] = Math.min(size * 1.6, H * Math.abs(dth)); // concave → widen
        }
        const total = wordLen + extras.reduce((s, a) => s + a, 0);
        let d = (WL - total) / 2;
        for (let i = 0; i < chars.length; i++) {
            const mid = d + advances[i] / 2;
            const [cx, cy] = pointAtArc(wp, wcum, mid);
            const th = angAt(mid);
            const tx = Math.cos(th), ty = Math.sin(th);
            // baseline pushed off the centreline along the glyph's "up" normal
            const gx = cx + ty * off;
            const gy = cy - tx * off;
            if (chars[i] !== " ")
                glyphs.push(text(gx, gy, chars[i], {
                    size, fill, family: FONTS.serif, italic, weight,
                    anchor: "middle", rotate: angleDeg([tx, ty]),
                }));
            d += advances[i] + tracking + extras[i];
        }
        texts.push(el("g", { filter: "url(#haloPaper)" }, glyphs.join("")));
    }
    return el("g", {}, texts.join(""));
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
    /** the town's lettered index badge, drawn ahead of the name */
    badge?: LabelBadge;
    cx: number;
    cy: number;
    /** full width of badge + name, which is what the packer spaces on */
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

    const meta = munis.map((m) => {
        const badge = badgeFor(m.name);
        return {
            m,
            name: m.name.toUpperCase(),
            badge,
            w: textWidth(m.name.toUpperCase(), size, S.tracking) * 1.15 + 10 + badgeAdvance({ size, badge }),
        };
    });
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
        out.push({ name: it.name, badge: it.badge, cx, cy, w: it.w, arrow: false });
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
            const L: MuniLayout = { name: it.name, badge: it.badge, cx, cy, w: it.w, arrow: true, start, tip, distKm: Math.round(distKm) >= 5 ? distKm : undefined };
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
        const baseline = L.cy + S.size * 0.34;
        if (L.badge) {
            // centre badge + name as one block, then set the name from its left
            const adv = badgeAdvance({ size: S.size, badge: L.badge });
            const nameW = textWidth(L.name, S.size, S.tracking);
            const left = L.cx - (nameW + adv) / 2;
            out.push(indexBadge(S.size, left, baseline, L.badge));
            out.push(text(left + adv, baseline, L.name, {
                size: S.size, fill: S.fill, family: FONTS.serif, weight: 500, tracking: S.tracking, anchor: "start",
                halo: PALETTE.paper, haloId: "haloPaper",
            }));
        } else {
            out.push(text(L.cx, baseline, L.name, {
                size: S.size, fill: S.fill, family: FONTS.serif, weight: 500, tracking: S.tracking, anchor: "middle",
                halo: PALETTE.paper, haloId: "haloPaper",
            }));
        }
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

/**
 * The title cartouche and the scale bar belong to the map and stay on it — the
 * bar reads as a measure of the drawing it sits on, which it stops doing once
 * it is parked in a side panel. The legend and compass live in the band's left
 * column instead, where the cropped lake has no room for them.
 *
 * Only the two that sit over the map come back as label keep-outs; the band
 * apparatus cannot collide with anything the placement engine does.
 */
function layoutFurniture(proj: Projection, column: Rect): Furniture[] {
    const { frame } = proj;
    const cart = titleCartoucheRect(frame.x + 34, frame.y + 30);

    // in the open water west of the islands, clear of the LAKE ONTARIO lettering
    const km = 5;
    const barLen = proj.pxPerKm * km;
    const scale = { x: frame.x + frame.w * 0.3 - barLen / 2, y: frame.y + frame.h - 52, w: barLen, h: 30 };

    // compass at the head of the column, legend filling whatever is left below
    const compassR = 32;
    const compass = { cx: column.x + column.w / 2, cy: column.y + compassR + 22, R: compassR };
    const legendTop = compass.cy + compassR + 16;
    const legend = { x: column.x, y: legendTop, w: column.w, h: column.y + column.h - legendTop };

    return [
        { box: rectBox(cart), draw: () => titleCartouche(cart) },
        { box: rectBox({ x: scale.x - 20, y: scale.y - 14, w: scale.w + 40, h: scale.h + 26 }), draw: () => scaleBar(proj, scale, km) },
        { box: EMPTY_BOX, draw: () => legendBox(legend) },
        { box: EMPTY_BOX, draw: () => compassRose(proj, compass) },
    ];
}

/** A degenerate keep-out for apparatus that is off the map and cannot collide. */
const EMPTY_BOX: Box = { x0: 0, y0: 0, x1: 0, y1: 0 };

function rectBox(r: Rect): Box {
    return { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
}

// ---------------------------------------------------------------------------
// enlarged inset of the Old Toronto core (undistorted square blow-up)
// ---------------------------------------------------------------------------

interface InsetLayout {
    box: Box;
    /** the panel rectangle as finally drawn on the page */
    panel: Rect;
    /** names the panel managed to label; only filled once `draw` has run */
    labelled: Set<string>;
    draw: () => string;
}

/**
 * Lay out the inset. The region shown is the projected bbox of the two
 * geographic corners (topLeft / bottomRight); the panel keeps that region's
 * aspect, so the blow-up is an undistorted uniform scale.
 *
 * The panel is drawn at its *design* size (`InsetOptions.width`, the size its
 * type and line weights are tuned for) and then transformed as a whole into
 * `place`. Scaling the finished drawing rather than re-laying it out at a
 * smaller size is what keeps the composition intact: shrinking the panel while
 * leaving the label sizes alone would just crowd the same type into less room.
 */
function layoutInset(mainProj: Projection, opts: InsetOptions | undefined, place: Rect): InsetLayout {
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
    // Design space: the panel is always DRAWN at the reference width its type and
    // line weights were tuned for, then scaled as a whole to the size asked for.
    // Deriving the design size from `o.width` instead would make the option
    // cancel out — the design height is proportional to the design width, so a
    // height-bound fit ends up the same size whatever is passed in.
    const scale = INSET_REF_WIDTH / rw; // uniform geographic zoom (undistorted)
    const designH = rh * scale;
    const design: Rect = { x: 0, y: 0, w: INSET_REF_WIDTH, h: designH };

    // headroom for the "DOWNTOWN CORE" caption, which sits above the panel
    const titleGap = 30;
    // The panel is pinned to the bottom-right of its slot and grows up and to
    // the left. It has to grow that way: it already reaches the sheet's bottom
    // margin, so anything anchored at the top would saturate the moment its
    // lower edge got there — which is what the slot's own width and height used
    // to do at around 550. Growing upward instead takes room from the open lake
    // in that corner, and growing leftward narrows the gazetteer panel, which
    // re-solves its type size to suit. The caps left are the sheet's: how far up
    // the map it may climb, and how much of the frame's width it may take.
    const right = place.x + place.w;
    const bottom = place.y + place.h;
    const ceiling = mainProj.frame.y + mainProj.frame.h * INSET_MAX_TOP;
    const width = Math.min(
        Math.max(120, o.width),
        mainProj.frame.w * INSET_MAX_WIDTH,
        ((bottom - ceiling - titleGap) * INSET_REF_WIDTH) / designH
    );
    const k = width / INSET_REF_WIDTH;
    const panel: Rect = { x: right - width, y: bottom - designH * k, w: width, h: designH * k };
    const box: Box = { x0: panel.x, y0: panel.y - titleGap, x1: panel.x + panel.w, y1: panel.y + panel.h };

    const labelled = new Set<string>();
    return {
        box,
        panel,
        labelled,
        draw: () =>
            insetGuides(region, panel, mainProj.frame) +
            el(
                "g",
                { transform: `translate(${round(panel.x)} ${round(panel.y)}) scale(${Math.round(k * 1e4) / 1e4})` },
                drawInset(mainProj, design, region, scale, labelled)
            ) +
            text(panel.x + panel.w / 2, panel.y - 11, "DOWNTOWN CORE", {
                size: 15, fill: PALETTE.ink, family: FONTS.display, weight: 700, tracking: 2,
                halo: PALETTE.paper, haloId: "haloPaper",
            }),
    };
}

/**
 * The dashed outline of the enlarged region on the main map, plus the two
 * eye-guides running from it to the panel's leading corners. Drawn in page
 * space (not inside the panel's transform) because both ends live there.
 */
function insetGuides(
    region: { x0: number; y0: number; x1: number; y1: number },
    panel: Rect,
    frame: Rect
): string {
    const dash = { "stroke-dasharray": "5 4", stroke: PALETTE.ink, "stroke-width": 1, "stroke-opacity": 0.7, fill: "none" } as const;
    const rTR: Pt = [region.x1, region.y0];
    const rBR: Pt = [region.x1, region.y1];
    // The panel hangs below the neatline, so its lower corner is off the map.
    // Guides are taken to the panel's near edge but stopped at the frame, or
    // they would be drawn straight across the gazetteer sitting underneath.
    const edgeBottom = Math.min(panel.y + panel.h, frame.y + frame.h);
    return el("g", {}, [
        el("path", { d: polyline([[region.x0, region.y0], rTR, rBR, [region.x0, region.y1]]) + " Z", ...dash }),
        el("path", { d: polyline([rTR, [panel.x, panel.y]]), ...dash }),
        el("path", { d: polyline([rBR, [panel.x, edgeBottom]]), ...dash }),
        // the near edge itself, marking how far down the panel reaches
        el("path", { d: polyline([[panel.x, panel.y], [panel.x, edgeBottom]]), ...dash }),
    ].join(""));
}

function drawInset(
    mainProj: Projection,
    panel: Rect,
    region: { x0: number; y0: number; x1: number; y1: number },
    scale: number,
    /** out-param: names this panel succeeded in labelling */
    labelled: Set<string>
): string {
    const ipx = ([sx, sy]: Pt): Pt => [panel.x + (sx - region.x0) * scale, panel.y + (sy - region.y0) * scale];
    const ip = (ll: LonLatTuple): Pt => ipx(mainProj.project(ll));
    const insetPxPerKm = mainProj.pxPerKm * scale;

    const near = (p: Pt, m = 40) =>
        p[0] >= panel.x - m && p[0] <= panel.x + panel.w + m && p[1] >= panel.y - m && p[1] <= panel.y + panel.h + m;
    const inRegion = (sp: Pt) => sp[0] >= region.x0 && sp[0] <= region.x1 && sp[1] >= region.y0 && sp[1] <= region.y1;

    const panelD = `M ${round(panel.x)} ${round(panel.y)} h ${round(panel.w)} v ${round(panel.h)} h ${round(-panel.w)} Z`;
    const out: string[] = [];

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
    // the panel's own river-mouth seam masks (the main map's are built through a
    // different projection, so they can't be reused here)
    const insetWaywaysD = waterways.features
        .filter((fe) => featureNear(fe, ip, near))
        .map((fe) => insetGeomPathD(fe.geometry as Geometry, ip))
        .filter(Boolean)
        .join(" ");
    // scaled with the zoom so the seam covers the same GROUND distance as the big
    // map's: at a fixed 2.4 px the panel erases barely a third as much real-world
    // width, and the wider mouths poke back out through it
    out.push(landMask("insetLandOnly", [waterD, insetWaywaysD], panel));

    if (waterD)
        g.push(el("g", { mask: "url(#insetLandOnly)" }, el("path", { d: waterD, "fill-rule": "evenodd", fill: "none", stroke: PALETTE.ink, "stroke-width": INSET_SHORE_INK * 2, "stroke-opacity": 0.7, "stroke-linejoin": "round", "stroke-linecap": "round" })));

    // parks (accurate, unsmoothed) over land + islands
    const parkFeatures = parks.features.filter((fe) => featureNear(fe, ip, near));
    for (const fe of parkFeatures) {
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (d) g.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.park, "fill-opacity": 0.85, stroke: PALETTE.parkEdge, "stroke-width": 0.7, "stroke-linejoin": "round" }));
    }

    // Toronto Islands: shaded park-green wholesale, then the non-park parts
    // (airport, cottage communities) overlaid back in the land tint. Drawn after
    // the parks above so the islands' own shading wins, and opaquely so the
    // overlapping source polygons' internal outlines don't show through.
    for (const kind of ["island-green", "island-nonpark"] as const) {
        const fe = islandParks.features.find((f) => f.properties?.kind === kind);
        if (!fe) continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (!d) continue;
        g.push(
            kind === "island-green"
                ? el("path", { d, "fill-rule": "evenodd", fill: PALETTE.park, stroke: PALETTE.ink, "stroke-width": 1, "stroke-opacity": 0.7, "stroke-linejoin": "round", "stroke-linecap": "round" })
                : el("path", { d, "fill-rule": "evenodd", fill: PALETTE.island, stroke: PALETTE.parkEdge, "stroke-width": 0.4, "stroke-opacity": 0.5, "stroke-linejoin": "round" })
        );
    }

    // sandy beaches on top of the parks (Woodbine, Cherry, the island beaches …)
    for (const fe of beaches.features) {
        if (!featureNear(fe, ip, near)) continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (d) g.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.beach, stroke: PALETTE.beachEdge, "stroke-width": 0.5, "stroke-linejoin": "round" }));
    }

    // Port Lands / naturalized Don River waterways + rivers/canals — the same
    // pre-dissolved hi-res water the main map draws (coreWater's shoreline doesn't
    // include them). On top of the parks so channels aren't buried under ravine green.
    const insetWayOutlines: string[] = [];
    for (const fe of waterways.features) {
        if (!featureNear(fe, ip, near)) continue;
        const d = insetGeomPathD(fe.geometry as Geometry, ip);
        if (!d) continue;
        g.push(el("path", { d, "fill-rule": "evenodd", fill: PALETTE.water }));
        insetWayOutlines.push(el("path", {
            d, fill: "none",
            stroke: PALETTE.waterDeep, "stroke-width": INSET_RIVER_INK * 2, "stroke-opacity": 0.6,
            "stroke-linejoin": "round", "stroke-linecap": "round",
        }));
    }
    g.push(el("g", { mask: "url(#insetLandOnly)" }, insetWayOutlines.join("")));

    // island ferry tracks, at the panel's own zoom (same order as the big map:
    // over the water, under the road network). Deliberately under-scaled: at the
    // full geometric zoom the dashes outweigh the inset's roads and read as a
    // heavy dashed boundary rather than a fine ferry track.
    g.push(ferryLayer(ip, scale * 0.62));

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
    const dotCandidates: Array<{ name: string; p: Pt; col: string }> = [];
    for (const d of LANDMARKS) {
        const sp = mainProj.project(d.at);
        if (!inRegion(sp)) continue;
        const p = ipx(sp);
        // Union is marked by its subway glyph; centeredLabel landmarks (Billy
        // Bishop) show a name only — neither gets a red/blue dot here.
        const noDot = d.name === "Union Station" || d.centeredLabel;
        if (!noDot && !coveredByFootprint(d.at))
            dotCandidates.push({ name: d.name, p, col: d.kind === "water" ? PALETTE.accentBlue : PALETTE.accentRed });
        if (d.centeredLabel) {
            labelInputs.push(areaLabel(`ins:${d.name}`, d.name, p, {
                badge: badgeFor(d.name),
                size: 10, tracking: 0.1, fill: "#3a2c1c", family: FONTS.serif,
                priority: 58, halo: PALETTE.paper, haloWidth: 2.4,
            }));
            continue;
        }
        labelInputs.push({
            id: `ins:${d.name}`, text: d.name, badge: badgeFor(d.name), anchor: p, kind: "point",
            size: 10, tracking: 0.1, fill: "#3a2c1c", family: FONTS.serif,
            priority: d.kind === "water" ? 58 : 60, halo: PALETTE.paper, haloWidth: 2.4,
        });
    }
    const { placed } = placeLabels(labelInputs, panel, []);
    // as on the main map, the badge doubles as the marker — a dot is only drawn
    // where the name (and so the badge) could not be placed
    const insetLabelled = new Set(placed.filter((p) => p.badge).map((p) => p.id.slice(4)));
    for (const n of insetLabelled) labelled.add(n);
    const markers = dotCandidates
        .filter((m) => !insetLabelled.has(m.name))
        .map((m) => el("circle", { cx: m.p[0], cy: m.p[1], r: 3, fill: m.col, stroke: PALETTE.paper, "stroke-width": 0.8 }));
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
    // (the "DOWNTOWN CORE" caption is drawn by layoutInset, outside the panel's
    // transform, so it keeps its page-level size instead of shrinking with the
    // drawing)
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

// ---------------------------------------------------------------------------
// gazetteer panel (the numbered index in the bottom band)
// ---------------------------------------------------------------------------

/**
 * The panel is four index columns and one side column, all sharing one type
 * size, so the widths have to be split in proportion to what each division has
 * to say. The side column carries the city, its six boroughs and the eighteen
 * towns — around one part in three of the panel's copy against the index's two
 * — so it is set this much wider than an index column. Equal columns would put
 * the side division a third over its depth and drag the shared size down with
 * it; at 2 the two divisions run out of copy at about the same point, which is
 * where the solved size peaks (1.8 gives 3.9, 2 gives 4.0, and past 2 the index
 * becomes the binding division instead).
 *
 * This is only the default (DEFAULT_INDEX.sideColumn): override it per render
 * with `index.sideColumn`.
 */
const INDEX_COLS = 4;

/** Range the side column is allowed to take, so a stray value can't erase a division. */
const SIDE_COL_RANGE: [number, number] = [0.6, 5];

/**
 * Room left between the bottom of the city block and the first town: enough for
 * the towns' own heading and its rule, which are drawn partway down the side
 * column rather than at the top of it.
 */
const SIDE_HEAD_GAP = 26;

/**
 * Space between an entry's name and the start of its gloss, in em.
 *
 * This is a floor rather than a target, in two senses. The line breaker only
 * ever stretches the glue *between* words, so justification cannot squeeze the
 * name and gloss back together. And the name is measured without kerning, which
 * the renderer then applies when it draws — kerning is essentially always
 * negative, so the name comes out a shade narrower than measured and the gap a
 * shade wider than nominal, never tighter. scripts/measure-widths.ts checks that
 * the estimate stays on the high side.
 *
 * A full em reads as a deliberate separation between the two voices — upright
 * name, italic gloss — at any size the panel solves for.
 */
const NAME_GLOSS_GAP_EM = 1;

/** Space between an entry's name and its parenthetical note, in em. */
const NOTE_GAP_EM = 0.34;

/** Word space used when setting the glosses, in em. See typesetText. */
const WORD_SPACE_EM = 0.3;

/**
 * The index: `badge · name · why it matters`, the gloss running on from the
 * name and wrapping under it.
 *
 * Two divisions. Four columns of numbered neighbourhoods and landmarks, then a
 * wider side column holding the city — its population, its amalgamation and its
 * six boroughs — above the surrounding towns.
 *
 * Entries are set as variable-height blocks and then flowed into columns, which
 * is what lets the glosses be full sentences — a fixed grid would have to size
 * every row for the longest one and waste the difference. The type size is
 * solved for rather than chosen: the largest size at which every division's
 * wrapped copy still fits the band is used, so the panel fills its box without
 * overflowing.
 */
function gazetteerPanel(r: Rect, o: IndexOptions = {}): string {
    const out: string[] = [];

    out.push(el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: PALETTE.paper, "fill-opacity": 0.5, stroke: PALETTE.ink, "stroke-width": 1.4 }));
    out.push(el("rect", { x: r.x + 5, y: r.y + 5, width: r.w - 10, height: r.h - 10, fill: "none", stroke: PALETTE.inkSoft, "stroke-width": 0.7, "stroke-opacity": 0.7 }));

    const padX = 16;
    const gutter = 14;
    const ratio = Math.min(Math.max(o.sideColumn ?? DEFAULT_INDEX.sideColumn, SIDE_COL_RANGE[0]), SIDE_COL_RANGE[1]);
    const colW = (r.w - padX * 2 - gutter * INDEX_COLS) / (INDEX_COLS + ratio);
    const sideW = colW * ratio;
    // the divider sits in the gutter between the last index column and the side
    const sideX = r.x + padX + INDEX_COLS * (colW + gutter);
    const divX = sideX - gutter / 2;
    const sideMid = sideX + sideW / 2;

    const headY = r.y + 19;
    const top = headY + 16;
    const colH = r.y + r.h - 10 - top;

    // Largest type size at which every division still fits. Searched by stepping
    // rather than solved, because line breaking is not a smooth function of
    // size; all of it shares one size so the panel reads as one table rather
    // than three. The side column carries the city block above the towns, so
    // what the city takes is what the towns have left.
    let size = 3.6;
    let best: { size: number; city: CityBlock; a: IndexColumns; b: IndexColumns } | null = null;
    for (let t = 3.6; t <= 9.01; t += 0.1) {
        const city = layoutCityBlock(sideW, t);
        const a = flowEntries(GAZETTEER, INDEX_COLS, colW, colH, t);
        const b = flowEntries(TOWNS, 1, sideW, colH - city.height - SIDE_HEAD_GAP, t);
        if (!a || !b) break;
        best = { size: t, city, a, b };
        size = t;
    }
    if (!best) {
        const city = layoutCityBlock(sideW, size);
        best = {
            size,
            city,
            a: flowEntries(GAZETTEER, INDEX_COLS, colW, colH, size, true)!,
            b: flowEntries(TOWNS, 1, sideW, colH - city.height - SIDE_HEAD_GAP, size, true)!,
        };
    }

    out.push(text(r.x + padX + (INDEX_COLS * (colW + gutter) - gutter) / 2, headY, "INDEX OF NEIGHBOURHOODS & LANDMARKS", {
        size: 11, fill: PALETTE.ink, family: FONTS.display, weight: 700, tracking: 2.6, anchor: "middle",
    }));
    out.push(text(sideMid, headY, "TORONTO", {
        size: 11, fill: PALETTE.ink, family: FONTS.display, weight: 700, tracking: 2.6, anchor: "middle",
    }));

    // the city block, then the towns' own heading partway down the same column
    out.push(best.city.draw(sideX, top));
    const townsHeadY = top + best.city.height + SIDE_HEAD_GAP - 10;
    out.push(text(sideMid, townsHeadY, "SURROUNDING TOWNS", {
        size: 11, fill: PALETTE.ink, family: FONTS.display, weight: 700, tracking: 2.6, anchor: "middle",
    }));
    out.push(el("path", {
        d: polyline([[sideX, townsHeadY + 7], [sideX + sideW, townsHeadY + 7]]),
        stroke: PALETTE.ink, "stroke-width": 0.7, "stroke-opacity": 0.55,
    }));

    out.push(el("path", {
        d: polyline([[r.x + padX, headY + 7], [divX - gutter / 2, headY + 7]]),
        stroke: PALETTE.ink, "stroke-width": 0.7, "stroke-opacity": 0.55,
    }));
    out.push(el("path", {
        d: polyline([[divX + gutter / 2, headY + 7], [r.x + r.w - padX, headY + 7]]),
        stroke: PALETTE.ink, "stroke-width": 0.7, "stroke-opacity": 0.55,
    }));
    out.push(el("path", {
        d: polyline([[divX, headY - 11], [divX, r.y + r.h - 12]]),
        stroke: PALETTE.ink, "stroke-width": 0.7, "stroke-opacity": 0.45,
    }));

    for (const [ci, col] of best.a.entries())
        out.push(drawColumn(col, r.x + padX + ci * (colW + gutter), top + best.size * 0.8, best.size));
    const townsTop = top + best.city.height + SIDE_HEAD_GAP + best.size * 0.8;
    out.push(drawColumn(best.b[0], sideX, townsTop, best.size));

    return el("g", {}, out.join("\n"));
}

/**
 * The city block: what sits under the TORONTO heading at the top of the side
 * column, above the towns. Its population and census year, the amalgamation
 * that produced it, and the six former cities set out underneath.
 *
 * The boroughs are drawn without badges. Nothing on the map is numbered for
 * them because they are not places to be found on it — they are the ground the
 * numbered places stand on, and the map names and tints all six anyway.
 */
interface CityBlock {
    /** vertical extent below the given top, so the towns know what is left */
    height: number;
    draw(x: number, y: number): string;
}

function layoutCityBlock(width: number, size: number): CityBlock {
    const subSize = Math.max(size * 0.95, 4.2);
    const lead = size * 1.28;

    const strap = `${TORONTO.note} · all populations are ${POPULATION_YEAR} census counts`.toUpperCase();
    const para = typesetText(TORONTO.blurb, 0, 0, width, size);
    const boroughs = flowEntries(BOROUGHS, 1, width, Infinity, size, true)!;

    // baselines, all relative to the block's top
    const strapBase = subSize * 0.9;
    const paraBase = strapBase + size * 1.9;
    const boroughBase = paraBase + (para.length - 1) * lead + size * 1.9;
    const height = boroughBase + columnHeight(size)(boroughs[0]) - size * 0.62 + size * 0.6;

    return {
        height,
        draw(x: number, y: number): string {
            const out: string[] = [];
            // the year the figures come from, said once for the whole sheet
            // rather than repeated after every population on it
            out.push(text(x + width / 2, y + strapBase, strap, {
                size: subSize, fill: PALETTE.inkSoft, family: FONTS.serif, weight: 500, tracking: subSize * 0.2, anchor: "middle",
            }));
            for (const [li, line] of para.entries())
                out.push(glossLine(line, x, y + paraBase + li * lead, size));
            out.push(drawColumn(boroughs[0], x, y + boroughBase, size));
            return el("g", {}, out.join("\n"));
        },
    };
}

/** Height of one flowed column, measured from its first baseline. */
function columnHeight(size: number): (col: IndexItem[]) => number {
    return (col) => col.reduce((a, it) => a + it.lines.length * size * 1.28 + size * 0.62, 0);
}

/**
 * One flowed column: badge (if the entry has one), name, note, wrapped gloss.
 * `y` is the first entry's baseline.
 */
function drawColumn(col: IndexItem[], x: number, y: number, size: number): string {
    const out: string[] = [];
    const lead = size * 1.28;
    for (const item of col) {
        if (item.entry.label)
            out.push(indexBadge(size, x, y, { label: item.entry.label, color: badgeColour(item.entry.kind) }));
        out.push(text(x + item.adv, y, item.entry.name, {
            size, fill: PALETTE.ink, family: FONTS.serif, weight: 600, tracking: 0.1, anchor: "start",
        }));
        if (item.entry.note)
            out.push(text(x + item.noteX, y, item.entry.note, {
                size, fill: PALETTE.inkSoft, family: FONTS.serif, weight: 400, anchor: "start",
            }));
        for (const [li, line] of item.lines.entries())
            out.push(glossLine(line, x, y + li * lead, size));
        y += item.lines.length * lead + size * 0.62;
    }
    return out.join("\n");
}

/**
 * One line of gloss: a single <text> with every word placed at the offset the
 * line breaker computed. The glue is already stretched, so the margins come out
 * flush without distorting any glyph.
 */
function glossLine(line: IndexLine, x: number, baseline: number, size: number): string {
    const spans = line.words.map((w) => el("tspan", { x: round(x + line.x + w.dx) }, esc(w.text))).join("");
    return el("text", {
        y: round(baseline),
        "font-family": FONTS.italic,
        "font-size": size,
        "font-style": "italic",
        fill: PALETTE.inkSoft,
        "text-anchor": "start",
    }, spans);
}

interface IndexLine {
    /** x of the line's left edge, relative to the column */
    x: number;
    /** words with their computed offsets from the line's left edge */
    words: Array<{ dx: number; text: string }>;
}

interface IndexItem {
    entry: GazetteerEntry;
    /** badge width, so the name and the wrapped lines under it line up */
    adv: number;
    /** x of the note (population) that follows the name, relative to the column */
    noteX: number;
    lines: IndexLine[];
}

type IndexColumns = IndexItem[][];

/**
 * Set one entry's gloss with the TeX line-breaking algorithm.
 *
 * The gloss runs on from the name, so the first line is short by the width of
 * the badge and the name and the rest are full width — which is why the line
 * lengths go in as an array rather than a single number. Justification comes out
 * of the algorithm itself: `positionItems` returns each word's offset with the
 * inter-word glue already stretched to fill the measure, so the renderer places
 * words rather than stretching a string. Nothing touches the letter spacing.
 */
function typesetText(blurb: string, adv: number, nameEnd: number, colW: number, size: number): IndexLine[] {
    // EB Garamond's own word space is a fifth of an em, which is narrow enough
    // that a line the breaker leaves unstretched reads as if the words were
    // touching. Since the renderer places every word itself, the space is a
    // free choice rather than a property of the font: it is set to WORD_SPACE_EM
    // and given to the line breaker as the natural width, so the stretch it
    // computes is measured from a space wide enough to see.
    const measure = (w: string) => (w === " " ? size * WORD_SPACE_EM : textWidth(w, size, 0, "italic"));
    const items = layoutItemsFromString(blurb, measure);

    // first line indented past the name, the rest only past the badge
    const lineLengths = (n: number) => Array.from({ length: n }, (_, i) => colW - (i === 0 ? nameEnd : adv));

    // Take the tightest setting that works: ask for a modest stretch limit first
    // and only loosen when the breaker cannot satisfy it. Going straight to an
    // unlimited ratio would let one awkward entry open up gaps a word wide.
    let breakpoints: number[] | null = null;
    let lengths = lineLengths(24);
    for (const ratio of [1, 1.6, 2.4, 4]) {
        try {
            breakpoints = breakLines(items, lengths, { maxAdjustmentRatio: ratio });
            break;
        } catch {
            // too tight at this ratio — try a looser one
        }
    }
    breakpoints ??= breakLines(items, lengths, { maxAdjustmentRatio: null });
    lengths = lineLengths(Math.max(1, breakpoints.length - 1));
    const positioned = positionItems(items, lengths, breakpoints);

    const lines: IndexLine[] = lengths.map((_, i) => ({ x: i === 0 ? nameEnd : adv, words: [] }));
    for (const p of positioned) {
        const it = items[p.item] as { text?: string };
        if (typeof it.text !== "string" || !it.text.trim()) continue;
        (lines[p.line] ?? lines[lines.length - 1]).words.push({ dx: p.xOffset, text: it.text });
    }
    return lines.filter((l) => l.words.length > 0);
}

/**
 * Wrap every entry at `size` and deal the results into `cols` columns.
 * Returns null if the tallest column exceeds `colH`, unless `force` is set.
 */
function flowEntries(
    entries: GazetteerEntry[],
    cols: number,
    colW: number,
    colH: number,
    size: number,
    force = false
): IndexColumns | null {
    const lead = size * 1.28;
    const gap = size * 0.62;

    const items: IndexItem[] = entries.map((entry) => {
        // an entry with no label carries no badge (the boroughs), and its gloss
        // wraps flush to the column rather than hanging off a badge that is not there
        const adv = entry.label ? badgeAdvance({ size, badge: { label: entry.label, color: "#000" } }) : 0;
        // measured in serifBold because that is the weight the name is drawn at
        const nameW = textWidth(entry.name, size, 0.1, "serifBold");
        const noteW = entry.note ? size * NOTE_GAP_EM + textWidth(entry.note, size, 0, "serif") : 0;
        const nameEnd = adv + nameW + noteW + size * NAME_GLOSS_GAP_EM;
        return { entry, adv, noteX: adv + nameW + size * NOTE_GAP_EM, lines: typesetText(entry.blurb, adv, nameEnd, colW, size) };
    });

    const heights = items.map((it) => it.lines.length * lead + gap);
    const target = heights.reduce((a, b) => a + b, 0) / cols;

    const columns: IndexColumns = Array.from({ length: cols }, () => []);
    let ci = 0;
    let used = 0;
    for (const [i, it] of items.entries()) {
        // move on once this column has had its share, but never leave a column
        // empty and never spill past the last one
        if (ci < cols - 1 && used > 0 && used + heights[i] / 2 > target) {
            ci++;
            used = 0;
        }
        columns[ci].push(it);
        used += heights[i];
    }

    const tallest = Math.max(...columns.map((c) => c.reduce((a, it) => a + it.lines.length * lead + gap, 0)));
    if (!force && tallest > colH) return null;
    return columns;
}

/** Width the inset's type and line weights are tuned for; see layoutInset. */
const INSET_REF_WIDTH = 560;

/**
 * How far the inset may grow, since it is no longer boxed in by its slot.
 * `TOP` is how high up the map frame its caption may climb, as a fraction of the
 * frame's height; `WIDTH` is the share of the frame's width it may take. Both
 * are limits of taste rather than of geometry — past them the panel starts
 * covering city rather than lake, and squeezing the gazetteer's columns hard
 * enough that their type size drops to pay for it.
 */
const INSET_MAX_TOP = 0.42;
const INSET_MAX_WIDTH = 0.45;

function decorativeBorder(frame: Rect): string {
    const out: string[] = [];
    const o = BORDER_OFFSET;
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

interface TitleLine {
    text: string;
    size: number;
    tracking: number;
    family: string;
    fill: string;
    weight?: number;
    italic?: boolean;
    /** baseline offset from the line above — or from the top of the box, for the first */
    lead: number;
}

/**
 * The lines of the title panel. The cartouche measures itself from these (see
 * titleCartoucheRect), so editing the wording or commenting a line out resizes
 * the box around what remains instead of leaving a hole where it used to be.
 */
const TITLE_LINES: TitleLine[] = [
    { text: "CITY OF TORONTO", size: 36, tracking: 3, family: FONTS.display, fill: PALETTE.ink, weight: 700, lead: 50 },
    { text: "AND ITS NEIGHBOURHOODS", size: 14, tracking: 6, family: FONTS.serif, fill: PALETTE.inkSoft, lead: 26 },
    // { text: "— Canada West —", size: 12, tracking: 2, family: FONTS.italic, fill: PALETTE.inkSoft, italic: true, lead: 22 },
];

/** Space under the last baseline, and the clearance the scrolls need each side. */
const TITLE_PAD = { bottom: 18, side: 40 };

/** Size the title panel to its content, anchored at its top-left corner. */
function titleCartoucheRect(x: number, y: number): Rect {
    const widest = TITLE_LINES.reduce((m, l) => Math.max(m, textWidth(l.text, l.size, l.tracking)), 0);
    return {
        x,
        y,
        w: widest + TITLE_PAD.side * 2,
        h: TITLE_LINES.reduce((s, l) => s + l.lead, 0) + TITLE_PAD.bottom,
    };
}

function titleCartouche(r: Rect): string {
    const { x, y, w, h } = r;
    const out: string[] = [];
    out.push(el("rect", { x, y, width: w, height: h, rx: 10, fill: PALETTE.paper, "fill-opacity": 0.85, stroke: PALETTE.ink, "stroke-width": 2 }));
    out.push(el("rect", { x: x + 6, y: y + 6, width: w - 12, height: h - 12, rx: 7, fill: "none", stroke: PALETTE.inkSoft, "stroke-width": 0.8 }));
    out.push(scroll(x + 16, y + h / 2, -1));
    out.push(scroll(x + w - 16, y + h / 2, 1));
    let baseline = y;
    for (const l of TITLE_LINES) {
        baseline += l.lead;
        out.push(text(x + w / 2, baseline, l.text, {
            size: l.size, fill: l.fill, family: l.family, tracking: l.tracking, weight: l.weight, italic: l.italic,
        }));
    }
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

function scaleBar(proj: Projection, r: Rect, km = 5): string {
    const { pxPerKm } = proj;
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
    out.push(text(x + w / 2, y + 21, "EXPLANATION", { size: 13, fill: PALETTE.ink, family: FONTS.display, tracking: 3, weight: 700 }));
    // The badge rows come first: they are now the primary marker on the sheet,
    // and they are the key to reading the index panel beside this box.
    const rows: Array<[string, string]> = [
        ["nbadge", "Neighbourhood — see index"],
        ["lbadge", "Landmark — see index"],
        ["tbadge", "Surrounding town — see index"],
        ["swatch", "Former Borough"],
        ["line", "Principal Street"],
        ["water", "Lake, River & Harbour"],
        ["depth", "Depth contour (metres)"],
    ];
    // Rows are spaced to whatever height the caller allotted, so adding one to
    // the list re-spaces the box instead of running off the bottom of it.
    const first = y + 42;
    const pitch = Math.min(22, (y + h - 10 - first) / (rows.length - 1));
    const rowSize = Math.min(12, pitch * 0.56);
    let ry = first;
    for (const [kind, label] of rows) {
        const gx = x + 18;
        if (kind === "swatch") out.push(el("rect", { x: gx, y: ry - 9, width: 18, height: 12, fill: PALETTE.regions["North York"], stroke: PALETTE.inkFaint, "stroke-width": 0.6 }));
        else if (kind === "line") out.push(el("path", { d: `M ${gx} ${ry - 3} L ${gx + 18} ${ry - 3}`, stroke: PALETTE.inkSoft, "stroke-width": 2 }));
        else if (kind === "nbadge" || kind === "lbadge" || kind === "tbadge")
            out.push(indexBadge(rowSize * 0.92, gx + 2, ry, {
                label: kind === "nbadge" ? "7" : kind === "lbadge" ? "49" : "MI",
                color: kind === "lbadge" ? PALETTE.accentRed : PALETTE.paper,
            }));
        else if (kind === "depth") out.push(el("path", { d: `M ${gx} ${ry - 5} q 4.5 6 9 0 t 9 0`, fill: "none", stroke: PALETTE.waterDeep, "stroke-width": 1, "stroke-opacity": 0.8 }));
        else out.push(el("rect", { x: gx, y: ry - 9, width: 18, height: 12, fill: PALETTE.water, stroke: PALETTE.waterDeep, "stroke-width": 0.6 }));
        out.push(text(gx + 28, ry, label, { size: rowSize, fill: PALETTE.ink, family: FONTS.serif, anchor: "start" }));
        ry += pitch;
    }
    return el("g", {}, out.join("\n"));
}
