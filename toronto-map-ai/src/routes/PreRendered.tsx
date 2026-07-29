import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OVERZOOM_LEVELS, TILE_DIR, type TileManifest } from "../tilePyramid";

/**
 * The lightweight view: a pre-rendered raster pyramid served as static tiles,
 * driven by Leaflet.
 *
 * Nothing about the map's geography reaches this component. The poster is
 * treated as a flat image — Leaflet runs on CRS.Simple, whose coordinates are
 * just pixels of the base-level render, so the 16-degree rotation baked into
 * the projection is simply part of the picture. No reprojection, no lat/lng.
 *
 * Cost, versus the live renderer on `/`: a handful of ~10 KB tiles instead of a
 * 3.5 MB bundle, and no vector re-rasterization on pan/zoom.
 */

const ATTRIBUTION =
    'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL)';

/** How far past the fitted view to open, matching the live map's 5x. */
const OPENING_ZOOM_OFFSET = Math.log2(5);

export default function PreRendered() {
    const holderRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return;

        let map: L.Map | null = null;
        let cancelled = false;

        const base = import.meta.env.BASE_URL;

        (async () => {
            let manifest: TileManifest;
            try {
                const res = await fetch(`${base}${TILE_DIR}/manifest.json`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                manifest = (await res.json()) as TileManifest;
            } catch (cause) {
                if (!cancelled) {
                    setError(
                        `Could not load the tile manifest (${cause instanceof Error ? cause.message : cause}). ` +
                            `Generate the pyramid with \`npm run prerender\`.`,
                    );
                }
                return;
            }
            if (cancelled || !holderRef.current) return;

            const { baseWidth, baseHeight, tileSize, maxNativeZoom, anchor } = manifest;

            map = L.map(holder, {
                crs: L.CRS.Simple,
                // Widened below once we know the zoom that fits the poster; the
                // container size is not known until Leaflet has measured it.
                minZoom: -8,
                maxZoom: maxNativeZoom + OVERZOOM_LEVELS,
                // Fractional zoom, so pinch and trackpad gestures stay smooth
                // instead of snapping to integer levels.
                zoomSnap: 0,
                zoomDelta: 0.8,
                // Wheel pixels per zoom level — LOWER is faster. Leaflet's
                // default is 60; the 100 this started at made scrolling crawl.
                // Going much below 50 pushes a single notch past 2 zoom levels,
                // which reads as a jump rather than a zoom.
                wheelPxPerZoomLevel: 50,
                attributionControl: true,
            });

            // CRS.Simple maps one unit to one pixel of the z0 render, with y
            // running upward — hence the flipped corners.
            const bounds = L.latLngBounds(
                map.unproject([0, baseHeight], 0),
                map.unproject([baseWidth, 0], 0),
            );

            L.tileLayer(`${base}${TILE_DIR}/{z}/{x}/{y}.webp`, {
                tileSize,
                bounds,
                noWrap: true,
                // Below z0 and above the deepest rendered level, Leaflet rescales
                // the nearest level it has rather than requesting tiles that were
                // never generated.
                minNativeZoom: 0,
                maxNativeZoom,
                minZoom: -8,
                maxZoom: maxNativeZoom + OVERZOOM_LEVELS,
                attribution: ATTRIBUTION,
                // The poster is opaque paper; no need to fade tiles over each other.
                updateWhenIdle: false,
                keepBuffer: 1,
            }).addTo(map);

            // Fit once to learn the zoom at which the whole poster is visible,
            // then forbid zooming out past it so the paper always fills the view.
            map.fitBounds(bounds, { animate: false });
            const fitZoom = map.getZoom();
            map.setMinZoom(fitZoom);
            map.setMaxBounds(bounds.pad(0.15));

            // Open on the downtown core, like the live map does.
            map.setView(
                map.unproject([anchor.x, anchor.y], 0),
                Math.min(fitZoom + OPENING_ZOOM_OFFSET, maxNativeZoom + OVERZOOM_LEVELS),
                { animate: false },
            );

            // The flex parent can still be settling on first paint.
            const ro = new ResizeObserver(() => map?.invalidateSize());
            ro.observe(holder);
            map.once("unload", () => ro.disconnect());
        })();

        return () => {
            cancelled = true;
            map?.remove();
        };
    }, []);

    return (
        <div className="app">
            <header className="titlebar">
                City of Toronto — Historic Map
                <span className="hint">pre-rendered tiles · pinch or scroll to zoom · drag to pan</span>
                <Link className="route-link" to="/svg">
                    ← live renderer
                </Link>
            </header>
            {error ? (
                <div className="map-holder map-error">{error}</div>
            ) : (
                <div className="map-holder" ref={holderRef} />
            )}
        </div>
    );
}
