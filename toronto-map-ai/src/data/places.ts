// Curated label data for the poster — the ★★★ ("essential") items from
// map-content-reference.md. Coordinates are [lon, lat] (WGS84).
//
// Kinds drive the visual hierarchy (font size / weight / style) in the renderer.

export type LonLat = [number, number];

/**
 * Which side of a name its index circle sits on. Every entry below carries one
 * explicitly so it can be moved per place — a circle that reads well to the left
 * of a name in open suburb often has nowhere to go downtown, and the right answer
 * is a judgement about that spot on the sheet rather than a rule.
 */
export type BadgeSide = "left" | "right" | "above" | "below";

export interface PlaceLabel {
    name: string;
    at: LonLat;
    /** where this place's index circle sits relative to its name */
    badge?: BadgeSide;
    /** optional manual pixel nudge applied after projection */
    nudge?: [number, number];
    /** optional priority override for the placement engine */
    priority?: number;
}

/** Informal super-districts — medium, wide-tracked capitals. (§1) */
export const SUPER_DISTRICTS: PlaceLabel[] = [
    { name: "MIDTOWN", at: [-79.398, 43.703] },
    { name: "UPTOWN", at: [-79.401, 43.745] },
    { name: "THE PORT LANDS", at: [-79.338, 43.651] },
];

/**
 * Colloquial / cultural neighbourhoods locals actually name (§2, ★★★).
 * The ethnic & commercial-strip names are the highest-value set for a visitor.
 */
