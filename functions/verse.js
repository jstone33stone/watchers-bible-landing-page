/**
 * GET /verse — the link a shared verse carries, and its Open Graph image:
 * the Paper edition.
 *
 * One route, two audiences — the same law /api/share runs on the web app
 * (functions/api/share.js there), pointed at this site instead:
 *  - Social crawlers (WhatsApp, Facebook, X, iMessage…) read the Open
 *    Graph/Twitter tags, whose og:image points back here with og=1 — a
 *    verse card in the app's default Paper theme: the reader's own k6
 *    speckle grain, a laid sheet with a bookmark ribbon, Literata ink.
 *    Everything the card needs arrives in the query string (the client is
 *    looking at the verse, so it knows the text; no server corpus is
 *    touched — and no copyrighted text is stored server-side).
 *  - Humans land on the landing page itself — a meta-refresh to /. The
 *    storefront IS the destination: the Play/APK doors live behind its own
 *    buttons, never as a shared link.
 *
 * Why a query-string address and not the bare root: a crawler caches one
 * card per exact URL, so the bare root can only ever wear the site's brand
 * card. `?verse?tr=…` gives every verse its own address on THIS site —
 * humans see the same storefront at every address, while each verse unfurls
 * its own card.
 *
 * Query: tr=translation id, b=book nr, bn=book name, c, v, ta=abbr,
 * t=verse text (≤380), r=optional range label ("16-18", "1–3, 5") worn by
 * a multi-verse link's ref line (the card itself anchors the first verse —
 * the OG link is per-verse). og=1 selects the image branch.
 */

import { initWasm, Resvg } from "@resvg/resvg-wasm";
import opentype from "@shuding/opentype.js";
import { INTER_700, LITERATA_500, LITERATA_400_ITALIC } from "./_og/fonts.js";
import {
  INTER_700_TTF,
  LITERATA_500_TTF,
  LITERATA_400_ITALIC_TTF,
} from "./_og/fonts-ttf.js";
import { GRAIN_B64 } from "./_og/grain.js";
import { json, html } from "./_lib/http.js";

const MAX_TEXT = 380;
const MAX_DESC = 300;
const MAX_BOOK = 28;
const MAX_RANGE = 24;

const clean = (s, max) =>
  String(s ?? "")
    .replace(/[<>]/g, "")
    .slice(0, max)
    .trim();

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const xmlEsc = esc;

/* ── The Paper palette — themes.ts "paper" verbatim (the app's default) ─── */

const DESK_TOP = "#dedfd9";
const DESK_BOTTOM = "#d5d7d0";
const SHEET = "#e7e8e2";
const INK = "#161713";
const MUTED = "#4b4e47";
const GOLD = "#514e44"; // paper's "sacred 10%": the ref/eyebrow ink
const STROKE = "#acada7";
const RIBBON = "#8a372f"; // danger's dignified brick — a bookmark ribbon
const RIBBON_FOLD = "#6f2c26";

/* ── resvg + fonts ───────────────────────────────────────────────────────── */

// resvg's WASM module initializes lazily on the first render and is cached
// at module level — the same laws share.js runs under (no wasm compilation
// at module scope; plain Node's preview harness reads the installed file).
let wasmReady = null;
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      try {
        const mod = await import("@resvg/resvg-wasm/index_bg.wasm");
        await initWasm(mod.default);
      } catch {
        // Plain Node (scripts/preview-verse-card.mjs) has no wasm ESM loader.
        const { readFileSync } = await import("node:fs");
        const { join } = await import("node:path");
        const wasmPath = join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");
        await initWasm(readFileSync(wasmPath));
      }
    })();
  }
  return wasmReady;
}

// opentype measures straight from the WOFF (its bundled tiny-inflate is pure
// JS); resvg paints only raw sfnt, so the three painted faces ship
// pre-converted in fonts-ttf.js — the worker never touches node:zlib.
// Base64 decodes through the standard atob, not Buffer: this project's
// compatibility settings are the dashboard's, and the worker must run under
// any of them.
const bytesFromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const FONT_BUFFERS = {
  inter700: bytesFromB64(INTER_700),
  literata500: bytesFromB64(LITERATA_500),
  literataItalic: bytesFromB64(LITERATA_400_ITALIC),
};
const TTF_BUFFERS = {
  inter700: bytesFromB64(INTER_700_TTF),
  literata500: bytesFromB64(LITERATA_500_TTF),
  literataItalic: bytesFromB64(LITERATA_400_ITALIC_TTF),
};

