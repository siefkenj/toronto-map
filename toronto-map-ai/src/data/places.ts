// Curated label data for the poster — the ★★★ ("essential") items from
// map-content-reference.md. Coordinates are [lon, lat] (WGS84).
//
// Kinds drive the visual hierarchy (font size / weight / style) in the renderer.

export type LonLat = [number, number];

export interface PlaceLabel {
    name: string;
    at: LonLat;
    /** optional manual pixel nudge applied after projection */
    nudge?: [number, number];
    /** optional priority override for the placement engine */
    priority?: number;
}

/** Informal super-districts — medium, wide-tracked capitals. (§1) */
export const SUPER_DISTRICTS: PlaceLabel[] = [
    { name: "MIDTOWN", at: [-79.398, 43.703] },
    { name: "UPTOWN", at: [-79.401, 43.745] },
    { name: "THE WATERFRONT", at: [-79.372, 43.638] },
    { name: "THE PORT LANDS", at: [-79.338, 43.651] },
];

/**
 * Colloquial / cultural neighbourhoods locals actually name (§2, ★★★).
 * The ethnic & commercial-strip names are the highest-value set for a visitor.
 */
export const NEIGHBOURHOODS: PlaceLabel[] = [
    // Ethnic & commercial strips
    { name: "Kensington Market", at: [-79.402, 43.654] },
    { name: "Chinatown", at: [-79.398, 43.653] },
    { name: "Greektown", at: [-79.349, 43.678] },
    { name: "Little India", at: [-79.322, 43.672] },
    { name: "Little Italy", at: [-79.415, 43.655] },
    { name: "Little Portugal", at: [-79.43, 43.65] },
    { name: "Corso Italia", at: [-79.446, 43.677] },
    { name: "Koreatown", at: [-79.418, 43.664] },
    { name: "Little Jamaica", at: [-79.445, 43.69] },
    // Downtown & core
    { name: "Yorkville", at: [-79.393, 43.671] },
    { name: "The Distillery District", at: [-79.359, 43.65] },
    { name: "Liberty Village", at: [-79.42, 43.638] },
    { name: "Cabbagetown", at: [-79.366, 43.667] },
    { name: "Regent Park", at: [-79.362, 43.66] },
    { name: "St. James Town", at: [-79.372, 43.669] },
    { name: "Corktown", at: [-79.361, 43.655] },
    { name: "Villiers Island", at: [-79.3535, 43.646], priority: 76 },
    { name: "The Annex", at: [-79.404, 43.668] },
    { name: "Trinity–Bellwoods", at: [-79.4137, 43.647] },
    { name: "Parkdale", at: [-79.437, 43.64] },
    // East end
    { name: "Tommy Thompson Park", at: [-79.325, 43.626] },
    { name: "Leslieville", at: [-79.334, 43.663] },
    { name: "Riverside", at: [-79.35, 43.659] },
    { name: "The Beaches", at: [-79.298, 43.671] },
    { name: "Leaside", at: [-79.366, 43.705] },
    { name: "The Danforth", at: [-79.345, 43.6795] },
    // North
    { name: "Don Mills", at: [-79.345, 43.735] },
    { name: "The Bridle Path", at: [-79.375, 43.735] },
    { name: "Hoggs Hollow", at: [-79.407, 43.744] },
    { name: "The Peanut", at: [-79.345, 43.784] },
    { name: "Forest Hill", at: [-79.414, 43.694] },
    { name: "Rosedale", at: [-79.383, 43.682] },
    // West
    { name: "The Junction", at: [-79.4674, 43.6659] },
    { name: "Bloor West Village", at: [-79.485, 43.649] },
    { name: "High Park", at: [-79.4638, 43.6465] },
    { name: "Swansea", at: [-79.484, 43.641] },
    { name: "The Kingsway", at: [-79.51, 43.648] },
    { name: "Mimico", at: [-79.499, 43.618] },
    { name: "New Toronto", at: [-79.505, 43.6] },
    { name: "Long Branch", at: [-79.5265, 43.596] },
    { name: "Mount Dennis", at: [-79.489, 43.687] },
    { name: "Weston", at: [-79.518, 43.7] },
    { name: "Jane and Finch", at: [-79.518, 43.757] },
    { name: "Rexdale", at: [-79.565, 43.72] },
    // Scarborough
    { name: "The Golden Mile", at: [-79.285, 43.73] },
    { name: "Malvern", at: [-79.223, 43.805] },
    { name: "Agincourt", at: [-79.29, 43.785] },
    { name: "Guildwood", at: [-79.192, 43.748] },
];

/** Landmarks: skyline icons + waterfront/islands (§6, ★★★). */
export interface Landmark extends PlaceLabel {
    /** short symbol category used for the marker glyph */
    kind: "icon" | "water";
    /** show only on the enlarged inset, not the (cluttered) big map */
    insetOnly?: boolean;
    /** draw no marker dot; place the name centred on the feature itself */
    centeredLabel?: boolean;
}

