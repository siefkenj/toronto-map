import type { MultiPolygon, Polygon } from "geojson";
import "./App.css";
import torontoLevel8 from "./assets/toronto-level-8.geojson.json";
import torontoLevel8Simp from "./assets/toronto-level-8-simp.geojson.json";
import torontoLevel10 from "./assets/toronto-level-10.geojson.json";
import React from "react";
import {
    Mat,
    findBoundingBox,
    pointInPolygon,
    simpleCenter,
} from "./utils/geometry";
import { makeTitleBreakable } from "./utils/text";
import { Text } from "./utils/svg-text";
import * as chroma from "chroma.ts";
import { lakeOntario, rivers } from "./water";
import { LABELS_NUDGE } from "./utils/labels-nudge";

const YORK_COLOR = chroma.color("efb8e0").set("hsl.h", (x) => x - 20);

const REGION_TO_COLOR: Record<string, chroma.Color> = {
    Toronto: chroma.color("88e0e3").set("hsl.h", (x) => x - 30),
    Scarborough: chroma.color("a0cbe2"),
    Etobicoke: chroma.color("ffe998"),
    York: YORK_COLOR,
    "East York": YORK_COLOR,
    "North York": YORK_COLOR,
};

const TORONTO_BOUNDS = {
    north: 43.9,
    south: 43.53,
    east: -79.1,
    west: -79.62,
} as const;

// Calculate width and height in degrees
const width = TORONTO_BOUNDS.east - TORONTO_BOUNDS.west;
const height = TORONTO_BOUNDS.north - TORONTO_BOUNDS.south;

const pixH = 1080;
const pixW = 1920;
const longScale = 81; // Every degree of longitude is about 81 km at this latitude
const latScale = 111; // Every degree of latitude is about 111 km
const cityRot = 16; // Rotate away from true north by 14 degrees
const zoom = pixW / (width * longScale) / 1.3;

const mapTransform = `translate(50 ${pixH}) scale(${zoom}) rotate(${cityRot}) scale(${longScale} ${-latScale}) translate(${-TORONTO_BOUNDS.west} ${-TORONTO_BOUNDS.south})`;
const matTransform = Mat.translate(-TORONTO_BOUNDS.west, -TORONTO_BOUNDS.south)
    .scale(longScale, -latScale)
    .rotate(cityRot)
    .scale(zoom, zoom)
    .translate(80, pixH);
const mapInverseTransform = `translate(${TORONTO_BOUNDS.west} ${
    TORONTO_BOUNDS.south
}) scale(${1 / longScale} ${1 / -latScale}) rotate(${-cityRot}) scale(${
    1 / zoom
}) translate(${-50} ${-pixH})`;
const mapPartialInverseTransform = `scale(${1 / longScale} ${
    1 / -latScale
}) rotate(${-cityRot}) scale(${1 / zoom}) translate(${-50} ${-pixH})`;

/**
 * Convert longitude/latitude bounding box to pixel size.
 * @param param0
 * @returns
 */
function bbToPixelSize({
    longDeg,
    latDeg,
}: {
    longDeg: number;
    latDeg: number;
}) {
    const longPix = longDeg * longScale * zoom;
    const latPix = latDeg * latScale * zoom;
    return { width: longPix, height: latPix };
}

