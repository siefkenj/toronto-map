// Depth ("bathymetry") contours for Lake Ontario, drawn from REAL sounding data.
//
// The isobaths in src/assets/toronto-bathymetry.geojson.json were generated from
// NOAA NCEI's Great Lakes bathymetry (the DEM_all mosaic, sampled over the map
// area via the ArcGIS ImageServer exportImage service) by marching-squares
// contouring of the lake-floor depth grid. Each feature is one depth level (in
// metres below the lake surface); we simply project and stroke them, shallow
// contours pale & thin, deeper ones darker & heavier. The caller clips them to
// the lake outline.

import type { FeatureCollection, MultiLineString } from "geojson";
import bathyRaw from "../assets/toronto-bathymetry.geojson.json";
import type { LonLatTuple } from "./projection";
import { el, smoothPath, type Pt } from "./svg";
import { PALETTE } from "./style";

const bathy = bathyRaw as unknown as FeatureCollection;

/** Levels present in the dataset (metres), ascending — for colour normalisation. */
const LEVELS: number[] = ((bathyRaw as { properties?: { levels?: number[] } }).properties?.levels ?? [])
    .slice()
    .sort((a, b) => a - b);

function mix(a: string, b: string, t: number): string {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh: number) => {
        const ca = (pa >> sh) & 255;
        const cb = (pb >> sh) & 255;
        return Math.round(ca + (cb - ca) * t);
    };
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Stroke every real isobath, coloured/weighted by depth. `project` maps lon/lat
 *  to screen px (main projection, or the inset's transform). */
export function depthContours(project: (p: LonLatTuple) => Pt, widthScale = 1): string {
    const maxLevel = LEVELS.length ? LEVELS[LEVELS.length - 1] : 100;
    const minLevel = LEVELS.length ? LEVELS[0] : 0;
    const out: string[] = [];
    for (const f of bathy.features) {
        if (f.geometry?.type !== "MultiLineString") continue;
        const depth = (f.properties?.depth as number) ?? 0;
        const t = Math.max(0, Math.min(1, (depth - minLevel) / Math.max(1, maxLevel - minLevel)));
        // shallow → pale engraved blue; deep → the darker water ink
        const stroke = mix(PALETTE.waterLine, PALETTE.waterDeep, t);
        const paths: string[] = [];
        for (const line of (f.geometry as MultiLineString).coordinates) {
            const pts: Pt[] = line.map((p) => project(p as LonLatTuple));
            paths.push(smoothPath(pts));
        }
        out.push(
            el("path", {
                d: paths.join(" "),
                fill: "none",
                stroke,
                "stroke-width": (0.35 + 0.5 * t) * widthScale,
                "stroke-opacity": 0.3 + 0.4 * t,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
            })
        );
    }
    return out.join("");
}
