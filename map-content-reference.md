# Toronto Poster Map — Content Reference

A research compilation of the region names, surrounding municipalities, streets, and
landmarks worth labelling on a large-format printed poster of Toronto. The goal is the
information *a Toronto native carries in their head* — the mental map — rendered so a
visitor can read the city the way locals talk about it.

**Status:** research only. Nothing in the map code has been changed. This document is a
menu to select from, not a spec — a large poster can be dense, but not everything below
should appear at once. Suggested priority tiers are marked ★★★ (essential) → ★ (optional/dense-zoom).

Coordinates are `lat,lon` (WGS84). Where a name already exists in the repo's GeoJSON it's
marked **[in data]**; names a native would expect but that are *missing* from the current
data are marked **[ADD]**.

---

## 0. What's already in the repo

| Layer | File | Contents |
|---|---|---|
| Former municipalities (admin_level 8) | `toronto-level-8*.geojson` | Scarborough, Etobicoke, York, North York, East York (+ Old Toronto implied) |
| Official neighbourhoods (admin_level 10) | `toronto-level-10*.geojson` | 158 City-of-Toronto planning/official neighbourhoods |
| Water | `toronto-water*.geojson` | Lake Ontario, rivers, riverbanks |
| Render | `toronto.typ` (Typst) and `toronto-map/src/App.tsx` (React/SVG) | Two parallel renderers |

The 158 official neighbourhoods are already labelled. This document focuses on the
*additional* layers that make the map read like local knowledge: colloquial district names,
commercial strips, streets, landmarks, and the surrounding region.

---

## 1. The macro regions (biggest labels)

These are the mental "zones" locals sort everything into. Some are the former
municipalities (already in data); others are informal but universally used.

### Former municipalities / boroughs (the six) — **[in data]**
Large, low-priority background labels. ★★★

- **Old Toronto** — the pre-1998 core (downtown + the old streetcar city)
- **East York** — 43.69,-79.33
- **York** — 43.69,-79.48
- **North York** — 43.77,-79.41
- **Etobicoke** — 43.66,-79.56
- **Scarborough** — 43.77,-79.23

### Informal super-districts locals actually say ★★★ **[ADD]**
These aren't official but appear constantly in conversation and news:

- **Downtown** — the core south of Bloor
- **Midtown** — Yonge & Eglinton / St. Clair belt (~43.70,-79.40)
- **Uptown** — North Toronto / Yonge north of Eglinton
- **The West End** — Parkdale/Junction/High Park side
- **The East End** — Danforth/Beaches/Leslieville side
- **The Waterfront / Harbourfront** — the lake edge downtown
- **The Annex / The Danforth / The Beaches / The Junction** — note locals prefix "The"
- **The Financial District / Bay Street** — metonym for the banking core
- **The Portlands** — post-industrial lakeshore east of downtown (under redevelopment)

---

## 2. Colloquial & cultural neighbourhood names to ADD

The official 158 are in the data, but locals and news use many names that are **absent or
buried** under a hyphenated official name. These are high-value because they carry cultural
identity a visitor wants. ★★★ unless noted.

