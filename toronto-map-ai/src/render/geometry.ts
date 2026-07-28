import type { MultiPolygon, Polygon, Position } from "geojson";

/**
 * Compute the bounding box of a polygon region.
 */
export function findBoundingBox(
    coords: Polygon["coordinates"] | MultiPolygon["coordinates"]
): {
    west: number;
    east: number;
    south: number;
    north: number;
} {
    const _coords = normalizePolygonOrMultiPolygon(coords);

    let west = Infinity;
    let east = -Infinity;
    let south = Infinity;
    let north = -Infinity;

    for (const ring of _coords) {
        for (const [x, y] of ring) {
            if (x < west) west = x;
            if (x > east) east = x;
            if (y < south) south = y;
            if (y > north) north = y;
        }
    }

    return { west, east, south, north };
}

/**
 * Naively compute the center of a polygon region by finding the center of its bounding box.
 */
export function simpleCenter(
    coords: Polygon["coordinates"] | MultiPolygon["coordinates"]
): [number, number] {
    const { west, east, south, north } = findBoundingBox(coords);
    const centerX = (west + east) / 2;
    const centerY = (south + north) / 2;
    return [centerX, centerY];
}

/**
 * Determine if `point` is inside `polygon`.
 */
export function pointInPolygon(
    point: [number, number],
    polygon: Polygon["coordinates"]
): boolean {
    const [x, y] = point;
    let inside = false;

    for (const ring of polygon) {
        let j = ring.length - 1;
        for (let i = 0; i < ring.length; i++) {
            const xi = ring[i][0];
            const yi = ring[i][1];
            const xj = ring[j][0];
            const yj = ring[j][1];

            const intersect =
                yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

            if (intersect) {
                inside = !inside;
            }

            j = i;
        }
    }

    return inside;
}

/**
 * Turn a multi-polygon coordinates into polygon coordinates.
 * Polygon coordinates are left alone.
 */
export function normalizePolygonOrMultiPolygon(
    coords: Polygon["coordinates"] | MultiPolygon["coordinates"]
): Polygon["coordinates"] {
    // If we are a multi-polygon, stuff all the coordinates together.
    if (
        coords.length > 0 &&
        coords?.[0]?.length > 0 &&
        coords?.[0]?.[0]?.length > 0 &&
        Array.isArray((coords as MultiPolygon["coordinates"])[0][0][0])
    ) {
        const multiPolygonCoords = coords as MultiPolygon["coordinates"];
        return multiPolygonCoords.flat(1) as Polygon["coordinates"];
    } else {
        return coords as Polygon["coordinates"];
    }
}

/**
 * Transform the coordinates by multiplying `[x, y, 1]` by the matrix.
 * ```
 * [ a b c ]
 * [ d e f ]
 * [ 0 0 1 ]
 * ```
 * Only `a`, `b`, `c`, `d`, `e`, and `f` are entered (either as a 2x3 matrix or a 6 element list).
 */
export function transformCoords<
    T extends Position | Position[] | Position[][] | Position[][][]
>(coords: T, mat: number[] | number[][]): T {
    if (mat.length === 0) {
        throw new Error("Transformation matrix cannot be empty.");
    }
    const _mat = mat.flat();
    if (_mat.length !== 6) {
        throw new Error(
            "Transformation matrix must be 2x3 or a 6 element list."
        );
    }
    if (coords.length === 0) {
        return coords; // No transformation needed for empty coordinates
    }
    if (isPosition(coords)) {
        return transformPosition(coords, _mat) as T;
    }
    // If we have a nested array, we need to recursively transform each position.
    return coords.map((coord) => transformCoords(coord, _mat)) as T;
}

/**
 * Multiply a `Position` by a transformation matrix.
 */
function transformPosition(pos: Position, mat: number[]): Position {
    if (mat.length !== 6) {
        throw new Error("Transformation matrix must be a 6 element list.");
    }
    const [a, b, c, d, e, f] = mat;
    const [x, y] = pos;
    return [a * x + b * y + c, d * x + e * y + f];
}

function isPosition(pos: any): pos is Position {
    return (
        Array.isArray(pos) &&
        pos.length === 2 &&
        typeof pos[0] === "number" &&
        typeof pos[1] === "number"
    );
}

/**
 * Transformation matrix class.
 *
 * The matrices are stored as
 * ```
 * [ a b c ]
 * [ d e f ]
 * [ 0 0 1 ]
 * ```
 * Only `a`, `b`, `c`, `d`, `e`, and `f` are entered (as a 6 element list).
 */
export class Mat extends Array<number> {
    constructor(...args: number[]) {
        super(...args);
        if (args.length !== 6) {
            throw new Error("Matrix must have 6 elements.");
        }
        Object.setPrototypeOf(this, Mat.prototype);
    }
    toString() {
        return `Mat(${this.join(", ")})`;
    }
    toArray() {
        return Array.from(this);
    }
    mul(other: Mat | number[]): Mat {
        if (other.length !== 6) {
            throw new Error("Matrix must have 6 elements.");
        }
        const [a, b, c, d, e, f] = this;
        const [o1, o2, o3, o4, o5, o6] = other;
        return new Mat(
            a * o1 + b * o4,
            a * o2 + b * o5,
            a * o3 + b * o6 + c,
            d * o1 + e * o4,
            d * o2 + e * o5,
            d * o3 + e * o6 + f
        );
    }
    static translate(x: number, y: number): Mat {
        return new Mat(1, 0, x, 0, 1, y);
    }
    translate(x: number, y: number): Mat {
        return Mat.translate(x, y).mul(this);
    }
    static scale(x: number, y: number): Mat {
        return new Mat(x, 0, 0, 0, y, 0);
    }
    scale(x: number, y: number): Mat {
        return Mat.scale(x, y).mul(this);
    }
    static rotate(angle: number): Mat {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return new Mat(cos, -sin, 0, sin, cos, 0);
    }
    rotate(angle: number): Mat {
        return Mat.rotate(angle).mul(this);
    }
    apply<T extends Position | Position[] | Position[][]>(coords: T): T {
        return transformCoords(coords, this.toArray());
    }
}

//window.Mat = Mat; // For debugging purposes
