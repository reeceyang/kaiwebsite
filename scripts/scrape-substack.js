#!/usr/bin/env node

/**
 * Substack Post Scraper for Kai's Website
 *
 * This script:
 * 1. Reads the full archive from Substack's JSON API (authoritative for slugs,
 *    titles, subtitles, dates and tags)
 * 2. Compares it with the files in posts/ and scrapes anything missing
 * 3. Rebuilds the prev/next navigation across every local post
 * 4. Regenerates gallery-posts.js, the manifest gallery.html reads
 *
 * The archive API is used rather than scraping the HTML archive page because it
 * gives us Substack's own slug. Deriving the slug from the title instead (what
 * this script used to do) disagrees with Substack on 6 of 76 posts, which means
 * the local filename stops matching the canonical URL.
 *
 * Usage: node scripts/scrape-substack.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SUBSTACK_URL = 'https://goldenblue.substack.com';
const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const MANIFEST = path.join(ROOT, 'gallery-posts.js');

// Categories the gallery can filter by. 'art' lives in gallery-art.js and is
// never produced here — nothing on Substack is art.
const CATEGORIES = ['comics', 'fiction', 'poetry', 'essays'];

// Substack's own tags win where they exist, since they're Kai's labels.
const TAG_CATEGORY = { poetry: 'poetry', fiction: 'fiction' };

// Hand calls for pieces Substack has no tag for. Anything absent falls through
// to 'essays', which is right for the overwhelming majority of the archive.
const CATEGORY_OVERRIDES = {
  '9010': 'comics',
  'parallel-universe': 'comics',
  'sea-creatures': 'poetry',
  // Tagged Poetry on Substack, but it's 5k words of prose with one poem in it.
  'everything-blends-with-everything': 'essays',
};

// Substack wraps every image in a restack/expand button pair. Matching the whole
// block by shape rather than by literal string, because Substack rewrites the
// attributes inside it now and then — an exact-string match silently stopped
// working and left the buttons in one post.
const BUTTON_PATTERN = /<div class="image-link-expand">[\s\S]*?<\/button><\/div><\/div>/g;

// Post template
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

// Helper: Format date for display (e.g., "January 11, 2026")
function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

// Helper: Remove image buttons from content
function removeImageButtons(content) {
  return content.replace(BUTTON_PATTERN, '');
}

// Helper: Which category does a post belong to?
function categoryFor(post) {
  if (CATEGORY_OVERRIDES[post.slug]) return CATEGORY_OVERRIDES[post.slug];
  for (const tag of post.tags) {
    const cat = TAG_CATEGORY[tag.toLowerCase()];
    if (cat) return cat;
  }
  return 'essays';
}

// Helper: Word count from a local post file, so every count in the manifest is
// measured the same way. Substack's own wordcount is the fallback for posts we
// haven't scraped yet; the two agree to within a few percent.
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

// Helper: Create navigation HTML. ← goes to the newer post, → to the older one.
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
// it self-heals if a post was ever inserted out of order.
function rebuildNavigation(localPosts) {
  let touched = 0;
  localPosts.forEach((post, i) => {
    const { prevNav, nextNav } = createNavHtml(localPosts[i - 1], localPosts[i + 1]);
    const filePath = path.join(POSTS_DIR, `${post.slug}.html`);
    const before = fs.readFileSync(filePath, 'utf8');
    const after = before
      .replace(
        /<a href="[^"]*" class="nav-arrow prev-post"[^>]*>\s*<span class="arrow">←<\/span>\s*<span class="nav-title">[^<]*<\/span>\s*<\/a>/,
        prevNav
      )
      .replace(
        /<a href="[^"]*" class="nav-arrow next-post"[^>]*>\s*<span class="nav-title">[^<]*<\/span>\s*<span class="arrow">→<\/span>\s*<\/a>/,
        nextNav
      );
    if (after === before) return;
    fs.writeFileSync(filePath, after);
    touched++;
  });
  console.log(`  Rewrote navigation in ${touched} post(s)`);
}

// Write gallery-posts.js — the manifest gallery.html reads. Regenerated whole
// every run, so it never drifts from posts/ or from Substack.
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

  const out = `// GENERATED by scripts/scrape-substack.js — do not edit by hand.
// Every post on goldenblue.substack.com, newest first. Categories come from
// Substack's own tags where they exist, from CATEGORY_OVERRIDES in the scraper
// otherwise, and default to 'essays'. 'fav' mirrors Kai's "Best" tag.
// Word counts are counted from posts/<slug>.html; posts with no local file yet
// fall back to Substack's own wordcount.
//
// Art lives in gallery-art.js, which this script never touches.
//
// ${posts.length} pieces: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.
window.GALLERY_POSTS = [
${records.join('\n')}
];
`;
  fs.writeFileSync(MANIFEST, out);
  console.log(`  Wrote ${path.basename(MANIFEST)} (${posts.length} records)`);
}

// Main scraping function
async function scrapePost(url) {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url);
  const html = await response.text();

  // Extract content - look for the main post body
  let content = '';

  const bodyMatch = html.match(/<div[^>]*class="[^"]*body markup[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*(?:<div[^>]*class="[^"]*post-footer|<div[^>]*class="[^"]*subscribe)/i)
    || html.match(/<div[^>]*class="[^"]*available-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*subscribe|<div[^>]*class="[^"]*paywall)/i);

  if (bodyMatch) {
    content = bodyMatch[1];
  } else {
    // Fallback: try to extract from JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        if (data.articleBody) {
          content = `<p>${data.articleBody.replace(/\n\n/g, '</p><p>')}</p>`;
        }
      } catch (e) {}
    }
  }

  if (!content.trim()) throw new Error('could not find post body');

  // Clean up content
  content = removeImageButtons(content);

  // Remove subscription prompts and other Substack UI elements
  content = content.replace(/<div[^>]*class="[^"]*subscription-widget[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  content = content.replace(/<div[^>]*class="[^"]*captioned-button-wrap[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  content = content.replace(/<a[^>]*class="[^"]*button[^"]*"[^>]*>Subscribe<\/a>/gi, '');

  // Remove poetry block notice text
  content = content.split('Text within this block will maintain its original spacing when published').join('');

  return content;
}

// Read the whole archive from the JSON API. `limit` caps at 20, so paginate.
async function fetchArchive() {
  console.log('Fetching Substack archive...');
  const posts = [];
  for (let offset = 0; ; offset += 20) {
    const url = `${SUBSTACK_URL}/api/v1/archive?sort=new&limit=20&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`archive request failed: ${response.status}`);
    const page = await response.json();
    if (!page.length) break;
    page.forEach(p => {
      const tags = (p.postTags || []).map(t => t.name);
      posts.push({
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle || '',
        date: p.post_date.slice(0, 10),
        wordcount: p.wordcount,
        tags,
        fav: tags.some(t => t.toLowerCase() === 'best'),
        url: `${SUBSTACK_URL}/p/${p.slug}`,
      });
    });
    if (page.length < 20) break;
  }
  return posts;
}

// Main function
async function main() {
  console.log('=== Substack Post Scraper ===\n');

  const archive = await fetchArchive();
  console.log(`Found ${archive.length} posts in the archive\n`);

  archive.forEach(p => { p.category = categoryFor(p); });

  const missing = archive.filter(p => !fs.existsSync(path.join(POSTS_DIR, `${p.slug}.html`)));

  if (missing.length === 0) {
    console.log('No new posts to scrape.');
  } else {
    console.log(`${missing.length} post(s) to scrape:`);
    missing.forEach(p => console.log(`  - ${p.title} (${p.slug})`));

    // Oldest first, so navigation chains forward naturally as files appear.
    for (const post of missing.slice().reverse()) {
      console.log(`\nProcessing: ${post.title}`);
      try {
        const content = await scrapePost(post.url);
        const html = POST_TEMPLATE
          .replace(/{{TITLE}}/g, post.title)
          .replace(/{{DATE}}/g, formatDateLong(post.date))
          .replace(/{{CONTENT}}/g, content)
          .replace(/{{PREV_NAV}}/g, '')
          .replace(/{{NEXT_NAV}}/g, '');
        fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.html`), html);
        console.log(`  Created: ${post.slug}.html`);
      } catch (error) {
        console.error(`  Error processing ${post.title}:`, error.message);
      }
    }
  }

  // A newly written post has empty nav placeholders; give it a real (hidden or
  // linked) pair before rebuilding the chain.
  archive.forEach(p => {
    const filePath = path.join(POSTS_DIR, `${p.slug}.html`);
    if (!fs.existsSync(filePath)) return;
    const html = fs.readFileSync(filePath, 'utf8');
    if (html.includes('class="nav-arrow prev-post"')) return;
    const { prevNav, nextNav } = createNavHtml(null, null);
    fs.writeFileSync(filePath, html.replace(
      /(<div class="container post-navigation">)\s*(<\/div>)/,
      `$1\n    ${prevNav}\n    ${nextNav}\n  $2`
    ));
  });

  console.log('');
  const local = archive.filter(p => fs.existsSync(path.join(POSTS_DIR, `${p.slug}.html`)));
  local.forEach(p => { p.local = true; });
  archive.forEach(p => { if (p.local !== true) p.local = false; });
  rebuildNavigation(local);
  writeManifest(archive);

  console.log(`\n=== Done! ${local.length}/${archive.length} posts local ===`);
}

main().catch(console.error);
