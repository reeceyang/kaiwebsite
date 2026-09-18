#!/usr/bin/env node

/**
 * Sync the whole archive.
 *
 * 1. Reads every post from Substack's JSON API — authoritative for slugs,
 *    titles, subtitles, dates and tags
 * 2. Imports anything missing locally as posts/<slug>.md
 * 3. Renders the markdown-backed posts, rebuilds prev/next across every local
 *    post, and regenerates gallery-posts.js (all of that is build-posts.js)
 *
 * The archive API is used rather than the HTML archive page because it gives us
 * Substack's own slug. Deriving the slug from the title instead (what this
 * script used to do) disagrees with Substack on 6 of 76 posts, which means the
 * local filename stops matching the canonical URL.
 *
 * Two things it deliberately does not do:
 *
 * - It never rewrites a post that has only a posts/<slug>.html. Those 76 files
 *   are the record; nothing here regenerates one, beyond its prev/next links.
 * - Where a posts/<slug>.md exists, its frontmatter beats the API — otherwise a
 *   sync would quietly revert a hand-corrected category. That's a property of
 *   build(), which overlays markdown on whatever baseline it's given.
 *
 * To add a single post from its link instead, use scripts/add-post.js.
 *
 * Usage: node scripts/scrape-substack.js
 */

const fs = require('fs');
const path = require('path');

const P = require('./lib/posts');
const S = require('./lib/substack');
const { build } = require('./build-posts');

const has = (slug, ext) => fs.existsSync(path.join(P.POSTS_DIR, `${slug}.${ext}`));

async function main() {
  console.log('=== Substack archive sync ===\n');

  console.log('Fetching Substack archive...');
  const archive = await S.fetchArchive();
  console.log(`Found ${archive.length} posts in the archive\n`);

  const missing = archive.filter(p => !has(p.slug, 'html') && !has(p.slug, 'md'));

  if (!missing.length) {
    console.log('No new posts to import.\n');
  } else {
    console.log(`${missing.length} post(s) to import:`);
    missing.forEach(p => console.log(`  - ${p.title} (${p.slug})`));
    // Oldest first, so the navigation chain grows forward naturally.
    for (const post of missing.slice().reverse()) {
      try {
        const { meta } = await S.importPost(post.slug);
        console.log(`  Wrote posts/${post.slug}.md (${meta.category})`);
      } catch (e) {
        console.error(`  Error importing ${post.slug}: ${e.message}`);
      }
    }
    console.log('');
  }

  const { records, local } = build(archive);
  console.log(`\n=== Done! ${local.length}/${records.length} posts local ===`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
