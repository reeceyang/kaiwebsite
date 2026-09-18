// markdown.js — the editable layer between Substack and posts/*.html.
//
// Two conversions and a frontmatter parser, with **no dependencies**. The repo
// has no package.json and shouldn't grow one, so this is a deliberately small
// markdown subset rather than a general implementation: enough to hold what Kai
// actually writes, with a raw-HTML escape hatch for everything else.
//
// The escape hatch is the important part. Any top-level line starting with `<`
// is passed through verbatim, so anything the subset can't express — a captioned
// figure, footnotes, poetry whose spacing matters — can just be written as HTML
// inside the .md. That's why the subset doesn't need to grow.

// Substack wraps every image in a restack/expand button pair. Matched by shape
// rather than by literal string, because Substack rewrites the attributes inside
// it now and then — an exact-string match silently stopped working once and left
// the buttons in one post.
const BUTTON_PATTERN = /<div class="image-link-expand">[\s\S]*?<\/button><\/div><\/div>/g;

// A Substack image: <div class="captioned-image-container"><figure>…</figure></div>.
// Reliably ends with </figure></div>, which is what makes it matchable without
// counting nested divs.
const FIGURE_PATTERN =
  /<div[^>]*class="[^"]*captioned-image-container[^"]*"[^>]*>\s*<figure[^>]*>([\s\S]*?)<\/figure>\s*<\/div>/gi;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', middot: '·', bull: '•', deg: '°',
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => {
      const v = ENTITIES[n.toLowerCase()];
      return v === undefined ? m : v;
    });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '="([^"]*)"', 'i'));
  return m ? m[1] : '';
}

// ---- frontmatter -------------------------------------------------------

// Split on the FIRST colon only: a title can contain one, and often contains
// commas. Quotes around a value are optional and stripped if present.
function parseFrontmatter(text) {
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  m[1].split(/\r?\n/).forEach(line => {
    if (!line.trim() || /^\s*#/.test(line)) return;
    const i = line.indexOf(':');
    if (i < 0) return;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.length > 1 && /^(".*"|'.*')$/.test(val)) val = val.slice(1, -1);
    meta[key] = val === 'true' ? true : val === 'false' ? false : val;
  });
  return { meta, body: text.slice(m[0].length) };
}

// Fixed key order, so a rebuild never reshuffles a file and shows up as a diff.
const FM_ORDER = ['title', 'subtitle', 'date', 'category', 'fav', 'substack'];

function serializeFrontmatter(meta) {
  const keys = FM_ORDER.filter(k => k in meta)
    .concat(Object.keys(meta).filter(k => !FM_ORDER.includes(k)));
  const lines = keys.map(k => {
    const v = meta[k];
    if (v === undefined || v === null || v === '') return `${k}:`;
    // Quote only where leading/trailing space would otherwise be lost, or where
    // the value would parse back as a boolean.
    const s = String(v);
    const needsQuotes = s !== s.trim() || /^(true|false)$/.test(s) && typeof v !== 'boolean';
    return `${k}: ${needsQuotes ? JSON.stringify(s) : s}`;
  });
  return '---\n' + lines.join('\n') + '\n---\n';
}

// ---- Substack HTML -> markdown ----------------------------------------

