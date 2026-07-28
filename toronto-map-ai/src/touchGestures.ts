/**
 * Touch gesture support for svg-pan-zoom.
 *
 * The library ships touch listeners, but they only mirror the mouse ones:
 * `handleMouseDown`/`handleMouseMove` read `evt.touches[0]` and ignore the rest,
 * so a two-finger pinch does nothing. Worse, `preventMouseEventsDefault` calls
 * preventDefault on touchmove, which also suppresses the browser's own
 * pinch-to-zoom — leaving the gesture completely dead on mobile.
 *
 * Upstream's answer is to plug Hammer.js into the `customEventsHandler` hook.
 * This is that same hook, implemented against native touch events so we don't
 * take on a dependency for three gestures.
 *
 * Provides: one-finger drag to pan, two-finger pinch to zoom about the
 * midpoint (the midpoint itself drags the map, as in every other map app),
 * and double-tap to zoom in.
 */

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;
const DOUBLE_TAP_ZOOM = 2;

/** Built-in touch handling is replaced wholesale; the mouse handlers stay. */
const HALTED = ["touchstart", "touchend", "touchmove", "touchleave", "touchcancel"];

type ClientPoint = { x: number; y: number };

function centroid(touches: TouchList): ClientPoint {
    let x = 0;
    let y = 0;
    for (let i = 0; i < touches.length; i++) {
        x += touches[i].clientX;
        y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
}

/** Separation of the first two touches, in CSS pixels. */
function separation(touches: TouchList): number {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
    );
}

export function createTouchGestureHandler(): SvgPanZoom.CustomEventHandler {
    let svg: SVGSVGElement | null = null;
    let instance: SvgPanZoom.Instance | null = null;

    // Gesture state. `anchor` lives in the SVG's viewport coordinate system —
    // the space zoomAtPoint() and panBy() operate in. Pan/zoom transform an
    // inner <g>, never the root, so the client->viewport mapping stays put for
    // the life of a gesture.
    let anchor: ClientPoint | null = null;
    let lastSeparation = 0;
    let lastTapTime = 0;
    let lastTapPoint: ClientPoint | null = null;

    /** Client (CSS px) coordinates -> the SVG's viewport coordinate system. */
    const toViewport = (clientX: number, clientY: number): ClientPoint => {
        const ctm = svg?.getScreenCTM();
        if (!svg || !ctm) return { x: clientX, y: clientY };
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const mapped = point.matrixTransform(ctm.inverse());
        return { x: mapped.x, y: mapped.y };
    };

    // The +/-/reset buttons are ordinary SVG children, so their taps bubble to
    // us. Leaving those untouched lets the browser synthesize the click; the
    // stock handler preventDefault()s them into uselessness on touch devices.
    const isControlIcon = (target: EventTarget | null) =>
        target instanceof Element && target.closest("#svg-pan-zoom-controls") != null;

    const onTouchStart = (evt: TouchEvent) => {
        if (isControlIcon(evt.target)) return;
        evt.preventDefault();
        const touches = evt.touches;

        if (touches.length === 1) {
            const touch = touches[0];
            const tap = { x: touch.clientX, y: touch.clientY };
            const isDoubleTap =
                lastTapPoint != null &&
                evt.timeStamp - lastTapTime < DOUBLE_TAP_MS &&
                Math.hypot(tap.x - lastTapPoint.x, tap.y - lastTapPoint.y) <
                    DOUBLE_TAP_SLOP_PX;

            if (isDoubleTap) {
                instance?.zoomAtPointBy(DOUBLE_TAP_ZOOM, toViewport(tap.x, tap.y));
                lastTapPoint = null;
                anchor = null;
                return;
            }

            lastTapTime = evt.timeStamp;
            lastTapPoint = tap;
            anchor = toViewport(tap.x, tap.y);
            lastSeparation = 0;
            return;
        }

        // A second finger cancels any pending double-tap.
        lastTapPoint = null;
        const centre = centroid(touches);
        anchor = toViewport(centre.x, centre.y);
        lastSeparation = separation(touches);
    };

    const onTouchMove = (evt: TouchEvent) => {
        if (isControlIcon(evt.target)) return;
        evt.preventDefault();
        const touches = evt.touches;
        if (!instance || !anchor || touches.length === 0) return;

        if (touches.length === 1) {
            const here = toViewport(touches[0].clientX, touches[0].clientY);
            instance.panBy({ x: here.x - anchor.x, y: here.y - anchor.y });
            anchor = here;
            return;
        }

        const spread = separation(touches);
        const here = toViewport(centroid(touches).x, centroid(touches).y);

        // Scale about the midpoint, which pins it in place. Note zoomAtPointBy,
        // not zoomAtPoint — the latter treats its argument as an absolute zoom
        // level, so feeding it a per-frame ratio snaps the map to ~1x.
        if (lastSeparation > 0 && spread > 0) {
            instance.zoomAtPointBy(spread / lastSeparation, here);
        }
        // ...then follow the midpoint's own drift, so a pinch can pan too.
        instance.panBy({ x: here.x - anchor.x, y: here.y - anchor.y });

        anchor = here;
        lastSeparation = spread;
    };

    const onTouchEnd = (evt: TouchEvent) => {
        const touches = evt.touches;
        if (touches.length === 0) {
            anchor = null;
            lastSeparation = 0;
            return;
        }
        // Re-anchor on the fingers that remain, so lifting one of two doesn't
        // make the map jump by the old centroid's offset.
        const centre = centroid(touches);
        anchor = toViewport(centre.x, centre.y);
        lastSeparation = touches.length >= 2 ? separation(touches) : 0;
    };

    return {
        haltEventListeners: HALTED,

        init(options) {
            svg = options.svgElement;
            instance = options.instance;
            // Non-passive: these gestures are ours, and we preventDefault them.
            svg.addEventListener("touchstart", onTouchStart, { passive: false });
            svg.addEventListener("touchmove", onTouchMove, { passive: false });
            svg.addEventListener("touchend", onTouchEnd);
            svg.addEventListener("touchcancel", onTouchEnd);
        },

        destroy() {
            svg?.removeEventListener("touchstart", onTouchStart);
            svg?.removeEventListener("touchmove", onTouchMove);
            svg?.removeEventListener("touchend", onTouchEnd);
            svg?.removeEventListener("touchcancel", onTouchEnd);
            svg = null;
            instance = null;
        },
    };
}
