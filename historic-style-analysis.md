# Historic Toronto Maps — Style Analysis for a "Historic" Poster Theme

Reference research for theming the poster map in a period cartographic style. All source
images were downloaded to [`historic-maps/`](historic-maps/) and are **public domain**
(pre-1930 / crown-copyright expired) — safe to trace, recolour, derive from, and print.

Nothing in the map code has been changed. This is a design reference: an inventory of what
was fetched, a distilled "period style system," and concrete ways to apply it to the two
existing renderers (`toronto.typ` and `toronto-map/src/App.tsx`).

---

## 1. Inventory of downloaded references

| File | Date | Region | Style in one line |
|---|---|---|---|
| [`1788_harbour_plan.jpg`](historic-maps/1788_harbour_plan.jpg) | 1788 | Harbour + park-lot grid | Georgian survey: copperplate italic, pale watercolour wash, ruled lot grid, "EXPLANATION" key |
| [`1823_phillpotts_harbour.jpg`](historic-maps/1823_phillpotts_harbour.jpg) | 1818/1823 | Town of York + shore | Royal Engineers watercolour: pictorial forest stipple, hachured ravines, framed title cartouche, embossed crest, fleur-de-lis N arrow |
| [`early1800s_st_patricks_ward.jpg`](historic-maps/early1800s_st_patricks_ward.jpg) | early–mid 1800s | St. Patrick's Ward (west of core) | Manuscript pen-and-wash: looping copperplate lettering, salmon/green parcel tints, estate names |
| [`1854_map_of_toronto.png`](historic-maps/1854_map_of_toronto.png) | ~1854 | City of Toronto | Steel engraving: scroll title cartouche ("CITY OF TORONTO C.W."), zig-zag braided neatline, engraved water hachure in the Harbour |
| [`1878_thornhill_village_atlas.jpg`](historic-maps/1878_thornhill_village_atlas.jpg) | 1878 | Village of Thornhill (York County atlas) | County-atlas plate: rope-braid border + quatrefoil corner rosettes, green tint boundary, lot/concession grid, hairy-hachure valley |
| [`1878_atlas_residence_lithographs.jpg`](historic-maps/1878_atlas_residence_lithographs.jpg) | 1878 | (decorative plate) | Bird's-eye residence vignettes, stipple sky, serif small-caps captions |
| [`1878_atlas_mill_vignettes.jpg`](historic-maps/1878_atlas_mill_vignettes.jpg) | 1878 | (decorative plate) | Lithograph mill/estate views — corner-illustration inspiration |
| [`1890_swansea.jpg`](historic-maps/1890_swansea.jpg) | 1890 | Swansea / Grenadier Pond (west) | Fine pen engraving: concentric "water-lining", caterpillar hachures, dashed lot lines, arched serif water label |
| [`1894_toronto_railways.jpg`](historic-maps/1894_toronto_railways.jpg) | 1894 | High Park / Junction / Swansea | Sepia pen diagram: pictorial trees in the park, solid vs dashed transit lines, big letterspaced display title + date |
| [`late1800s_railways_harbour.jpg`](historic-maps/late1800s_railways_harbour.jpg) | late 1800s | Whole waterfront + Don/Humber | Manuscript: red/blue/orange ink rail lines, soft blue harbour wash with **feathered shoreline**, italic labels |
| [`1900_dovercourt_york_twp.jpg`](historic-maps/1900_dovercourt_york_twp.jpg) | ~1900 | Dovercourt (Twp. of York) | Real-estate subdivision plan — ruled blocks, plan-of-survey lettering |
| [`goads_smalls_pond_plate.jpg`](historic-maps/goads_smalls_pond_plate.jpg) | ~1910s | Ward 1 / Leslieville (Goad's) | Fire-insurance plate: **flat colour blocks** (salmon=brick, yellow=frame), blue water, compass star, plate cross-refs |
| [`1919_weston.jpg`](historic-maps/1919_weston.jpg) | 1919 | Etobicoke & York twps, Humber/Weston | Topographic: contour lines (25-ft), stipple forest, township lot grid, huge letterspaced "YORK / ETOBICOKE" |

**Coverage of the modern regions:** Old Toronto has by far the richest material (all the city
plans above). The former townships that became **North York, Etobicoke, York, Scarborough,
East York** are best served by the **1878 Illustrated Historical Atlas of York County** (the
Thornhill plate + vignettes here are samples; the same atlas has full Etobicoke, Scarborough,
York, Markham township sheets) and the **1919 topographic sheet** (Etobicoke/York twps). If you
want, I can pull the specific Etobicoke and Scarborough township plates next.

---

## 2. The period style system (distilled)

### 2.1 Substrate — never pure white
Every reference sits on **warm aged paper**: cream → buff → light tan (`#efe6cf`, `#e8dab8`,
`#dcc9a0`), often with foxing specks and a slightly darker mount around the edge. This single
change (white → cream) does most of the "historic" work. Add faint blotch/foxing texture and a
subtle vignette darkening at the sheet edges.

### 2.2 Colour palettes (three era options)

**A. Manuscript watercolour (1788–1854)** — softest, most elegant:
- Land / open ground: bare cream paper
- Forest / vegetation: muted olive-green wash `#9ca87a`, `#ب` → use ~`#a7b083` at low opacity
- Built parcels / reserves: pale salmon–terracotta `#d8a58a`, `#e0b39a`
- Water: pale duck-egg/powder blue `#a9c4cf`, edges feathered (see 2.4)
- Roads: ochre/tan `#c9a86a`
- Ink linework & lettering: sepia/warm brown `#5b4632` (NOT black)
- Accent (forts, key features): iron-oxide red `#a83c2c`

**B. Steel-engraving monochrome (1854–1890)** — one ink on cream:
- Everything in sepia-black line on cream; tone built from line density only.
- Water = engraved parallel "water lines"; relief = hachures; woods = stipple.
- Optional single spot tint (the 1878 atlas uses a thin **green** boundary line).

**C. Goad's fire-insurance (1900s–1920s)** — boldest, graphic, "late-Victorian pop":
- Brick buildings: salmon/rose `#d98c7a`
- Frame buildings: chrome yellow `#e8c66a`
- Water: mid blue `#7fa8c9`
- Parks/vegetation: muted green
- Plate refs / callouts: red; all on cream, heavy black street casings.

> Recommendation: the map's current bright pastel choropleth maps most naturally onto **Palette
> A** (swap each region's pastel for a muted watercolour wash) for an antique feel, or **Palette
> C** if you want the neighbourhoods to stay boldly colour-coded but read as "Goad's atlas."

### 2.3 Typography
- **Sheet title:** decorative engraved display. Two idioms: (i) *copperplate italic* — "PLAN of
  the Harbour of Toronto" (1788); (ii) *Victorian shaded slab / Tuscan caps* — "THORNHILL",
  "CITY OF TORONTO" inside a scroll cartouche (1854).
- **Region / area labels:** open Roman **caps, widely letterspaced**, often **arched or curved
  to follow the shape** (e.g. "HARBOUR OF TORONTO", "HIGH PARK", "GRENADIER LAKE"). This is the
  signature move — spreading a name across its whole area in tracked capitals.
- **Water bodies:** letterspaced serif caps, frequently *italic*, curved along the feature.
- **Rivers / streets:** small serif **italic**, set along the line.
- **Neighbourhood / estate names:** looping **copperplate script** (St. Patrick's Ward).
- Practical web/Typst substitutes: *IM Fell English*, *Cardo*, *EB Garamond* (body/labels);
  *Playfair Display* or a Tuscan/“Old Man Eloquent” display face for titles; a copperplate
  script (*Herr Von Muellerhoff*, *Tangerine*) for flourished labels. Always add generous
  `letter-spacing` on area caps.

### 2.4 Textures & linework (the details that sell it)
- **Water — pick one:**
  1. *Watercolour wash* with a **feathered/graded edge** (darker at shore, fading out) — see the
     late-1800s harbour and 1823 plan. Programmatically: coastline + a few inward-offset,
     lightening bands.
  2. *Engraved water-lines*: 3–8 thin lines **paralleling the shoreline**, spaced wider as they
     go out (1854 Harbour, 1890 Swansea). Very achievable by offsetting the lake polygon inward
     repeatedly and stroking each ring.
  3. *Stipple* for shallows/sandbars (1823 Islands).
- **Relief / ravines:** **hachures** — short strokes running downslope, denser = steeper (the
  "hairy caterpillar" look along the Don, Humber, Thornhill creek). Toronto's ravine system is a
  natural place to apply these. Or fine **contour lines** at fixed intervals (1919).
- **Woodland:** clustered pictorial tree stipples / tiny tree icons (1823, 1894 High Park).
- **Parcels / blocks:** thin ruled lines; a few buildings hatched solid; lot & concession
  numbering in the townships.

### 2.5 Decorative apparatus (frame the poster like a period sheet)
- **Cartouche** for the title: scrollwork/cloud flourish (1854) or a simple ruled title box
  with italic subtitle + scale statement (1788, 1823).
- **Neatline border:** options seen — plain double rule; **zig-zag braided** guilloche (1854);
  **rope-braid with quatrefoil corner rosettes** (1878 atlas). A decorative border instantly
  reads "antique."
- **Compass:** fleur-de-lis / barbed arrow (1823), or an 8-point **compass star** (Goad's).
- **Scale bar:** segmented "barber-pole" bar + wording like *"Scale of six Inches to a Mile"* or
  chains.
- **Legend:** an **"EXPLANATION"** box with lettered/keyed entries.
- **Seal / crest:** an embossed-looking roundel (1823 has the Inspector-General crest) — could
  become a modern "City of Toronto" arms medallion.
- **Corner vignettes:** the 1878 atlas frames the sheet with engraved bird's-eye views of
  notable buildings. A period-style poster could ring the map with small engraved vignettes of
  Toronto icons (Old City Hall, CN Tower rendered as an engraving, Casa Loma, the ROM).
- **Certification cartouche:** flourished cursive attribution block lower-left (1823) — a place
  for your own colophon/credits in period voice.

---

## 3. Applying it to the existing renderers

The map is currently a rotated neighbourhood **choropleth** with region labels and a
watercolour-ish lake. To take it "historic," in rough priority order:

1. **Substrate + palette (biggest ROI):** set the page background to cream; replace
   `REGION_TO_COLOR` / `color_map` pastels with muted **Palette A** washes (or **Palette C**
   Goad's tints). Change label/stroke colour from white/black to sepia `#5b4632`.
   - `toronto-map/src/App.tsx`: `REGION_TO_COLOR`, the neighbourhood fill logic, `background`.
   - `toronto.typ`: `#let color_map`, the `stroke: white` in the neighbourhood `line(...)`.
2. **Typography:** switch labels to a serif/period webfont; add `letter-spacing` to region caps;
   italicise water/river labels. (`svg-text.ts` / the `region_text` styler in `toronto.typ`.)
3. **Lake Ontario — engraved water-lines:** you already isolate the lake polygon. Instead of one
   flat fill, stroke the coastline plus N inward-offset rings in thin sepia lines. This is the
   single most recognizable "old map" water treatment and is pure geometry (offset + stroke).
   Alternatively keep a wash but feather the edge.
4. **Neatline + cartouche + compass + scale bar:** add a decorative border rectangle, a title
   cartouche, an 8-point compass star, and a segmented scale bar as static SVG/cetz overlays.
5. **Ravine hachures (optional, advanced):** render short downslope strokes along the Don/Humber
   valleys and ravine polygons for relief character.
6. **Surrounding-municipality blobs (from `map-content-reference.md`):** style their leader-line
   callouts as period labels — letterspaced italic caps with a hairline leader, or small
   cartouche tags.

Achievable-today subset: **1, 2, 4** are mostly styling/overlays. **3** is a modest geometry
addition. **5** is the ambitious one.

---

## 4. Sources & how to get more

- **Wikimedia Commons** — `Category:Old maps of Toronto` (direct public-domain image files; used
  for most of the above). API: `commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Old_maps_of_Toronto&cmtype=file`.
- **Internet Archive** — *Illustrated Historical Atlas of the County of York, 1878* (McGill copy),
  id `McGillLibrary-rbsc_county-atlas-maps-york_elfG1148Y6M51878-22665`. Page images via
  `https://archive.org/download/<id>/page/n<N>_w<width>.jpg`. Contains full township sheets for
  **Etobicoke, Scarborough, York, Markham, Vaughan, Gwillimbury, King, Georgina, Whitchurch**.
- **Toronto Public Library — Historical Map Collection** and the **City of Toronto Archives**
  (Cane 1842, Fleming/Ridout/Schreiber 1857, Goad's atlas 1884–1924 full plates).
- **oldtorontomaps.blogspot.com** and **goadstoronto.blogspot.com** — well-indexed aggregators
  of the above, ordered by date.

## 5. Suggested next step

Tell me which **era/palette direction** appeals (A watercolour / B engraving / C Goad's), and
whether you want me to (a) pull the specific **Etobicoke & Scarborough township plates** from
the 1878 atlas, and/or (b) prototype the cream-substrate + sepia-labels + engraved-water-lines
treatment on the existing map so you can see it before committing.