let parsedFonts = null;
function fonts() {
  if (!parsedFonts) {
    const ab = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    parsedFonts = {
      inter700: opentype.parse(ab(FONT_BUFFERS.inter700)),
      literata500: opentype.parse(ab(FONT_BUFFERS.literata500)),
      literataItalic: opentype.parse(ab(FONT_BUFFERS.literataItalic)),
    };
  }
  return parsedFonts;
}

/** Advance width of a run; SVG letter-spacing rides after every glyph. */
function widthOf(text, font, size, letterSpacing = 0) {
  return font.getAdvanceWidth(text, size) + letterSpacing * Math.max(0, text.length - 1);
}

/** Verse text size by length — readable at a glance in a feed preview. */
function verseFontStyle(len) {
  if (len <= 90) return { fontSize: 54, lineHeight: 1.38 };
  if (len <= 150) return { fontSize: 46, lineHeight: 1.4 };
  if (len <= 220) return { fontSize: 40, lineHeight: 1.42 };
  if (len <= 300) return { fontSize: 35, lineHeight: 1.45 };
  return { fontSize: 31, lineHeight: 1.48 };
}

/** Greedy word wrap against a measured width; an unbroken word wider than
    the column hard-breaks so no text ever overflows the card. */
function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (widthOf(next, font, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (widthOf(word, font, size) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        if (chunk && widthOf(chunk + ch, font, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [text];
}

/* ── The card: a verse page lying on the reader's desk ────────────────────
   Landscape 1200×630. The app's verse-image signature transposed: the
   "REF · ABBR" tracked caps eyebrow (paper-gold), Literata ink verse,
   tracked WATCHERS BIBLE brand line — framed as cut-paper: a laid sheet
   with a bookmark ribbon on the desk wash, the k6 grain over everything. */

const GRAIN_TILE = 128;
const GRAIN_SCALE = 2; // the tile speaks at 256px periods — survives chat downscale

function verseSvg({ text, refLine, abbr }) {
  const f = fonts();
  const { fontSize, lineHeight: lhRatio } = verseFontStyle(text.length);
  const lh = fontSize * lhRatio;

  // ── the sheet ──────────────────────────────────────────────────────────
  const sheetX = 80;
  const sheetY = 64;
  const sheetW = 1040;
  const sheetH = 502;
  const sheetB = sheetY + sheetH; // 566

  // ── eyebrow: "JOHN 3:16 · KJV" tracked caps (verse-image law) ─────────
  const eyebrow = `${refLine} · ${abbr}`.toUpperCase();
  const eyebrowSize = 24;
  const eyebrowTrack = 9;
  const eyebrowW = widthOf(eyebrow, f.inter700, eyebrowSize, eyebrowTrack);
  const eyebrowX = (1200 - eyebrowW) / 2;
  const eyebrowY = 158;

  // ── verse, centered in the zone between eyebrow and ornament ──────────
  const literata = f.literata500;
  const lines = wrapText(text, literata, fontSize, 960);
  const zoneTop = 210;
  const zoneBottom = 478;
  const groupH = lines.length * lh;
  const groupTop = Math.max(zoneTop, zoneTop + (zoneBottom - zoneTop - groupH) / 2);
  const lineBaselines = lines.map((_, i) => groupTop + i * lh + lh * 0.72);

  // ── ornament: hairline + diamond ────────────────────────────────────────
  const ornY = 506;
  const ornHalf = 30;
  const ornGap = 16;

  // ── brand line + tagline at the sheet's foot ───────────────────────────
  const brand = "WATCHERS BIBLE";
  const brandSize = 17;
  const brandTrack = 7;
  const brandW = widthOf(brand, f.inter700, brandSize, brandTrack);
  const brandX = (1200 - brandW) / 2;
  const brandY = sheetB - 34;
  const taglineY = sheetB - 14;

  // grain tiles: 5×3 at 256px periods cover the 1200×630 card
  const period = GRAIN_TILE * GRAIN_SCALE;
  const grainTiles = [];
  for (let gy = 0; gy * period < 630; gy += 1) {
    for (let gx = 0; gx * period < 1200; gx += 1) {
      grainTiles.push(
        `<image x="${gx * period}" y="${gy * period}" width="${period}" height="${period}" href="data:image/png;base64,${GRAIN_B64}"/>`,
      );
    }
  }

  const verseText = lines
    .map((l, i) => {
      const t = xmlEsc(l);
      return i === 0 ? t : `<tspan x="600" dy="${lh}">${t}</tspan>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${DESK_TOP}"/>
      <stop offset="1" stop-color="${DESK_BOTTOM}"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.78">
      <stop offset="0.6" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0.08"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#desk)"/>
  <rect x="${sheetX}" y="${sheetY + 14}" width="${sheetW}" height="${sheetH}" rx="6" fill="${INK}" fill-opacity="0.17" filter="url(#soft)"/>
  <rect x="${sheetX}" y="${sheetY}" width="${sheetW}" height="${sheetH}" rx="6" fill="${SHEET}" stroke="${STROKE}" stroke-width="1.5"/>

  <polygon points="872,22 906,22 906,196 889,178 872,196" fill="${RIBBON}"/>
  <polygon points="872,22 884,22 884,196 872,196" fill="${RIBBON_FOLD}"/>

  ${grainTiles.join("\n  ")}
  <rect width="1200" height="630" fill="url(#vig)"/>

  <text x="${eyebrowX}" y="${eyebrowY}" font-family="Inter" font-weight="700" font-size="${eyebrowSize}" letter-spacing="${eyebrowTrack}" fill="${GOLD}">${xmlEsc(eyebrow)}</text>
  <text x="600" y="${lineBaselines[0]}" font-family="Literata Medium" font-weight="500" font-size="${fontSize}" fill="${INK}" text-anchor="middle">${verseText}</text>

  <line x1="${600 - ornHalf - ornGap}" y1="${ornY}" x2="${600 - ornGap}" y2="${ornY}" stroke="${STROKE}" stroke-width="1.5"/>
  <line x1="${600 + ornGap}" y1="${ornY}" x2="${600 + ornHalf + ornGap}" y2="${ornY}" stroke="${STROKE}" stroke-width="1.5"/>
  <rect x="596" y="${ornY - 4}" width="8" height="8" fill="${GOLD}" fill-opacity="0.8" transform="rotate(45 600 ${ornY})"/>

  <text x="${brandX}" y="${brandY}" font-family="Inter" font-weight="700" font-size="${brandSize}" letter-spacing="${brandTrack}" fill="${MUTED}">${brand}</text>
  <text x="600" y="${taglineY}" font-family="Literata" font-style="italic" font-size="16" fill="${MUTED}" fill-opacity="0.8" text-anchor="middle">Be still, and read.</text>
</svg>`;
}

/** Verse card → PNG bytes. Exported so scripts/preview-verse-card.mjs can
    render samples locally before anything ships. */
export async function renderVersePng(params) {
  await ensureWasm();
  const svg = verseSvg(params);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    // Custom-fonts path only: mixing loadSystemFonts into the same object
    // sends resvg down the system-fonts branch, which loads nothing and
    // silently drops every <text> (the share.js law).
    font: {
      fontBuffers: Object.values(TTF_BUFFERS),
      defaultFontFamily: "Inter",
    },
  });
  return resvg.render().asPng();
}

/* ── The burn bucket ─────────────────────────────────────────────────────── */

// The render is CPU-heavy and unauthenticated, and the CDN cache only
// answers identical URLs — a burst of unique query strings burns cold-start
// + CPU on every request. The same per-IP bucket share.js runs: honest
// sharing (a few renders per paste) never notices. In-memory, per warm
// isolate.
const OG_LIMIT = 20;
const OG_WINDOW_MS = 60_000;
let ogHits = null;

function clientIp(request) {
  const direct = request.headers.get("cf-connecting-ip");
  if (typeof direct === "string" && direct.length > 0) {
    return direct.trim().replace(/^::ffff:/, "").slice(0, 64);
  }
  const fwd = request.headers.get("x-forwarded-for");
  let ip = "";
  if (typeof fwd === "string" && fwd.length > 0) {
    ip = fwd.split(",")[0].trim();
  }
  return ip.replace(/^::ffff:/, "").slice(0, 64);
}

function ogAllowed(ip) {
  if (!ogHits) ogHits = new Map();
  const now = Date.now();
  if (ogHits.size > 10_000) {
    for (const [k, b] of ogHits) {
      if (now - b.start > OG_WINDOW_MS) ogHits.delete(k);
    }
  }
  const b = ogHits.get(ip);
  if (!b || now - b.start > OG_WINDOW_MS) {
    ogHits.set(ip, { start: now, n: 1 });
    return true;
  }
  b.n += 1;
  return b.n <= OG_LIMIT;
}

async function renderOg(request) {
  if (!ogAllowed(clientIp(request))) {
    return json(429, { error: "too many renders, try again shortly" });
  }
  const q = new URL(request.url).searchParams;
  const text = clean(q.get("t"), MAX_TEXT);
  const bookName = clean(q.get("bn"), MAX_BOOK) || "The Bible";
  const chapter = String(parseInt(q.get("c"), 10) || 1);
  const verse = String(parseInt(q.get("v"), 10) || 1);
  const range = clean(q.get("r"), MAX_RANGE);
  const abbr = clean(q.get("ta"), 12) || "KJV";

  if (!text) {
    return new Response("missing verse text", { status: 400 });
  }
  const refLine = range ? `${bookName} ${chapter}:${range}` : `${bookName} ${chapter}:${verse}`;

  try {
    const png = await renderVersePng({ text, refLine, abbr });
    // The image is a pure function of the query, so it is cacheable per URL.
    return new Response(png, {
      status: 200,
      headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
    });
  } catch (e) {
    // A dead og:image is otherwise invisible (crawlers never show you the
    // 500); ?debug=1 rides the message/stack in the body — the render tree
    // carries nothing sensitive (the share.js law).
    console.error("verse og render failed:", e?.message || e);
    const qDebug = new URL(request.url).searchParams.has("debug");
    return json(
      500,
      qDebug
        ? { error: "render failed", detail: String(e?.message || e), stack: String(e?.stack || "").slice(0, 500) }
        : { error: "render failed" },
    );
  }
}

/* ── The verse landing page ──────────────────────────────────────────────── */

function versePage({ q, selfUrl, ogUrl, refLine, abbr, text }) {
  const title = `${refLine} (${abbr.toUpperCase()}) · Watchers Bible`;
  const desc = clean(text, MAX_DESC);
  return html(200, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#dbdcd6">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watchers Bible">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(selfUrl)}">
<meta property="og:image" content="${esc(ogUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(refLine)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogUrl)}">
<meta http-equiv="refresh" content="0; url=/">
<noscript><link rel="canonical" href="https://watchersbible.pages.dev/"></noscript>
</head>
<body style="margin:0;background:#dbdcd6;color:#161713;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:32px">
<main>
  <p style="letter-spacing:0.35em;font-size:11px;font-weight:700;color:#514e44;font-family:Arial,sans-serif">WATCHERS BIBLE</p>
  <p style="font-style:italic;color:#4b4e47">${esc(title)}</p>
  <p><a href="/" style="color:#8a372f">Be still, and read. →</a></p>
</main>
</body>
</html>`, { "cache-control": "public, max-age=3600" });
}

export async function onRequest({ request }) {
  const url = new URL(request.url);
  // og=1 selects the image branch — the flag is stripped before the query
  // is forwarded into the image renderer's own parameters.
  if (url.searchParams.get("og") === "1") {
    url.searchParams.delete("og");
    return renderOg(new Request(url, request));
  }

  const q = url.searchParams;
  const tr = clean(q.get("tr"), 24) || "kjv";
  const b = String(parseInt(q.get("b"), 10) || 1);
  const c = String(parseInt(q.get("c"), 10) || 1);
  const v = String(parseInt(q.get("v"), 10) || 1);
  const bn = clean(q.get("bn"), MAX_BOOK) || "The Bible";
  const ta = clean(q.get("ta"), 12) || "KJV";
  const r = clean(q.get("r"), MAX_RANGE);
  const t = clean(q.get("t"), MAX_TEXT);

  const refLine = r ? `${bn} ${c}:${r}` : `${bn} ${c}:${v}`;
  const selfUrl = `${url.origin}${url.pathname}?${q.toString()}`;
  // og:image points back here with the og=1 flag: the renderer and the
  // verse page share one function, and crawlers just see an image URL.
  const ogParams = new URLSearchParams(q);
  ogParams.set("og", "1");
  const ogUrl = `${url.origin}/verse?${ogParams.toString()}`;
  void tr;
  void b;
  return versePage({ q, selfUrl, ogUrl, refLine, abbr: ta, text: t });
}
