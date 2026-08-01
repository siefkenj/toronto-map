import { useEffect, useRef } from "react";
import { Link } from "react-router";
import svgPanZoom from "svg-pan-zoom";
import { renderTorontoMap, defaultViewAnchor } from "../render/renderMap";
import { createTouchGestureHandler } from "../touchGestures";
import { CANONICAL_RENDER } from "../tilePyramid";

// Render the self-contained SVG once (data + fonts are all embedded).
//
// This is the live renderer, kept for development: everything downstream — the
// tile pyramid on /pre-rendered included — is generated from it. It is also the
// expensive one (~6 MB of geojson bundled, ~800 ms to render, ~7,300 paths left
// in the DOM), which is why this whole route sits behind a lazy import.
//
// CANONICAL_RENDER is shared with the tile generator on purpose: these options
// change the label layout and the inset, so the tiles are only a faithful copy
// of this view while both sides pass the same ones.
const svgMarkup = renderTorontoMap(CANONICAL_RENDER);

export default function DevMap() {
    const holderRef = useRef<HTMLDivElement>(null);
    // Where the view was when the last instance was torn down, so a hot update
    // does not throw you back to the opening position. Survives the update
    // because Fast Refresh keeps hook state across one.
    const viewRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return;

        // The markup is injected here rather than through React's
        // dangerouslySetInnerHTML, and that is load-bearing. React re-applies
        // that prop on every re-render — JSX builds a new {__html} object each
        // time, so it never compares equal to the last one — which tore out the
        // <svg> that svg-pan-zoom had wrapped and left the map frozen until a
        // reload. A hot update to the map code re-renders this component, so
        // that was every edit. Owning the node here keeps the two apart: React
        // renders an empty holder and never touches what is inside it.
        holder.innerHTML = svgMarkup;
        const svg = holder.querySelector<SVGSVGElement>("svg");
        if (!svg) return;

        // Fill the container; svg-pan-zoom drives the viewBox transform.
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");

        const instance = svgPanZoom(svg, {
            zoomEnabled: true,
            panEnabled: true,
            controlIconsEnabled: true,
            dblClickZoomEnabled: true,
            mouseWheelZoomEnabled: true,
            preventMouseEventsDefault: true,
            fit: true,
            center: true,
            // wide range so you can zoom way out to the whole poster AND way in
            minZoom: 0.02,
            maxZoom: 300,
            // Zoom travel per wheel notch. svg-pan-zoom's default is 0.2; this
            // covers the poster's wide zoom range in a reasonable number of
            // scrolls.
            zoomScaleSensitivity: 0.9,
            // svg-pan-zoom's own touch handling is single-finger only (no
            // pinch); this replaces it. See ../touchGestures.
            customEventsHandler: createTouchGestureHandler(),
        });

        // The flex container often has zero size on the first paint, which makes
        // the initial fit tiny ("zoomed way out"). Fit exactly once, as soon as the
        // holder actually has a size; on later resizes just update the viewport so
        // the user's current zoom/pan is preserved.
        let fitted = false;
        const onSize = () => {
            instance.resize();
            const { width, height } = holder.getBoundingClientRect();
            if (!fitted && width > 0 && height > 0) {
                instance.fit();
                instance.center();
                const saved = viewRef.current;
                if (saved) {
                    // coming back from a hot update: hold the view the edit was
                    // made from, which is the part of the map being worked on
                    instance.zoom(saved.zoom);
                    instance.pan(saved.pan);
                } else {
                    // Open zoomed in on the downtown core (rather than the geometric
                    // centre of the poster, which is empty north-Toronto suburbia).
                    const base = instance.getZoom();
                    instance.zoom(base * 5);
                    const sizes = instance.getSizes();
                    const rz = sizes.realZoom;
                    const a = defaultViewAnchor();
                    instance.pan({
                        x: sizes.width / 2 - a.x * rz,
                        y: sizes.height / 2 - a.y * rz,
                    });
                }
                fitted = true;
            }
        };
        const ro = new ResizeObserver(onSize);
        ro.observe(holder);

        return () => {
            ro.disconnect();
            // Guarded: an exception thrown out of a cleanup would leave the route
            // dead until a full reload, which is the failure this effect exists
            // to avoid in the first place.
            try {
                if (fitted) viewRef.current = { zoom: instance.getZoom(), pan: instance.getPan() };
            } catch {
                // instance unusable; open at the default view next time
            }
            try {
                instance.destroy();
            } catch {
                // nothing left to detach from
            }
            holder.innerHTML = "";
        };
        // Re-runs only when the markup itself differs — an edit that changes the
        // map. Edits that leave the output identical (a comment, a rename)
        // re-render the component but leave the SVG and the pan/zoom instance
        // exactly as they were, so the view does not even flicker.
    }, [svgMarkup]);

    return (
        <div className="app">
            <header className="titlebar">
                City of Toronto — Historic Map
                <span className="hint">
                    scroll or pinch to zoom · drag to pan · double-click to zoom in
                </span>
                <Link className="route-link" to="/pre-rendered">
                    pre-rendered view →
                </Link>
            </header>
            {/* Filled by the effect above, which owns everything inside it. */}
            <div className="map-holder svg-map" ref={holderRef} />
        </div>
    );
}
