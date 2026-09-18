// substack.js — the only code in the repo that touches the network.
//
// Two endpoints, both on goldenblue.substack.com:
//
//   /api/v1/archive?sort=new&limit=20&offset=N   the post list, paginated
//   /api/v1/posts/<slug>                         one post, body_html included
//
// The per-post endpoint replaces what used to be a pair of regexes against the
// rendered page. Note /api/v1/posts/by-slug/<slug> 302s — don't use it.

const fs = require('fs');
const path = require('path');

const md = require('./markdown');
const P = require('./posts');

// Read the whole archive. `limit` caps at 20, so paginate.
async function fetchArchive() {
  const posts = [];
  for (let offset = 0; ; offset += 20) {
    const url = `${P.SUBSTACK_URL}/api/v1/archive?sort=new&limit=20&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`archive request failed: ${res.status}`);
    const page = await res.json();
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
        category: P.categoryFor(p.slug, tags),
      });
    });
    if (page.length < 20) break;
  }
  return posts;
}

// One post, with its body.
async function fetchPost(slug) {
  const url = `${P.SUBSTACK_URL}/api/v1/posts/${slug}`;
  const res = await fetch(url, { redirect: 'error' });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  const post = await res.json();
  if (post.slug !== slug) throw new Error(`asked for '${slug}', got '${post.slug}'`);
  if (!post.body_html) throw new Error(`'${slug}' has no body_html (paywalled, or not published?)`);
  return post;
}

// Fetch a post and write posts/<slug>.md. Refuses to clobber an existing .md
// without `force`: that file is hand-edited by definition.
async function importPost(slug, { force = false } = {}) {
  const mdPath = path.join(P.POSTS_DIR, `${slug}.md`);
  if (fs.existsSync(mdPath) && !force) {
    throw new Error(
      `posts/${slug}.md already exists and may have been edited by hand; ` +
      'pass --force to discard those edits and re-import'
    );
  }

  const post = await fetchPost(slug);
  const tags = (post.postTags || []).map(t => t.name);

  const meta = {
    title: post.title,
    // Substack stores a bare "-" for posts left without a subtitle.
    subtitle: (post.subtitle || '').trim() === '-' ? '' : (post.subtitle || '').trim(),
    date: post.post_date.slice(0, 10),
    // A first guess, from Substack's tags. It lands in the frontmatter, which is
    // where it becomes editable — nothing goes in CATEGORY_OVERRIDES for an
    // md-backed post, or the category would live in two places and drift.
    category: P.categoryFor(slug, tags),
    fav: tags.some(t => t.toLowerCase() === 'best'),
    substack: `${P.SUBSTACK_URL}/p/${slug}`,
  };

  const body = md.htmlToMarkdown(post.body_html);
  fs.writeFileSync(mdPath, md.serializeFrontmatter(meta) + '\n' + body);
  return { meta, body, path: mdPath };
}

// Accepts a full URL, a /p/<slug> path, or a bare slug.
function slugFrom(arg) {
  const m = arg.match(/\/p\/([^/?#]+)/);
  const slug = m ? m[1] : arg.replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    throw new Error(`can't read a slug out of '${arg}'`);
  }
  return slug;
}

module.exports = { fetchArchive, fetchPost, importPost, slugFrom };
