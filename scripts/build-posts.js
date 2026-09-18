#!/usr/bin/env node

/**
 * Rebuild every markdown-backed post, and the manifest.
 *
 * Run this after hand-editing a posts/*.md. It touches the network **never**:
 * the records for the 76 HTML-only posts are read back out of gallery-posts.js,
 * and the records for md-backed posts come from their own frontmatter. So this
 * is the script that works on a plane.
 *
 * A post with a posts/<slug>.md is rebuilt from it, frontmatter and all. A post
 * with only posts/<slug>.html is left completely alone — nothing here rewrites
 * one, beyond its prev/next links.
 *
 * Usage: node scripts/build-posts.js
 */

const fs = require('fs');
const path = require('path');

const md = require('./lib/markdown');
const P = require('./lib/posts');

// Frontmatter is the source of truth for an md-backed post, so a missing field
// is a mistake worth stopping on rather than quietly defaulting.
function recordFromMarkdown(file) {
  const slug = path.basename(file, '.md');
  const { meta, body } = md.parseFrontmatter(fs.readFileSync(path.join(P.POSTS_DIR, file), 'utf8'));

  const need = k => {
    const v = meta[k];
    if (v === undefined || v === '') throw new Error(`posts/${file}: frontmatter is missing '${k}'`);
    return v;
  };

  const date = String(need('date')).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`posts/${file}: date '${date}' is not YYYY-MM-DD`);
  }
  const category = String(need('category')).trim();
  if (!P.CATEGORIES.includes(category)) {
    throw new Error(`posts/${file}: category '${category}' is not one of ${P.CATEGORIES.join(', ')}`);
  }

  return {
    slug,
    title: String(need('title')),
    subtitle: meta.subtitle === undefined ? '' : String(meta.subtitle),
    date,
    category,
    fav: meta.fav === true || meta.fav === 'true',
    local: true,
    body,
  };
}

// The shared tail of all three scripts. `baseline` is the record list to start
// from — the existing manifest for a plain rebuild, the Substack archive for a
// sync — and markdown always wins over it.
function build(baseline) {
  const records = baseline.map(r => ({
    ...r,
    // writeManifest() recounts from the rendered HTML and only falls back to
    // this, which is where a not-yet-local post's count has to come from.
    wordcount: r.wordcount === undefined ? r.words : r.wordcount,
  }));

  const mdFiles = fs.readdirSync(P.POSTS_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`${mdFiles.length} markdown post(s): ${mdFiles.map(f => path.basename(f, '.md')).join(', ') || '(none)'}`);

  mdFiles.forEach(file => {
    const rec = recordFromMarkdown(file);
    const at = records.findIndex(r => r.slug === rec.slug);
    if (at < 0) records.push(rec); else records[at] = { ...records[at], ...rec };
  });

  // Newest first, as the gallery and the navigation chain both expect. Sort is
  // stable, so two posts sharing a date keep the archive's own order.
  records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Render the md-backed posts. Every one is rewritten whole from its markdown,
  // which wipes its navigation; rebuildNavigation() below puts it back.
  let rendered = 0;
  records.filter(r => r.body !== undefined).forEach(rec => {
    const html = P.renderPost({
      slug: rec.slug,
      title: rec.title,
      date: rec.date,
      bodyHtml: md.markdownToHtml(rec.body),
    });
    const file = path.join(P.POSTS_DIR, `${rec.slug}.html`);
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    fs.writeFileSync(file, html);
    if (before !== html) rendered++;
  });
  console.log(`  Rendered ${rendered} post(s) from markdown`);

  const local = records.filter(r => fs.existsSync(path.join(P.POSTS_DIR, `${r.slug}.html`)));
  local.forEach(r => { r.local = true; });
  records.forEach(r => { if (r.local !== true) r.local = false; });

  P.ensureNavPlaceholders(local.map(r => r.slug));
  P.rebuildNavigation(local);
  P.writeManifest(records);

  return { records, local };
}

function main() {
  console.log('=== Rebuilding posts ===\n');
  const { records, local } = build(P.readManifest());
  console.log(`\n=== Done! ${local.length}/${records.length} posts local ===`);
}

module.exports = { build, recordFromMarkdown };

if (require.main === module) main();
