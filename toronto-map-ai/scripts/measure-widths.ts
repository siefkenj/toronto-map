/**
 * Dev probe: compare the width the layout estimates against what Chromium
 * actually draws, at both the regular and the semibold weight.
 *
 * Measured at a large font size on purpose. Chromium quantizes
 * getComputedTextLength to whole pixels, so at poster sizes (4-9px) the
 * quantization is a percent or two on its own and swamps what is being
 * measured.
 *
 * Expect ratios of 1.00-1.04, always >= 1: the estimate omits GPOS kerning,
 * which the renderer applies and which is essentially always negative. That the
 * estimate is a slight OVER-estimate is what makes the gazetteer's name-to-gloss
 * gap a true minimum rather than a target.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const metricsSrc = await readFile(path.join(here, "../src/render/fontMetrics.ts"), "utf8");
const face = (name: string) =>
    JSON.parse(new RegExp(`export const ${name}_METRICS: FaceMetrics = (\\{.*?\\});`, "s").exec(metricsSrc)![1]);
const serif = face("SERIF");
const bold = face("SERIF_BOLD");
const est = (m: { adv: Record<string, number>; fallback: number }, s: string, size: number, tracking: number) => {
    let w = 0;
    for (const ch of s) w += (m.adv[ch] ?? m.fallback) * size;
    return w + tracking * Math.max(0, s.length - 1);
};

const fontsSrc = await readFile(path.join(here, "../src/render/fonts.ts"), "utf8");
const css = /FONT_FACE_CSS =\s*("(?:[^"\\]|\\.)*")/s.exec(fontsSrc)![1];
const FONT_FACE_CSS: string = JSON.parse(css);

const names = ["Tommy Thompson Park", "Kensington Market", "Chinatown", "The Distillery District", "CN Tower", "Mississauga"];
const size = 600;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<style>${FONT_FACE_CSS}</style><svg xmlns="http://www.w3.org/2000/svg" width="40000" height="40000">
${names.map((n, i) => `<text id="a${i}" x="0" y="${400 + i * 700}" font-family="'EB Garamond', serif" font-size="${size}" letter-spacing="0" font-weight="400">${n}</text>
<text id="b${i}" x="18000" y="${400 + i * 700}" font-family="'EB Garamond', serif" font-size="${size}" letter-spacing="0" font-weight="600">${n}</text>`).join("")}
</svg>`);
await page.waitForTimeout(900);
console.log("name".padEnd(24) + "est400".padStart(8) + "drawn400".padStart(9) + "est600".padStart(8) + "drawn600".padStart(9) + "   ratio400  ratio600");
for (const [i, n] of names.entries()) {
    const len = (id: string) => page.evaluate(`document.getElementById('${id}').getComputedTextLength()`) as Promise<number>;
    const a = await len(`a${i}`);
    const b = await len(`b${i}`);
    const e4 = est(serif, n, size, 0);
    const e6 = est(bold, n, size, 0);
    console.log(
        n.padEnd(24) + e4.toFixed(2).padStart(8) + a.toFixed(2).padStart(9) + e6.toFixed(2).padStart(8) + b.toFixed(2).padStart(9) +
        "    " + (e4 / a).toFixed(3) + "     " + (e6 / b).toFixed(3)
    );
}
await browser.close();
