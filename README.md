# Watchers Bible · Landing Page

The official marketing landing page for [Watchers Bible](https://github.com/), a free, offline, ad-free Bible app for Android (iOS coming soon).

The site is a paper-art showcase in the app's Kindle Paperwhite "Paper" theme: cut-paper dawn dioramas, origami dove flybys, quill-drawn flourishes, torn-page dividers, a translation shelf, a pop-up book spread for the themes, and a Play-Store-style catalog of real device screenshots. The page is rich; the app it sells is the quiet one.

## Stack

Plain HTML + CSS + vanilla JavaScript. No build step, no dependencies (fonts come from Google Fonts). Deployable to any static host.

## Run locally

Open `index.html` directly, or serve the folder:

```
npx serve .
```

## Structure

```
index.html        # all markup + inline SVG art
privacy.html      # privacy policy (served at /privacy by pretty URLs)
404.html          # LOAD-BEARING on Cloudflare Pages: without it, Pages
                  # auto-SPA-fallbacks every unknown path to index.html (200)
_headers          # security headers (CSP, X-Frame-Options, HSTS,
                  # Permissions-Policy) on every path; must ride every
                  # deploy · its script hash pins index.html's inline
                  # bootstrap, so recompute the hash when that script changes
css/styles.css    # paper tokens, art, motion
js/main.js        # motion director (observer + rAF + fallback sweeps)
js/giving.js      # Chapter Eight: the listing form (posts to the ledger API)
js/wall.js        # Chapter Eight: the supporter wall (reads the ledger API)
assets/           # logo mark + device screenshots (web + full-res)
support/          # giving QR codes
```

## Deploy

Production: **Cloudflare Pages**, project `watchersbible` → https://watchersbible.pages.dev

Pages has no `.assetsignore`, so deploy a clean staging folder, never the repo root
(`.env.local`, `.git`, `.vercel`, `.taste-skill` must not go public):

```sh
rm -rf "$TEMP/wb-pages" && mkdir -p "$TEMP/wb-pages"
cp index.html privacy.html favicon.ico 404.html _headers "$TEMP/wb-pages/"
cp -r css js assets support "$TEMP/wb-pages/"
npx wrangler pages deploy "$TEMP/wb-pages" --project-name watchersbible --branch main
```

**Push = deploy.** `.github/workflows/deploy-pages.yml` watches `main`: every
push builds the staging folder in CI and deploys it through
`cloudflare/wrangler-action`. It needs two repository secrets
(`Settings → Secrets and variables → Actions`): `CLOUDFLARE_API_TOKEN`
(token with the "Cloudflare Pages · Edit" permission) and
`CLOUDFLARE_ACCOUNT_ID`. The manual recipe above stays as the fallback
(hotfixes when CI is down, local verification). No `_redirects` file: pretty
URLs are native on Pages, and 200-rewrites for `.html` caused a 307
self-loop on the old Workers setup. The Vercel mirror was **removed**
(2026-11-14): Cloudflare Pages is the only host.

## Placeholders to swap

Download links: the hero badge, the "download the APK directly" line, the
thank-you note and the chooser's APK row all point at the R2 APK. When the
Google Play listing goes public, swap the hero badge's `href` (the TODO
comment sits right above it in the markup) and turn the chooser's Google
Play row from an `am-soon` button into a plain `am-row` link. The App Store
row gets the same treatment when that listing lands. The web edition lives
at https://bibleonline.pages.dev (linked from the chooser's "Read on the
web" row).

## Motion & accessibility

Every animation is `transform`/`opacity`-only and guarded by `prefers-reduced-motion` (everything settles instantly). IntersectionObserver drives reveals; timed sweeps guarantee reveals even where observer delivery is slow.
