// Descriptive text for the named regions on the poster.
//
// `text` is condensed from the lead paragraph of each place's English Wikipedia
// article and stays close to it. `short` is the gloss the poster's gazetteer
// panel prints, and is written to a different brief: it says why the place
// matters, not merely where it is or what it is. Those are editorial syntheses
// drawn from the wider article rather than trims of the lead, so treat `article`
// as the starting point for checking them, not as a citation for every clause.
//
// Covers SUPER_DISTRICTS, NEIGHBOURHOODS, MUNICIPALITIES, LANDMARKS and
// RIVER_LABELS from ./places.ts — PARK_LABELS are deliberately not included.
// Keys are the exact `name` strings used there, so a lookup is direct; the
// names are unique across those five arrays.
//
// `article` is the article the text was drawn from, which is often not the same
// string as the map label (Wikipedia files "The Danforth" under "Danforth
// Avenue", and several map names are redirects into a broader article). Those
// cases are flagged with `viaRedirect`.

export interface PlaceDescription {
    /** English Wikipedia article title the blurb was condensed from */
    article: string;
    url: string;
    /** one-sentence blurb suitable for a caption or legend */
    text: string;
    /**
     * Compressed form for the poster's gazetteer panel, where each entry gets a
     * single line about 300 units wide. Present for everything the map numbers
     * (see ./gazetteer); `text` is the fallback for the rest.
     */
    short?: string;
    /** set when the map label is a redirect into, or a sub-topic of, `article` */
    viaRedirect?: boolean;
}

const W = "https://en.wikipedia.org/wiki/";

