# Kai's Personal Website

Personal site for Kai van Brunt — writing, art, and a bit of research background.
Deployed to **kai.bleebo.dev** via GitHub Pages (see `CNAME`) straight off `main`.

**No build system.** Plain HTML/CSS/JS, no frameworks, no bundler, no external stylesheets. Every
page inlines its own `<style>`, which means the shared bits (the `:root` custom properties, the
`.menu-bar`, the hero rule) are *duplicated across ~80 files*. Changing one of them means a scripted
sweep, not an edit. That's the deliberate tradeoff: no toolchain to maintain, at the cost of
mechanical edits when a shared rule moves.

## Layout

```
index.html            home — bio, links, Tortellini
gallery.html          everything Kai has written or painted, one spatial page
collection.html       music / literature / movies Kai likes
writing.html          a redirect stub to gallery.html (old inbound links)
posts/*.html          76 posts, one file each, scraped from Substack
gallery-posts.js      GENERATED manifest of those 76 posts
gallery-art.js        hand-written manifest of the art
gallery.js            the gallery's comet-field engine
starfield.js          the background on every page, the gallery included
art/                  paintings
torties/              0.jpg … 21.jpg, photos of Tortellini
scripts/
  scrape-substack.js  pulls posts from goldenblue.substack.com, regenerates gallery-posts.js
  probe-gallery.js    headless-Chrome layout check for gallery.html
*.pdf                 CV and five papers, linked from index.html
```

## Theme system

`localStorage['theme']` is `'dark'` (default) or `'light'`; light mode sets `data-theme="light"` on
`<html>`. Each page has a tiny inline script in `<head>` that applies the attribute before first
paint to avoid a flash, and a `setTheme()` at the bottom that flips it and calls
`window.starfield.refresh()`.

Light mode is **the same night sky reverse-coloured** — light-red (`#F43208` family) stars and
comets on `#f5f5f5` — not a separate daytime design. One implementation serves both: `starfield.js`
reads `--star-color` and `--comet-color` from the root style and caches them, and `refresh()`
re-reads them. There is no `light-starfield.js`; don't reintroduce one.

The custom properties every page defines, in both `:root` blocks:
`--bg-color --text-color --border-color --heading-stroke --glow-color --marker-color`
`--backdrop-brightness --button-hover-bg --button-hover-text --date-color --star-color --comet-color`

Dark background is `#121212` (not pure black — deliberately). Accent red is `#F43208` everywhere.

## Fonts

Adobe Typekit, `https://use.typekit.net/xxz4zlr.css`: **brigade** for body, **waters-titling
condensedpro** for headings. Waters Titling is a titling face, so headings render as caps whatever
case the source is in.

Brigade ships **one weight (500) and no italic**, and Waters Titling only 600 — so `font-weight: 600`
on body text is a synthesized faux bold, and worth avoiding. Deliberate exception to "titling for
headings": the gallery's item titles (`.v-title`) are brigade at a larger size, so a preview reads as
mixed-case prose. The titling face is reserved for the hero. Don't "fix" that back.

The hero (`KAI VAN BRUNT`) uses `font-size: min(13.2ch, 15.8vw)` with `white-space: nowrap`. Both
numbers are measured, not guessed: 13.2ch is the design size, and 15.8vw is the largest that still
keeps the red drop shadow inside a 320px screen. It is continuous — no breakpoint — because a
media-query fallback used to overflow between ~640px and ~780px.

## gallery.html