function htmlToMarkdown(html) {
  // Blocks that must survive verbatim, parked behind placeholders. The sentinel
  // is a NUL, written as an escape so it can't be mistyped: it is not
  // whitespace, so the tidy-up pass at the end leaves it alone, and it cannot
  // collide with prose the way a space-delimited ` 12 ` placeholder could.
  const keep = [];
  const stash = (str, block) => {
    keep.push({ str, block });
    return '\u0000' + (keep.length - 1) + '\u0000';
  };

  let s = html;

  // 1. Substack furniture that is never content.
  s = s.replace(BUTTON_PATTERN, '');
  s = s.replace(/<div[^>]*class="[^"]*subscription-widget[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  s = s.replace(/<div[^>]*class="[^"]*captioned-button-wrap[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  s = s.replace(/<a[^>]*class="[^"]*button[^"]*"[^>]*>Subscribe<\/a>/gi, '');
  s = s.split('Text within this block will maintain its original spacing when published').join('');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  s = s.replace(/<button[\s\S]*?<\/button>/gi, '');

  // 2. Images, before the div soup around them gets flattened. Substack ships
  //    ~5KB of srcset/picture/data-attrs per image; all of that goes.
  s = s.replace(FIGURE_PATTERN, (m, inner) => stash(figureToMarkdown(inner), true));
  s = s.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (m, inner) => stash(figureToMarkdown(inner), true));

  // 3. <pre> is the one place whitespace is load-bearing, so fence it and never
  //    touch it again.
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, body) => stash(
    '```\n' + decodeEntities(body.replace(/<[^>]+>/g, '')).replace(/^\n+|\n+$/g, '') + '\n```',
    true
  ));

  // 4. Inline, once over the whole string. Images and pre are already parked, so
  //    the only anchors left are prose links.
  s = s
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, x) => '**' + x.trim() + '**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, x) => '*' + x.trim() + '*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (m, x) => '`' + x.trim() + '`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (m, href, x) => '[' + x.replace(/<[^>]+>/g, '').trim() + '](' + href + ')')
    // a hard break is inline: it must not gain blank lines when restored
    .replace(/<br\s*\/?>/gi, () => stash('\\\n', false));

  // 5. Blocks. Headings clamp to h3: the post title is the page's h2.
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (m, n, t) => '\n\n' + '#'.repeat(Math.min(6, Math.max(3, +n))) + ' ' + t.replace(/<[^>]+>/g, '').trim() + '\n\n');
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, b) => {
    const text = b.replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim();
    return '\n\n' + text.split(/\n{2,}/).map(p => '> ' + p.replace(/\s*\n\s*/g, ' ').trim())
      .join('\n>\n') + '\n\n';
  });
  s = s.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');
  s = s.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, body) => {
    let n = 0;
    const items = [];
    body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (mm, t) => {
      n++;
      items.push((tag.toLowerCase() === 'ol' ? n + '. ' : '- ') + t.replace(/<[^>]+>/g, '').trim());
      return '';
    });
    return '\n\n' + items.join('\n') + '\n\n';
  });
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (m, t) => '\n\n' + t.trim() + '\n\n');

  // 6. Whatever tags are left were structural (divs, spans, pictures).
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);

  // 7. Tidy, then put the parked blocks back.
  s = s
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // A block stash gets blank lines around it so it reads as its own block; an
  // inline one (a hard break) must not, or every <br> would split a paragraph.
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => {
    const k = keep[+i];
    return k.block ? '\n\n' + k.str + '\n\n' : k.str;
  });
  return s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// A figure becomes a plain image line when it has no caption — which is the
// common case — and stays raw HTML when it has one, since markdown has no
// caption syntax. The <a> wrapper is kept either way: it's what makes a
// 14,100px-tall comic openable at full size, and `.content a img { cursor:
// pointer }` in the post template already assumes it's there.
function figureToMarkdown(inner) {
  const img = (inner.match(/<img\b[^>]*>/i) || [''])[0];
  const link = (inner.match(/<a\b[^>]*>/i) || [''])[0];
  const cap = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);

  const src = attr(img, 'src');
  const alt = decodeEntities(attr(img, 'alt'));
  const href = attr(link, 'href') || src;
  if (!src) return '';

  const caption = cap ? decodeEntities(cap[1].replace(/<[^>]+>/g, '')).trim() : '';
  if (!caption) return `[![${alt}](${src})](${href})`;
  return [
    '<figure>',
    `  <a href="${href}" target="_blank"><img src="${src}" alt="${escapeHtml(alt)}"></a>`,
    `  <figcaption>${escapeHtml(caption)}</figcaption>`,
    '</figure>',
  ].join('\n');
}

// ---- markdown -> the HTML that goes inside <div class="content"> ------

