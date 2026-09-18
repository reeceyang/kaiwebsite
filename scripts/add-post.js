#!/usr/bin/env node

/**
 * Add one Substack post to the gallery, from its link.
 *
 *   node scripts/add-post.js https://goldenblue.substack.com/p/not-a-wolf
 *   node scripts/add-post.js not-a-wolf            # a bare slug works too
 *   node scripts/add-post.js <url> --force         # re-import, discarding edits
 *
 * It writes posts/<slug>.md — the editable source — and then runs the same build
 * as scripts/build-posts.js, so posts/<slug>.html and gallery-posts.js come out
 * the other side. Edit the markdown afterwards and re-run build-posts.js; this
 * script is only needed the once.
 *
 * It refuses to overwrite an existing .md without --force. That file is
 * hand-edited by definition, and a re-import would silently eat the edits.
 */

const P = require('./lib/posts');
const S = require('./lib/substack');
const { build } = require('./build-posts');

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const target = args.find(a => !a.startsWith('-'));
  if (!target) {
    console.error('usage: node scripts/add-post.js <substack-url|slug> [--force]');
    process.exit(1);
  }

  const slug = S.slugFrom(target);
  console.log(`Importing ${slug}...`);
  const { meta, body } = await S.importPost(slug, { force });

  const words = body.split(/\s+/).filter(w => /[a-z0-9]/i.test(w)).length;
  console.log(`  Wrote posts/${slug}.md — ${meta.category}, ~${words} words of markdown`);
  console.log('  Edit it if you like, then re-run: node scripts/build-posts.js\n');

  build(P.readManifest());
  console.log(`\n=== Added ${slug} ===`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
