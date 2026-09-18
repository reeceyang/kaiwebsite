// posts.js — everything the three post scripts share: the page template, the
// manifest reader and writer, the navigation chain, and the word count.
//
// This is a plain CommonJS module with no dependencies, like the rest of the
// repo's tooling. Nothing here is aware of Substack; `add-post.js` and
// `scrape-substack.js` own the network.
//
// The one rule worth stating: `slug` always comes from a filename, never from a
// field. `posts/<slug>.html` and `posts/<slug>.md` are the same piece, and the
// slug is Substack's own, verbatim — 6 of 76 disagree with a title-derived slug,
// which used to break links.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const MANIFEST = path.join(ROOT, 'gallery-posts.js');
const SUBSTACK_URL = 'https://goldenblue.substack.com';

// Categories the gallery can filter by. 'art' lives in gallery-art.js and is
// never produced here — nothing on Substack is art.
const CATEGORIES = ['comics', 'fiction', 'poetry', 'essays'];

// Substack's own tags win where they exist, since they're Kai's labels.
const TAG_CATEGORY = { poetry: 'poetry', fiction: 'fiction' };

// Hand calls for pieces Substack has no tag for. Anything absent falls through
// to 'essays', which is right for the overwhelming majority of the archive.
//
// This map is only for HTML-only posts. A post with a `.md` carries its category
// in frontmatter instead — having it in two places would drift.
const CATEGORY_OVERRIDES = {
  '9010': 'comics',
  'parallel-universe': 'comics',
  'sea-creatures': 'poetry',
  // Tagged Poetry on Substack, but it's 5k words of prose with one poem in it.
  'everything-blends-with-everything': 'essays',
};

