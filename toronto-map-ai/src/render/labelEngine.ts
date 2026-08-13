// Greedy label placement with hard overlap avoidance.
//
// Text metrics are ESTIMATED (no DOM), so the SVG stays portable/server-safe.
// Labels are placed highest-priority first; each tries its ideal spot then a set
// of candidate offsets; if nothing fits without colliding, the label is dropped
// (when allowDrop) — guaranteeing no two placed labels overlap.
//
// A badged label tries a further set of positions FIRST: the four that put the
// badge disc exactly on the feature's own point, with the name hung off one side
// of it (see pinnedCandidates). The disc is a fraction of the width of the name,
// so it will sit on a centre that the whole label could never fit on, and the
// number then marks the place rather than merely accompanying it. Only when all
// four are blocked does the label move off its centre as a unit, as before.

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
    /** which side of the name the circle sits on; defaults to "left" */
    side?: BadgeSide;
}

/** Where a badge sits relative to the name it keys. */
export type BadgeSide = "left" | "right" | "above" | "below";

/** Badge circle radius and the gap after it, both as multiples of the font size. */
const BADGE_R = 0.62;
const BADGE_GAP = 0.26;

/** How much room a badge needs, and on which side, in label units. */
export interface BadgeRoom {
    /** extra width, on whichever side the badge takes */
    dx: number;
    /** extra height above the ascent, and below the descent */
    top: number;
    bottom: number;
}

const NO_BADGE: BadgeRoom = { dx: 0, top: 0, bottom: 0 };

export function badgeRoom(inp: { size: number; badge?: LabelBadge }): BadgeRoom {
    if (!inp.badge) return NO_BADGE;
    const d = inp.size * (BADGE_R * 2 + BADGE_GAP);
    switch (inp.badge.side ?? "left") {
        case "above": return { dx: 0, top: d, bottom: 0 };
        case "below": return { dx: 0, top: 0, bottom: d };
        default: return { dx: d, top: 0, bottom: 0 };   // left and right both sit beside
    }
}

/** Horizontal room the badge takes up beside the text, in label units. */
export function badgeAdvance(inp: { size: number; badge?: LabelBadge }): number {
    return badgeRoom(inp).dx;
}

/**
 * Cap height of this face as a fraction of its font size, measured off the
 * rendered sheet: 48 digit badges average 0.656 em and 12 capital-initial badges
 * 0.651 em, both sitting on their baseline. Digits and capitals are the same
 * height here, so one constant serves for both.
 */
const BADGE_CAP = 0.653;

export interface BadgePlacement {
    cx: number;
    cy: number;
    r: number;
    /** font size for the figure inside the circle */
    numSize: number;
    /** baseline the figure is set on */
    numBaseline: number;
}

/**
 * Where a badge's circle and its figure go, given the left edge and width of the
 * NAME it keys and that name's baseline.
 *
 * Beside the name (left/right) the circle is centred on the name's CAP CENTRE
 * LINE and the figure is centred in the circle — so the figure and the name's
 * capitals share a centre. Setting the figure on the name's baseline instead is
 * the obvious thing and looks wrong: the figure is about 0.72 of the name's size,
 * so sharing a baseline puts its centre roughly 0.09 em low and the number reads
 * as having slipped down out of its circle.
 *
 * Above or below there is no name alongside to match, so the figure is simply
 * centred in its circle.
 *
 * `nameSize` is the size of the name being matched, which is not always the size
 * the badge is drawn at — the legend sets its discs slightly smaller than its
 * rows — so it is passed separately where the two differ.
 */
