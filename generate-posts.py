#!/usr/bin/env python3

import csv
import os
from datetime import datetime
from pathlib import Path

# Paths
csv_path = Path.home() / ".whorl/docs/goldenblue/posts.csv"
posts_dir = Path.home() / ".whorl/docs/goldenblue/posts"
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

    h2 {{
      font-size: 2.2rem;
      margin-bottom: 0.55rem;
    }}

    h3 {{
      font-size: 1.5rem;
      margin-top: 1.1rem;
      margin-bottom: 0.55rem;
    }}

    @media screen and (max-width: 80ch) {{
      h1 {{
        font-size: 19.25vw;
      }}
    }}

    p {{
      font-size: 1.1rem;
      padding-top: 0.55rem;
      padding-bottom: 0.55rem;
      line-height: 1.6;
    }}

    a {{
      text-underline-offset: 0.25rem;
      text-decoration-color: #F43208;
    }}

    .post-date {{
      font-style: italic;
      color: var(--date-color);
      font-size: 1rem;
      margin-bottom: 1.1rem;
      display: block;
    }}

    canvas {{
      position: absolute;
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
    }}

    .backdrop {{
      backdrop-filter: blur(10px) brightness(var(--backdrop-brightness));
    }}

    .header-container {{
      padding-bottom: 0;
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

    .red-drop {{
      text-shadow: 0px 0px 5px var(--glow-color), 9px 6px 0px #F43208;
    }}

    .red-raise {{
      text-shadow: 0px 0px 5px var(--glow-color), -9px -6px 0px #F43208;
    }}

    .post-content {{
      padding: 1.65rem;
    }}
  </style>
</head>
<body>
  <canvas id="starfield"></canvas>

  <div class="container header-container">
    <h1><span class="red-raise">K</span>ai van&nbsp;Brun<span class="red-drop">t</span></h1>
  </div>

  <nav class="menu-bar container">
    <button id="home-btn">home</button>
    <button id="writing-btn" class="active">writing</button>
    <button id="gallery-btn">gallery</button>
    <button id="likes-btn">likes</button>
    <button id="theme-toggle">☀</button>
  </nav>

  <div class="container dashed backdrop post-content">
    <h2>{title}</h2>
    <span class="post-date">{date}</span>
    <div class="content">
{content}
    </div>
  </div>

  <script src="../starfield.js"></script>
  <script src="../light-starfield.js"></script>
  <script>
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    function initTheme() {{
      const savedTheme = localStorage.getItem('theme') || 'dark';
      setTheme(savedTheme);
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
    document.getElementById('likes-btn').addEventListener('click', () => window.location.href = '../likes.html');
  </script>
</body>
</html>
"""

# Read CSV
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

        # Read markdown content
        md_path = posts_dir / f"{slug}.md"
        if not md_path.exists():
            print(f"Warning: {md_path} not found")
            continue

        with open(md_path, 'r') as mf:
            content = mf.read()

        # Convert basic markdown to HTML (simple conversion for now)
        # Convert paragraphs
        html_content = ""
        paragraphs = content.split('\n\n')
        for para in paragraphs:
            para = para.strip()
            if para:
                # Simple paragraph
                html_content += f"      <p>{para}</p>\n"

        # Create HTML file
        html = template.format(
            title=title,
            date=formatted_date,
            content=html_content
        )

        output_path = output_dir / f"{slug}.html"
        with open(output_path, 'w') as out:
            out.write(html)

        print(f"Created: {output_path}")

print("Done generating post pages!")