function App() {
    const svgRef = React.useRef<SVGSVGElement>(null);

    React.useEffect(() => {
        if (svgRef.current) {
        }
    }, []);

    // console.log(torontoLevel10.features[0].geometry.coordinates);
    // Make all the neighborhoods and their labels
    const neighborhoods: React.ReactNode[] = [];
    const neighborhoodLabels: React.ReactNode[] = [];

    torontoLevel10.features.forEach((feature, i) => {
        if (
            feature.geometry.type !== "Polygon" &&
            feature.geometry.type !== "MultiPolygon"
        ) {
            return null;
        }
        const geometry = feature.geometry as Polygon | MultiPolygon;

        const [centerX, centerY] = simpleCenter(
            feature.geometry.coordinates as
                | Polygon["coordinates"]
                | MultiPolygon["coordinates"]
        );

        const title = feature.properties.name
            ? makeTitleBreakable(feature.properties.name)
            : "Unknown";

        const bb = findBoundingBox(geometry.coordinates);
        const { width: pixWidth, height: _pixHeight } = bbToPixelSize({
            longDeg: bb.east - bb.west,
            latDeg: bb.north - bb.south,
        });

        // Determine which level 8 region we're in
        const regionElm = torontoLevel8Simp.features.find((r) => {
            return (
                r.geometry.type === "Polygon" &&
                pointInPolygon(
                    [centerX, centerY],
                    (r.geometry as Polygon).coordinates
                )
            );
        });
        const region = regionElm?.properties?.name || "Toronto";
        const relLat = centerY - TORONTO_BOUNDS.south;
        const [pixCenterX, pixCenterY] = matTransform.apply([centerX, centerY]);

        neighborhoods.push(
            <Polygon
                key={i}
                polygonData={feature.geometry as Polygon | MultiPolygon}
                mat={matTransform}
                fill={
                    "" +
                    REGION_TO_COLOR[region]
                        .set("hsv.h", (x) => x + 380 * relLat)
                        .darker(relLat * 2)
                        .desaturate(0.0)
                }
                stroke="white"
                strokeWidth={1}
            />
        );
        neighborhoodLabels.push(
            <g
                key={i}
                transform={`translate(${
                    pixCenterX + (LABELS_NUDGE[i]?.[0] || 0)
                } ${pixCenterY + (LABELS_NUDGE[i]?.[1] || 0)})`}
            >
                <Text
                    width={pixWidth + 55}
                    textAnchor="middle"
                    className="neighbourhood-label"
                    //fill="red"
                >
                    {title}
                </Text>
            </g>
        );
    });

    return (
        <div>
            <svg
                width={pixW}
                height={pixH}
                //viewBox={`-100 -100 ${pixW + 100} ${pixH + 300}`}
                style={{ background: "#eef" }}
                ref={svgRef}
            >
                <pattern
                    id="diagonalHatch"
                    patternUnits="userSpaceOnUse"
                    width="4"
                    height="4"
                >
                    <path
                        d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
                        style={{ stroke: "#8bc", strokeWidth: 1.5 }}
                    ></path>
                </pattern>
                {neighborhoods}
                {rivers.map((river, i) => (
                    <Polygon
                        key={i}
                        polygonData={river.geometry as Polygon | MultiPolygon}
                        mat={matTransform}
                        fill="var(--color-river-fill, #8bc)"
                        stroke="var(--color-river-border, #09f)"
                        strokeWidth={0.5}
                    />
                ))}
                <Polygon
                    polygonData={lakeOntario.geometry as Polygon}
                    stroke="none"
                    fill="#f5fbff"
                    mat={matTransform}
                />
                <Polygon
                    polygonData={lakeOntario.geometry as Polygon}
                    stroke="white"
                    strokeWidth={0.5}
                    fill="url(#diagonalHatch)"
                    mat={matTransform}
                />
                {neighborhoodLabels}
                <DrawBorderBounds />
            </svg>
        </div>
    );
}

export default App;

function Polygon({
    polygonData,
    mat,
    ...rest
}: {
    polygonData: Polygon | MultiPolygon;
    /**
     * Optional transformation matrix to apply to the points.
     */
    mat?: Mat;
} & React.SVGProps<SVGPolygonElement>) {
    if (polygonData.type === "MultiPolygon") {
        return polygonData.coordinates.map((subPoly, j) => (
            <Polygon
                key={`${j}`}
                polygonData={{ type: "Polygon", coordinates: subPoly }}
                mat={mat}
                {...rest}
            />
        ));
    }
    // Trace an SVG curve through the polygon coordinates
    return polygonData.coordinates.map((poly, i) => {
        if (Array.isArray(poly[0][0])) {
            throw new Error(
                "Nested arrays found in polygon coordinates, expected flat array."
            );
        }
        if (mat) {
            poly = mat.apply(poly);
        }
        return (
            <path
                key={i}
                {...rest}
                d={poly
                    .map(([x, y], i) =>
                        i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
                    )
                    .join(" ")}
            />
        );
    });
}

/**
 * Draw longitude and latitude lines every 0.1 degrees
 * within the Toronto bounding box.
 */
function DrawBorderBounds() {
    const STEP = 0.05; // Step size in degrees
    const longCoords = Array.from(
        {
            length:
                Math.ceil((TORONTO_BOUNDS.east - TORONTO_BOUNDS.west) / STEP) +
                1,
        },
        (_, i) => TORONTO_BOUNDS.west + i * STEP
    );
    const latCoords = Array.from(
        {
            length:
                Math.ceil(
                    (TORONTO_BOUNDS.north - TORONTO_BOUNDS.south) / STEP
                ) + 1,
        },
        (_, i) => TORONTO_BOUNDS.south + i * STEP
    );

    return (
        <g>
            {longCoords.map((x) => {
                const [startX, startY] = matTransform.apply([
                    x,
                    TORONTO_BOUNDS.south,
                ]);
                const [endX, endY] = matTransform.apply([
                    x,
                    TORONTO_BOUNDS.north,
                ]);
                // Return a labeled line for each longitude

                return (
                    <React.Fragment key={x}>
                        <line
                            key={`long-${x}`}
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="gray"
                            strokeWidth={0.5}
                        />
                        <text
                            x={startX}
                            y={startY}
                            textAnchor="middle"
                            fill="gray"
                        >
                            {x.toFixed(2)}°
                        </text>
                    </React.Fragment>
                );
            })}
            {latCoords.map((y) => {
                const [startX, startY] = matTransform.apply([
                    TORONTO_BOUNDS.west,
                    y,
                ]);
                const [endX, endY] = matTransform.apply([
                    TORONTO_BOUNDS.east,
                    y,
                ]);
                return (
                    <React.Fragment key={y}>
                        <line
                            key={`lat-${y}`}
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="gray"
                            strokeWidth={0.5}
                        />
                        <text
                            x={startX}
                            y={startY}
                            textAnchor="end"
                            fill="gray"
                        >
                            {y.toFixed(2)}°
                        </text>
                    </React.Fragment>
                );
            })}
        </g>
    );
}
