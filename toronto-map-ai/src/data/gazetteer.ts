/**
 * The poster's index.
 *
 * The city heads the panel's side column — TORONTO and the BOROUGHS under it,
 * which carry no badge because they are not points to be found on the sheet but
 * the ground the numbered places stand on. The rest is two badged series, each
 * keyed by a badge drawn beside the name on the map:
 *
 *  - Landmarks, neighbourhoods and the indexed parks take one run of numbers,
 *    1…n, but each kind keeps its own block of that run in the order below, so
 *    a number still says which series a place belongs to and the panel reads as
 *    three lists rather than one shuffled one. Inside a block the order spirals
 *    outward from the CN Tower — see numberedSeries.
 *  - Surrounding municipalities take initials instead. They are a different
 *    kind of thing (places off the edge of the map, pointed at rather than
 *    drawn), a letter is self-evidently not part of the numbered run, and the
 *    initials are guessable, which a number in the seventies would not be.
 *
 * The blurbs come from ./descriptions — `short` when it exists, since the full
 * `text` sentences are written for reading rather than for a narrow column, and
 * `text` otherwise so a missing short form degrades instead of blanking the row.
 */
import { DESCRIPTIONS } from "./descriptions";
import { LANDMARKS, MUNICIPALITIES, NEIGHBOURHOODS, PARK_LABELS, type BadgeSide, type LonLat } from "./places";

export type GazetteerKind = "neighbourhood" | "landmark" | "park" | "municipality" | "borough";

export interface GazetteerEntry {
    /** what is set inside the badge: "17" for the numbered series, "MI" for towns */
    label: string;
    /** must match the `name` in ./places exactly — that is the join key */
    name: string;
    kind: GazetteerKind;
    /** parenthetical set after the name, before the gloss (towns: population) */
    note?: string;
    /** which side of the name on the MAP the badge sits on (see ./places) */
    side?: BadgeSide;
    /** one-line gloss for the panel */
    blurb: string;
}

function blurbFor(name: string): string {
    const d = DESCRIPTIONS[name];
    return d?.short ?? d?.text ?? "";
}

/** The parks that carry a dot and an index entry, in the order they are declared. */
export const INDEXED_PARKS = PARK_LABELS.filter((p) => p.indexed);