// The post page, verbatim as scrape-substack.js has always emitted it, so a
// re-render of an existing post is a no-op. Placeholders are filled by
// renderPost() below.
const POST_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <title>{{TITLE}} - Kai</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://use.typekit.net/xxz4zlr.css">
  <script>
    // Set theme immediately to avoid flash
    (function() {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    })();
  </script>
  <style>
    :root {
      --bg-color: #121212;
      --text-color: white;
      --border-color: white;
      --heading-stroke: lightgoldenrodyellow;
      --glow-color: lightgoldenrodyellow;
      --marker-color: lightgray;
      --backdrop-brightness: 0.5;
      --button-hover-bg: rgb(255, 255, 255);
      --button-hover-text: black;
      --date-color: #aaa;
      --star-color: rgba(255, 255, 255, 1);
      --comet-color: rgba(255, 255, 255, 1);
    }

    :root[data-theme="light"] {
      --bg-color: #f5f5f5;
      --text-color: #1a1a1a;
      --border-color: #333;
      --heading-stroke: rgba(244, 50, 8, 0.5);
      --glow-color: rgba(244, 50, 8, 0.3);
      --marker-color: #666;
      --backdrop-brightness: 1.5;
      --button-hover-bg: #1a1a1a;
      --button-hover-text: white;
      --date-color: #888;
      --star-color: rgba(244, 50, 8, 0.85);
      --comet-color: rgba(244, 50, 8, 0.7);
    }

    * {
      font-family: brigade, sans-serif;
      font-weight: 500;
      font-style: normal;
      color: var(--text-color);
      padding: 0;
      margin: 0;
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: "waters-titling-condensedpro", sans-serif;
      font-weight: 600;
      font-style: normal;
      -webkit-text-stroke-width: 0.5px;
      -webkit-text-stroke-color: var(--heading-stroke);
    }

    h2 {
      font-size: 2.2rem;
      margin-bottom: 0.55rem;
    }

    h3 {
      font-size: 1.5rem;
      margin-top: 1.1rem;
      margin-bottom: 0.55rem;
    }

    p {
      font-size: 1.1rem;
      padding-top: 0.55rem;
      padding-bottom: 0.55rem;
      line-height: 1.6;
    }

    em {
      font-style: italic;
    }

    a {
      text-underline-offset: 0.25rem;
      text-decoration-color: #F43208;
      color: var(--text-color);
    }

    blockquote {
      border-left: 3px solid var(--border-color);
      padding-left: 1.1rem;
      margin: 1.1rem 0;
      font-style: italic;
    }

    .post-date {
      font-style: italic;
      color: var(--date-color);
      font-size: 1rem;
      margin-bottom: 1.65rem;
      display: block;
    }

    canvas {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
    }

    body {
      overflow-x: clip;
      background-color: var(--bg-color);
    }

    .container {
      margin: auto;
      margin-top: unset;
      margin-bottom: unset;
      max-width: 71.5ch;
      padding: 0.55rem;
    }

    button {
      background-color: transparent;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 0.55rem;
      font-size: 1.1rem;
      cursor: pointer;
      margin-top: 0.55rem;
      margin-bottom: 0.55rem;
      backdrop-filter: blur(10px) brightness(var(--backdrop-brightness));
    }

    button:hover:not(:disabled) {
      background-color: var(--button-hover-bg);
      color: var(--button-hover-text);
    }

    .dashed {
      border: 1px dashed var(--border-color);
      box-sizing: border-box;
    }

    .backdrop {
      backdrop-filter: blur(10px) brightness(var(--backdrop-brightness));
    }

    .menu-bar {
      display: flex;
      justify-content: space-between;
      gap: 0.55rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      padding-top: 0;
      padding-bottom: 0;
    }

    .menu-bar button {
      flex: 1;
      margin-top: 0;
      margin-bottom: 0;
    }

    #theme-toggle {
      font-size: 1.2rem;
      line-height: 1;
    }

    .menu-bar button.active {
      box-shadow: 4px 4px 0px 0px #F43208;
    }

    .post-content {
      padding: 1.1rem;
    }

    .content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.1rem 0;
    }

    .content a {
      display: inline;
    }

    .content a img {
      cursor: pointer;
    }

    .post-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.1rem;
      margin-bottom: 1.1rem;
      gap: 1.1rem;
    }

    .nav-arrow {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      color: var(--text-color);
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .nav-arrow:hover {
      opacity: 1;
    }

    .nav-arrow .arrow {
      font-size: 1.5rem;
    }

    .nav-arrow .nav-title {
      font-style: italic;
      font-size: 0.95rem;
    }

    .prev-post {
      justify-content: flex-start;
    }

    .next-post {
      justify-content: flex-end;
      margin-left: auto;
    }

    .footnote {
      margin-top: 1.1rem;
      padding-top: 0.55rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.95rem;
    }

    .footnote-anchor {
      vertical-align: super;
      font-size: 0.8rem;
      text-decoration: none;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 1.1rem 0;
    }
  </style>
</head>
<body>
  <canvas id="starfield"></canvas>

  <nav class="menu-bar container" style="margin-top: 1.65rem;">
    <button id="home-btn">home</button>
    <button id="gallery-btn" class="active">gallery</button>
    <button id="collection-btn">collection</button>
    <button id="theme-toggle">☀</button>
  </nav>

  <div class="container post-navigation">
    {{PREV_NAV}}
    {{NEXT_NAV}}
  </div>

  <div class="container dashed backdrop">
    <div class="post-content">
      <h2>{{TITLE}}</h2>
      <span class="post-date">{{DATE}}</span>
      <div class="content">
      {{CONTENT}}
      </div>
    </div>
  </div>

  <div class="container" style="margin-top: 1.1rem; margin-bottom: 1.65rem;">
    <button id="return-to-top">↑ return to top</button>
  </div>

  <script src="../starfield.js"></script>
  <script>
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    function setTheme(theme) {
      if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☽';
      } else {
        root.removeAttribute('data-theme');
        themeToggle.textContent = '☀';
      }
      localStorage.setItem('theme', theme);
      window.starfield.refresh();
    }

    function toggleTheme() {
      const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    }

    themeToggle.addEventListener('click', toggleTheme);
    setTheme(localStorage.getItem('theme') || 'dark');

    document.getElementById('home-btn').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('gallery-btn').addEventListener('click', () => window.location.href = '../gallery.html');
    document.getElementById('collection-btn').addEventListener('click', () => window.location.href = '../collection.html');
    document.getElementById('return-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  </script>
</body>
</html>`;

// ---- small helpers -----------------------------------------------------

// e.g. "January 11, 2026"
function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

// Which category does a post belong to, given Substack's tags?
function categoryFor(slug, tags = []) {
  if (CATEGORY_OVERRIDES[slug]) return CATEGORY_OVERRIDES[slug];
  for (const tag of tags) {
    const cat = TAG_CATEGORY[tag.toLowerCase()];
    if (cat) return cat;
  }
  return 'essays';
}

// Word count from a local post file, so every count in the manifest is measured
// the same way. Substack's own wordcount is the fallback for posts we haven't
// scraped yet; the two agree to within a few percent.
function localWordCount(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.html`);
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<div class="content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  if (!match) return null;
  const text = match[1]
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  const words = text.split(/\s+/).filter(w => /[a-z0-9]/i.test(w));
  return words.length;
}

