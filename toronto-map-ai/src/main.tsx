import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import svgPanZoom from "svg-pan-zoom";
import "./index.css";
import { renderTorontoMap, defaultViewAnchor } from "./render/renderMap";
import { createTouchGestureHandler } from "./touchGestures";

// Render the self-contained SVG once (data + fonts are all embedded).
const svgMarkup = renderTorontoMap({inset: {width: 560}});

function App() {
    const holderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const holder = holderRef.current;
        const svg = holder?.querySelector<SVGSVGElement>("svg");
        if (!holder || !svg) return;

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
            zoomScaleSensitivity: 0.4,
            // svg-pan-zoom's own touch handling is single-finger only (no
            // pinch); this replaces it. See ./touchGestures.
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
                fitted = true;
            }
        };
        const ro = new ResizeObserver(onSize);
        ro.observe(holder);

        return () => {
            ro.disconnect();
            instance.destroy();
        };
    }, []);

    return (
        <div className="app">
            <header className="titlebar">
                City of Toronto — Historic Map
                <span className="hint">scroll or pinch to zoom · drag to pan · double-click to zoom in</span>
            </header>
            <div
                className="map-holder"
                ref={holderRef}
                // The renderer returns a self-contained SVG string; inject it as-is.
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
        </div>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
