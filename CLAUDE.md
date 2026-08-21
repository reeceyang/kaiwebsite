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
starfield.js          the background on every page except the gallery
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

The whole archive on one page: a dense field of diagonal comet trails, with each piece sitting in a
rectangular **void** genuinely carved out of the field (`globalCompositeOperation =
'destination-out'`, not a card drawn on top). Filters (`all · art · comics · fiction · poetry ·
essays`) are links in the top right, red-underlined when active. Previews show only title, subtitle,
date, and rounded word count — nothing else, on purpose. Favourites (Substack's `Best` tag) get a
red ✦.

How `gallery.js` works, roughly:

- One heading, `ANG = 28°`. Everything is done in `(u, v)` — along a trail and across the trails —
  and converted back to `(x, y)` at draw time.
- Positions are **deterministic per slug**: an FNV-1a hash of the slug seeds a mulberry32 PRNG, so a
  piece always lands in the same place and adding a post doesn't reshuffle the page.
- Layout is measure-then-place: set widths, one batched `offsetHeight` read, then round-robin lanes
  with a greedy push-down for collisions. Widths scale with word count.
- The hero and the menu bar have **no void** — the field runs straight behind them, on purpose. The
  filter row is the only `.carve` element left. Everything still works if you add the class back.
- A filtered-out `.void` is absolutely positioned, so at `opacity: 0` it still overflows `#sky` and
  still counts toward the page's scroll height. `.out` (`display: none`) is added 450ms later, once
  it has faded, and removed *before* the batched height read so a returning piece has a real starting
  opacity to fade up from. Without it `poetry` was 561px of content in a 4,415px scrollable page.
- The field is never shorter than the window, or a one-item filter leaves bare background below it.
- The field (~4,000 gradient strokes) is stroked **once** into an offscreen `pristine` canvas, a
  slice per frame, in **top-down order** (`ymin`) rather than the generated across-axis order — the
  reader is at the top, so the first screenful should be the first thing finished.
- Void edges are **feathered**, not cut: `carve()` grows each rect by `GROW` and erases it through
  `ctx.filter = blur(FEATHER)`, so the whole soft transition falls outside the piece's own box (the
  field measures 0 alpha from ~7px inside the box, ramping back to full ~15px outside). `ctx.filter`
  blurs in **device** space, so `carve()` takes a `scale` — without it the feather would be half as
  wide on a 2× display.
- That carve is not run per blit. It's baked once per layout into `fieldMask`, a half-res alpha mask,
  and `blitField()` applies it with `destination-in`. `blitField(y0, y1)` can do a **band** only, and
  the bake uses that: the page is ~4,500px and the window ~800px, a whole-canvas blit costs ~80ms
  (mostly scaling the mask up), and a bake blits ten-odd times — which had put ~880ms of a ~1350ms
  bake into redrawing rows nobody was looking at. Banding it took the bake to ~760ms. A banded
  `destination-in` **must be clipped**, or it erases the destination everywhere the source isn't.
- All rects go into **one path per carve**, for correctness rather than speed: `destination-out`
  twice over a pixel removes `(1-a1)(1-a2)` where a union removes `max(a1,a2)`, so two feathers that
  met would scrub a bright seam. They do meet — the closest pair of voids in any filter at any width
  is 16px apart. The cost is that a blurred fill is charged for its whole region, so a full-res
  carve of the 1440×4566 `all` layout is ~200ms of software rasterisation against 4.8ms unblurred —
  which is why it's cached as a half-res mask rather than repeated. Three cheaper schemes were
  measured and rejected; the comment above `FEATHER` records why.
- Nothing travels. A `position: fixed` overlay canvas only lights trails **already in the field**:
  the one under the cursor, or — when the cursor is over a piece — every trail crossing it, found
  with `trailsThrough()` (an axis-aligned slab test against the v-buckets). Both are cached per key
  and cross-faded over ~130ms.
- A lit group can run to a couple of hundred trails, far too many to re-stroke per frame, so it's
  rendered once into an offscreen canvas 32 trails at a time and blitted; groups over `BLOOM_MAX`
  drop the wide soft pass, which is what keeps an item's glow reading as a band rather than a
  floodlight. The voids are re-applied to it as a reusable half-res alpha mask (`maskFor`), so a lit
  trail still stops at a void edge. Scrolling fades the group out — the page has moved out from
  under the cursor — which also means a group is only ever built at one scroll position.
- Everything degrades to the static carved field under `prefers-reduced-motion` and on touch, which
  is the whole design minus the glow. Note `matchMedia('(hover: hover)')` is **false** in headless
  Chrome, so the glow layer correctly refuses to boot there unless you force
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

Two traps specific to measuring the glow layer, both of which produced phantom regressions:

- **Headless has no GPU**, so every canvas number above is a software-rasterisation upper bound, and
  an *idle* frame gap is already 33ms. Anything under ~35ms is unmeasurable there, not fast.
- A full-canvas `getImageData` readback costs tens of ms **itself** and gets charged to the frame it
  lands in. Frame-gap windows have to contain no readback at all, or the probe measures itself. The
  session-wide spikes in such a run are `repaintPristine()` on a theme flip re-stroking the whole
  field, not the hover layer — the same streaming path as first paint. They were 200–250ms before
  the banded blit; the worst gap in a full probe run is now 67ms.

## Design notes

Bold display typography, heavy red accents, an animated sky behind everything, and a preference for
the quirky over the tidy — the gallery is a spatial field rather than a grid because that's the
point. Content stays readable first: text never waits on canvas work.