// Every tag this produces is parked behind a NUL sentinel the moment it is made,
// so the emphasis passes below only ever see prose. Without that, `_` emphasis
// eats its way through the markup it just generated: a Substack CDN link is
// `…/$s_!u9o7!,…` inside a `target="_blank"` anchor, and those two underscores
// paired up into an <em> that swallowed half the URL.
//
// A link's *text* is deliberately left unparked — only the <a> and </a> are — so
// `[**a title**](url)` still emboldens.
function inlineMd(t) {
  const keep = [];
  const hold = str => '\u0000' + (keep.push(str) - 1) + '\u0000';

  return t
    // raw inline HTML the author typed: passed through untouched
    .replace(/<[^>]+>/g, hold)
    // `code` before anything else, since its contents are literal
    .replace(/`([^`]+)`/g, (m, x) => hold(`<code>${escapeHtml(x)}</code>`))
    // ![alt](src) first, so [![…](…)](href) is left as [<img>](href)
    .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g,
      (m, alt, src) => hold(`<img src="${src}" alt="${escapeHtml(alt)}">`))
    // an image wrapped in a link is a "see it full size" link, so it opens out
    .replace(/\[(\u0000\d+\u0000)\]\(([^\s)]+)\)/g,
      (m, img, href) => hold(`<a href="${href}" target="_blank">`) + img + hold('</a>'))
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,
      (m, text, href) => hold(`<a href="${href}">`) + text + hold('</a>'))
    .replace(/\*\*([^*]+)\*\*/g, (m, x) => `<strong>${x}</strong>`)
    .replace(/(^|[^*\\])\*([^*\n]+)\*/g, (m, pre, x) => `${pre}<em>${x}</em>`)
    .replace(/(^|[^\w\\])_([^_\n]+)_/g, (m, pre, x) => `${pre}<em>${x}</em>`)
    .replace(/\\\n/g, '<br>\n')
    .replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}

const BLOCK_START = /^(?:#{1,6}\s|>\s?|```|\s*(?:[-*+]|\d+\.)\s|(?:-{3,}|\*{3,}|_{3,})\s*$|\s*<)/;

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // fenced block — the only place whitespace survives intact
    if (/^```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push('<pre>' + escapeHtml(body.join('\n')) + '</pre>');
      continue;
    }

    // raw HTML: the escape hatch. Passed through verbatim to a blank line.
    if (/^\s*</.test(line)) {
      const block = [];
      while (i < lines.length && lines[i].trim()) block.push(lines[i++]);
      out.push(block.join('\n'));
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      // clamped to h3..h6: the post's own title is the h2 above this content
      const level = Math.min(6, Math.max(3, h[1].length));
      out.push(`<h${level}>${inlineMd(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^>\s?/.test(line)) {
      const block = [];
      while (i < lines.length && /^>/.test(lines[i])) block.push(lines[i++].replace(/^>\s?/, ''));
      const paras = block.join('\n').split(/\n\s*\n/).filter(p => p.trim());
      out.push('<blockquote>' + paras.map(p => `<p>${inlineMd(p.trim())}</p>`).join('') + '</blockquote>');
      continue;
    }

    const li = line.match(/^\s*([-*+]|\d+\.)\s+/);
    if (li) {
      const ordered = /\d/.test(li[1]);
      const items = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim());
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map(t => `<li>${inlineMd(t)}</li>`).join('') + `</${tag}>`);
      continue;
    }

    // paragraph: everything up to a blank line or the start of another block
    const para = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) para.push(lines[i++]);
    const html = inlineMd(para.join('\n').trim());
    // A line that is nothing but an image is a figure, not prose: `p`'s font-size
    // and vertical padding have nothing to apply to, and `.content img` in the
    // post template already sets its own display and margins.
    out.push(/^<(a [^>]*>\s*)?<img [^>]*>(\s*<\/a>)?$/.test(html) ? html : `<p>${html}</p>`);
  }

  return out.join('\n');
}

module.exports = {
  parseFrontmatter, serializeFrontmatter,
  htmlToMarkdown, markdownToHtml,
  decodeEntities, escapeHtml,
  BUTTON_PATTERN,
};
