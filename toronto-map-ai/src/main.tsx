import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import "./index.css";

// Hash routing, not history routing: the build is relocatable (base "./"), so
// it has to work from a project-pages subpath, a custom domain or file:// alike,
// with no server-side rewrite rules available on GitHub Pages.
//
// Both routes are lazy so that neither pays for the other. That matters in one
// direction especially: the live renderer bundles ~6 MB of geojson, and
// /pre-rendered must never download it.
const DevMap = lazy(() => import("./routes/DevMap"));
const PreRendered = lazy(() => import("./routes/PreRendered"));

/**
 * Loopback hosts, where the map is being worked on rather than looked at.
 * Covers the IPv4/IPv6 spellings and the reserved `.localhost` suffix, since
 * those are the same machine by another name.
 */
function isLocalhost(): boolean {
    const host = window.location.hostname;
    return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "[::1]" ||
        host === "::1" ||
        host.endsWith(".localhost")
    );
}

/**
 * Where `/` lands.
 *
 * Deployed, that is the cheap pre-rendered view — most visitors are on a phone
 * and should not be handed a 3.5 MB bundle. Served from localhost it is the
 * live renderer instead, because that is the one being developed against and
 * the tiles are generated from it. Both remain reachable by their own path
 * either way.
 */
const DEFAULT_ROUTE = isLocalhost() ? "/svg" : "/pre-rendered";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HashRouter>
            <Suspense fallback={<div className="route-loading">Loading map…</div>}>
                <Routes>
                    <Route path="/" element={<Navigate to={DEFAULT_ROUTE} replace />} />
                    <Route path="/svg" element={<DevMap />} />
                    <Route path="/pre-rendered" element={<PreRendered />} />
                    <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
                </Routes>
            </Suspense>
        </HashRouter>
    </StrictMode>,
);