// ---- the page ----------------------------------------------------------

// Fill the template. Function replacers throughout, not replacement strings: a
// post body containing `$&` or `$1` would otherwise be spliced into itself.
function renderPost({ slug, title, date, bodyHtml }) {
  // A fresh page gets the hidden pair, so rebuildNavigation() has something to
  // match and rewrite — it looks for real .nav-arrow anchors, not placeholders.
  const { prevNav, nextNav } = createNavHtml(null, null);
  const fill = { TITLE: title, DATE: formatDateLong(date), CONTENT: bodyHtml, PREV_NAV: prevNav, NEXT_NAV: nextNav };
  const html = POST_TEMPLATE.replace(/\{\{(TITLE|DATE|CONTENT|PREV_NAV|NEXT_NAV)\}\}/g, (m, key) => fill[key]);
  if (/\{\{[A-Z_]+\}\}/.test(html)) {
    throw new Error(`${slug}: unfilled placeholder ${html.match(/\{\{[A-Z_]+\}\}/)[0]}`);
  }
  return html;
}

// ---- navigation --------------------------------------------------------

// ← goes to the newer post, → to the older one.
function createNavHtml(newer, older) {
  const prevNav = newer
    ? `<a href="${newer.slug}.html" class="nav-arrow prev-post">
      <span class="arrow">←</span>
      <span class="nav-title">${newer.title}</span>
    </a>`
    : `<a href="#" class="nav-arrow prev-post" style="visibility: hidden;">
      <span class="arrow">←</span>
      <span class="nav-title"></span>
    </a>`;

  const nextNav = older
    ? `<a href="${older.slug}.html" class="nav-arrow next-post">
      <span class="nav-title">${older.title}</span>
      <span class="arrow">→</span>
    </a>`
    : `<a href="#" class="nav-arrow next-post" style="visibility: hidden;">
      <span class="nav-title"></span>
      <span class="arrow">→</span>
    </a>`;

  return { prevNav, nextNav };
}

// Rebuild prev/next across every local post from the archive order. Doing the
// whole chain in one pass is simpler than patching the ends incrementally, and
// it self-heals if a post was ever inserted out of order. It's also what puts
// the navigation back after a post has been re-rendered from its markdown.
function rebuildNavigation(localPosts) {
  let touched = 0;
  localPosts.forEach((post, i) => {
    const { prevNav, nextNav } = createNavHtml(localPosts[i - 1], localPosts[i + 1]);
    const filePath = path.join(POSTS_DIR, `${post.slug}.html`);
    const before = fs.readFileSync(filePath, 'utf8');
    const after = before
      .replace(
        /<a href="[^"]*" class="nav-arrow prev-post"[^>]*>\s*<span class="arrow">←<\/span>\s*<span class="nav-title">[^<]*<\/span>\s*<\/a>/,
        () => prevNav
      )
      .replace(
        /<a href="[^"]*" class="nav-arrow next-post"[^>]*>\s*<span class="nav-title">[^<]*<\/span>\s*<span class="arrow">→<\/span>\s*<\/a>/,
        () => nextNav
      );
    if (after === before) return;
    fs.writeFileSync(filePath, after);
    touched++;
  });
  console.log(`  Rewrote navigation in ${touched} post(s)`);
}