/** Great-circle distance between two [lon, lat] points, kilometres. */
function haversineKm(a: LonLat, b: LonLat): number {
    const R = 6371;
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(b[1] - a[1]);
    const dLon = rad(b[0] - a[0]);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial compass bearing a → b, degrees clockwise from true north. */
function bearingDeg(a: LonLat, b: LonLat): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLon = rad(b[0] - a[0]);
    const y = Math.sin(dLon) * Math.cos(rad(b[1]));
    const x =
        Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
        Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Widths of the first and last ring, in kilometres.
 *
 * The rings widen outward because the places do: the core packs dozens of them
 * into the first two kilometres, and past the old city they thin out to one
 * every few. Rings of one fixed width would either slice the core so finely that
 * the ordering is pure distance, or lump half the sheet into one ring.
 */
const RING_FIRST_KM = 0.2;
const RING_LAST_KM = 2;

/**
 * Outer radius of each ring, in kilometres, out to `maxKm`.
 *
 * Widths grow geometrically from RING_FIRST_KM, and the ratio is solved so the
 * outermost ring comes out at RING_LAST_KM rather than being fixed in advance —
 * so the ring scheme stretches to fit however far the farthest place happens to
 * be, instead of running out of rings or overshooting when that changes.
 */
function ringEdges(maxKm: number): number[] {
    const K = RING_LAST_KM / RING_FIRST_KM;
    // sum(first·rⁱ) = maxKm together with first·r^(n-1) = last gives r directly
    const denom = RING_FIRST_KM * K - maxKm;
    const r = denom < 0 ? (RING_FIRST_KM - maxKm) / denom : 1;
    const edges: number[] = [];
    let w = RING_FIRST_KM;
    let acc = 0;
    // the guard is a backstop against a pathological ratio, not a real bound
    while (acc < maxKm && edges.length < 500) {
        acc += Math.min(w, RING_LAST_KM);
        edges.push(acc);
        w *= r;
    }
    return edges;
}

/**
 * The kinds of the numbered run, and the order their blocks appear in — which is
 * the order of the badge colours: red, then the neighbourhood wash, then blue,
 * then green. Landmarks lead so the CN Tower, which the numbering spirals out
 * from, comes out as 1.
 */
const SERIES_ORDER: GazetteerKind[] = ["landmark", "neighbourhood", "park"];

/**
 * The numbered series: everything drawn inside the map frame.
 *
 * One run of numbers, but the kinds do not interleave — each takes a block of
 * the run, in SERIES_ORDER. Inside a block the order spirals out from the CN
 * Tower: places are sorted into rings around it (see ringEdges) and, within a
 * ring, taken clockwise from due west, so consecutive numbers are neighbours on
 * the sheet and a reader who has found one badge can guess where the next lies.
 * Bearings are true, not screen: the sheet is rotated to bring the street grid
 * square, and a reader asking "what is west of here" means the city's west
 * either way.
 *

 * Only the flagged parks are here: the map names many more green spaces than it
 * numbers, and a dot is a promise that the panel has something to say about the
 * place (see ParkLabel.indexed).
 */
function numberedSeries(): GazetteerEntry[] {
    const raw = [
        ...NEIGHBOURHOODS.map((d) => ({ d, kind: "neighbourhood" as GazetteerKind })),
        ...LANDMARKS.map((d) => ({ d, kind: "landmark" as GazetteerKind })),
        ...INDEXED_PARKS.map((d) => ({ d, kind: "park" as GazetteerKind })),
    ];
    const origin = LANDMARKS.find((d) => d.name === ORIGIN_NAME)?.at;
    if (!origin) throw new Error(`${ORIGIN_NAME} not found in LANDMARKS — it is the origin of the numbering`);

    const withGeom = raw.map((e) => ({ ...e, km: haversineKm(origin, e.d.at), bearing: bearingDeg(origin, e.d.at) }));
    // rings are measured over the whole set, so a ring means the same distance
    // from the tower in every block
    const edges = ringEdges(Math.max(...withGeom.map((e) => e.km)));
    const ringOf = (km: number) => {
        const i = edges.findIndex((edge) => km <= edge);
        return i < 0 ? edges.length : i;
    };
    // clockwise from due west: W → N → E → S, which is bearing 270 → 0 → 90 → 180
    const clockwise = (bearing: number) => (bearing - 270 + 360) % 360;

    const ordered = withGeom.sort((a, b) => {
        const ka = SERIES_ORDER.indexOf(a.kind);
        const kb = SERIES_ORDER.indexOf(b.kind);
        if (ka !== kb) return ka - kb;
        if (a.d.name === ORIGIN_NAME) return -1;
        if (b.d.name === ORIGIN_NAME) return 1;
        const ra = ringOf(a.km);
        const rb = ringOf(b.km);
        return ra !== rb ? ra - rb : clockwise(a.bearing) - clockwise(b.bearing);
    });

    return ordered.map((e, i) => ({
        label: String(i + 1),
        name: e.d.name,
        kind: e.kind,
        side: e.d.badge,
        blurb: blurbFor(e.d.name),
    }));
}

/** The place the numbering spirals out from, and so always number 1. */
const ORIGIN_NAME = "CN Tower";

export const GAZETTEER: GazetteerEntry[] = numberedSeries();

/**
 * Codes for the surrounding towns: the initial alone wherever that is
 * unambiguous, and a second letter only where several towns share one.
 *
 *   A — Ajax / Aurora        M — Mississauga / Markham / Milton
 *   B — Brampton / Burlington  O — Oakville / Oshawa
 *
 * Where a group has one member far larger than the rest, that one keeps the
 * bare initial and the others take two letters — so M is Mississauga, the
 * seventh-largest city in the country, and Markham and Milton read as MA and
 * MI. Hand-assigned rather than derived so the codes stay put if a town is ever
 * added: a rule that re-derives them would silently renumber the whole series.
 */
const TOWN_CODES: Record<string, string> = {
    Ajax: "AJ",
    Aurora: "AU",
    Brampton: "BR",
    Burlington: "BU",
    Caledon: "C",
    Georgetown: "G",
    "King City": "K",
    Mississauga: "M",
    Markham: "MA",
    Milton: "MI",
    Newmarket: "N",
    Oakville: "OA",
    Oshawa: "OS",
    Pickering: "P",
    "Richmond Hill": "R",
    Thornhill: "T",
    Vaughan: "V",
    Whitby: "W",
};

/**
 * The census the sheet's population figures are taken from. Printed as a
 * subheading rather than repeated on every line — every number in the panel is
 * a count from this census, so it is said once.
 *
 * The 2026 census went into the field on 4 May 2026, but no counts from it have
 * been published — in 2021 the first ones came nine months after collection —
 * so 2021 is still the current count. Re-check when they land.
 */
export const POPULATION_YEAR = 2021;

/**
 * Census counts, from Statistics Canada table 98-10-0002 (population and
 * dwelling counts by census subdivision, 2021 Census).
 *
 * Three of the eighteen are not municipalities and so are not in that table:
 *
 *  - Georgetown and King City are *population centres* — the built-up area
 *    rather than the township around it — taken from the 2021 Census
 *    Geographic Attribute File (92-151-X), where King City is filed under the
 *    name "King". Their townships are much larger than the villages the map
 *    points at: Halton Hills counts 62,951 and King Township 27,333, so the
 *    population-centre figure is the honest one for a dot on a map.
 *  - Thornhill has no figure at all. It was never incorporated, and the census
 *    counts it inside Vaughan and Markham, so any number for it would be a
 *    private estimate rather than a count. Its gloss says so instead.
 */
const TOWN_POPULATION: Record<string, number> = {
    Ajax: 126666,
    Aurora: 62057,
    Brampton: 656480,
    Burlington: 186948,
    Caledon: 76581,
    Georgetown: 44058,
    "King City": 8396,
    Markham: 338503,
    Milton: 132979,
    Mississauga: 717961,
    Newmarket: 87942,
    Oakville: 213759,
    Oshawa: 175383,
    Pickering: 99186,
    "Richmond Hill": 202022,
    Vaughan: 323103,
    Whitby: 138501,
};

/**
 * Populations set in thousands, which is all the precision a poster can carry:
 * three significant figures reads as an order of magnitude rather than as a
 * claim about how many people were home on census day. Under ten thousand a
 * decimal is kept, because "8k" and "9k" would flatten villages that differ by
 * half again; over a million it switches to M rather than print "2,794k".
 */
/**
 * The parenthetical a name carries in the panel. The panel sets it an em space
 * after the name (see NOTE_GAP_EM), which is what separates the two — the
 * brackets then mark it as an aside rather than part of the name.
 */
function popNote(n: number): string {
    return `(pop. ${popLabel(n)})`;
}

function popLabel(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    return `${(n / 1000).toFixed(1)}k`;
}

/**
 * The lettered series: the towns ringing the map, ordered by their code so a
 * reader who has spotted a circle on the sheet can run down the column to it.
 */
export const TOWNS: GazetteerEntry[] = MUNICIPALITIES.filter((m) => !m.unlisted).map((m) => ({
    label: TOWN_CODES[m.name] ?? m.name.slice(0, 2).toUpperCase(),
    name: m.name,
    kind: "municipality" as const,
    side: m.badge,
    note: TOWN_POPULATION[m.name] === undefined ? undefined : popNote(TOWN_POPULATION[m.name]),
    blurb: blurbFor(m.name),
})).sort((a, b) => a.label.localeCompare(b.label, "en"));

/**
 * The city itself, which heads the panel.
 *
 * Its population is the 2021 census count for the City of Toronto census
 * subdivision (StatCan 98-10-0002): 2,794,356.
 */
export const TORONTO: GazetteerEntry = {
    label: "",
    name: "Toronto",
    kind: "borough",
    note: popNote(2794356),
    blurb:
        "Canada’s largest city and its financial capital, and the fourth largest in North America. The city itself is " +
        "younger than most of the places named on this sheet: on 1 January 1998 the province dissolved Metropolitan " +
        "Toronto and fused its six municipalities into one, ten months after a referendum in which three quarters of " +
        "those who voted said no. The six are still how Torontonians say where they are.",
};

/**
 * The six municipalities amalgamated in 1998, still the everyday geography of
 * the city. They carry no badge: they are not points to be found on the map but
 * the ground everything else on it stands on.
 *
 * Populations are 2021 census counts, aggregated by scripts/borough_populations.py:
 * Statistics Canada's dissemination-block counts (92-151-X) assigned to the
 * City of Toronto's own former-municipality boundaries. Statistics Canada does
 * not publish the former cities as a geography and the City's community council
 * areas merge two pairs of them, so this is the join that answers the question
 * actually asked. The six sum to 2,794,356 — the published city total, to the
 * person — which is the check that the assignment lost nobody.
 *
 * Ordered largest to smallest, so the sub-list reads as the shape of the city.
 */
export const BOROUGHS: GazetteerEntry[] = [
    {
        label: "",
        name: "Old Toronto",
        kind: "borough",
        note: popNote(841236),
        blurb:
            "The pre-1998 city: the Humber east to Victoria Park, the lake north to Hogg’s Hollow. Downtown, the harbour and the streetcar wards — the most people of the six, and the fastest growing.",
    },
    {
        label: "",
        name: "North York",
        kind: "borough",
        note: popNote(683511),
        blurb:
            "Farm concessions until the war, then the towers of North York Centre: a downtown raised out in the suburbs by Mel Lastman over a quarter century as mayor.",
    },
    {
        label: "",
        name: "Scarborough",
        kind: "borough",
        note: popNote(630145),
        blurb:
            "Named by Elizabeth Simcoe in 1793 for bluffs that recalled Yorkshire. Postwar apartment slabs on a township grid, and now the region’s great arrival city.",
    },
    {
        label: "",
        name: "Etobicoke",
        kind: "borough",
        note: popNote(376237),
        blurb:
            "Wadoopikaang, “where the alders grow”, between the Humber and Etobicoke Creek: the lakeshore mill towns, postwar subdivisions, and Pearson.",
    },
    {
        label: "",
        name: "York",
        kind: "borough",
        note: popNote(146828),
        blurb:
            "What was left of the old township once the others had taken their share, and the least well-off of the six: Weston, Mount Dennis, Eglinton West.",
    },
    {
        label: "",
        name: "East York",
        kind: "borough",
        note: popNote(116399),
        blurb:
            "The last borough in Canada, which held the title until amalgamation rather than call itself a city. Brick semis, Leaside, and the east end of the Danforth.",
    },
];

const BY_NAME = new Map([...GAZETTEER, ...TOWNS].map((e) => [e.name, e]));

/** Index entry for a map label, or undefined if that feature isn't indexed. */
export function gazetteerEntry(name: string): GazetteerEntry | undefined {
    return BY_NAME.get(name);
}
