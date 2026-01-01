# Kai's Personal Website

Personal portfolio website for Kai van Brunt, showcasing academic work, projects, and creative writing.

## Project Structure

```
kaiwebsite/
├── index.html              # Main portfolio page
├── the-better-place.html   # Gothic fiction story page
├── starfield.js            # Animated starfield background
├── threeBodySimulation.js  # Three-body physics simulation (currently unused)
├── cv.pdf                  # CV/Resume
├── torties/                # Collection of cat (Tortellini) photos (0.jpg - 21.jpg)
└── PDFs/                   # Academic papers
    ├── echogram.pdf
    ├── squeezedlight.pdf
    ├── nuclearh2.pdf
    ├── electronheating.pdf
    └── reentry.pdf
```

## Main Features

### index.html - Portfolio Homepage
Personal portfolio showcasing research background and projects.

**Key Sections:**
- **Hero**: Large stylized name with red drop shadows
- **About**: Bio covering work in computer vision (Beery Lab), nuclear security (MIT LNSP), and astrophysics (LANL)
- **Links**: CV, GitHub, LinkedIn
- **Tortellini**: Interactive button to display random cat photos (22 images)
- **Projects**: List of academic papers with descriptions

**Visual Design:**
- Starfield canvas background (animated stars and comets)
- Brigade font for body text
- Waters Titling Condensed Pro for headings
- Black background with white text
- Red accent color (#F43208)
- Lightgoldenrodyellow glow effects
- Backdrop blur on content containers
- Responsive design with breakpoints

**Interactive Elements:**
- "Say hi" button cycles through random Tortellini photos
- Button becomes disabled for 4 seconds after dismissing
- Links to external profiles and PDF documents

### the-better-place.html - Gothic Story
A standalone reading experience for a gothic fiction story titled "The Raven's Call" by Edgar Van Helsing.

**Features:**
- Reading progress bar at top
- Bookmark system (hover over progress bar to add bookmarks)
- Light/dark theme toggle
- Drop caps for chapter starts
- Styled chapter headers with red underline gradient
- Responsive typography (Crimson Pro font)
- "To be continued..." ending

**Technical:**
- Tailwind CSS via CDN
- Smooth scrolling
- localStorage-ready bookmark system
- Progress-based color changes (darkens near completion)

### starfield.js - Background Animation
Canvas-based starfield animation with twinkling stars and occasional comets.

**Parameters:**
- Star spawn rate: 0.15
- Max stars: 600 simultaneous
- Comet chance: 0.002
- Star life: 6000ms
- Comet life: 10000ms

**Star types:**
- Circles (50%)
- Diamonds (50%)
- Size: 2-5px
- Twinkling alpha oscillation

**Comets:**
- Spawn from top or left edge
- Trail effect (30 positions)
- Gradual fade out

### threeBodySimulation.js - Physics Simulation
Three-body gravitational simulation with mouse interaction (currently not integrated into any page).

**Features:**
- Three bodies with gravitational attraction
- Mouse acts as massive gravitational body
- Velocity clamping to prevent runaway acceleration
- Position trails (200 points)
- Wrapping boundaries

## Technologies Used

- Pure HTML/CSS/JavaScript (no build system)
- Adobe Fonts (Typekit): Brigade, Waters Titling Condensed Pro
- Tailwind CSS (CDN - only for the-better-place.html)
- Google Fonts: Crimson Pro
- Canvas API for animations

## Git Status

Current branch: `main`

Modified files:
- index.html (has uncommitted changes)

Untracked files:
- the-better-place.html (new gothic story page)

Recent commits:
- f55ca42: backdrop, updated intro
- 2ecbe2d: adjust h2 font size
- 6c33181: edit content and styles
- 27c4a47: add more torties

## MCP Tools Available

The following MCP tools are available for interacting with Substack content:
- `ingest` - Add content to knowledge base
- `text_search` - Full-text search
- `agent_search` - AI-powered search
- `bash` - Run commands in the docs directory

## Design Philosophy

The website emphasizes:
- **Visual Impact**: Bold typography, dramatic shadows, and animated backgrounds
- **Personal Touch**: Interactive Tortellini section, custom artwork, personal writing
- **Academic Rigor**: Clear presentation of research work and publications
- **Clean Code**: Simple, readable HTML/CSS/JS without unnecessary frameworks
- **Responsive Design**: Works well on mobile and desktop

## Future Possibilities

- Integrate threeBodySimulation.js into main page or separate demo page
- Add more story chapters to the-better-place.html
- Implement the bookmark save functionality
- Add more interactive elements
- Create a blog section using MCP tools to pull from Substack
