// Tiny helpers for building SVG markup as a string (framework-agnostic).

export type Pt = [number, number];

export function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Serialize an attribute object into a string. Numbers are rounded. */
export function attrs(a: Record<string, string | number | undefined>): string {
    return Object.entries(a)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}="${typeof v === "number" ? round(v) : esc(String(v))}"`)
        .join(" ");
}

export function round(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Build an SVG path `d` from a list of screen points (open polyline). */
export function polyline(pts: Pt[]): string {
    return pts
        .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${round(x)} ${round(y)}`)
        .join(" ");
}

/** Build a closed path `d` from a ring of points. */
export function ring(pts: Pt[]): string {
    return polyline(pts) + " Z";
}

/**
 * Smooth a polyline into a path using a uniform Catmull-Rom spline expressed as
 * cubic béziers. Used to give roads and the land/water boundary organic, flowing
 * curves instead of faceted segments. `closed` wraps the ends for rings.
 */
export function smoothPath(pts: Pt[], closed = false): string {
    let p = pts;
    if (closed && p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) {
        p = p.slice(0, -1); // drop duplicated closing vertex
    }
    const n = p.length;
    if (n < 3) return polyline(pts) + (closed ? " Z" : "");
    const get = (i: number): Pt =>
        closed ? p[((i % n) + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    // curves carry ~3× the coordinates of a polyline, so round to 0.1px to keep
    // the (self-contained) SVG from ballooning.
    const r1 = (v: number) => Math.round(v * 10) / 10;
    let d = `M ${r1(p[0][0])} ${r1(p[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const p0 = get(i - 1);
        const p1 = get(i);
        const p2 = get(i + 1);
        const p3 = get(i + 2);
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C ${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    if (closed) d += " Z";
    return d;
}

export function el(
    tag: string,
    a: Record<string, string | number | undefined>,
    children?: string
): string {
    const at = attrs(a);
    if (children === undefined) return `<${tag} ${at} />`;
    return `<${tag} ${at}>${children}</${tag}>`;
}

/** A <text> with letter-spacing + optional stroke halo for legibility. */
export function text(
    x: number,
    y: number,
    content: string,
    opts: {
        size: number;
        fill: string;
        family: string;
        tracking?: number;
        weight?: number | string;
        anchor?: "start" | "middle" | "end";
        italic?: boolean;
        halo?: string;
        haloWidth?: number;
        haloId?: string;
        rotate?: number;
        opacity?: number;
        transform?: string;
    }
): string {
    const t =
        opts.transform ??
        (opts.rotate ? `rotate(${round(opts.rotate)} ${round(x)} ${round(y)})` : undefined);
    const base = {
        x,
        y,
        "font-family": opts.family,
        "font-size": opts.size,
        "letter-spacing": opts.tracking ?? 0,
        "text-anchor": opts.anchor ?? "middle",
        "font-weight": opts.weight ?? 400,
        "font-style": opts.italic ? "italic" : "normal",
        transform: t,
        opacity: opts.opacity,
    };
    let out = "";
    // A soft, blurred halo via an SVG filter (Firefox-supported: feMorphology +
    // feGaussianBlur + feFlood). The filter renders the halo AND the crisp text
    // in one element, so the outline genuinely fades outward.
    if (opts.halo && opts.haloId) {
        return out + el("text", { ...base, fill: opts.fill, filter: `url(#${opts.haloId})` }, esc(content));
    }
    if (opts.halo) {
        // fallback (no filter id supplied): a single soft translucent stroke
        out += el(
            "text",
            {
                ...base,
                fill: "none",
                stroke: opts.halo,
                "stroke-width": opts.haloWidth ?? 3,
                "stroke-linejoin": "round",
                "stroke-opacity": 0.5,
                "paint-order": "stroke",
            },
            esc(content)
        );
    }
    out += el("text", { ...base, fill: opts.fill }, esc(content));
    return out;
}
