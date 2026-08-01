// Greedy label placement with hard overlap avoidance.
//
// Text metrics are ESTIMATED (no DOM), so the SVG stays portable/server-safe.
// Labels are placed highest-priority first; each tries its ideal spot then a set
// of candidate offsets; if nothing fits without colliding, the label is dropped
// (when allowDrop) — guaranteeing no two placed labels overlap.

import type { Pt } from "./svg";
import { FACE_METRICS } from "./fontMetrics";

/**
 * A circled index number drawn immediately before the label text, keying the
 * feature to its entry in the gazetteer panel. For landmarks it stands in for
 * the marker dot, so it carries that marker's colour.
 */
export interface LabelBadge {
    /** what is set inside the circle: an index number, or a town's initials */
    label: string;
    color: string;
}

/** Badge circle radius and the gap after it, both as multiples of the font size. */
const BADGE_R = 0.62;
const BADGE_GAP = 0.26;

/** Horizontal room the badge takes up ahead of the text, in label units. */
export function badgeAdvance(inp: { size: number; badge?: LabelBadge }): number {
    return inp.badge ? inp.size * (BADGE_R * 2 + BADGE_GAP) : 0;
}

/** Geometry of a label's badge, given the left edge of the whole label. */
export function badgeGeometry(size: number, left: number, baseline: number): { cx: number; cy: number; r: number } {
    const r = size * BADGE_R;
    // centred on the text's optical middle rather than its baseline
    return { cx: left + r, cy: baseline - size * 0.24, r };
}

export interface LabelInput {
    id: string;
    text: string;
    /** optional circled index number drawn ahead of the text */
    badge?: LabelBadge;
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
    /**
     * Never reduce this label to its badge alone — the name has to appear. Such
     * a label falls back to a leadered point placement and, failing that, is
     * forced into position rather than abbreviated.
     */
    nameRequired?: boolean;
    /** label lives in the outer margin (skip frame containment test) */
    inMargin?: boolean;
    /**
     * Never draw a leader to this label's anchor. An area label that cannot fit
     * is retried as a point label, which draws a leader so a displaced name still
     * says what it belongs to. That reads correctly for a feature with a real
     * position, but the anchor of a big open area is a nominal interior point, so
     * the leader is a line to nothing — set this for those.
     */
    noLeader?: boolean;
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

/**
 * Advance width of one character in em, for `face` ("serif" | "italic" |
 * "display"). Measured from the real fonts by scripts/build-font-metrics.ts;
 * this used to be a five-bucket guess, which was tolerable for deciding roughly
 * where a map label sits but nowhere near good enough to set justified copy.
 */
export function charAdvance(ch: string, face: FaceName = "serif"): number {
    const m = FACE_METRICS[face] ?? FACE_METRICS.serif;
    return m.adv[ch] ?? m.fallback;
}

export type FaceName = "serif" | "serifBold" | "italic" | "display";

export function textWidth(text: string, size: number, tracking = 0, face: FaceName = "serif"): number {
    const m = FACE_METRICS[face] ?? FACE_METRICS.serif;
    let w = 0;
    for (const ch of text) w += (m.adv[ch] ?? m.fallback) * size;
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
    const w = textWidth(p.text, p.size, p.tracking) + badgeAdvance(p);
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

    for (let inp of ordered) {
        const tryFit = (cand: LabelInput): Candidate | null => {
            const w = textWidth(cand.text, cand.size, cand.tracking) + badgeAdvance(cand);
            for (const c of candidatesFor(cand)) {
                let box = boxAt(c.x, c.y, w, cand.size, c.anchor);
                if (cand.rotate) box = rotatedAABB(box, c.x, c.y, cand.rotate);
                if (!cand.inMargin && !insideFrame(box, frame)) continue;
                if (boxes.some((b) => overlaps(box, b))) continue;
                boxes.push(box);
                return c;
            }
            return null;
        };

        let chosen = tryFit(inp);

        // First retry: keep the name but look further afield. The point search
        // radiates well past the area nudges and draws a leader, so a name that
        // had to move off its centre still says what it belongs to. This is the
        // only retry a `nameRequired` label gets before being forced.
        if (!chosen && inp.kind === "area") {
            const roaming: LabelInput = { ...inp, kind: "point", textAnchor: undefined };
            const c = tryFit(roaming);
            if (c) {
                inp = roaming;
                chosen = c;
            }
        }

        // Second retry: a badged label that still cannot fit falls back to the
        // badge alone. The number is a fraction of the width of the name, and
        // the gazetteer panel promises every number on the sheet can be looked
        // up — dropping the feature would break that promise, a bare number does
        // not. Labels marked `nameRequired` opt out: for those the name is the
        // point, and something else has to give way instead.
        if (!chosen && inp.badge && !inp.nameRequired) {
            const bare: LabelInput = { ...inp, text: "", kind: "point", textAnchor: undefined };
            const c = tryFit(bare);
            if (c) {
                inp = bare;
                chosen = c;
            }
        }

        if (!chosen) {
            if ((inp.allowDrop ?? true) && !inp.nameRequired) {
                dropped++;
                continue;
            }
            // forced placement at the ideal spot
            const anchor = inp.textAnchor ?? "middle";
            const w = textWidth(inp.text, inp.size, inp.tracking) + badgeAdvance(inp);
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
            leader: inp.noLeader ? undefined : chosen.leader,
        });
    }

    return { placed, dropped };
}