export const DESCRIPTIONS: Record<string, PlaceDescription> = {
    // ── Super-districts ────────────────────────────────────────────────────
    MIDTOWN: {
        article: "Midtown, Toronto",
        url: W + "Midtown,_Toronto",
        text: "The band of Old Toronto north of the downtown core, roughly St. Clair to Eglinton, centred on Yonge–Eglinton.",
    },
    UPTOWN: {
        article: "Uptown Toronto",
        url: W + "Uptown_Toronto",
        text: "A loosely defined area of Toronto lying north of Midtown.",
    },
    "THE PORT LANDS": {
        article: "Port Lands",
        url: W + "Port_Lands",
        text: "An industrial and recreational district southeast of downtown, built on the former Don River delta and Ashbridge's Bay.",
    },

    // ── Neighbourhoods: ethnic & commercial strips ─────────────────────────
    "Kensington Market": {
        article: "Kensington Market",
        url: W + "Kensington_Market",
        text: "A famously multicultural downtown neighbourhood with a partly outdoor market, designated a National Historic Site in 2006.",
        short: "A National Historic Site: the immigrant-run market that has absorbed wave after wave of newcomers and stayed defiantly free of chains.",
    },
    Chinatown: {
        article: "Chinatown, Toronto",
        url: W + "Chinatown,_Toronto",
        text: "A Chinese ethnic enclave in the downtown core, centred on Spadina Avenue and Dundas Street West.",
        short: "One of North America’s largest Chinatowns, built by those displaced when the first Chinatown was expropriated for New City Hall.",
    },
    Greektown: {
        article: "Greektown, Toronto",
        url: W + "Greektown,_Toronto",
        text: "A commercial-residential Greek enclave on Danforth Avenue, settled after the First World War and known for its restaurants.",
        short: "One of the largest Greek communities in North America, and the street that fills for the Taste of the Danforth each August.",
    },
    "Little India": {
        article: "Gerrard India Bazaar",
        url: W + "Gerrard_India_Bazaar",
        text: "The Gerrard India Bazaar, a commercial South Asian enclave on Gerrard Street East in Leslieville.",
        short: "The Gerrard India Bazaar, the largest South Asian marketplace in North America and the commercial heart of the region’s Tamil diaspora.",
        viaRedirect: true,
    },
    "Little Italy": {
        article: "Little Italy, Toronto",
        url: W + "Little_Italy,_Toronto",
        text: "A restaurant and bar strip along College Street West known for its Italian-Canadian businesses.",
        short: "The heart of postwar Italian Toronto, now a nightlife strip that still empties into the road whenever Italy plays.",
    },
    "Little Portugal": {
        article: "Little Portugal, Toronto",
        url: W + "Little_Portugal,_Toronto",
        text: "A mainly residential enclave west of downtown, with Portuguese businesses along Dundas Street West and College Street.",
        short: "Centre of one of the largest Portuguese communities outside Portugal, settled from the Azores from the 1950s onward.",
    },
    "Corso Italia": {
        article: "Corso Italia (Toronto)",
        url: W + "Corso_Italia_(Toronto)",
        text: "An Italian-Canadian neighbourhood on St. Clair Avenue West between Westmount and Lansdowne Avenues.",
        short: "The second Italian main street, settled as Little Italy overflowed north; still lined with cafés and social clubs.",
    },
    Koreatown: {
        article: "Koreatown, Toronto",
        url: W + "Koreatown,_Toronto",
        text: "A Korean enclave on Bloor Street between Christie and Bathurst, grown from 1970s immigration into Canada's largest Korean concentration.",
        short: "Canada’s largest concentration of Koreans, grown out of 1970s immigration into a strip of late-night restaurants and groceries.",
    },
    "Little Jamaica": {
        article: "Little Jamaica",
        url: W + "Little_Jamaica",
        text: "An Afro-Caribbean cultural hub along Eglinton Avenue West, recognized by the city for its heritage significance.",
        short: "Birthplace of Canadian reggae and of Caribbean business in the city; its shops were hit hard by a decade of Eglinton LRT works.",
    },

    // ── Neighbourhoods: downtown & core ────────────────────────────────────
    Yorkville: {
        article: "Yorkville, Toronto",
        url: W + "Yorkville,_Toronto",
        text: "A former village of 1830 annexed in 1883, now an upmarket retail and office district north of Bloor.",
        short: "A 1960s coffee-house scene that launched Joni Mitchell and Neil Young, since rebuilt as Canada’s most expensive retail strip.",
    },
    "The Distillery District": {
        article: "Distillery District",
        url: W + "Distillery_District",
        text: "Forty heritage buildings of the old Gooderham and Worts Distillery — North America's largest collection of Victorian industrial architecture.",
        short: "Once the largest distillery in the world, and now the best-preserved group of Victorian industrial buildings in North America.",
    },
    "Liberty Village": {
        article: "Liberty Village",
        url: W + "Liberty_Village",
        text: "A former industrial pocket between King Street West and the Gardiner, redeveloped into dense condos and offices.",
        short: "Named for the prisoners released from the jails that stood here; now the city’s densest cluster of tech and media firms.",
    },
    Cabbagetown: {
        article: "Cabbagetown, Toronto",
        url: W + "Cabbagetown,_Toronto",
        text: "A downtown neighbourhood billed as the largest continuous area of preserved Victorian housing in North America.",
        short: "The largest unbroken stretch of Victorian housing in North America, named for the cabbages Irish famine migrants grew out front.",
    },
    "Regent Park": {
        article: "Regent Park",
        url: W + "Regent_Park",
        text: "Canada's oldest and largest public housing project, built in the late 1940s and under redevelopment since 2005.",
        short: "Canada’s first and largest public housing project, now a twenty-year experiment in mixed-income rebuilding watched across the country.",
    },
    "St. James Town": {
        article: "St. James Town",
        url: W + "St._James_Town",
        text: "A high-rise neighbourhood in the northeast corner of downtown, between Jarvis and Parliament south of Bloor.",
        short: "The most densely populated neighbourhood in Canada — nineteen towers housing people from more than a hundred countries.",
    },
    Corktown: {
        article: "Corktown, Toronto",
        url: W + "Corktown,_Toronto",
        text: "An older residential area east of Parliament Street, its vacated industrial buildings now studios, shops and film space.",
        short: "Named for the Cork-born labourers who built the Don’s mills and bridges; the oldest surviving working-class quarter in the city.",
    },
    "Villiers Island": {
        article: "Ookwemin Minising",
        url: W + "Ookwemin_Minising",
        text: "A 40-hectare artificial island in the Port Lands, renamed Ookwemin Minising, bounded by the Keating Channel and the Don.",
        short: "Rising on the re-naturalised mouth of the Don, the largest flood-protection and land-making project in Toronto’s history.",
        viaRedirect: true,
    },
    "The Annex": {
        article: "The Annex",
        url: W + "The_Annex",
        text: "A Midtown neighbourhood between Bathurst and Avenue Road, running north from Bloor Street to Dupont.",
        short: "Where Jane Jacobs and her neighbours killed the Spadina Expressway in 1971 — a fight that changed how North American cities plan roads.",
    },
    Parkdale: {
        article: "Parkdale, Toronto",
        url: W + "Parkdale,_Toronto",
        text: "A former village west of downtown, running from Roncesvalles Avenue to Dufferin Street down to Lake Ontario.",
        short: "A grand lakeside suburb severed by the Gardiner, later home to the largest Tibetan community in North America.",
    },

    // ── Neighbourhoods: east end ───────────────────────────────────────────
    "Tommy Thompson Park": {
        article: "Leslie Street Spit",
        url: W + "Leslie_Street_Spit",
        text: "A five-kilometre human-made headland of lakefill, now a naturalized park and recognized Important Bird Area.",
        short: "An accidental wilderness — fifty years of construction rubble tipped into the lake, now an Important Bird Area of heron and tern colonies.",
        viaRedirect: true,
    },
    Leslieville: {
        article: "Leslieville",
        url: W + "Leslieville",
        text: "A neighbourhood east of the Don River, bounded by Gerrard Street, Eastern Avenue and Coxwell Avenue.",
        short: "Grown around George Leslie’s nurseries; a film-studio and brunch district that became shorthand for east-end gentrification.",
    },
    Riverside: {
        article: "Riverdale, Toronto",
        url: W + "Riverdale,_Toronto",
        text: "The Queen Street East strip immediately across the Don River, at the southwest corner of Riverdale.",
        short: "The Queen Street gateway to the east end, anchored by the restored Broadview Hotel and a run of Victorian storefronts.",
        viaRedirect: true,
    },
    "The Beaches": {
        article: "The Beaches, Toronto",
        url: W + "The_Beaches,_Toronto",
        text: "An east-end neighbourhood named for its four beaches on Lake Ontario, south of Kingston Road.",
        short: "Toronto’s summer resort since the 1890s, with a boardwalk, four beaches and the Olympic-sized Donald Summerville pools.",
    },
    Leaside: {
        article: "Leaside",
        url: W + "Leaside",
        text: "An affluent planned town of 1913 near Bayview and Eglinton, named for the 19th-century Lea family.",
        short: "A planned railway town laid out by the Canadian Northern in 1913, and now among the most sought-after addresses in the city.",
    },
    "The Danforth": {
        article: "Danforth Avenue",
        url: W + "Danforth_Avenue",
        text: "The east–west arterial continuing Bloor Street across the Prince Edward Viaduct, named for contractor Asa Danforth Jr.",
        short: "The high street the Prince Edward Viaduct created in 1918, opening the far side of the Don valley to development.",
        viaRedirect: true,
    },

    // ── Neighbourhoods: north ──────────────────────────────────────────────
    "Don Mills": {
        article: "Don Mills",
        url: W + "Don_Mills",
        text: "Canada's first planned satellite community, developed privately in the 1950s and 60s as a self-supporting “new town”.",
        short: "Canada’s first fully planned suburb, a 1950s model of neighbourhood units and greenbelts copied across the country.",
    },
    "The Bridle Path": {
        article: "Bridle Path, Toronto",
        url: W + "Bridle_Path,_Toronto",
        text: "“Millionaires' Row” — multimillion-dollar mansions on two- to four-acre lots, Canada's most affluent neighbourhood as of 2014.",
        short: "Canada’s wealthiest address, where two-acre lots and film-star mansions earned it the name Millionaires’ Row.",
    },
    "Hoggs Hollow": {
        article: "Hoggs Hollow",
        url: W + "Hoggs_Hollow",
        text: "A residential valley neighbourhood south of York Mills Road, through which the west branch of the Don flows.",
        short: "A mill village in a deep ravine, and the site of the 1960 disaster that forced Ontario to overhaul its workplace safety law.",
    },
    "The Peanut": {
        article: "Don Valley Village",
        url: W + "Don_Valley_Village#The_Peanut",
        text: "A pocket of Don Valley Village named for the peanut-shaped plot formed where Don Mills Road's lanes diverge.",
        short: "A rare piece of 1960s planning whimsy — an oval of divided roadway modelled on Queen’s Park, which became the district’s name.",
        viaRedirect: true,
    },
    "Forest Hill": {
        article: "Forest Hill, Toronto",
        url: W + "Forest_Hill,_Toronto",
        text: "A former village amalgamated in 1967, and one of Toronto's wealthiest neighbourhoods.",
        short: "A self-governing village until 1967, whose Upper Canada College and Holy Blossom Temple anchored the city’s Anglo and Jewish elites.",
    },
    Rosedale: {
        article: "Rosedale, Toronto",
        url: W + "Rosedale,_Toronto",
        text: "One of Toronto's oldest suburbs, named for the wild roses on the Jarvis estate and long its “old money” address.",
        short: "Toronto’s original garden suburb, laid out along the ravines in the 1860s and still its old-money enclave.",
    },

    // ── Neighbourhoods: west ───────────────────────────────────────────────
    "The Junction": {
        article: "The Junction",
        url: W + "The_Junction",
        text: "Named for the West Toronto Diamond rail crossing; an independent city until it was annexed in 1909.",
        short: "Named for its four-way rail crossing, and dry by local vote from 1904 until 1998 — which is what preserved its Victorian main street.",
    },
    "Bloor West Village": {
        article: "Bloor West Village",
        url: W + "Bloor_West_Village",
        text: "A shopping district of over 400 businesses on Bloor Street between South Kingsway and Ellis Park Road.",
        short: "The world’s first Business Improvement Area, invented here in 1970 and since copied by thousands of high streets.",
    },
    "High Park": {
        article: "High Park",
        url: W + "High_Park",
        text: "A 161-hectare municipal park opened in 1876, a third of it still rare oak savannah.",
        short: "Bequeathed to the city by John Howard in 1873 on condition it stay free to all, and holding a globally rare black-oak savannah.",
    },
    Swansea: {
        article: "Swansea, Toronto",
        url: W + "Swansea,_Toronto",
        text: "A former village between the Humber River and High Park, absorbed into Metropolitan Toronto in 1953.",
        short: "The last independent village in Toronto, holding out until 1967, wedged between the Humber River and High Park.",
    },
    "The Kingsway": {
        article: "The Kingsway, Toronto",
        url: W + "The_Kingsway,_Toronto",
        text: "An affluent Etobicoke neighbourhood, originally Kingsway Park, between Mimico Creek and the Humber River.",
        short: "A 1920s garden suburb of English-cottage houses, built to a single architectural code that still governs how it looks.",
    },
    Mimico: {
        article: "Mimico",
        url: W + "Mimico",
        text: "A lakeshore neighbourhood in southeast Etobicoke, an independent municipality from 1911 to 1967.",
        short: "Toronto’s first commuter suburb, grown around the 1855 Great Western Railway stop on the lakeshore.",
    },
    "New Toronto": {
        article: "New Toronto",
        url: W + "New_Toronto",
        text: "Founded in 1890 and planned as an industrial centre; an independent lakeshore town from 1913 to 1967.",
        short: "A company town planned in 1890 for heavy industry, whose Goodyear and Campbell Soup plants drew thousands of workers.",
    },
    "Long Branch": {
        article: "Long Branch, Toronto",
        url: W + "Long_Branch,_Toronto",
        text: "Toronto's southwestern corner, developed in the late 1800s as a lakeside summer resort.",
        short: "A Victorian summer resort of shoreline cottages, later a village that resisted amalgamation until 1967.",
    },
    "Mount Dennis": {
        article: "Mount Dennis",
        url: W + "Mount_Dennis",
        text: "An Eglinton Avenue neighbourhood on the Humber, long defined by Kodak Heights, Kodak's Canadian film plant.",
        short: "Built around Kodak Heights, whose 1917 film plant employed generations until it closed in 2005; now the Eglinton LRT’s western end.",
    },
    Weston: {
        article: "Weston, Toronto",
        url: W + "Weston,_Toronto",
        text: "A 19th-century village on the Humber, absorbed into the Borough of York in the late 1960s.",
        short: "A Humber mill town older than the suburbs that surround it, and one of the oldest surviving main streets in Toronto.",
    },
    "Jane and Finch": {
        article: "Jane and Finch",
        url: W + "Jane_and_Finch",
        text: "A North York neighbourhood at Jane Street and Finch Avenue West, covering Black Creek and Glenfield-Jane Heights.",
        short: "One of Canada’s most diverse and most stereotyped neighbourhoods, built as 1960s tower blocks with almost no transit.",
    },
    Rexdale: {
        article: "Rexdale",
        url: W + "Rexdale",
        text: "A post-war Etobicoke development north of Highway 401, centred on Rexdale Boulevard and Islington Avenue.",
        short: "A postwar subdivision named for its developer, Rex Heslop, and now the industrial, airport-facing edge of Etobicoke.",
    },

    // ── Neighbourhoods: Scarborough ────────────────────────────────────────
    "The Golden Mile": {
        article: "Golden Mile, Toronto",
        url: W + "Golden_Mile,_Toronto",
        text: "A commercial strip on Eglinton Avenue East that was one of Canada's first model industrial parks.",
        short: "Canada’s first planned industrial park, whose 1950s factory strip is now being rebuilt as high-rise Eglinton East.",
    },
    Malvern: {
        article: "Malvern, Toronto",
        url: W + "Malvern,_Toronto",
        text: "A neighbourhood of some 44,000 people in the city's northeast corner.",
        short: "A 1970s planned community of 44,000, and one of the most ethnically diverse neighbourhoods in the country.",
    },
    Agincourt: {
        article: "Agincourt, Toronto",
        url: W + "Agincourt,_Toronto",
        text: "A former village on Sheppard Avenue between Kennedy and Markham Roads, part of Scarborough until 1998.",
        short: "Named after the battle by a postmaster in 1858, and later home to the first Chinese shopping mall in North America.",
    },
    Guildwood: {
        article: "Guildwood",
        url: W + "Guildwood",
        text: "A residential village on the Scarborough Bluffs, south of Kingston Road.",
        short: "Built around the Guild Inn, whose grounds display salvaged façades and columns rescued from demolished Toronto buildings.",
    },

    // ── Municipalities: West (Peel / Halton) ───────────────────────────────
    Mississauga: {
        article: "Mississauga",
        url: W + "Mississauga",
        text: "Canada's seventh-largest municipality, on Lake Ontario's northwestern shore in Peel Region, with 717,961 residents in 2021.",
        short: "Canada’s seventh-largest city, grown from farm townships into a corporate hub and home to Pearson airport.",
    },
    Brampton: {
        article: "Brampton",
        url: W + "Brampton",
        text: "The seat of Peel Region and Canada's ninth most populous municipality, north of Mississauga.",
        short: "One of the fastest-growing cities in Canada, and the country’s largest South Asian-majority municipality.",
    },
    Oakville: {
        article: "Oakville, Ontario",
        url: W + "Oakville,_Ontario",
        text: "The seat of Halton Region and Ontario's largest town, with 213,759 residents in 2021.",
        short: "Ontario’s largest town: a Lake Ontario harbour village turned affluent commuter suburb, and home to Ford Canada.",
    },
    Burlington: {
        article: "Burlington, Ontario",
        url: W + "Burlington,_Ontario",
        text: "A city at the west end of Lake Ontario, founded 1874, bordering Hamilton at the head of the Golden Horseshoe.",
        short: "Guards the head of Lake Ontario where the Niagara Escarpment meets the water, and is repeatedly ranked among Canada’s best places to live.",
    },
    Milton: {
        article: "Milton, Ontario",
        url: W + "Milton,_Ontario",
        text: "A Halton Region town that was Canada's fastest-growing municipality between 2001 and 2011.",
        short: "Canada’s fastest-growing municipality through the 2000s, hemmed in between the Escarpment and the Greenbelt.",
    },
    Georgetown: {
        article: "Georgetown, Ontario",
        url: W + "Georgetown,_Ontario",
        text: "A community of 44,000 on the Credit River within Halton Hills, named for 1821 settler George Kennedy.",
        short: "A Credit River mill village within Halton Hills, kept semi-rural by the Greenbelt that surrounds it.",
    },
    Caledon: {
        article: "Caledon, Ontario",
        url: W + "Caledon,_Ontario",
        text: "A largely rural Peel Region town of hamlets and villages, named after the Roman name for Scotland.",
        short: "A largely rural town of hamlets on the Escarpment and the moraine, forming the green northern edge of the region.",
    },

    // ── Municipalities: North (York Region) ────────────────────────────────
    Vaughan: {
        article: "Vaughan",
        url: W + "Vaughan",
        text: "A York Region city directly north of Toronto, and Canada's fastest-growing municipality from 1996 to 2006.",
        short: "Home of Canada’s Wonderland and a vast rail-freight hub, and the first suburb the subway reached, in 2017.",
    },
    Thornhill: {
        article: "Thornhill, Ontario",
        url: W + "Thornhill,_Ontario",
        text: "A suburban district straddling Yonge Street on Toronto's northern border, split between Vaughan and Markham.",
        short: "A colonial mill village swallowed by suburbia, now split down Yonge Street between Vaughan and Markham, which is why the census never counts it on its own.",
    },
    "Richmond Hill": {
        article: "Richmond Hill, Ontario",
        url: W + "Richmond_Hill,_Ontario",
        text: "York Region's third most populous municipality, between Markham and Vaughan and north of Thornhill.",
        short: "Sits astride the Oak Ridges Moraine, and was long the site of the David Dunlap Observatory’s great telescope.",
    },
    Aurora: {
        article: "Aurora, Ontario",
        url: W + "Aurora,_Ontario",
        text: "A town 48 km north of downtown Toronto, partly on the Oak Ridges Moraine and ringed by the Greenbelt.",
        short: "A Victorian railway town on the moraine, ringed by Greenbelt and known for its preserved main street.",
    },
    Newmarket: {
        article: "Newmarket, Ontario",
        url: W + "Newmarket,_Ontario",
        text: "The seat of York Region, named as the “new market” in contrast to the old market at York.",
        short: "Seat of York Region, founded by Quakers in 1801 as the new market that rivalled York itself.",
    },
    "King City": {
        article: "King City, Ontario",
        url: W + "King_City,_Ontario",
        text: "The largest community in King Township, 40 km north of Toronto, with 8,396 residents in 2021.",
        short: "The largest village in rural King Township, surrounded by protected moraine countryside and horse farms.",
    },

    // ── Municipalities: East (Durham / York) ───────────────────────────────
    Pickering: {
        article: "Pickering, Ontario",
        url: W + "Pickering,_Ontario",
        text: "A Durham Region city immediately east of Toronto, named after Pickering in North Yorkshire.",
        short: "Site of one of the world’s largest nuclear stations, and of the airport lands expropriated in 1972 and still empty.",
    },
    Ajax: {
        article: "Ajax, Ontario",
        url: W + "Ajax,_Ontario",
        text: "A waterfront town in Durham Region at the eastern edge of the Greater Toronto Area.",
        short: "Built from nothing in 1941 around a wartime shell-filling plant, and named for the Royal Navy cruiser HMS Ajax.",
    },
    Whitby: {
        article: "Whitby, Ontario",
        url: W + "Whitby,_Ontario",
        text: "A lakeshore commuter town of 138,501 that is home to the headquarters of Durham Region.",
        short: "Seat of Durham Region, and a 19th-century grain port whose harbour shipped Ontario wheat to the world.",
    },
    Oshawa: {
        article: "Oshawa",
        url: W + "Oshawa",
        text: "Durham Region's largest municipality and the eastern anchor of the GTA; its name means “the crossing place” in Ojibwe.",
        short: "Home of General Motors in Canada since 1918, and the eastern anchor of the Greater Toronto Area.",
    },
    Markham: {
        article: "Markham, Ontario",
        url: W + "Markham,_Ontario",
        text: "York Region's largest city, 30 km northeast of downtown Toronto, with 338,503 residents in 2021.",
        short: "Canada’s most ethnically diverse municipality and a major technology centre, with a preserved 1794 village core.",
    },

    // ── Landmarks: skyline icons ───────────────────────────────────────────
    "CN Tower": {
        article: "CN Tower",
        url: W + "CN_Tower",
        text: "A 553-metre communications and observation tower completed in 1976 on the former Railway Lands.",
        short: "The world’s tallest free-standing structure for thirty-two years, built in 1976 to lift broadcasts clear of the new downtown towers.",
    },
    "Rogers Centre": {
        article: "Rogers Centre",
        url: W + "Rogers_Centre",
        text: "A retractable-roof stadium opened in 1989 at the foot of the CN Tower, home of the Toronto Blue Jays.",
        short: "The first stadium anywhere with a fully retractable roof, and home to the Blue Jays’ back-to-back World Series wins.",
    },
    "Scotiabank Arena": {
        article: "Scotiabank Arena",
        url: W + "Scotiabank_Arena",
        text: "A Bay Street arena, formerly the Air Canada Centre, home to the Maple Leafs and the Raptors.",
        short: "Home of the Maple Leafs and the Raptors, and the busiest arena in Canada — its two tenants between them sell out nearly every night of the winter.",
    },
    "City Hall & Nathan Phillips Sq.": {
        article: "Toronto City Hall",
        url: W + "Toronto_City_Hall",
        text: "Viljo Revell's Neo-Expressionist seat of municipal government, opened in 1965 with Nathan Phillips Square alongside.",
        short: "Viljo Revell’s 1965 competition winner, whose curved towers became the city’s emblem and whose square is its front yard.",
    },
    "Old City Hall": {
        article: "Old City Hall (Toronto)",
        url: W + "Old_City_Hall_(Toronto)",
        text: "A Romanesque civic building that housed city council from 1899 to 1966 and a provincial court until 2023.",
        short: "E. J. Lennox’s Romanesque pile of 1899, the largest building in Toronto when it opened and a working courthouse until 2023.",
    },
    "Union Station": {
        article: "Union Station (Toronto)",
        url: W + "Union_Station_(Toronto)",
        text: "The 1927 rail and transit hub on Front Street, a National Historic Site and Canada's busiest station.",
        short: "Canada’s busiest transport hub, moving more passengers a year than Pearson airport through a 1927 Beaux-Arts hall.",
    },
    "Casa Loma": {
        article: "Casa Loma",
        url: W + "Casa_Loma",
        text: "A Gothic Revival castle built 1911–14 for financier Sir Henry Pellatt, now a historic house museum.",
        short: "Sir Henry Pellatt’s 1914 folly, abandoned when his hydro fortune collapsed and now the most-filmed interior in the city.",
    },
    "Royal Ontario Museum": {
        article: "Royal Ontario Museum",
        url: W + "Royal_Ontario_Museum",
        text: "Canada's largest and most-visited museum, covering art, world culture and natural history on Bloor Street West.",
        short: "Canada’s largest museum, its collections running from dinosaurs to Chinese temple art behind Libeskind’s 2007 crystal.",
    },
    "St. Lawrence Market": {
        article: "St. Lawrence Market",
        url: W + "St._Lawrence_Market",
        text: "A major public market on Front Street East, split between its North and South buildings.",
        short: "Trading on this corner since 1803, and repeatedly named among the finest food markets in the world.",
    },
    "Eaton Centre": {
        article: "Toronto Eaton Centre",
        url: W + "Toronto_Eaton_Centre",
        text: "A downtown shopping mall and office complex named for the Eaton's department store that once anchored it.",
        short: "The busiest shopping mall in North America, built in the 1970s over streets Eaton’s had been buying up for a century.",
    },
    "Sankofa Square (Yonge–Dundas)": {
        article: "Sankofa Square",
        url: W + "Sankofa_Square",
        text: "The public square at Yonge and Dundas, opened in 2002 and renamed from Yonge–Dundas Square in 2024.",
        short: "Toronto’s Times Square, renamed in 2024 after the Akan symbol for reclaiming what was lost.",
    },
    "Hanlan's Point Beach": {
        article: "Hanlan's Point Beach",
        url: W + "Hanlan's_Point_Beach",
        text: "A clothing-optional beach on the west shore of Hanlan's Point, at the western end of the Toronto Islands. Nude bathing was legalised here by by-law in 1894, banned again in 1930, reinstated as a trial in 1999 and made permanent in 2002; the clothing-optional zone was extended to the whole beach in 2023.",
        short: "Legally clothing-optional from 1894 until a 1930 by-law ended it, restored on trial in 1999 and permanently in 2002; Canada’s first Pride was a picnic held here in 1971.",
    },
    "Queen's Park": {
        article: "Queen's Park (Toronto)",
        url: W + "Queen's_Park_(Toronto)",
        text: "An 1860 urban park named for Queen Victoria, site of the Ontario Legislative Building.",
        short: "Seat of Ontario’s legislature since 1893, and the name Canadians use for the provincial government itself.",
    },
    "Hockey Hall of Fame": {
        article: "Hockey Hall of Fame",
        url: W + "Hockey_Hall_of_Fame",
        text: "A museum of ice hockey inside a historic Bank of Montreal building at Brookfield Place, home of the Stanley Cup.",
        short: "Keeper of the Stanley Cup, housed in a former Bank of Montreal whose stained-glass banking hall survives intact.",
    },
    "Fort York": {
        article: "Fort York",
        url: W + "Fort_York",
        text: "An early 19th-century fortification that defended the entrance to Toronto Harbour, now a National Historic Site.",
        short: "Where Toronto began — the 1793 garrison, burned by American troops in 1813 in the raid that gave the burning of Washington its pretext.",
    },
    "Exhibition Place": {
        article: "Exhibition Place",
        url: W + "Exhibition_Place",
        text: "A 197-acre publicly owned lakeshore district of exhibition halls, theatres, parkland and sports facilities.",
        short: "Home of the Canadian National Exhibition since 1879, the largest annual fair in the country.",
    },
    "Evergreen Brick Works": {
        article: "Don Valley Brick Works",
        url: W + "Don_Valley_Brick_Works",
        text: "A former quarry and brickworks in the Don Valley, its buildings restored as an environmental and cultural centre.",
        short: "The quarry that supplied the bricks for much of old Toronto; its pit is now a wetland and its kilns a sustainability centre.",
        viaRedirect: true,
    },

    // ── Landmarks: waterfront & islands ────────────────────────────────────
    "Toronto Islands": {
        article: "Toronto Islands",
        url: W + "Toronto_Islands",
        text: "A chain of 15 small islands in Lake Ontario just south of the mainland.",
        short: "North America’s largest urban car-free community, cut off from the mainland by the great storm of 1858.",
    },
    "Billy Bishop Airport": {
        article: "Billy Bishop Toronto City Airport",
        url: W + "Billy_Bishop_Toronto_City_Airport",
        text: "The island airport serving short-haul flights across Canada and the United States, with US border preclearance.",
        short: "Reached by the world’s shortest scheduled ferry crossing — 121 metres — and, since 2015, a pedestrian tunnel.",
    },
    "Harbourfront Centre": {
        article: "Harbourfront Centre",
        url: W + "Harbourfront_Centre",
        text: "A waterfront cultural organization at 235 Queens Quay West, established in 1972 to create a waterfront park.",
        short: "A 1972 federal experiment that turned derelict docklands into public waterfront, and a year-round arts campus.",
    },
    "Ontario Place": {
        article: "Ontario Place",
        url: W + "Ontario_Place",
        text: "An entertainment venue on three artificial islands, opened in 1971 and closed for redevelopment since 2012.",
        short: "A 1971 futurist pavilion on man-made islands, and home of the world’s first permanent IMAX cinema.",
    },
    "Sunnyside Beach": {
        article: "Sunnyside, Toronto",
        url: W + "Sunnyside,_Toronto",
        text: "A three-kilometre lakefront strip on Humber Bay with a beach, bathing pavilion, pool and rowing clubs.",
        short: "Site of the lost Sunnyside amusement park of 1922–55; its bathing pavilion and outdoor pool still stand.",
        viaRedirect: true,
    },
    "Woodbine Beach": {
        article: "Woodbine Beach",
        url: W + "Woodbine_Beach",
        text: "Toronto's largest beach, at the foot of Woodbine Avenue in The Beaches next to Ashbridge's Bay.",
        short: "The largest beach in Toronto and a Blue Flag swimming site, backed by the Martin Goodman Trail.",
    },

    // ── Rivers ─────────────────────────────────────────────────────────────
    "Humber River": {
        article: "Humber River (Ontario)",
        url: W + "Humber_River_(Ontario)",
        text: "The western of the two major rivers flanking Toronto, designated a Canadian Heritage River in 1999.",
    },
    "Don River": {
        article: "Don River (Ontario)",
        url: W + "Don_River_(Ontario)",
        text: "A river rising in the Oak Ridges Moraine and emptying into Toronto Harbour just east of the old town of York.",
    },
    "Rouge River": {
        article: "Rouge River (Ontario)",
        url: W + "Rouge_River_(Ontario)",
        text: "Flows from the Oak Ridges Moraine to Lake Ontario along Toronto's eastern boundary, through Rouge National Urban Park.",
    },
    "Highland Creek": {
        article: "Highland Creek (Toronto)",
        url: W + "Highland_Creek_(Toronto)",
        text: "A meandering ravine river whose watershed lies almost entirely within Scarborough, emptying at the east end of the Bluffs.",
    },

    // ── Parks ──────────────────────────────────────────────────────────────
    "Rouge National Urban Park": {
        article: "Rouge National Urban Park",
        url: W + "Rouge_National_Urban_Park",
        text: "Canada’s first national urban park, 79.1 square kilometres of Carolinian forest, farmland and marsh at the city’s eastern edge.",
        short: "Canada’s first national urban park, and at 79 square kilometres one of the largest urban parks in the world.",
    },
    "Scarborough Bluffs": {
        article: "Scarborough Bluffs",
        url: W + "Scarborough_Bluffs",
        text: "An escarpment along the Scarborough shoreline rising as much as 90 metres above Lake Ontario, formed from sediment laid down at the end of the last ice age.",
        short: "A wall of layered sediment up to 90 m high, a record of the last ice age that the lake is steadily eating away.",
    },
    "Morningside Park": {
        article: "Morningside Park (Toronto)",
        url: W + "Morningside_Park_(Toronto)",
        text: "Toronto’s largest park, following Highland Creek through a wooded ravine in Scarborough.",
        short: "The city’s largest park by area, following Highland Creek down a wooded Scarborough ravine.",
        viaRedirect: true,
    },
    "Trinity Bellwoods Park": {
        article: "Trinity Bellwoods Park",
        url: W + "Trinity_Bellwoods_Park",
        text: "A park on Queen Street West on the former grounds of Trinity College, whose gates still stand at the entrance, and the name the surrounding neighbourhood goes by.",
        short: "The city’s default summer gathering place, on the former grounds of Trinity College — and the name of the neighbourhood grown up around it.",
    },
    "Christie Pits Park": {
        article: "Christie Pits",
        url: W + "Christie_Pits",
        text: "A park in a former sand and gravel pit, site of the 1933 Christie Pits riot.",
        short: "A park sunk in a former gravel pit, remembered for the 1933 riot that broke out at a baseball game there.",
        viaRedirect: true,
    },
    "Allan Gardens": {
        article: "Allan Gardens",
        url: W + "Allan_Gardens",
        text: "One of Toronto’s oldest parks, with a Victorian conservatory of six greenhouses under glass.",
        short: "One of the oldest parks in the city, built around a Victorian glasshouse that stays warm all winter.",
    },
    "Riverdale Park": {
        article: "Riverdale Park (Toronto)",
        url: W + "Riverdale_Park_(Toronto)",
        text: "A park in the Don Valley split into east and west halves by the river, the Don Valley Parkway and the rail corridor.",
        short: "Two halves of one park either side of the Don, and the postcard view of the skyline from its slope.",
        viaRedirect: true,
    },
    "Dufferin Grove Park": {
        article: "Dufferin Grove Park",
        url: W + "Dufferin_Grove_Park",
        text: "A west-end park known for its community-run ovens, rink and farmers’ market.",
        short: "A west-end park run largely by the people who use it, with bread ovens, a rink and a Thursday market.",
    },
    "Corktown Common": {
        article: "Corktown Common",
        url: W + "Corktown_Common",
        text: "A park on the West Don Lands built atop a flood-protection landform that shields the eastern downtown from the Don.",
        short: "A marsh and meadow on top of a flood berm — the earthwork that made the eastern downtown buildable.",
    },
    "Cherry Beach": {
        article: "Cherry Beach",
        url: W + "Cherry_Beach",
        text: "A Port Lands beach on the Outer Harbour, officially Clarke Beach Park.",
        short: "A Port Lands beach on the Outer Harbour, as much a place to hear music as to swim.",
    },
    "Sunnybrook Park": {
        article: "Sunnybrook Park",
        url: W + "Sunnybrook_Park",
        text: "A large park in the West Don valley, part of a chain of connected parkland running through the ravine.",
        short: "Stables, playing fields and bridle paths in the West Don valley, given to the city in 1928.",
    },
    "Edwards Gardens": {
        article: "Edwards Gardens",
        url: W + "Edwards_Gardens",
        text: "A former estate garden at the head of the Wilket Creek ravine, now home to the Toronto Botanical Garden.",
        short: "A former private estate at the head of the Wilket Creek ravine, now the Toronto Botanical Garden.",
    },
    "Downsview Park": {
        article: "Downsview Park",
        url: W + "Downsview_Park",
        text: "A park on the former Canadian Forces Base Downsview, the first national urban park declared in Canada.",
        short: "A park made from a decommissioned air base, still being built out around the runway it inherited.",
    },
};

/** Look up a blurb by the exact `name` used in ./places.ts. */
export function describe(name: string): PlaceDescription | undefined {
    return DESCRIPTIONS[name];
}