The whole archive on one page: a dense field of diagonal comet trails that **is never drawn**, and
shows only where you point at it. Each piece sits in a rectangular **void** in that field. Filters
(`all · best · art · comics · fiction · poetry · essays`) are links in the top right, red-underlined
when active. Previews show only title, subtitle, date, and rounded word count — nothing else, on
purpose. Favourites (Substack's `Best` tag) get a red ✦, and `best` is the filter for them — not a
category but a flag cutting across all of them, so it's labelled with the same ✦ rather than a
legend, and only appears when some item carries the tag.

Three layers, back to front:

| | |
|---|---|
| `#starfield` | the same twinkling sky as every other page (`starfield.js`), at `z-index: -1` |
| `#live`      | viewport-sized, `position: fixed`, `z-index: 1`. The lit group, and nothing else |
| `.void`      | the pieces, `z-index: 10`. Opaque plates that read as holes in the sky |

The field being invisible until hovered was **not** the original design — it was drawn statically at
first. It turned out to be better, and the drawing was deleted rather than fixed.

How `gallery.js` works, roughly:

- One heading, `ANG = 28°`. Everything is done in `(u, v)` — along a trail and across the trails —
  and converted back to `(x, y)` at draw time.
- Positions are **deterministic per slug**: an FNV-1a hash of the slug seeds a mulberry32 PRNG, so a
  piece always lands in the same place and adding a post doesn't reshuffle the page.
- Layout is measure-then-place: set widths, one batched `offsetHeight` read, then round-robin lanes
  with a greedy push-down for collisions. Widths scale with word count.
- The hero and the menu bar have **no void** — the sky runs straight behind them, on purpose. The
  menu buttons are filled with `--bg-color` instead, so a label stays legible over the sky while the
  gaps between buttons still show it through. `.filters` is the only `.carve` element left, and it
  carries the class itself rather than the full-width row it sits in, so its plate hugs the links.
  Everything still works if you add the class back to something else.
- A filtered-out `.void` is absolutely positioned, so at `opacity: 0` it still overflows `#sky` and
  still counts toward the page's scroll height. `.out` (`display: none`) is added 450ms later, once
  it has faded, and removed *before* the batched height read so a returning piece has a real starting
  opacity to fade up from. Without it `poetry` was 561px of content in a 4,415px scrollable page.
- The trails still reach the bottom of the window even when the content doesn't, or a one- or
  two-item filter (`best` is four) leaves the last screenful with nothing in it to light.
- The ~4,000 trails are **geometry only**, generated once per page size and never stroked. They exist
  so there is a real, fixed field to light: the trail under the cursor is the same trail every time
  you return to that spot, and the sheaf under a piece is exactly the set that passes through it.
- **Voids are CSS, not canvas.** `.void::before` is a plate of `--bg-color` at `inset: -6px` under
  `filter: blur(6px)`, so the sky dissolves into it instead of ending on a cut. It's grown before
  being blurred because a blur eats inward too, and the piece's own box has to stay completely
  clear — measured against a flooded backdrop, the plate is ~99% opaque 4px inside the box and fully
  opaque from ~8px, ramping up from ~14px outside, and the text starts at 19–24px of padding.
- `.filters::before` overrides the inset to `-7px -8px`. Not wider: the row is flush right inside a
  container with 0.55rem of padding, and the pseudo-element's negatively-inset **layout box** is real
  even though its blur is only ink overflow — 9px gave 2px of horizontal scroll at 390px. Note this
  rule has to sit *below* the shared one; equal specificity resolves by document order.
- Because the plates are real elements above `#live` in the stacking order, **they occlude the glow
  for free** — a lit trail stops at a void edge with nothing masked. That is what a half-res carved
  alpha mask used to do. Overlapping plates are also safe where erasing twice was not:
  `destination-out` twice over a pixel removed `(1-a1)(1-a2)` where a union removes `max(a1,a2)`, so
  two feathers that met scrubbed a bright seam, and they do meet — the closest pair of voids in any
  filter at any width is 16px apart. Two opaque `source-over` plates only get more opaque.
- Nothing travels. `#live` only lights trails already in the field: the one under the cursor, or —
  when the cursor is over a piece — every trail crossing it, found with `trailsThrough()` (an
  axis-aligned slab test against the v-buckets). Both are cached per key and cross-faded over ~130ms.
- A lit group can run to a couple of hundred trails, far too many to re-stroke per frame, so it's
  rendered once into an offscreen canvas 32 trails at a time and blitted; groups over `BLOOM_MAX`
  drop the wide soft pass, which is what keeps an item's glow reading as a band rather than a
  floodlight. Scrolling fades the group out — the page has moved out from under the cursor — which
  also means a group is only ever built at one scroll position. A theme flip drops it, since it's
  baked in the old palette.
- Under `prefers-reduced-motion` or on touch the glow never boots, and the page is then just the
  starfield and the voids. Note `matchMedia('(hover: hover)')` is **false** in headless Chrome, so
  the glow layer correctly refuses to boot there unless you force
  `--blink-settings=primaryHoverType=2,availableHoverTypes=2,…`.

Art is the one kind of piece that renders itself in its void, and clicking it opens a lightbox.

### Adding work

- **A post**: run `node scripts/scrape-substack.js`. It reads the Substack archive API, writes any
  missing `posts/*.html`, rebuilds every post's prev/next links, and regenerates `gallery-posts.js`
  wholesale — so the manifest can't drift from the directory. Filenames use Substack's own `slug`
  verbatim (6 of 76 disagree with a title-derived slug, which used to break links). Category comes
  from the post's tags, defaults to `essays`, and is overridable in `CATEGORY_OVERRIDES` at the top
  of the script.
- **A painting**: drop the file in `art/` and append one record to `gallery-art.js`. The scraper
  never touches that file.

## Verification

`node scripts/probe-gallery.js [widths…]` renders `gallery.html` at each width in every filter state
and fails on box collisions, horizontal overflow, or a hero that wraps or overhangs. Two things it
exists to work around, both learned the hard way:

- `--dump-dom` clamps the headless viewport to a 500px minimum, so narrow layouts must be measured
  inside an explicitly-sized `<iframe>` (with `--allow-file-access-from-files`).
- Under `--virtual-time-budget`, CSS transitions never settle, so `getBoundingClientRect()` returns
  half-finished positions. The probe injects
  `*{transition:none!important;animation:none!important}` before measuring.

Also: `performance.now()` deltas read as 0ms under virtual time, so anything about frame cost has to
be measured over CDP in a real event loop instead. And a canvas taller than the headless viewport
isn't fully rasterized into a viewport screenshot — that looks like a painting bug but isn't.
**Headless has no GPU**, so every canvas number here is a software-rasterisation upper bound, and an
*idle* frame gap is already 33ms — anything under ~35ms is unmeasurable there, not fast. A
full-canvas `getImageData` readback also costs tens of ms itself and gets charged to the frame it
lands in, so a frame-gap window must contain no readback at all or the probe measures itself.

Anything about the voids or the glow has to be measured on **composited** pixels — a screenshot
decoded to RGB — not with `getImageData`. Occlusion by an opaque DOM plate and a plate's colour
against the page background are both invisible to a canvas readback. Two things that follow:

- Give the plates a **known backdrop** before measuring them: stop the starfield and flood its canvas
  with solid white (dark theme) or black (light). Against a live sky the contrast is a few stars and
  the edge ramp is unmeasurable. This is what showed the plate to be exactly `--bg-color` in both
  themes and pinned down the feather profile above.
- For the glow, diff a hover screenshot against a no-hover baseline with the sky stopped, so the lit
  group is the only thing that can differ. Exclude the hovered piece's own box — hover puts a
  `text-shadow` on its title and scales an art image — and sample a *different* void for occlusion.
  Inset that sample at least 6px: nearer the edge than that you are measuring the feather, not a
  hole, which reads as a 3-pixel leak and isn't one.

Do not trust a downscaled screenshot for anything near the background colour. Reading `#121212`
plates on a `#121212` page, I twice reported defects — plates lighter than the background, plates
with no text in them — that measurement then showed did not exist.

## Design notes

Bold display typography, heavy red accents, an animated sky behind everything, and a preference for
the quirky over the tidy — the gallery is a spatial field rather than a grid because that's the
point. Content stays readable first: text never waits on canvas work.