| Colloquial name | Where (official area it sits in) | Approx centre | Note |
|---|---|---|---|
| **Kensington Market** | (own official nbhd) | 43.654,-79.402 | Bohemian market — **[in data]** |
| **Chinatown** (Spadina) | Kensington/University | 43.653,-79.398 | **[ADD]** |
| **East Chinatown** | Riverdale (Broadview/Gerrard) | 43.664,-79.349 | **[ADD]** |
| **Greektown / The Danforth** | Danforth | 43.678,-79.349 | **[ADD]** |
| **Little India / Gerrard India Bazaar** | Greenwood-Coxwell | 43.672,-79.322 | **[ADD]** |
| **Little Italy** (College St) | Palmerston-Little Italy | 43.655,-79.415 | **[ADD]** |
| **Little Portugal** | (own official nbhd) | 43.650,-79.430 | **[in data]** |
| **Corso Italia** (St. Clair W) | Corso Italia-Davenport | 43.677,-79.446 | **[in data]** |
| **Koreatown** (Bloor W) | Annex/Seaton Village | 43.664,-79.418 | **[ADD]** |
| **Little Jamaica / Eglinton West** | Oakwood/Keelesdale-Eglinton W | 43.690,-79.445 | **[ADD]** culturally endangered by LRT |
| **Little Tibet** (Parkdale) | South Parkdale | 43.640,-79.435 | **[ADD]** |
| **Yorkville** | Annex/University | 43.671,-79.393 | **[ADD]** luxury shopping |
| **The Distillery District** | St Lawrence-East Bayfront | 43.650,-79.359 | **[ADD]** pedestrian heritage |
| **Liberty Village** | Fort York-Liberty Village | 43.638,-79.420 | **[in data]** |
| **CityPlace** | Harbourfront-CityPlace | 43.640,-79.393 | **[in data]** condo district |
| **Cabbagetown** | Cabbagetown-South St.James Town | 43.667,-79.366 | **[in data]** Victorian |
| **Regent Park** | (own official nbhd) | 43.660,-79.362 | **[in data]** redevelopment |
| **St. James Town** | N/S St.James Town | 43.669,-79.372 | dense highrise |
| **Corktown** | Moss Park / Regent Park edge | 43.655,-79.361 | **[ADD]** |
| **Leslieville** | South Riverdale/Greenwood | 43.663,-79.334 | **[ADD]** trendy east end |
| **Riverside** | South Riverdale (Queen E) | 43.659,-79.350 | **[ADD]** |
| **Leaside** | Leaside-Bennington | 43.705,-79.366 | **[in data]** |
| **Don Mills** | Banbury-Don Mills | 43.735,-79.345 | **[ADD]** first planned suburb |
| **The Bridle Path** | Bridle Path-Sunnybrook | 43.735,-79.375 | **[ADD]** wealthiest enclave |
| **Hoggs Hollow** | St.Andrew-Windfields | 43.744,-79.407 | **[ADD]** Yonge valley |
| **The Peanut** | Don Valley Village | 43.784,-79.345 | **[ADD]** iconic loop-road shape |
| **Jane and Finch** | Glenfield-Jane Heights/Black Creek | 43.757,-79.518 | **[ADD]** major news name |
| **Rexdale** | Rexdale-Kipling / Elms-Old Rexdale | 43.720,-79.565 | **[ADD]** NW corner |
| **The Golden Mile** | Clairlea/Eglinton E (Scarb) | 43.730,-79.285 | **[ADD]** postwar industrial→retail |
| **Malvern** | Malvern E/W | 43.805,-79.223 | **[ADD]** NE Scarborough |
| **Agincourt** | Agincourt N/S | 43.785,-79.290 | **[in data]** Chinese community |
| **Guildwood / The Guild** | Guildwood | 43.748,-79.192 | **[in data]** bluffs + sculpture park |
| **The Beaches / The Beach** | The Beaches | 43.671,-79.298 | **[in data]** (name is locally contested) |
| **Bloor West Village** | Runnymede-Bloor West Village | 43.649,-79.485 | **[in data]** |
| **The Kingsway** | Kingsway South | 43.648,-79.510 | **[in data]** affluent Etobicoke |
| **Mimico / New Toronto / Long Branch** | (own official nbhds) | ~43.61,-79.50 | **[in data]** lakeshore villages |
| **Mount Dennis** | (own official nbhd) | 43.687,-79.489 | **[in data]** Eglinton LRT terminus |
| **Weston** | (own official nbhd) | 43.700,-79.518 | **[in data]** historic town |
| **Swansea / High Park** | High Park-Swansea | 43.650,-79.470 | **[in data]** |
| **Parkdale** | South Parkdale | 43.640,-79.437 | **[in data]** |

> **Selection tip:** the ethnic/commercial-strip names (Chinatown, Greektown, Little India,
> Little Italy, Little Jamaica, Koreatown) are the single highest-value **[ADD]** set for a
> visitor — they say "here is where a culture lives," which official planning names hide.

---

## 3. Business Improvement Areas (BIAs) — the commercial strips ★★

Toronto's 86 BIAs are the *named shopping/dining strips* — often exactly the "street of
significance" the map should highlight. Centroids below are from the City Open Data BIA
polygons (`business-improvement-areas`, EPSG:4326). Good candidates for small strip labels
along their street. Dedupe against §2 where names overlap.

