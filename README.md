# Mohamed Abuzaid — live-event profile

The page behind the QR code on the printed event card.

| File | What it is |
|---|---|
| `index.html` | The profile page. One self-contained file — the portrait is embedded, so it works from any host with no external assets. |
| `card.html` | Print sheet for the 85 × 55 mm event card, front and back, with the QR already generated. Open it and print at 100%. |
| `legacy-profile.html` | The earlier bilingual one-pager this replaces. Kept for reference. |

## The page

Built on the SignalX / Beautiful Mind design system (`Assets-and-Material`),
Direction 3: navy-teal ground `#0A2641`, Saudi green `#1B6C3C` as the action
colour, gold demoted to accent, and the pastel alignment palette used as light
rather than as surface.

- **Bilingual EN / AR** with a full RTL flip. Arabic is never a footnote — the
  toggle swaps every string, and Latin logotypes and numeric runs are isolated
  so they don't mirror.
- **Counting statistics** — the track record animates in on scroll.
- **The flagship first.** SignalX leads: the five beats, the modelled revenue
  trajectory drawn on scroll, the ask, and the eight revenue streams.
- **Four more ventures**, each stating plainly what it gives the reader.
- **An audience selector.** Investor, enterprise CEO, government or campus —
  the pitch re-aims itself to whoever is holding the phone.
- Respects `prefers-reduced-motion`; no horizontal scroll at any width.

## Hosting

Production is Vercel, from `main`:

**https://mohamed-profile-and-investor-page.vercel.app**

That URL is what the QR on the card encodes. Two things make it work, and both
are already done or noted:

- Vercel Authentication (Deployment Protection) is **off** for this project.
  While it was on, every `.vercel.app` URL redirected to a Vercel sign-in page,
  which would have made the QR useless to anyone but the account owner. Custom
  domains are exempt from that protection; `.vercel.app` domains are not.
- The page must exist at `index.html` (lowercase) in the repo root for Vercel to
  serve it at `/`. The previous file was `Index.html`, which does not resolve.

`index.html` is standalone, so any other static host serves it too. `.nojekyll`
is present in case GitHub Pages is ever preferred.

If the page moves to a different URL, the QR in `card.html` must be regenerated —
it encodes the URL directly, and nothing redirects.
