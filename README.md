# Mohamed Abuzaid — one brand, two practices

A single self-contained profile site. Products and showcases are the **same list**:
every card is something you can book *and* the proof that it works. Click a card and
the showcase opens full-screen over the page — the visitor never leaves.

## Run it

Double-click `index.html`. That's it — no server needed, because the product list is
loaded by a `<script>` tag rather than `fetch()`.

Static files only. Any static host will serve it (Vercel, Netlify, GitHub Pages, Cloudflare).

### Putting it on Vercel without a terminal

1. Go to vercel.com → **Add New… → Project → Deploy**
2. Drag the whole `mohamed-brand` folder onto the upload area
3. Framework preset: **Other**. No build command, no output directory.

## Structure

    index.html              the page
    theme.css               LEAP Insights design system
    app.js                  nav, reveals, counters, cursor glow, grid, overlay
    data/showcases.js       >>> the only file you need to edit <<<
    data/showcases.json     same data as JSON — a fallback, kept in sync by hand
    assets/mohamed.jpg      hero portrait (also the header mark and the favicon)
    assets/story/*          the story film's certificates and field photographs
    media/avatar/*.mp4      the six avatar clips, served from this repo
    media/story/*.mp4       the ten-year management appreciation clip
    showcases/avatar.html   self-contained Avatar Studio player
    showcases/story.html    THE RECORD — the 22-year story film (card 02), 11 chapters
    showcases/second-brain.html  self-contained Second Brain / knowledge graph

## Adding or changing a product

Everything on the products grid comes from `data/showcases.js`. Add one object and a
card appears, already wired to its overlay. Fields:

| field      | what it does |
|------------|--------------|
| `id`       | unique key, used by `data-open-case` |
| `lane`     | `ai` or `practice` — the two showcase tabs. Software stays in `ai`, the executive practice in `practice`; they are never mixed |
| `practice` | `ai` (cyan accent) or `safety` (amber accent) |
| `icon`     | one glyph shown in the card tile |
| `from`     | the small line above the title — the platform or the certification |
| `headline` | the bookable offer, as the card title |
| `pitch`    | one sentence on the card |
| `who`      | the "For:" line |
| `tab`/`title`/`kicker`/`lede`/`bullets`/`tags` | the full-screen panel |
| `status`   | optional. `soon` shows a "Deployment stage" chip, `client` shows "Client delivery"; omit for a live product |
| `links`    | optional. `[{label, src}]` — extra outbound links rendered inside the record panel (used by the Masters Legacy card) |
| `cta`      | the card button. Name the outcome ("Explore SignalX live", "Play the 22-year story"), never a generic verb |
| `open`     | `{"type":"local","src":"./showcases/x.html"}` iframes the file, `{"type":"external","src":"https://…"}` renders a panel plus an outbound link, `{"type":"inline"}` renders the panel only |

The "Live engagements" cards (Al Rabie, Ministry of Education, Saudi Ceramics, Leap Connect) are
plain HTML in `index.html` under `#engagements`. They link out; commercial terms stay in the
proposal documents and never appear on this page.

## Notes

- **The page leads with one thesis** — "AI systems built on 22 years of enterprise rigor" — then a
  compact 4-stat grid (2×2 on phones), a grayscale trust strip of the organisations delivered for, and
  the two-tab showcase. Tabs, not an audience toggle: the same buyer often needs both lanes.
- **The QHSSE card sits at position 02**, right after SignalX, and opens `showcases/story.html`
  — a five-chapter auto-advancing story film (foundations → Lean/Kaizen → the field →
  recognition → what the managers said). Chapter durations are set per `<section data-dur>`;
  a playing video pauses the reel. Add photographs to `assets/story/` and a `<figure class="plate">`.
- **`theme.css` is the LEAP Bright system** — LEAP violet on a near-white ground with SignalX
  sage-teal and gold as the practice accents. Section headings use a split treatment: the
  `.grad` span renders as an outlined stroke, the rest filled. Cards carry a running light
  line (a rotating `--ang` conic gradient in the border).

- **Avatar videos are served from this repo** (`media/avatar/`, ~20 MB, moov atom moved
  to the front so playback starts before the download finishes). They used to point at
  Google Drive. Do not point them back.
- **The Saudi Ceramics page is open.** The access-code gate and the "Confidential & Proprietary"
  footer were removed on 2026-09-29 (unpaid demo prototype concept); the Campaign Engine card links
  straight to it and carries a "Client delivery" chip.
- **The story film is served from this repo.** `showcases/story.html` opens on the portrait
  `media/story/wft-10-years-appreciation.mp4` (with a poster frame), not the YouTube embed — the
  upload on YouTube has blurred side-pillars baked in. The reel waits on that chapter until the film
  has been watched through.
- `22 years` (graduated 2004) is the correct figure — not 17.
- MISA is shown as **Active Investor Registration 272796**, with no outbound link.