```
Albion Islington Square        43.7368,-79.5645
Baby Point Gates               43.6574,-79.4871
Bayview Leaside                43.7064,-79.3755
Bloor Annex                    43.6662,-79.4074
Bloor By The Park              43.6556,-79.4565
Bloor West Village             43.6485,-79.4846
Bloor-Yorkville                43.6710,-79.3892
Bloorcourt Village             43.6614,-79.4283
Bloordale Village              43.6586,-79.4410
Broadview Danforth             43.6769,-79.3562
Cabbagetown                    43.6632,-79.3685
Cedarbrae Markham Lawrence     43.7614,-79.2288
Chinatown                      43.6542,-79.3984
Church-Wellesley Village       43.6650,-79.3810   (The Village / Gay Village)
CityPlace and Fort York        43.6383,-79.4039
College Promenade              43.6539,-79.4247
College West                   43.6520,-79.4351
Corso Italia                   43.6771,-79.4462
Crossroads of the Danforth     43.6928,-79.2809
Danforth Mosaic                43.6828,-79.3258
Danforth Village               43.6890,-79.2975
Dovercourt Village             43.6673,-79.4314
Downtown Yonge                 43.6570,-79.3812
DuKe Heights                   43.7607,-79.4818
Dupont by the Castle           43.6763,-79.4071
Eglinton Hill                  43.6906,-79.4733
Emery Village                  43.7395,-79.5466
Fairbank Village               43.6957,-79.4531
Financial District             43.6471,-79.3816
Forest Hill Village            43.6894,-79.4137
Gerrard India Bazaar           43.6722,-79.3221   (Little India)
Greektown on the Danforth      43.6790,-79.3450
Harbord Street                 43.6625,-79.4050
Hillcrest Village              43.6808,-79.4299
Historic Queen East            43.6549,-79.3672
Humber Bay Shores              43.6245,-79.4791
Kennedy Road                   43.7621,-79.2798
Kensington Market              43.6541,-79.4022
Korea Town                     43.6640,-79.4176
Lakeshore Village              43.6011,-79.5038
Lawrence Ingram Keele          43.7051,-79.4718
Leslieville                    43.6623,-79.3343
Liberty Village                43.6389,-79.4196
Little Italy                   43.6554,-79.4147
Little Portugal                43.6496,-79.4301
Long Branch                    43.5961,-79.5265
MarkeTO District               43.7087,-79.4535
Midtown Yonge                  43.6999,-79.3970
Mimico By The Lake             43.6147,-79.4868
Mimico Village                 43.6180,-79.4989
Mirvish Village                43.6650,-79.4115
Mount Dennis                   43.6866,-79.4889
Mount Pleasant Village         43.7050,-79.3890
Oakwood Village                43.6895,-79.4395
Old Town Toronto               43.6528,-79.3700
Ossington Avenue               43.6467,-79.4198   (the Ossington Strip)
Pape Village                   43.6887,-79.3486
Parkdale Village               43.6398,-79.4401
Queen Street West              43.6489,-79.3958
Regal Heights Village          43.6796,-79.4364
Riverside District             43.6594,-79.3474
Rogers Road                    43.6820,-79.4686
Roncesvalles Village           43.6463,-79.4490   (Little Poland)
Rosedale Main Street           43.6787,-79.3907
Sheppard East Village          43.7895,-79.2611
Shop The Queensway             43.6252,-79.5088
St. Clair Gardens              43.6743,-79.4598
The Beach                      43.6690,-79.2982
The Eglinton Way               43.7042,-79.4112
The Junction                   43.6659,-79.4674
The Kingsway                   43.6477,-79.5101
The Waterfront                 43.6264,-79.3825
Toronto Downtown West          43.6466,-79.3898
Trinity-Bellwoods              43.6516,-79.4098
Upper Village                  43.7002,-79.4298
Uptown Yonge                   43.7130,-79.3996
Village of Islington           43.6466,-79.5303   (has famous murals)
West Queen West                43.6451,-79.4140
Weston Village                 43.7006,-79.5188
Wexford Heights                43.7447,-79.2986   (Wexford = "Little Middle East")
Wilson Village                 43.7325,-79.4607
Wychwood Heights               43.6825,-79.4218
Yonge & St. Clair              43.6874,-79.3950
Yonge Lawrence Village         43.7311,-79.4031
Yonge North York               43.7675,-79.4124
York-Eglinton                  43.6969,-79.4444   (Little Jamaica core)
```

---

## 4. Streets of significance

The user's brief: significant streets are *not necessarily the biggest*, and generic maps
can't distinguish them. Below, streets are grouped by *why* they matter. A poster could
render these as a distinct labelled-street layer (e.g. gold casing) rather than by width.

