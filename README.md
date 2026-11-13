# Watchers Bible · Landing Page

The official marketing landing page for [Watchers Bible](https://github.com/) — a free, offline, ad-free Bible app for Android and iOS.

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
css/styles.css    # paper tokens, art, motion
js/main.js        # motion director (observer + rAF + fallback sweeps)
assets/           # logo mark + device screenshots (web + full-res)
support/          # giving QR codes
```

## Deploy

Production: **Cloudflare Pages**, project `watchersbible` → https://watchersbible.pages.dev

Pages has no `.assetsignore`, so deploy a clean staging folder, never the repo root
(`.env.local`, `.git`, `.vercel`, `.taste-skill` must not go public):

```sh
rm -rf "$TEMP/wb-pages" && mkdir -p "$TEMP/wb-pages"
cp index.html privacy.html favicon.ico 404.html "$TEMP/wb-pages/"
cp -r css js assets support "$TEMP/wb-pages/"
npx wrangler pages deploy "$TEMP/wb-pages" --project-name watchersbible --branch main
```

The Vercel mirror was **removed** (2026-11-14) — this repo no longer auto-deploys anywhere on push; Cloudflare Pages is the only host. No `_redirects` file: pretty URLs are native on Pages, and 200-rewrites for `.html` caused a 307 self-loop on the old Workers setup.

## Placeholders to swap

Download links are centralized in `index.html` (`#play-store`, `#app-store`, `#direct-apk`) — replace them when the store listings go live.

## Motion & accessibility

Every animation is `transform`/`opacity`-only and guarded by `prefers-reduced-motion` (everything settles instantly). IntersectionObserver drives reveals; timed sweeps guarantee reveals even where observer delivery is slow.
