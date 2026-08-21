#!/usr/bin/env node

/**
 * Layout probe for gallery.html.
 *
 * Renders the page inside an explicitly-sized iframe at several widths, in every
 * filter state, and reports overlapping voids, horizontal overflow, and whether
 * the hero still fits on one line.
 *
 * The iframe matters: `--dump-dom` clamps the headless viewport to a 500px
 * minimum, so measuring the top-level document lies about narrow layouts.
 * Killing transitions matters too: under `--virtual-time-budget` the CSS tweens
 * never settle, so getBoundingClientRect() returns half-finished positions and
 * every measurement looks like a collision.
 *
 * Usage: node scripts/probe-gallery.js [width ...]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = 'file://' + path.join(ROOT, 'gallery.html');
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const SIZES = WIDTHS.length ? WIDTHS : [320, 390, 768, 1024, 1440, 1920];
const CATS = ['all', 'art', 'comics', 'fiction', 'poetry', 'essays'];

const HARNESS = (w, h, cat) => `<!DOCTYPE html>
<style>html,body{margin:0}iframe{border:0;display:block}</style>
<iframe id="f" width="${w}" height="${h}" src="${TARGET}${cat === 'all' ? '' : '#' + cat}"></iframe>
<pre id="out">pending</pre>
<script>
const f = document.getElementById('f');
f.addEventListener('load', () => setTimeout(measure, 2500));

function measure() {
  const d = f.contentDocument, wnd = f.contentWindow;
  const kill = d.createElement('style');
  kill.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  d.head.appendChild(kill);
  void d.body.offsetHeight;

  const boxes = [...d.querySelectorAll('.void:not(.gone)')].map(el => {
    const r = el.getBoundingClientRect();
    return {
      t: el.querySelector('.v-title').textContent.trim().slice(0, 28),
      l: r.left, r: r.right, tp: r.top + wnd.scrollY, b: r.bottom + wnd.scrollY,
    };
  });

  const hits = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const oy = Math.min(a.b, b.b) - Math.max(a.tp, b.tp);
      if (ox > 0.5 && oy > 0.5) {
        hits.push(a.t + ' X ' + b.t + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ')');
      }
    }
  }

  const over = boxes.filter(b => b.l < -0.5 || b.r > ${w} + 0.5)
    .map(b => b.t + ' [' + Math.round(b.l) + '..' + Math.round(b.r) + ']');

  // white-space: nowrap means the hero can't wrap, so the failure mode to
  // watch is the glyphs running past the viewport instead. Count line boxes via
  // a Range anyway, in case the nowrap ever comes off.
  const h1 = d.querySelector('h1');
  const cs = wnd.getComputedStyle(h1);
  const range = d.createRange();
  range.selectNodeContents(h1);
  const tops = new Set([...range.getClientRects()].map(r => Math.round(r.top)));
  const lines = tops.size;
  // the h1 is a block, so its own rect is just the container width — measure the
  // glyphs. The red drop shadow sticks out 9px past the final one.
  const hr = range.getBoundingClientRect();
  const heroRight = Math.ceil(hr.right + 9);

  document.getElementById('out').textContent = JSON.stringify({
    items: boxes.length,
    collisions: hits,
    overflow: over,
    heroLines: lines,
    heroWidth: Math.round(hr.width),
    heroRight: heroRight,
    heroFont: cs.fontSize,
    pageHeight: Math.round(d.getElementById('sky').getBoundingClientRect().height + d.getElementById('sky').offsetTop),
    scrollWidth: d.documentElement.scrollWidth,
  });
}
</script>
`;

let failures = 0;

for (const w of SIZES) {
  for (const cat of CATS) {
    const file = path.join(ROOT, `_probe_${w}_${cat}.html`);
    fs.writeFileSync(file, HARNESS(w, 900, cat));
    let dom;
    try {
      dom = execFileSync('google-chrome', [
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--allow-file-access-from-files',
        '--virtual-time-budget=9000',
        `--window-size=${Math.max(w + 40, 560)},960`,
        '--dump-dom', 'file://' + file,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
    } finally {
      fs.unlinkSync(file);
    }

    const match = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
    if (!match || match[1] === 'pending') {
      console.log(`${w}px ${cat}: NO RESULT`);
      failures++;
      continue;
    }
    const r = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"));

    const bad = r.collisions.length || r.overflow.length || r.heroLines !== 1
      || r.scrollWidth > w || r.heroRight > w;
    if (bad) failures++;
    console.log(
      `${String(w).padStart(4)}px ${cat.padEnd(8)} ${String(r.items).padStart(2)} items` +
      `  h=${String(r.pageHeight).padStart(5)}` +
      `  hero=${r.heroLines}L/right${r.heroRight}@${r.heroFont}` +
      `  sw=${r.scrollWidth}` +
      (bad ? '  <-- ' : '  ok') +
      (r.collisions.length ? ` collide: ${r.collisions.join('; ')}` : '') +
      (r.overflow.length ? ` overflow: ${r.overflow.join('; ')}` : '')
    );
  }
}

console.log(failures ? `\n${failures} failing case(s)` : '\nall clean');
process.exit(failures ? 1 : 0);