export const LANDMARKS: Landmark[] = [
    // Skyline icons
    { name: "CN Tower", at: [-79.3871, 43.6426], kind: "icon" },
    { name: "Rogers Centre", at: [-79.3894, 43.6416], kind: "icon", insetOnly: true },
    { name: "Scotiabank Arena", at: [-79.3791, 43.6435], kind: "icon", insetOnly: true },
    { name: "Ripley's Aquarium", at: [-79.3866, 43.6422], kind: "icon", insetOnly: true },
    { name: "City Hall & Nathan Phillips Sq.", at: [-79.3837, 43.653], kind: "icon", insetOnly: true },
    { name: "Old City Hall", at: [-79.3817, 43.6525], kind: "icon", insetOnly: true },
    { name: "Union Station", at: [-79.3804, 43.6453], kind: "icon" },
    { name: "Casa Loma", at: [-79.4094, 43.678], kind: "icon" },
    { name: "Royal Ontario Museum", at: [-79.3948, 43.6677], kind: "icon" },
    { name: "Art Gallery of Ontario", at: [-79.3925, 43.6536], kind: "icon", insetOnly: true },
    { name: "St. Lawrence Market", at: [-79.3716, 43.6487], kind: "icon", insetOnly: true },
    { name: "Eaton Centre", at: [-79.3807, 43.6544], kind: "icon", insetOnly: true },
    { name: "Sankofa Square", at: [-79.3804, 43.6559], kind: "icon", insetOnly: true },
    { name: "Queen's Park", at: [-79.3916, 43.6622], kind: "icon" },
    { name: "Hockey Hall of Fame", at: [-79.3777, 43.6473], kind: "icon", insetOnly: true },
    { name: "Fort York", at: [-79.4042, 43.6392], kind: "icon" },
    { name: "Exhibition Place", at: [-79.4156, 43.6335], kind: "icon" },
    { name: "Evergreen Brick Works", at: [-79.3647, 43.6843], kind: "icon" },
    // Waterfront & islands
    { name: "Toronto Islands", at: [-79.373, 43.6205], kind: "water" },
    { name: "Billy Bishop Airport", at: [-79.3945, 43.6289], kind: "water", centeredLabel: true },
    { name: "Harbourfront Centre", at: [-79.3819, 43.6388], kind: "water", insetOnly: true },
    { name: "Ontario Place", at: [-79.415, 43.628], kind: "water" },
    { name: "Sunnyside Beach", at: [-79.457, 43.6374], kind: "water" },
    { name: "Woodbine Beach", at: [-79.3071, 43.6618], kind: "water" },
];

/**
 * Surrounding municipalities (§5, ★★★ direction groups: West / North / East).
 * These sit far outside the city; the renderer clamps them to the map margin
 * and points a leader toward their true bearing — "nebulous blobs pointing out".
 */
export interface Municipality extends PlaceLabel {
    group: "West" | "North" | "East";
}

export const MUNICIPALITIES: Municipality[] = [
    // West (Peel / Halton)
    { name: "Mississauga", at: [-79.64, 43.59], group: "West", nudge: [100, 52] },
    { name: "Brampton", at: [-79.76, 43.73], group: "West" },
    { name: "Oakville", at: [-79.69, 43.47], group: "West" , nudge: [0, -254] },
    { name: "Burlington", at: [-79.8, 43.33], group: "West", nudge: [0, -324] },
    { name: "Milton", at: [-79.88, 43.51], group: "West" },
    { name: "Georgetown", at: [-79.92, 43.65], group: "West" },
    { name: "Caledon", at: [-79.73, 43.87], group: "West" },
    // North (York Region)
    { name: "Vaughan", at: [-79.51, 43.84], group: "North" },
    { name: "Thornhill", at: [-79.42, 43.81], group: "North" },
    { name: "Richmond Hill", at: [-79.44, 43.88], group: "North" },
    { name: "Aurora", at: [-79.47, 44.0], group: "North" },
    { name: "Newmarket", at: [-79.46, 44.06], group: "North" },
    { name: "King City", at: [-79.53, 43.93], group: "North" },
    // East (Durham)
    { name: "Pickering", at: [-79.09, 43.84], group: "East" },
    { name: "Ajax", at: [-79.02, 43.85], group: "East" },
    { name: "Whitby", at: [-78.94, 43.9], group: "East" },
    { name: "Oshawa", at: [-78.86, 43.9], group: "East" },
    { name: "Markham", at: [-79.26, 43.87], group: "East" },
];

/**
 * Passenger ferry routes from the Jack Layton Ferry Terminal to the Toronto
 * Islands — drawn as dotted lines. Each is a [from, to] pair of [lon, lat].
 */
export const FERRY_ROUTES: Array<[LonLat, LonLat]> = [
    [[-79.3756, 43.64], [-79.3785, 43.6238]], // → Centre Island dock
    [[-79.3756, 43.64], [-79.3517, 43.6234]], // → Ward's Island dock
    [[-79.3756, 43.64], [-79.3889, 43.6212]], // → Hanlan's Point dock
];

/** Major named rivers/creeks to label in italic along their course (§7). */
export const RIVER_LABELS: PlaceLabel[] = [
    { name: "Humber River", at: [-79.49, 43.69] },
    { name: "Don River", at: [-79.358, 43.7] },
    { name: "Rouge River", at: [-79.14, 43.82] },
    { name: "Highland Creek", at: [-79.19, 43.78] },
];
