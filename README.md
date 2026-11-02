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
css/styles.css    # paper tokens, art, motion
js/main.js        # motion director (observer + rAF + fallback sweeps)
assets/           # logo mark + device screenshots (web + full-res)
```

## Placeholders to swap

Download links are centralized in `index.html` (`#play-store`, `#app-store`, `#direct-apk`) — replace them when the store listings go live.

## Motion & accessibility

Every animation is `transform`/`opacity`-only and guarded by `prefers-reduced-motion` (everything settles instantly). IntersectionObserver drives reveals; timed sweeps guarantee reveals even where observer delivery is slow.