// A post written before the navigation existed has no anchors for
// rebuildNavigation() to match, only the empty container. Give it the hidden
// pair first.
function ensureNavPlaceholders(slugs) {
  slugs.forEach(slug => {
    const filePath = path.join(POSTS_DIR, `${slug}.html`);
    if (!fs.existsSync(filePath)) return;
    const html = fs.readFileSync(filePath, 'utf8');
    if (html.includes('class="nav-arrow prev-post"')) return;
    const { prevNav, nextNav } = createNavHtml(null, null);
    fs.writeFileSync(filePath, html.replace(
      /(<div class="container post-navigation">)\s*(<\/div>)/,
      () => `<div class="container post-navigation">\n    ${prevNav}\n    ${nextNav}\n  </div>`
    ));
  });
}

// ---- the manifest ------------------------------------------------------

// Read gallery-posts.js back. It is just `window.GALLERY_POSTS = [...]`, so
// running it against a stub object recovers the records with no parser and no
// dependency. This is what lets build-posts.js work **offline**: the records for
// the 76 HTML-only posts come from here rather than from the API.
function readManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  const win = {};
  new Function('window', fs.readFileSync(MANIFEST, 'utf8'))(win);
  return win.GALLERY_POSTS || [];
}

// Write gallery-posts.js — the manifest gallery.html reads. Regenerated whole
// every run, so it never drifts from posts/.
function writeManifest(posts) {
  const records = posts.map(p => {
    // A word count is meaningless for a comic, so drop it rather than print
    // "~30 words" under a drawing.
    const counted = localWordCount(p.slug);
    const words = p.category === 'comics' ? null : (counted == null ? p.wordcount : counted) || null;
    // Substack stores a bare "-" for posts Kai left without a subtitle.
    const subtitle = (p.subtitle || '').trim() === '-' ? '' : (p.subtitle || '');
    const fields = [
      `slug: ${JSON.stringify(p.slug)}`,
      `title: ${JSON.stringify(p.title)}`,
      `subtitle: ${JSON.stringify(subtitle)}`,
      `date: ${JSON.stringify(p.date)}`,
      `words: ${words}`,
      `category: ${JSON.stringify(p.category)}`,
      `local: ${p.local}`,
    ];
    if (p.fav) fields.push('fav: true');
    return '  { ' + fields.join(', ') + ' },';
  });

  const counts = {};
  posts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  const out = `// GENERATED by scripts/build-posts.js — do not edit by hand.
// Every post on goldenblue.substack.com, newest first. A post with a
// posts/<slug>.md takes its title, subtitle, date, category and 'fav' from that
// file's frontmatter; the rest take them from Substack's own archive API, with
// categories from Substack's tags where they exist, from CATEGORY_OVERRIDES in
// scripts/lib/posts.js otherwise, and 'essays' as the default. 'fav' mirrors
// Kai's "Best" tag.
// Word counts are counted from posts/<slug>.html; posts with no local file yet
// fall back to Substack's own wordcount.
//
// Art lives in gallery-art.js, which none of these scripts touch.
//
// ${posts.length} pieces: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.
window.GALLERY_POSTS = [
${records.join('\n')}
];
`;
  fs.writeFileSync(MANIFEST, out);
  console.log(`  Wrote ${path.basename(MANIFEST)} (${posts.length} records)`);
}

module.exports = {
  ROOT, POSTS_DIR, MANIFEST, SUBSTACK_URL,
  CATEGORIES, TAG_CATEGORY, CATEGORY_OVERRIDES,
  POST_TEMPLATE,
  formatDateLong, categoryFor, localWordCount,
  renderPost, createNavHtml, rebuildNavigation, ensureNavPlaceholders,
  readManifest, writeManifest,
};
