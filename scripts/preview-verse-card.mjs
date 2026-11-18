/**
 * Renders sample Paper verse cards to PNG so the design can be checked
 * locally before deploying (the share.js preview law). Usage:
 *   node scripts/preview-verse-card.mjs <out-dir>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderVersePng } from "../functions/verse.js";

const outDir = process.argv[2] ?? "C:/Users/jston/AppData/Local/Temp/wb-verse-preview";
mkdirSync(outDir, { recursive: true });

const SAMPLES = [
  {
    name: "short",
    params: {
      text: "Thy word is a lamp unto my feet, and a light unto my path.",
      refLine: "Psalms 119:105",
      abbr: "KJV",
    },
  },
  {
    name: "medium",
    params: {
      text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
      refLine: "John 3:16",
      abbr: "KJV",
    },
  },
  {
    name: "very-long",
    params: {
      text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. For God sent not his Son into the world to condemn the world; but that the world through him might be saved.",
      refLine: "John 3:16-17",
      abbr: "KJV",
    },
  },
  {
    name: "multi-range",
    params: {
      text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
      refLine: "Romans 8:28–29",
      abbr: "ASV",
    },
  },
  {
    name: "long-tagalog",
    params: {
      text: "Ang salita mo'y ilawan sa aking mga paa, at liwanag sa aking landas. Ito'y sandata ko sa laban, at kalakip ko sa paglakad, araw man ay gabi man.",
      refLine: "Mga Awit 119:105",
      abbr: "ADB",
    },
  },
  {
    // The eyebrow's worst realistic case: a long book name + a long range —
    // must shrink a step (or more) and never run under the ribbon at x 1030.
    name: "worst-ref",
    params: {
      text: "Ang salita mo'y ilawan sa aking mga paa, at liwanag sa aking landas. Ito'y sandata ko sa laban, at kalakip ko sa paglakad, araw man ay gabi man.",
      refLine: "Song of Solomon 8:100–105, 108",
      abbr: "ADB",
    },
  },
  {
    // The love chapter — the likeliest long-ref share.
    name: "long-ref",
    params: {
      text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,",
      refLine: "1 Corinthians 13:4–7",
      abbr: "KJV",
    },
  },
];

for (const { name, params } of SAMPLES) {
  const png = await renderVersePng(params);
  const out = join(outDir, `verse-${name}.png`);
  writeFileSync(out, png);
  console.log(out, png.length, "bytes");
}
