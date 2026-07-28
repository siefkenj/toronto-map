// Greedy label placement with hard overlap avoidance.
//
// Text metrics are ESTIMATED (no DOM), so the SVG stays portable/server-safe.
// Labels are placed highest-priority first; each tries its ideal spot then a set
// of candidate offsets; if nothing fits without colliding, the label is dropped
// (when allowDrop) — guaranteeing no two placed labels overlap.

import type { Pt } from "./svg";

export interface LabelInput {
    id: string;
    text: string;
    /** ideal anchor: label centre (area) or the marker point (point) */
    anchor: Pt;
    size: number;
    family: string;
    fill: string;
    priority: number;
    kind: "area" | "point";
    tracking?: number;
    weight?: number | string;
    italic?: boolean;
    textAnchor?: "start" | "middle" | "end";
    rotate?: number;
    halo?: string;
    haloWidth?: number;
    allowDrop?: boolean;
    /** label lives in the outer margin (skip frame containment test) */
    inMargin?: boolean;
}

export interface PlacedLabel extends LabelInput {
    x: number;
    y: number;
    finalAnchor: "start" | "middle" | "end";
    leader?: [Pt, Pt];
}

export interface Box {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const PAD = 1.9;

export function charAdvance(ch: string): number {
    if (" .,:;'!|il".includes(ch)) return 0.28;
    if ("fjrt()[]-I".includes(ch)) return 0.34;
    if ("mwMW".includes(ch)) return 0.86;
    if (ch >= "A" && ch <= "Z") return 0.64;
    return 0.5;
}

export function textWidth(text: string, size: number, tracking = 0): number {
    let w = 0;
    for (const ch of text) w += charAdvance(ch) * size;
    return w + tracking * Math.max(0, text.length - 1);
}

function boxAt(
    x: number,
    y: number,
    w: number,
    size: number,
    anchor: "start" | "middle" | "end"
): Box {
    const ascent = size * 0.74;
    const descent = size * 0.26;
    const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    return { x0: left - PAD, y0: y - ascent - PAD, x1: left + w + PAD, y1: y + descent + PAD };
}

/** AABB of a box rotated by `deg` about (cx,cy). */
function rotatedAABB(b: Box, cx: number, cy: number, deg: number): Box {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const corners: Pt[] = [
        [b.x0, b.y0],
        [b.x1, b.y0],
        [b.x1, b.y1],
        [b.x0, b.y1],
    ].map(([px, py]) => {
        const dx = px - cx;
        const dy = py - cy;
        return [cx + dx * c - dy * s, cy + dx * s + dy * c] as Pt;
    });
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function boxesOverlap(a: Box, b: Box): boolean {
    return !(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1);
}
function overlaps(a: Box, b: Box): boolean {
    return boxesOverlap(a, b);
}

/** Screen-space AABB actually occupied by an already-placed label. */
export function labelBox(p: PlacedLabel): Box {
    const w = textWidth(p.text, p.size, p.tracking);
    let box = boxAt(p.x, p.y, w, p.size, p.finalAnchor);
    if (p.rotate) box = rotatedAABB(box, p.x, p.y, p.rotate);
    return box;
}

function insideFrame(b: Box, f: Rect): boolean {
    const slack = 4;
    return (
        b.x0 >= f.x - slack &&
        b.y0 >= f.y - slack &&
        b.x1 <= f.x + f.w + slack &&
        b.y1 <= f.y + f.h + slack
    );
}

interface Candidate {
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
    leader?: [Pt, Pt];
}

function candidatesFor(inp: LabelInput): Candidate[] {
    const [ax, ay] = inp.anchor;
    if (inp.kind === "area") {
        const anchor = inp.textAnchor ?? "middle";
        const s = inp.size;
        const out: Candidate[] = [{ x: ax, y: ay, anchor }];
        // small nudges around the ideal centre
        for (const r of [0.9, 1.8, 2.8]) {
            for (const [dx, dy] of [
                [0, -1],
                [0, 1],
                [-1, -0.6],
                [1, -0.6],
                [-1, 0.6],
                [1, 0.6],
            ] as const) {
                out.push({ x: ax + dx * s * r, y: ay + dy * s * r, anchor });
            }
        }
        return out;
    }
    // point label: sit beside the marker, radiating outward, with a leader
    const out: Candidate[] = [];
    const s = inp.size;
    const gap = 4;
    for (const r of [gap, gap + s, gap + s * 2.2, gap + s * 3.6]) {
        const places: Array<[number, number, "start" | "middle" | "end"]> = [
            [r, 0, "start"],
            [-r, 0, "end"],
            [r * 0.8, -r * 0.7, "start"],
            [r * 0.8, r * 0.7, "start"],
            [-r * 0.8, -r * 0.7, "end"],
            [-r * 0.8, r * 0.7, "end"],
            [0, -r - s * 0.4, "middle"],
            [0, r + s * 0.4, "middle"],
        ];
        for (const [ox, oy, anchor] of places) {
            const x = ax + ox;
            const y = ay + oy + s * 0.34;
            out.push({ x, y, anchor, leader: [[ax, ay], [x, y - s * 0.34]] });
        }
    }
    return out;
}

/**
 * Place labels without overlap. `occupied` seeds fixed keep-out boxes
 * (decorative apparatus). Returns only the labels that were placed.
 */
export function placeLabels(
    inputs: LabelInput[],
    frame: Rect,
    occupied: Box[] = []
): { placed: PlacedLabel[]; dropped: number } {
    const boxes: Box[] = [...occupied];
    const placed: PlacedLabel[] = [];
    let dropped = 0;

    const ordered = [...inputs].sort((a, b) => b.priority - a.priority);

    for (const inp of ordered) {
        const w = textWidth(inp.text, inp.size, inp.tracking);
        const cands = candidatesFor(inp);
        let chosen: Candidate | null = null;

        for (const c of cands) {
            let box = boxAt(c.x, c.y, w, inp.size, c.anchor);
            if (inp.rotate) box = rotatedAABB(box, c.x, c.y, inp.rotate);
            if (!inp.inMargin && !insideFrame(box, frame)) continue;
            if (boxes.some((b) => overlaps(box, b))) continue;
            chosen = c;
            boxes.push(box);
            break;
        }

        if (!chosen) {
            if (inp.allowDrop ?? true) {
                dropped++;
                continue;
            }
            // forced placement at the ideal spot
            const anchor = inp.textAnchor ?? "middle";
            let box = boxAt(inp.anchor[0], inp.anchor[1], w, inp.size, anchor);
            if (inp.rotate) box = rotatedAABB(box, inp.anchor[0], inp.anchor[1], inp.rotate);
            boxes.push(box);
            placed.push({
                ...inp,
                x: inp.anchor[0],
                y: inp.anchor[1],
                finalAnchor: anchor,
            });
            continue;
        }

        placed.push({
            ...inp,
            x: chosen.x,
            y: chosen.y,
            finalAnchor: chosen.anchor,
            leader: chosen.leader,
        });
    }

    return { placed, dropped };
}