> **Note on "Bowyer Street":** I could not find a *Bowyer Street* in Toronto in OpenStreetMap
> or Nominatim — the only Ontario match is near Port Dover. The Toronto association of the
> name is **Henry Bowyer Lane**, a 19th-c. Toronto architect (Osgoode Hall, 2nd City Hall).
> Please confirm the exact name/location you meant so it can be added correctly. It may be a
> small residential street, a laneway, or a personally-significant street that OSM tags
> differently.

### 4a. The defining spines (everyone orients by these) ★★★
- **Yonge Street** — the spine; "Canada's longest street"; the E/W dividing line for street numbering. 43.65→43.85 N along -79.41→-79.38
- **Bloor Street** — E/W crosstown; **Bloor–Danforth subway** line; Mink Mile luxury retail in Yorkville; Bloor Street Culture Corridor (Bathurst→Yonge)
- **Danforth Avenue** — Bloor's continuation east of the Don; Greektown
- **Queen Street** (W and E) — Queen West = fashion/music/art; the "coolest street" corridor
- **King Street** (W and E) — Entertainment District (King W) + St. Lawrence (King E); King streetcar transit priority corridor
- **Dundas Street** (W and E) — Dundas West nightlife; Chinatown; Little India (Gerrard is parallel)
- **College Street** — Little Italy; continues as Carlton east of Yonge
- **Spadina Avenue** — Chinatown + Kensington; wide streetcar avenue (from Ojibwe *ishpadinaa*, "high hill")
- **Bathurst Street** — long N/S cultural dividing line
- **St. Clair Avenue** — Corso Italia, "the second downtown"; St. Clair streetcar ROW
- **Eglinton Avenue** — the "midtown crosstown"; new Line 5 Eglinton LRT; Little Jamaica

### 4b. Culturally-loaded shorter streets & strips ★★
- **Ossington Avenue** — the Ossington Strip (nightlife/dining)
- **Roncesvalles Avenue** — Little Poland; family west end
- **Kensington Ave / Augusta Ave / Baldwin St / Nassau St** — the internal streets *of* Kensington Market
- **Baldwin Village** (Baldwin St near McCaul) — restaurant row
- **Mirvish Village / Markham Street** — bookstore/arts heritage block
- **Geary Avenue** — **[ADD]** post-industrial breweries/pasta/arts strip north of Dupont; first Heritage Plaque District
- **Sterling Road** — **[ADD]** MOCA + Museum of Contemporary Art / Drake Commissary arts pocket
- **Church Street** — Church-Wellesley = the Gay Village
- **Front Street** — Union Station, St. Lawrence Market, Distillery gateway
- **Mill Street** — the Distillery Historic District's spine
- **Queens Quay** — the waterfront boulevard
- **Kingston Road** — historic road to the east; Upper Beaches / Birch Cliff
- **Gerrard Street** (E) — Little India / Gerrard India Bazaar; Cabbagetown
- **Harbord Street** — university/bookish restaurant strip

### 4c. Grid arterials locals name-drop for orientation ★
North–south: Yonge, Bathurst, Spadina, Dufferin, Keele, Jane, Islington, Kipling, Royal York,
Avenue Rd, Mount Pleasant, Bayview, Don Mills Rd, Victoria Park, Warden, Kennedy, Brimley,
McCowan, Markham Rd, Morningside.
East–west (the "avenue ladder," ~2 km apart): Lake Shore Blvd, Front, Queen, Dundas, College/Carlton,
Bloor/Danforth, Davenport (the diagonal), St. Clair, Eglinton, Lawrence, York Mills/Wilson,
Sheppard, Finch, Steeles (the N city limit).

