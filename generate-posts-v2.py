#!/usr/bin/env python3

import csv
from datetime import datetime
from pathlib import Path
import re

# Paths
csv_path = Path.home() / ".whorl/docs/goldenblue/posts.csv"
html_dir = Path.home() / ".whorl/docs/goldenblue/posts"
output_dir = Path("/home/kav/kaiwebsite/posts")

# Create output directory
output_dir.mkdir(exist_ok=True)

# HTML template
template = """<!DOCTYPE html>
<html>
<head>
  <title>{title} - Kai</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://use.typekit.net/xxz4zlr.css">
  <script>
    // Set theme immediately to avoid flash
    (function() {{
      const savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'light') {{
        document.documentElement.setAttribute('data-theme', 'light');
      }}
    }})();
  </script>
  <style>
    :root {{
      --bg-color: black;
      --text-color: white;
      --border-color: white;
      --heading-stroke: lightgoldenrodyellow;
      --glow-color: lightgoldenrodyellow;
      --marker-color: lightgray;
      --backdrop-brightness: 0.5;
      --button-hover-bg: rgb(255, 255, 255);
      --button-hover-text: black;
      --date-color: #aaa;
    }}

    :root[data-theme="light"] {{
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
    }}

    * {{
      font-family: brigade, sans-serif;
      font-weight: 500;
      font-style: normal;
      color: var(--text-color);
      padding: 0;
      margin: 0;
    }}

    h1, h2, h3, h4, h5, h6 {{
      font-family: "waters-titling-condensedpro", sans-serif;
      font-weight: 600;
      font-style: normal;
      -webkit-text-stroke-width: 0.5px;
      -webkit-text-stroke-color: var(--heading-stroke);
    }}

    h1 {{
      font-size: 13.2ch;
      text-shadow: 0px 0px 5px var(--glow-color);
      padding-top: 0.55rem;
      padding-bottom: 0rem;
      margin-left: 3px;
    }}

    @media screen and (max-width: 80ch) {{
      h1 {{
        font-size: 19.25vw;
      }}
    }}

    .red-drop {{
      text-shadow: 0px 0px 5px var(--glow-color), 9px 6px 0px #F43208;
    }}

    .red-raise {{
      text-shadow: 0px 0px 5px var(--glow-color), -9px -6px 0px #F43208;
    }}

    .header-container {{
      padding-bottom: 0;
    }}

    h2 {{
      font-size: 2.2rem;
      margin-bottom: 0.55rem;
    }}

    h3 {{
      font-size: 1.5rem;
      margin-top: 1.1rem;
      margin-bottom: 0.55rem;
    }}

    p {{
      font-size: 1.1rem;
      padding-top: 0.55rem;
      padding-bottom: 0.55rem;
      line-height: 1.6;
    }}

    em {{
      font-style: italic;
    }}

    a {{
      text-underline-offset: 0.25rem;
      text-decoration-color: #F43208;
      color: var(--text-color);
    }}

    blockquote {{
      border-left: 3px solid var(--border-color);
      padding-left: 1.1rem;
      margin: 1.1rem 0;
      font-style: italic;
    }}

    .post-date {{
      font-style: italic;
      color: var(--date-color);
      font-size: 1rem;
      margin-bottom: 1.65rem;
      display: block;
    }}

    canvas {{
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
    }}

    body {{
      overflow-x: clip;
      background-color: var(--bg-color);
    }}

    .container {{
      margin: auto;
      margin-top: unset;
      margin-bottom: unset;
      max-width: 71.5ch;
      padding: 0.55rem;
    }}

    button {{
      background-color: transparent;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 0.55rem;
      font-size: 1.1rem;
      cursor: pointer;
      margin-top: 0.55rem;
      margin-bottom: 0.55rem;
      backdrop-filter: blur(10px) brightness(var(--backdrop-brightness));
    }}

    button:hover:not(:disabled) {{
      background-color: var(--button-hover-bg);
      color: var(--button-hover-text);
    }}

    .dashed {{
      border: 1px dashed var(--border-color);
      box-sizing: border-box;
    }}

    .backdrop {{
      backdrop-filter: blur(10px) brightness(var(--backdrop-brightness));
    }}

    .menu-bar {{
      display: flex;
      justify-content: space-between;
      gap: 0.55rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      padding-top: 0;
      padding-bottom: 0;
    }}

    .menu-bar button {{
      flex: 1;
      margin-top: 0;
      margin-bottom: 0;
    }}

    #theme-toggle {{
      font-size: 1.2rem;
      line-height: 1;
    }}

    .menu-bar button.active {{
      box-shadow: 4px 4px 0px 0px #F43208;
    }}

    .post-content {{
      padding: 1.1rem;
    }}

    .content img {{
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.1rem 0;
    }}

    .content a {{
      display: inline;
    }}

    .content a img {{
      cursor: pointer;
    }}

    .post-navigation {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.1rem;
      margin-bottom: 1.1rem;
      gap: 1.1rem;
    }}

    .nav-arrow {{
      display: flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      color: var(--text-color);
      opacity: 0.7;
      transition: opacity 0.2s;
    }}

    .nav-arrow:hover {{
      opacity: 1;
    }}

    .nav-arrow .arrow {{
      font-size: 1.5rem;
    }}

    .nav-arrow .nav-title {{
      font-style: italic;
      font-size: 0.95rem;
    }}

    .prev-post {{
      justify-content: flex-start;
    }}

    .next-post {{
      justify-content: flex-end;
      margin-left: auto;
    }}

    .footnote {{
      margin-top: 1.1rem;
      padding-top: 0.55rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.95rem;
    }}

    .footnote-anchor {{
      vertical-align: super;
      font-size: 0.8rem;
      text-decoration: none;
    }}

    hr {{
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 1.1rem 0;
    }}
  </style>
</head>
<body>
  <canvas id="starfield"></canvas>

  <nav class="menu-bar container" style="margin-top: 1.65rem;">
    <button id="home-btn">home</button>
    <button id="writing-btn" class="active">writing</button>
    <button id="gallery-btn">gallery</button>
    <button id="collection-btn">collection</button>
    <button id="theme-toggle">☀</button>
  </nav>

  <div class="container post-navigation">
    <a href="{prev_link}" class="nav-arrow prev-post"{prev_style}>
      <span class="arrow">←</span>
      <span class="nav-title">{prev_title}</span>
    </a>
    <a href="{next_link}" class="nav-arrow next-post"{next_style}>
      <span class="nav-title">{next_title}</span>
      <span class="arrow">→</span>
    </a>
  </div>

  <div class="container dashed backdrop">
    <div class="post-content">
      <h2>{title}</h2>
      <span class="post-date">{date}</span>
      <div class="content">
{content}
      </div>
    </div>
  </div>

  <div class="container" style="margin-top: 1.1rem; margin-bottom: 1.65rem;">
    <button id="return-to-top">↑ return to top</button>
  </div>

  <script src="../starfield.js"></script>
  <script src="../light-starfield.js"></script>
  <script>
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    function initTheme() {{
      const savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'light') {{
        themeToggle.textContent = '☽';
        window.starfield.stop();
        window.lightStarfield.start();
      }} else {{
        themeToggle.textContent = '☀';
        window.lightStarfield.stop();
        window.starfield.start();
      }}
    }}

    function setTheme(theme) {{
      if (theme === 'light') {{
        root.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☽';
        window.starfield.stop();
        window.lightStarfield.start();
      }} else {{
        root.removeAttribute('data-theme');
        themeToggle.textContent = '☀';
        window.lightStarfield.stop();
        window.starfield.start();
      }}
      localStorage.setItem('theme', theme);
    }}

    function toggleTheme() {{
      const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    }}

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    document.getElementById('home-btn').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('writing-btn').addEventListener('click', () => window.location.href = '../writing.html');
    document.getElementById('gallery-btn').addEventListener('click', () => window.location.href = '../gallery.html');
    document.getElementById('collection-btn').addEventListener('click', () => window.location.href = '../collection.html');
    document.getElementById('return-to-top').addEventListener('click', () => window.scrollTo({{ top: 0, behavior: 'smooth' }}));
  </script>
</body>
</html>
"""

