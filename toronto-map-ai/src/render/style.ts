// Palette + typography for the "historic" theme, blending the two references:
//  - late-1800s manuscript: aged paper, sepia ink, soft blue watercolour harbour
//    with a feathered shoreline, red/blue rail-ink accents.
//  - 1854 steel engraving: scroll cartouche, braided neatline, engraved water-lines.

export const PALETTE = {
    // substrate
    paper: "#efe3c8",
    paperEdge: "#e3d3ad",
    vignette: "#8a7550",

    // ink
    ink: "#5b4632", // primary sepia line & lettering
    inkSoft: "#7d6647",
    inkFaint: "#a9946f",

    // water
    water: "#bcd4dd", // pale watercolour wash
    waterDeep: "#7fa7b8",
    waterLine: "#8aa9b5", // engraved parallel lines
    waterLabel: "#40707e",

    // island landmass — kept close to the Old Toronto wash so the islands read as land
    island: "#dccdaa",

    // parks (muted antique green) and their outline
    park: "#c3cca2",
    parkEdge: "#8b9760",
    parkLabel: "#5f6a3a",

    // stenciled building footprints (engraved block look)
    building: "#e0cfa4",
    buildingInk: "#6b5334",

    // accents (rail-ink)
    accentRed: "#a6432e",
    accentBlue: "#3a5f86",

    // region fills — muted antique washes (one per former municipality)
    regions: {
        "Old Toronto": "#d8c9a6",
        Toronto: "#d8c9a6",
        "East York": "#cdb79b",
        York: "#d3c19c",
        "North York": "#c9c3a0",
        Etobicoke: "#dcc8a0",
        Scarborough: "#cdbf9e",
    } as Record<string, string>,
    regionDefault: "#d4c4a0",
} as const;

// Only these three faces are embedded (see fonts.ts); fallbacks are generic.
// EB Garamond replaces IM Fell English: same old-style character, smooth outlines.
export const FONTS = {
    // Display serif for the title cartouche (engraved, bold feel).
    display: `'Playfair Display', Georgia, 'Times New Roman', serif`,
    // Serif for area/region caps and body labels.
    serif: `'EB Garamond', Georgia, 'Times New Roman', serif`,
    // Italic serif for water & streets.
    italic: `'EB Garamond', Georgia, serif`,
};

// Sizes are tuned for a ~4 ft (2000px → 48 in) wide poster, so they can be small
// on screen yet legible in print. Smaller sizes also let the collision engine fit
// far more labels without overlap.
export const LABEL_STYLE = {
    region: { size: 27, tracking: 8, fill: PALETTE.ink, weight: 600 },
    superDistrict: { size: 13, tracking: 5, fill: PALETTE.inkSoft, weight: 500 },
    neighbourhood: { size: 8.5, tracking: 0.2, fill: PALETTE.ink },
    street: { size: 7.5, tracking: 1, fill: PALETTE.inkSoft },
    landmark: { size: 6.5, tracking: 0.1, fill: "#4a3a28" },
    municipality: { size: 12, tracking: 2, fill: PALETTE.ink },
    river: { size: 8, tracking: 0.4, fill: PALETTE.waterLabel },
};
