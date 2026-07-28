import type { Position } from "geojson";
import { Mat, findBoundingBox } from "./geometry";

export interface GeoBounds {
    west: number;
    east: number;
    south: number;
    north: number;
}

/** Geographic extent shown inside the map frame (city of Toronto + a margin).
 *  North is cropped close to the city's Steeles Ave edge so there isn't a wide
 *  empty band of paper between the northern towns and the city itself. */
export const CONTENT_BOUNDS: GeoBounds = {
    west: -79.645,
    east: -79.11,
    south: 43.58,
    north: 43.805,
};

// Approximate km per degree at Toronto's latitude.
const LON_SCALE = 81;
const LAT_SCALE = 111;
/** Rotate the city grid so it sits square to the page (Toronto's grid ≈ 16°). */
export const CITY_ROT = 16;

export interface Projection {
    /** lon/lat -> screen pixels */
    project(p: LonLatTuple): [number, number];
    /** screen pixels -> lon/lat (inverse of project) */
    unproject(p: [number, number]): LonLatTuple;
    /** the inner rectangle (inside margins) the content is fitted into */
    frame: { x: number; y: number; w: number; h: number };
    /** pixels per kilometre (for the scale bar) */
    pxPerKm: number;
    /** unit screen vector pointing to true north (for the compass) */
    north: [number, number];
    mat: Mat;
}

export type LonLatTuple = [number, number];

/**
 * Build an affine projection that rotates by `rot` degrees and auto-fits the
 * given geographic bounds into `canvas` minus `margin`, preserving aspect ratio.
 */
export function makeProjection(
    canvas: { w: number; h: number },
    margin: { top: number; right: number; bottom: number; left: number },
    bounds: GeoBounds = CONTENT_BOUNDS,
    rot = CITY_ROT
): Projection {
    // lon/lat -> rotated "world" (km-ish, y-down)
    const worldMat = Mat.scale(LON_SCALE, -LAT_SCALE).rotate(rot);

    // world-space bbox of the four geographic corners
    const corners: Position[] = [
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
    ].map((c) => worldMat.apply(c as Position));
    const wb = findBoundingBox([corners]);
    const worldW = wb.east - wb.west;
    const worldH = wb.north - wb.south;
    const worldCx = (wb.east + wb.west) / 2;
    const worldCy = (wb.north + wb.south) / 2;

    const frame = {
        x: margin.left,
        y: margin.top,
        w: canvas.w - margin.left - margin.right,
        h: canvas.h - margin.top - margin.bottom,
    };
    const s = Math.min(frame.w / worldW, frame.h / worldH);
    const screenCx = frame.x + frame.w / 2;
    const screenCy = frame.y + frame.h / 2;

    const mat = worldMat
        .scale(s, s)
        .translate(screenCx - s * worldCx, screenCy - s * worldCy);

    const project = (p: LonLatTuple): [number, number] =>
        mat.apply(p as Position) as [number, number];

    // inverse of the affine `mat` ([ma mb mc; md me mf]): screen -> lon/lat
    const [ma, mb, mc, md, me, mf] = mat;
    const det = ma * me - mb * md || 1;
    const unproject = ([X, Y]: [number, number]): LonLatTuple => [
        (me * (X - mc) - mb * (Y - mf)) / det,
        (-md * (X - mc) + ma * (Y - mf)) / det,
    ];

    // pixels per km: 1 km east ≈ 1/LON_SCALE degrees of longitude
    const a = project([bounds.west, bounds.south]);
    const b = project([bounds.west + 1 / LON_SCALE, bounds.south]);
    const pxPerKm = Math.hypot(b[0] - a[0], b[1] - a[1]);

    // north vector: direction of increasing latitude on screen
    const n0 = project([worldCx0(bounds), worldCy0(bounds)]);
    const n1 = project([worldCx0(bounds), worldCy0(bounds) + 0.01]);
    const nlen = Math.hypot(n1[0] - n0[0], n1[1] - n0[1]) || 1;
    const north: [number, number] = [
        (n1[0] - n0[0]) / nlen,
        (n1[1] - n0[1]) / nlen,
    ];

    return { project, unproject, frame, pxPerKm, north, mat };
}

function worldCx0(b: GeoBounds) {
    return (b.west + b.east) / 2;
}
function worldCy0(b: GeoBounds) {
    return (b.south + b.north) / 2;
}