# Read all posts first to build navigation
posts = []
with open(csv_path, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['is_published'] != 'true':
            continue

        # Extract info
        post_id = row['post_id']
        slug = post_id.split('.')[1] if '.' in post_id else None
        if not slug:
            continue

        title = row['title'].strip('"')
        date_str = row['post_date']

        # Format date
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            formatted_date = dt.strftime('%B %d, %Y')
        except:
            formatted_date = date_str

        # Find the HTML file
        html_path = html_dir / f"{post_id}.html"
        if not html_path.exists():
            print(f"Warning: {html_path} not found")
            continue

        # Read HTML content
        with open(html_path, 'r') as hf:
            content = hf.read()

        # Clean up content: remove preformatted-block wrapper and class="text"
        content = re.sub(
            r'<div class="preformatted-block"[^>]*><label[^>]*>.*?</label><pre class="text">',
            '<pre>',
            content,
            flags=re.DOTALL
        )
        content = content.replace('</pre></div>', '</pre>')
        content = re.sub(r'<pre class="text">', '<pre>', content)

        # Remove subscription prompts and buttons
        content = re.sub(r'<p[^>]*>Thanks for reading.*?</p>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<div[^>]*class="[^"]*subscription[^"]*"[^>]*>.*?</div>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<button[^>]*subscribe[^>]*>.*?</button>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<a[^>]*subscribe[^>]*>.*?</a>', '', content, flags=re.DOTALL | re.IGNORECASE)

        # Remove Spotify embeds
        content = re.sub(r'<iframe[^>]*spotify\.com[^>]*>.*?</iframe>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<div[^>]*class="[^"]*spotify[^"]*"[^>]*>.*?</div>', '', content, flags=re.DOTALL | re.IGNORECASE)

        # Remove image open buttons (Substack adds these)
        content = re.sub(r'<button[^>]*>Open image.*?</button>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<a[^>]*class="[^"]*image-link[^"]*"[^>]*>\s*<button[^>]*>.*?</button>\s*</a>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<div[^>]*class="[^"]*image-button[^"]*"[^>]*>.*?</div>', '', content, flags=re.DOTALL | re.IGNORECASE)

        # Fix "Another Arctic" formatting - add leading spaces to "I."
        if slug == 'another-arctic':
            content = content.replace('<pre>I.\n\n', '<pre>      I.\n\n')

        posts.append({
            'slug': slug,
            'title': title,
            'date': formatted_date,
            'content': content,
            'date_obj': datetime.fromisoformat(date_str.replace('Z', '+00:00')) if date_str else None
        })

# Sort posts by date (newest first)
posts.sort(key=lambda p: p['date_obj'] if p['date_obj'] else datetime.min, reverse=True)

# Generate HTML for each post with navigation
for i, post in enumerate(posts):
    # Determine prev/next posts
    # "came right after" = newer (previous in the list)
    # "came right before" = older (next in the list)
    prev_post = posts[i-1] if i > 0 else None
    next_post = posts[i+1] if i < len(posts)-1 else None

    # Format navigation links
    if prev_post:
        prev_link = f"{prev_post['slug']}.html"
        prev_title = prev_post['title']
        prev_style = ""
    else:
        prev_link = "#"
        prev_title = ""
        prev_style = ' style="visibility: hidden;"'

    if next_post:
        next_link = f"{next_post['slug']}.html"
        next_title = next_post['title']
        next_style = ""
    else:
        next_link = "#"
        next_title = ""
        next_style = ' style="visibility: hidden;"'

    # Indent content for template
    indented_content = '\n'.join('      ' + line if line.strip() else ''
                                  for line in post['content'].split('\n'))

    # Create HTML file
    html = template.format(
        title=post['title'],
        date=post['date'],
        content=indented_content,
        prev_link=prev_link,
        prev_title=prev_title,
        prev_style=prev_style,
        next_link=next_link,
        next_title=next_title,
        next_style=next_style
    )

    output_path = output_dir / f"{post['slug']}.html"
    with open(output_path, 'w') as out:
        out.write(html)

    print(f"Created: {output_path}")

print("Done generating post pages!")
