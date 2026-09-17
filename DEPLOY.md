# Deploying this profile

Static site — no build step, no dependencies.

## Structure
- `index.html` — the profile (10 showcase cards, overlay viewer)
- `theme.css`, `app.js` — LEAP Bright styling and the card/overlay logic
- `data/showcases.json` + `data/showcases.js` — card content (edit here, not in the HTML)
- `showcases/story.html` — the 22-year story film (11 chapters, galleries, certificates)
- `showcases/second-brain.html` — Cowork OS demo: dashboard + 3D/2D brain, live in one page
- `showcases/brain/` — the four self-contained Cowork OS pages the demo embeds
- `assets/`, `media/` — photographs, certificate scans, videos, CV PDF

## Vercel
1. Push the folder to `MohamedSignalx/beautiful-mind-cowork-os` (or its own repo).
2. Vercel → New Project → import the repo.
3. Framework preset: **Other**. Build command: none. Output directory: `/` (or the folder this file sits in).
4. Deploy.

Everything is relative-path, so it also works from a subdirectory or from `file://`.

## Before shipping
- The CV download link works on a real domain; the preview sandbox blocks direct asset downloads.
- Certificate scans are full-resolution. If first load feels heavy, downscale them and keep the originals as the click-through target.