### 4d. Highways (context framing) ★
- **Gardiner Expressway** (elevated lakeshore)
- **Don Valley Parkway ("the DVP")**
- **Highway 401** (the busiest highway in North America; the city's northern belt)
- **Highway 400** (to cottage country/north), **427** (west), **404/DVP**, **QEW** (to Niagara), **Allen Road** ("the Allen")

---

## 5. Surrounding municipalities (nebulous blobs pointing outward)

Grouped by direction from downtown Toronto (~43.65,-79.38). Coordinates are approximate town
centres, suitable for a blob + leader-line. The four regional municipalities (**Halton, Peel,
York, Durham**) form the "905" ring around Toronto's "416."

### West (Peel / Halton) ★★★
- **Mississauga** — 43.59,-79.64 (largest neighbour; Square One, Pearson Airport straddles the border)
- **Brampton** — 43.73,-79.76 (NW)
- **Oakville** — 43.47,-79.69 (SW, lakeshore, affluent)
- **Burlington** — 43.33,-79.80 (SW)
- **Milton** — 43.51,-79.88 (W, fastest-growing)
- **Halton Hills (Georgetown / Acton)** — 43.65,-79.92 (W)
- **Caledon / Bolton** — 43.87,-79.73 (NW, rural)

### North (York Region) ★★★
- **Vaughan** — 43.84,-79.51 (Vaughan Metropolitan Centre subway terminus; Canada's Wonderland; Woodbridge, Maple, Kleinburg)
- **Thornhill** — 43.81,-79.42 (straddles Vaughan/Markham, directly N of the city)
- **Richmond Hill** — 43.88,-79.44
- **Aurora** — 44.00,-79.47
- **Newmarket** — 44.06,-79.46
- **King City / Nobleton / Schomberg** — 43.93,-79.53 (rural King Twp)
- **East Gwillimbury / Bradford** — 44.10,-79.55

### Northeast (York / Durham) ★★
- **Markham** — 43.87,-79.26 (major tech/Chinese community; Unionville historic main st)
- **Unionville** — 43.86,-79.31
- **Stouffville (Whitchurch-Stouffville)** — 43.97,-79.25
- **Uxbridge** — 44.11,-79.12
- **Port Perry (Scugog)** — 44.10,-78.95
- **Georgina / Keswick / Sutton** — 44.23,-79.46 (on Lake Simcoe)

### East (Durham Region) ★★★
- **Pickering** — 43.84,-79.09 (nuclear station, casino)
- **Ajax** — 43.85,-79.02
- **Whitby** — 43.90,-78.94 (Brooklin to its north)
- **Oshawa** — 43.90,-78.86 (GM auto town; the "far east" anchor)
- **Bowmanville / Courtice / Newcastle (Clarington)** — 43.91,-78.69 (E)

### South (across Lake Ontario) ★
The lake dominates the south. Across the water on a clear day: the **Niagara** shore.
- **St. Catharines** — 43.16,-79.25 (S, across the lake)
- **Niagara Falls / Niagara-on-the-Lake** — 43.09,-79.08 (far S)
- **Hamilton** — 43.26,-79.87 (SW, head of the lake)

### Far ring / "the horseshoe" & getaways ★ (optional, edge-of-map)
- **Barrie** — 44.39,-79.69 (N gateway to cottage country / Muskoka)
- **Guelph** — 43.55,-80.25 · **Kitchener–Waterloo** — 43.45,-80.49 · **Cambridge** — 43.36,-80.31 (W, "the 519")
- **Peterborough** — 44.31,-78.32 (NE, the Kawarthas)
- **Cobourg / Port Hope** — 43.96,-78.17 (E, lakeshore)
- **Orillia** — 44.61,-79.42 · **Collingwood / Wasaga Beach** — 44.50,-80.22 (N, Georgian Bay)
- **Kawartha Lakes (Lindsay)** — 44.36,-78.74 (NE)

> Data note: OSM `place=city|town` within the region was queried to confirm this set. Watch
> out — a wide bbox also pulls in **New York State** towns across the lake (Lockport, Medina,
> Brockport, Grand Island, Tonawanda) which should NOT be labelled as GTA.

---

## 6. Landmarks & points of interest

Source: City of Toronto `places-of-interest-and-toronto-attractions` (178 pts) +
`cultural-hotspot-points-of-interest`. Full CSV/GeoJSON downloadable (see §9). Highest-recognition
subset below — a native would expect these on any Toronto poster.

### Icons / skyline ★★★
- **CN Tower** — 43.6426,-79.3871
- **Rogers Centre** (SkyDome) — 43.6416,-79.3894
- **Scotiabank Arena** (Leafs/Raptors) — 43.6435,-79.3791
- **Ripley's Aquarium** — 43.6422,-79.3866
- **Toronto City Hall & Nathan Phillips Square** (the "3D Toronto" sign) — 43.6530,-79.3837
- **Old City Hall** — 43.6525,-79.3817
- **Union Station** — 43.6453,-79.3804
- **Casa Loma** (castle) — 43.6780,-79.4094
- **Royal Ontario Museum (ROM)** — 43.6677,-79.3948
- **Art Gallery of Ontario (AGO)** — 43.6536,-79.3925
- **St. Lawrence Market** — 43.6487,-79.3716
- **Distillery Historic District** — 43.6502,-79.3591
- **Eaton Centre** — 43.6544,-79.3807
- **Sankofa Square** (formerly Yonge-Dundas Sq) — 43.6559,-79.3804
- **Ontario Legislature, Queen's Park** — 43.6622,-79.3916
- **Hockey Hall of Fame** — 43.6473,-79.3777
- **Fort York** — 43.6392,-79.4042
- **Exhibition Place / CNE / BMO Field / Budweiser Stage** — 43.63,-79.41

### Waterfront & islands ★★★
- **Toronto Islands** (Centre / Ward's / Hanlan's Point; Centreville) — ~43.62,-79.37
- **Billy Bishop Toronto City Airport** (island airport) — 43.6289,-79.3945
- **Harbourfront Centre** — 43.6388,-79.3819
- **Ontario Place** — 43.628,-79.415
- **Jack Layton Ferry Terminal** — 43.6400,-79.3756
- **Sugar Beach / HTO Park / Sunnyside Beach / Woodbine Beach** — waterfront chain

### Parks & nature ★★
- **High Park** — 43.6465,-79.4638 (city's biggest central park; cherry blossoms, zoo)
- **Scarborough Bluffs / Bluffer's Park** — 43.7082,-79.2348 (dramatic lake cliffs)
- **Evergreen Brick Works** — 43.6843,-79.3647 (Don Valley; heritage + market)
- **Tommy Thompson Park / Leslie Street Spit** — 43.6352,-79.3249 (urban wilderness)
- **Rouge National Urban Park** — 43.818,-79.173 (Canada's first national urban park, NE)
- **Toronto Zoo** — 43.8203,-79.1823 (NE)
- **Edwards Gardens / Toronto Botanical Garden** — 43.7341,-79.3582
- **Riverdale Park & Farm** — 43.667,-79.362
- **The Beaches boardwalk / Kew Gardens** — 43.668,-79.298
- **Downsview Park** — 43.7439,-79.4842
- **Humber Bay Park & Shores** — 43.624,-79.478

### Institutions & campuses ★★
- **University of Toronto (St. George)** — 43.663,-79.396
- **Toronto Metropolitan University** (formerly Ryerson) — 43.658,-79.379
- **OCAD University** (the "tabletop" building) — 43.6495,-79.3881
- **York University** (North York) — 43.773,-79.503
- **Toronto General / Hospital Row (University Ave)** — 43.659,-79.388
- **Aga Khan Museum** (North York) — 43.7253,-79.3322
- **Black Creek Pioneer Village** — 43.7726,-79.5151
- **Ontario Science Centre** (Don Mills; note: closed 2024) — 43.716,-79.339
- **Yorkdale / Sherway Gardens / Fairview / Scarborough Town Centre** — major mall anchors

### Entertainment & theatre district ★
Roy Thomson Hall, Massey Hall, Princess of Wales & Royal Alexandra (Mirvish theatres),
Meridian Hall, Four Seasons Centre (opera/ballet), TIFF Bell Lightbox, Elgin & Winter Garden,
The Danforth Music Hall, Second City, Budweiser Stage. (Cluster in Entertainment District,
King W & downtown.)

---

## 7. Water & natural features (framing the map)

Already partly in `toronto-water.geojson`. Named features locals use:
- **Lake Ontario** — the whole southern edge **[in data]**
- **Toronto Harbour / Inner Harbour** — sheltered by the Islands
- **Humber River** — west valley (with **Old Mill**); a National Heritage River
- **Don River** (East & West branches) + **the Don Valley**
- **Rouge River** — far east, in Rouge Park
- **Highland Creek** — Scarborough
- **Etobicoke Creek / Mimico Creek** — west border
- **Black Creek** — NW tributary of the Humber
- **Grenadier Pond** (in High Park), **Toronto Islands lagoons**
- **The ravines** — Toronto's defining topographic feature ("a city within a park");
  worth a subtle green ravine layer if the poster has room.

---

## 8. Transit spine (optional orientation layer) ★

Locals navigate by subway line & station names. If a schematic transit layer is wanted:
- **Line 1 Yonge–University** (the "U"), **Line 2 Bloor–Danforth**, **Line 4 Sheppard**,
  **Line 5 Eglinton Crosstown** (LRT, opening), **Line 6 Finch West** (LRT).
- Data: `ttc-subway-shapefiles` on Toronto Open Data.
- Key interchange/anchor stations locals name: Union, Bloor-Yonge, St. George, Spadina,
  Kennedy, Kipling, Finch, Vaughan Metropolitan Centre, Sheppard-Yonge, Eglinton.

---

## 9. Data sources & how to pull more

**In-repo (already downloaded):**
- `toronto-level-8*.geojson`, `toronto-level-10*.geojson`, `toronto-water*.geojson` (from OSM via Overpass; see `example queries`).

**Toronto Open Data (CKAN)** — base:
`https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/`
- `package_show?id=<name>` lists downloadable resources. Useful packages:
  - `business-improvement-areas` — 86 BIA polygons (used in §3)
  - `places-of-interest-and-toronto-attractions` — 178 attraction points (used in §6)
  - `cultural-hotspot-points-of-interest`
  - `neighbourhoods` / `neighbourhood-profiles` — official 158 (matches repo data)
  - `heritage-conservation-districts`, `heritage-register`
  - `parks`, `parks-and-recreation-facilities`
  - `toronto-centreline-tcl` — the full street centreline network (for the street layer)
  - `ttc-subway-shapefiles`
  - GeoJSON in EPSG **4326** (lat/lon) is the `...-4326.geojson` resource of each.

**OpenStreetMap / Overpass** — for names/geometry not in city data (surrounding
municipalities, colloquial `place=neighbourhood` nodes, specific streets):
- Primary endpoint `overpass-api.de` was frequently returning HTTP 504 on heavy queries during
  this research; the mirror `https://maps.mail.ru/osm/tools/overpass/api/interpreter` worked.
  Keep queries lean (`out tags qt;` for names, split city/town queries) and retry on 504.
- **Nominatim** (`nominatim.openstreetmap.org/search?q=...&format=json`) for one-off geocodes
  (1 req/sec; set a User-Agent).

---

## 10a. Regions in the current dataset to EXCLUDE or FIX

Auditing the repo's GeoJSON (`toronto-level-8-simp.geojson` = 6 features;
`toronto-level-10-simp.geojson` = 174 features), several entries should be dropped, fixed, or
relabelled before they reach the poster. Two kinds of problem: **technical junk** (renders as
blank/garbage) and **editorial** (bureaucratic names no local uses).

### 10a.1 Technical — drop before rendering (not real regions)
- **8 unnamed `Point` nodes** in level-10 (`node/254215326`, `534783654`, `555446350`,
  `622094543`, `3060121401`, `5261287521`, `5359771730`, `5353721638`) — these are OSM
  relation-member artifacts from the Overpass `>; out skel qt` step. No `name`, no area. Drop.
- **1 unnamed `Point`** in level-8 (the 6th feature) — same kind of artifact. Drop.
- *(The current `toronto.typ` already dodges these by filtering `type=="boundary"` AND
  `geometry=="Polygon"`; `App.tsx` should apply the same guard.)*

### 10a.2 Data fixes — real regions that won't render correctly as-is
- **Kensington-Chinatown** — present as `relation/18721596` but its `name` tag is **null**; the
  real name only sits in the `note` field. It currently renders as a **blank polygon**. Fix:
  backfill `name` from `note` (don't drop it — it's a marquee neighbourhood, and see §2 for the
  colloquial split into *Kensington Market* + *Chinatown*).
- **Woodbine Corridor** — the only `MultiPolygon` in the set (`relation/18756121`). The Typst
  renderer's `geometry=="Polygon"` filter **silently drops it**, so it's missing from that
  output. Fix the filter to accept MultiPolygon (or explode it) rather than exclude it.

### 10a.3 Editorial — merge directional splits into one label
The 2021 City model split single vernacular places into administrative halves. On a poster these
read as clutter; merge each set to the bolded label:
- **Agincourt** ← `Agincourt North`, `Agincourt South-Malvern West`
- **Bendale** ← `Bendale South`, `Bendale-Glen Andrew`
- **Forest Hill** ← `Forest Hill North`, `Forest Hill South`
- **Lawrence Park** ← `Lawrence Park North`, `Lawrence Park South`
- **L'Amoreaux** ← `East L'Amoreaux`, `L'Amoreaux West`
- **Malvern** ← `Malvern East`, `Malvern West`
- **Newtonbrook** ← `Newtonbrook East`, `Newtonbrook West`
- **Riverdale** ← `North Riverdale`, `South Riverdale` (keep *Riverside*/*Leslieville* as their own, §2)
- **Willowdale** ← `East Willowdale`, `Willowdale West`, `Yonge-Doris`, `Lansing-Westgate`
- **St. James Town** ← `North St.James Town` + the St. James Town half of `Cabbagetown-South St.James Town`

### 10a.4 Editorial — simplify hyphenated amalgams to the name locals actually say
Keep the vernacular half, drop the administrative tail (dataset name → poster label):

| Dataset name | Poster label |
|---|---|
| Banbury-Don Mills | **Don Mills** |
| Bridle Path-Sunnybrook-York Mills | **The Bridle Path** |
| Cabbagetown-South St.James Town | **Cabbagetown** |
| Corso Italia-Davenport | **Corso Italia** |
| Fort York-Liberty Village | **Liberty Village** (Fort York → landmark, §6) |
| Harbourfront-CityPlace | **Harbourfront / CityPlace** |
| High Park-Swansea | **High Park** (+ Swansea) |
| Humewood-Cedarvale | **Humewood / Cedarvale** |
| Leaside-Bennington | **Leaside** |
| Mimico-Queensway | **Mimico** |
| Palmerston-Little Italy | **Little Italy** |
| Runnymede-Bloor West Village | **Bloor West Village** |
| St Lawrence-East Bayfront-The Islands | **St. Lawrence** (Islands labelled separately, §6) |
| Yorkdale-Glen Park | **Yorkdale** |

**Keep hyphenated names as-is** — these *are* what locals say: `Church-Wellesley`,
`Trinity-Bellwoods`, `Yonge-Eglinton`, `Yonge-St.Clair`, `Rosedale-Moore Park`,
`Birchcliffe-Cliffside`, `Playter Estates-Danforth`.

### 10a.5 Editorial — purely administrative names to drop or demote (no vernacular currency)
These 2021 amalgam names are essentially invisible to residents; on a poster they add noise
without adding recognition. Recommend **dropping the label** (keep the polygon for the colour
fill only) or demoting to the smallest tier. Non-exhaustive, worst offenders:

`Beechborough-Greenbrook`, `Brookhaven-Amesbury`, `Elms-Old Rexdale`, `Englemount-Lawrence`,
`Eringate-Centennial-West Deane`, `Fenside-Parkwoods`, `Golfdale-Cedarbrae-Woburn`,
`Kingsview Village-The Westway`, `Mount Olive-Silverstone-Jamestown`, `Oakdale-Beverley Heights`,
`Parkwoods-O'Connor Hills`, `Pelmo Park-Humberlea`, `Princess-Rosethorn`,
`Willowridge-Martingrove-Richview`, `Bayview Woods-Steeles`, `Bedford Park-Nortown`,
`Briar Hill-Belgravia`, `Caledonia-Fairbank`, `Edenbridge-Humber Valley`,
`Humber Heights-Westmount`, `Thistletown-Beaumond Heights`, `West Humber-Clairville`,
`Westminster-Branson`, `Woodbine-Lumsden`, `Rustic`, `Maple Leaf`, `Woburn North`,
`Oakdale-Beverley Heights`.

> Note: a few administrative names *contain* a news-relevant place — e.g. `Glenfield-Jane
> Heights` sits in the **Jane and Finch** area (§2), `Keelesdale-Eglinton West` overlaps **Little
> Jamaica**. Relabel those to the vernacular rather than dropping them.

### 10a.6 Corridor / City-Centre labels — demote (planning jargon)
`Etobicoke City Centre`, `Yonge-Bay Corridor`, `Woodbine Corridor`, `Junction Area` (→ **The
Junction**), `Downtown Yonge East`, `South Eglinton-Davisville`, `Wellington Place`,
`Bay-Cloverhill` — these are planning/BIA constructs, not how people refer to the areas. Keep
`Financial District` (widely used). Relabel `Junction Area` → **The Junction**.

---

## 10. Open questions for you

1. **"Bowyer Street"** — not found in Toronto in OSM/Nominatim (see §4). Can you confirm the
   name/spelling/location, or the significance, so it's placed correctly?
2. **Density budget** — how many labels total feels right? The tiers (★★★/★★/★) above let us
   dial density up or down per zoom/region.
3. **Colloquial vs official** — do you want colloquial names to *replace* the official
   hyphenated planning names in the data, sit *alongside* them, or appear as a separate style?
4. **Reach** — should surrounding municipalities include only the immediate 905 ring (§5
   West/North/NE/East), or extend to the far getaway ring (Barrie, Niagara, KW, Kawarthas)?
5. **Extra layers** — interested in a transit-line schematic (§8) and/or a ravine/green layer (§7)?
