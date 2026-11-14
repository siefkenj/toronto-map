import type { Feature, Polygon } from "geojson";
import torontoWater from "./assets/toronto-water.geojson.json";

// Find Lake Ontario in the Toronto water data
export const lakeOntario = ((torontoWater as any).features as Feature[]).find(
    (feature) => feature.properties!.name === "Lake Ontario"
)!;

export const rivers = ((torontoWater as any).features as Feature[]).filter(
    (feature) => ["river", "canal"].includes(feature.properties!.water)
);

const maxCoords = Math.max(
    ...(lakeOntario.geometry as Polygon).coordinates.map((c) => c.length)
);
lakeOntario.geometry = {
    type: "Polygon",
    coordinates: (lakeOntario.geometry as Polygon).coordinates.filter(
        (c) => c.length === maxCoords
    ),
};