export function badgePlacement(
    size: number,
    textLeft: number,
    textW: number,
    baseline: number,
    b: LabelBadge,
    nameSize: number = size
): BadgePlacement {
    const r = size * BADGE_R;
    const gap = size * BADGE_GAP;
    const numSize = r * (b.label.length > 1 ? 1.04 : 1.16);
    const half = (numSize * BADGE_CAP) / 2;
    const centred = (cx: number, cy: number) => ({ cx, cy, r, numSize, numBaseline: cy + half });
    switch (b.side ?? "left") {
        case "above":
            return centred(textLeft + textW / 2, baseline - size * 0.74 - gap - r);
        case "below":
            return centred(textLeft + textW / 2, baseline + size * 0.26 + gap + r);
        case "right":
            return centred(textLeft + textW + gap + r, baseline - (nameSize * BADGE_CAP) / 2);
        default:
            return centred(textLeft - gap - r, baseline - (nameSize * BADGE_CAP) / 2);
    }
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
 * Clearance beyond this counts as "open paper" — past it, one pinned side is no
 * roomier than another in any way a reader would notice. Only consulted when the
 * side named in the data is blocked outright.
 */
const MAX_CLEARANCE = 24;

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
    anchor: "start" | "middle" | "end",
    room: BadgeRoom = NO_BADGE
): Box {
    const ascent = size * 0.74;
    const descent = size * 0.26;
    const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    return {
        x0: left - PAD,
        y0: y - ascent - room.top - PAD,
        x1: left + w + PAD,
        y1: y + descent + room.bottom + PAD,
    };
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

/** Separation between two non-overlapping boxes; 0 if they touch or overlap. */
function boxGap(a: Box, b: Box): number {
    const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
    const dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
    return Math.hypot(dx, dy);
}
function overlaps(a: Box, b: Box): boolean {
    return boxesOverlap(a, b);
}

/** Screen-space AABB actually occupied by an already-placed label. */
export function labelBox(p: PlacedLabel): Box {
    const room = badgeRoom(p);
    const w = textWidth(p.text, p.size, p.tracking) + room.dx;
    let box = boxAt(p.x, p.y, w, p.size, p.finalAnchor, room);
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
    /** side this candidate puts the badge on, overriding the input's own */
    badgeSide?: BadgeSide;
}

/**
 * Where the label's reference point has to go for the badge disc to land exactly
 * on the anchor, with the name set off to `side`. Inverts badgePlacement, so the
 * two must stay in step: each case here solves that function's case for the text
 * position that puts (cx, cy) on the anchor, with the text anchored "start" so
 * the label's left edge is the reference point.
 */
function pinnedCandidate(inp: LabelInput, side: BadgeSide, textW: number): Candidate {
    const [ax, ay] = inp.anchor;
    const s = inp.size;
    const r = s * BADGE_R;
    const gap = s * BADGE_GAP;
    const half = (s * BADGE_CAP) / 2;
    const at = (x: number, y: number): Candidate => ({ x, y, anchor: "start", badgeSide: side });
    switch (side) {
        case "right": return at(ax - textW - gap - r, ay + half);
        case "above": return at(ax - textW / 2, ay + s * 0.74 + gap + r);
        case "below": return at(ax - textW / 2, ay - s * 0.26 - gap - r);
        default: return at(ax - r, ay + half);
    }
}

/**
 * The badge marks the feature, so the first thing tried is always to put the
 * disc ON the feature and hang the name off it — the disc is small enough to sit
 * on a centre that the whole label could never fit on. The four sides are tried
 * in turn, the one set in the data first, and only when none of them clears its
 * neighbours does placement fall back to moving the label as a unit.
 */
function pinnedCandidates(inp: LabelInput): Candidate[] {
    if (!inp.badge || inp.rotate) return [];
    const textW = textWidth(inp.text, inp.size, inp.tracking);
    const preferred = inp.badge.side ?? "left";
    const sides: BadgeSide[] = [preferred, ...(["left", "right", "above", "below"] as const).filter((s) => s !== preferred)];
    return sides.map((s) => pinnedCandidate(inp, s, textW));
}

function candidatesFor(inp: LabelInput): Candidate[] {
    const [ax, ay] = inp.anchor;
    if (inp.kind === "area") {
        const anchor = inp.textAnchor ?? "middle";
        const s = inp.size;
        const out: Candidate[] = [...pinnedCandidates(inp), { x: ax, y: ay, anchor }];
        // Nudges around the ideal centre, nearest ring first. Pinning takes the
        // exact centre for whichever label reaches it first, so the ones that
        // follow lean on these rings much harder than they used to; a sparse set
        // sends a label that misses by a little all the way out to the roaming
        // search, which can strand it a kilometre from what it names.
        for (const r of [0.9, 1.4, 1.8, 2.3, 2.8, 3.4]) {
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
    const out: Candidate[] = pinnedCandidates(inp);
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
 * The same label with its badge moved to `side`. The resolved side is written
 * back into the placed label, so everything downstream — the keep-out box, the
 * drawing code — reads it from the badge as before and needs no notion of a
 * candidate having chosen it.
 */
function withSide<T extends { size: number; badge?: LabelBadge }>(inp: T, side: BadgeSide | undefined): T {
    if (!side || !inp.badge || inp.badge.side === side) return inp;
    return { ...inp, badge: { ...inp.badge, side } };
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
            const textW = textWidth(cand.text, cand.size, cand.tracking);
            const fits = (c: Candidate): Box | null => {
                // a pinned candidate carries its own side, and the badge takes
                // its room from whichever side that is
                const room = badgeRoom(withSide(cand, c.badgeSide));
                let box = boxAt(c.x, c.y, textW + room.dx, cand.size, c.anchor, room);
                if (cand.rotate) box = rotatedAABB(box, c.x, c.y, cand.rotate);
                if (!cand.inMargin && !insideFrame(box, frame)) return null;
                if (boxes.some((b) => overlaps(box, b))) return null;
                return box;
            };
            const cands = candidatesFor(cand);

            // The pinned candidates all put the disc on the same point, so they
            // are not a preference order but a choice of which way the name
            // hangs off it.
            //
            // The side named in the data wins outright whenever it fits: these
            // are set per place by hand, and a placement that fits already
            // overlaps nothing, so there is no case where overruling one buys
            // the reader anything. Only when that side is blocked does the
            // engine choose, and then it takes the one standing clearest of its
            // neighbours rather than the first that merely fits — which keeps
            // the name out of the crowd and leaves the most room for whatever
            // is placed after it.
            const pinned = cands
                .filter((c) => c.badgeSide)
                .map((c) => ({ c, box: fits(c) }))
                .filter((z): z is { c: Candidate; box: Box } => z.box !== null);
            if (pinned.length) {
                const preferred = cand.badge?.side ?? "left";
                const asAsked = pinned.find((z) => z.c.badgeSide === preferred);
                let best = asAsked ?? pinned[0];
                if (!asAsked) {
                    let bestClear = -Infinity;
                    for (const z of pinned) {
                        let clear = MAX_CLEARANCE;
                        for (const b of boxes) clear = Math.min(clear, boxGap(z.box, b));
                        if (clear > bestClear) {
                            bestClear = clear;
                            best = z;
                        }
                    }
                }
                boxes.push(best.box);
                return best.c;
            }

            for (const c of cands) {
                if (c.badgeSide) continue; // already tried, and none of them fit
                const box = fits(c);
                if (!box) continue;
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
            const room = badgeRoom(inp);
            const w = textWidth(inp.text, inp.size, inp.tracking) + room.dx;
            let box = boxAt(inp.anchor[0], inp.anchor[1], w, inp.size, anchor, room);
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
            ...withSide(inp, chosen.badgeSide),
            x: chosen.x,
            y: chosen.y,
            finalAnchor: chosen.anchor,
            leader: inp.noLeader ? undefined : chosen.leader,
        });
    }

    return { placed, dropped };
}