export const NEIGHBOURHOODS: PlaceLabel[] = [
    // Ethnic & commercial strips
    { name: "Kensington Market", at: [-79.402, 43.654], badge: "above" },
    // Anchored at Spadina & Queen West, the south end of the strip, not at
    // Spadina & Dundas. The block around Dundas is spoken for — "OLD TORONTO"
    // reaches down over it and Kensington Market sits just below — so a label
    // anchored there is pushed a kilometre east, ending up over Queen & Bay.
    // Anchoring at the quiet end of the same strip lands the name on Chinatown.
    { name: "Chinatown", at: [-79.3963, 43.6489], badge: "left" },
    { name: "Greektown", at: [-79.349, 43.678], badge: "left" },
    { name: "Little India", at: [-79.322, 43.672], badge: "left" },
    { name: "Little Italy", at: [-79.415, 43.655], badge: "left" },
    { name: "Little Portugal", at: [-79.43, 43.65], badge: "left" },
    { name: "Corso Italia", at: [-79.446, 43.677], badge: "left" },
    { name: "Koreatown", at: [-79.418, 43.664], badge: "left" },
    { name: "Little Jamaica", at: [-79.445, 43.69], badge: "left" },
    // Downtown & core
    { name: "Yorkville", at: [-79.393, 43.671], badge: "left" },
    { name: "The Distillery District", at: [-79.359, 43.65], badge: "left" },
    { name: "Liberty Village", at: [-79.42, 43.638], badge: "left" },
    { name: "Cabbagetown", at: [-79.366, 43.667], badge: "left" },
    { name: "Regent Park", at: [-79.362, 43.66], badge: "left" },
    { name: "St. James Town", at: [-79.372, 43.669], badge: "left" },
    // Nudged south off Regent Park, and ranked above THE PORT LANDS: that
    // district label reaches over Corktown's own corner, and while it held the
    // ground Corktown could not pin, so the disc floated ~250 m north of the
    // neighbourhood onto Queen Street.
    { name: "Corktown", at: [-79.361, 43.6532], priority: 76, badge: "below" },
    { name: "Villiers Island", at: [-79.3535, 43.646], priority: 76, badge: "below" },
    { name: "The Annex", at: [-79.404, 43.668], badge: "left" },
    // Trinity–Bellwoods is not here: neighbourhood and park share a name and a
    // spot on the sheet, so they are carried once, as the park (see PARK_LABELS,
    // and High Park and Tommy Thompson, which collapse the same way).
    { name: "Parkdale", at: [-79.437, 43.64], badge: "left" },
    // East end
    { name: "Leslieville", at: [-79.334, 43.663], badge: "left" },
    { name: "Riverside", at: [-79.35, 43.659], badge: "left" },
    { name: "The Beaches", at: [-79.298, 43.671], badge: "below" },
    { name: "Leaside", at: [-79.366, 43.705], badge: "left" },
    { name: "The Danforth", at: [-79.345, 43.6795], badge: "left" },
    // North
    { name: "Don Mills", at: [-79.345, 43.735], badge: "left" },
    { name: "The Bridle Path", at: [-79.375, 43.735], badge: "left" },
    { name: "Hoggs Hollow", at: [-79.407, 43.744], badge: "left" },
    { name: "The Peanut", at: [-79.345, 43.784], badge: "left" },
    { name: "Forest Hill", at: [-79.414, 43.694], badge: "left" },
    { name: "Rosedale", at: [-79.383, 43.682], badge: "left" },
    // West
    { name: "The Junction", at: [-79.4674, 43.6659], badge: "left" },
    { name: "Bloor West Village", at: [-79.485, 43.649], badge: "left" },
    { name: "Swansea", at: [-79.484, 43.641], badge: "left" },
    { name: "The Kingsway", at: [-79.51, 43.648], badge: "left" },
    { name: "Mimico", at: [-79.499, 43.618], badge: "left" },
    { name: "New Toronto", at: [-79.505, 43.6], badge: "left" },
    { name: "Long Branch", at: [-79.5265, 43.596], badge: "left" },
    { name: "Mount Dennis", at: [-79.489, 43.687], badge: "left" },
    { name: "Weston", at: [-79.518, 43.7], badge: "left" },
    { name: "Jane and Finch", at: [-79.518, 43.757], badge: "left" },
    { name: "Rexdale", at: [-79.565, 43.72], badge: "left" },
    // Scarborough
    { name: "The Golden Mile", at: [-79.285, 43.73], badge: "left" },
    { name: "Malvern", at: [-79.223, 43.805], badge: "left" },
    { name: "Agincourt", at: [-79.29, 43.785], badge: "left" },
    { name: "Guildwood", at: [-79.192, 43.748], badge: "left" },
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
    { name: "CN Tower", at: [-79.3871, 43.6426], kind: "icon", badge: "left" },
    { name: "Rogers Centre", at: [-79.3894, 43.6416], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Scotiabank Arena", at: [-79.3791, 43.6435], kind: "icon", insetOnly: true, badge: "left" },
    { name: "City Hall & Nathan Phillips Sq.", at: [-79.3837, 43.653], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Old City Hall", at: [-79.3817, 43.6525], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Union Station", at: [-79.3804, 43.6453], kind: "icon", badge: "left" },
    { name: "Casa Loma", at: [-79.4094, 43.678], kind: "icon", badge: "left" },
    { name: "Royal Ontario Museum", at: [-79.3948, 43.6677], kind: "icon", badge: "left" },
    { name: "St. Lawrence Market", at: [-79.3716, 43.6487], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Eaton Centre", at: [-79.3807, 43.6544], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Sankofa Square (Yonge–Dundas)", at: [-79.3804, 43.6559], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Queen's Park", at: [-79.3916, 43.6622], kind: "icon", badge: "left" },
    { name: "Hockey Hall of Fame", at: [-79.3777, 43.6473], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Fort York", at: [-79.4042, 43.6392], kind: "icon", badge: "left" },
    { name: "Exhibition Place", at: [-79.4156, 43.6335], kind: "icon", badge: "left" },
    // Waterfront, but landmarks like any other: the sheet carries two badged
    // series, parks and landmarks, and a built attraction on the water is still
    // a built attraction. The beaches and the islands went to the parks.
    { name: "Billy Bishop Airport", at: [-79.3945, 43.6289], kind: "icon", centeredLabel: true, badge: "above" },
    { name: "Harbourfront Centre", at: [-79.3819, 43.6388], kind: "icon", insetOnly: true, badge: "left" },
    { name: "Ontario Place", at: [-79.415, 43.628], kind: "icon", badge: "left" },
];

/**
 * Surrounding municipalities (§5, ★★★ direction groups: West / North / East).
 * These sit far outside the city; the renderer clamps them to the map margin
 * and points a leader toward their true bearing — "nebulous blobs pointing out".
 */
export interface Municipality extends PlaceLabel {
    group: "West" | "North" | "East";
    /**
     * Name the town on the map but keep it out of the SURROUNDING TOWNS panel.
     * Used for the far cities, which are here to give the sheet its bearings
     * rather than to be looked up — and, having no panel entry, they are drawn
     * without an index letter, since that circle is a promise the panel keeps.
     */
    unlisted?: boolean;
}

// The hand nudges these once carried were measured against the old, much taller
// frame; the map is now cropped to the shoreline, so the packing engine's own
// placement along the shortened border is the correct one.
export const MUNICIPALITIES: Municipality[] = [
    // West (Peel / Halton)
    { name: "Mississauga", at: [-79.64, 43.59], group: "West", badge: "left" },
    { name: "Brampton", at: [-79.76, 43.73], group: "West", badge: "left" },
    { name: "Oakville", at: [-79.69, 43.47], group: "West", badge: "left" },
    { name: "Burlington", at: [-79.8, 43.33], group: "West", badge: "left" },
    { name: "Milton", at: [-79.88, 43.51], group: "West", badge: "left" },
    { name: "Georgetown", at: [-79.92, 43.65], group: "West", badge: "left" },
    { name: "Caledon", at: [-79.73, 43.87], group: "West", badge: "left" },
    // North (York Region)
    { name: "Vaughan", at: [-79.51, 43.84], group: "North", badge: "left" },
    { name: "Thornhill", at: [-79.42, 43.81], group: "North", badge: "left" },
    { name: "Richmond Hill", at: [-79.44, 43.88], group: "North", badge: "left" },
    { name: "Aurora", at: [-79.47, 44.0], group: "North", badge: "left" },
    { name: "Newmarket", at: [-79.46, 44.06], group: "North", badge: "left" },
    { name: "King City", at: [-79.53, 43.93], group: "North", badge: "left" },
    // East (Durham). Their discs sit on the RIGHT of the name: that is the side
    // their arrows leave from, so the number and its line read as one mark
    // rather than the arrow setting off from behind the word.
    { name: "Pickering", at: [-79.09, 43.84], group: "East", badge: "right" },
    { name: "Ajax", at: [-79.02, 43.85], group: "East", badge: "right" },
    { name: "Whitby", at: [-78.94, 43.9], group: "East", badge: "right" },
    { name: "Oshawa", at: [-78.86, 43.9], group: "East", badge: "right" },
    { name: "Markham", at: [-79.26, 43.87], group: "East", badge: "right" },
    // Beyond the commuter belt: named on the sheet for orientation, absent from
    // the panel (see `unlisted`). Kitchener-Waterloo is given at the midpoint of
    // the two downtowns, the pair being one place to a reader at this distance.
    // Anchored south of the two downtowns so its margin label clears the Pearson
    // diagram, which the true midpoint put it straight across.
    { name: "Kitchener–Waterloo", at: [-80.5065, 43.408], group: "West", unlisted: true },
    { name: "Ottawa", at: [-75.6972, 45.4215], group: "East", unlisted: true },
];

/**
 * Passenger ferry routes from the Jack Layton Ferry Terminal to the Toronto
 * Islands — drawn as dotted lines. Each is a [from, to] pair of [lon, lat].
 */
export const FERRY_ROUTES: Array<[LonLat, LonLat]> = [
    // Island ends are the OSM amenity=ferry_terminal docks, not the island
    // centres — the docks all sit on the harbour (north) shore, so aiming at
    // the landmass instead put these lines out in open water.
    [[-79.3751, 43.6402], [-79.3781, 43.6224]], // → Centre Island dock
    [[-79.3751, 43.6402], [-79.3578, 43.6314]], // → Ward's Island dock
    [[-79.3751, 43.6402], [-79.3891, 43.6279]], // → Hanlan's Point dock
];

/**
 * Big green spaces worth naming on the main map. The parks layer itself is
 * drawn from dissolved OSM polygons (which lose their names in the union), so
 * these label points are carried separately — each is the real centroid of the
 * OSM feature, and only parks whose centroid falls inside the map frame are
 * listed. Evergreen Brick Works is here rather than among the landmarks: what
 * the sheet marks is the restored brickworks, but it is green space and reads as
 * such. High Park and Tommy Thompson Park moved here from the neighbourhood list
 * for the same reason.
 */
export interface ParkLabel extends PlaceLabel {
    /**
     * Carries an index dot and an entry in the gazetteer, rather than only an
     * italic name on the green. Set for the parks a reader is likely to have
     * heard of — the ones that turn up in news and listings by name — since a
     * numbered dot is a promise that the panel says something worth reading
     * about the place. The rest are named on the map and left at that.
     */
    indexed?: boolean;
}

export const PARK_LABELS: ParkLabel[] = [
    // Scarborough / east
    { name: "Rouge National Urban Park", at: [-79.1711, 43.8464], indexed: true, priority: 58 },
    { name: "Toronto Zoo", at: [-79.1844, 43.8202], priority: 58 },
    { name: "Scarborough Bluffs", at: [-79.2320, 43.7060], indexed: true, priority: 58 },
    { name: "Morningside Park", at: [-79.2067, 43.7773], indexed: true, badge: "left" },
    { name: "East Point Park", at: [-79.1654, 43.7581] },
    { name: "Thomson Memorial Park", at: [-79.2526, 43.7597] },
    { name: "Milliken Park", at: [-79.2701, 43.8279] },
    // Downtown and the old city — the parks that carry the city's public life,
    // and the reason this list is not simply the largest green spaces.
    { name: "Christie Pits Park", at: [-79.4210, 43.6647], indexed: true, badge: "below" },
    { name: "Allan Gardens", at: [-79.3744, 43.6619], indexed: true, badge: "left", priority: 62 },
    // ranked over the neighbouring parks: with the discs pinned to their
    // features the Don valley got tight enough that Riverdale lost its name
    // and was left as a bare number.
    { name: "Riverdale Park", at: [-79.3561, 43.6700], indexed: true, priority: 61, badge: "left" },
    // The site, not the parkland: the City's Don Valley Brick Works Park is a
    // separate feature 270 m northwest. The point is the restored brickworks.
    { name: "Evergreen Brick Works", at: [-79.3647, 43.6843], indexed: true, badge: "left" },
    { name: "Dufferin Grove Park", at: [-79.4325, 43.6562], indexed: true, badge: "below" },
    // Named but not indexed: downtown has no room for another name here, and
    // taking it costs Union Station its own (the index check catches the trade).
    { name: "Corktown Common", at: [-79.3525, 43.6540] },
    { name: "Cherry Beach", at: [-79.3438, 43.6370], indexed: true, badge: "below" },
    // Beaches and the islands: green space you can walk in, so they read as
    // parks. These were a third, blue "waterfront" series until it was folded
    // into these two.
    { name: "Toronto Islands", at: [-79.373, 43.6205], indexed: true, badge: "left" },
    // anchored on the sand: the OSM node of that name is a bike dock set back
    // from the water, and with the disc pinned to its point the badge sat inland
    { name: "Hanlan's Point Beach", at: [-79.394, 43.6194], indexed: true, badge: "right" },
    { name: "Sunnyside Beach", at: [-79.457, 43.6374], indexed: true, badge: "left" },
    { name: "Woodbine Beach", at: [-79.3071, 43.6618], indexed: true, badge: "left" },
    // Each of these three is a neighbourhood name as well as a park; the sheet
    // carries it once, here, rather than twice with two numbers.
    { name: "Trinity Bellwoods Park", at: [-79.4148, 43.6477], indexed: true, badge: "right" },
    { name: "High Park", at: [-79.4638, 43.6465], indexed: true, badge: "left" },
    { name: "Tommy Thompson Park", at: [-79.3250, 43.6260], indexed: true, badge: "left" },
    // Don valley / midtown
    { name: "Sunnybrook Park", at: [-79.3679, 43.7240], indexed: true, badge: "left" },
    { name: "E. T. Seton Park", at: [-79.3405, 43.7079] },
    { name: "Taylor Creek Park", at: [-79.3146, 43.7012] },
    { name: "Edwards Gardens", at: [-79.3575, 43.7315], indexed: true, badge: "left" },
    { name: "Mount Pleasant Cemetery", at: [-79.3848, 43.6953] },
    { name: "Cedarvale Park", at: [-79.4229, 43.6905] },
    { name: "East Don Parkland", at: [-79.3787, 43.7957] },
    { name: "L'Amoreaux Park", at: [-79.3082, 43.8130] },
    // North York / west
    { name: "Earl Bales Park", at: [-79.4218, 43.7516] },
    { name: "G. Ross Lord Park", at: [-79.4603, 43.7810] },
    { name: "Downsview Park", at: [-79.4807, 43.7405], indexed: true, badge: "left" },
    { name: "Rowntree Mills Park", at: [-79.5774, 43.7535] },
    { name: "West Humber Parkland", at: [-79.5588, 43.7341] },
    { name: "Claireville Conservation Area", at: [-79.6604, 43.7560] },
    // Etobicoke / lakeshore
    { name: "Centennial Park", at: [-79.5910, 43.6517] },
    { name: "Colonel Samuel Smith Park", at: [-79.5134, 43.5911] },
    { name: "Marie Curtis Park", at: [-79.5428, 43.5832] },
    { name: "Ashbridges Bay Park", at: [-79.3092, 43.6577] },
];

/** Major named rivers/creeks to label in italic along their course (§7). */
export const RIVER_LABELS: PlaceLabel[] = [
    { name: "Humber River", at: [-79.49, 43.69] },
    { name: "Don River", at: [-79.358, 43.7] },
    { name: "Rouge River", at: [-79.14, 43.82] },
    { name: "Highland Creek", at: [-79.19, 43.78] },
];
