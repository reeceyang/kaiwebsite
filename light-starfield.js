// light-starfield.js - Starfield for light mode with gradient background

(function() {
  // Adjusted parameters (no comets)
  const STAR_SPAWN_RATE = 0.15;   // higher spawn rate for more stars
  const MAX_STARS = 600;          // cap total simultaneous stars
  const STAR_LIFE = 6000;         // longer life for slower twinkle
  const CONTRAIL_CHANCE = 0.005;  // spawn rate for contrails
  const CONTRAIL_LIFE = 20000;    // lifespan of each contrail in ms (longer for slower speed)
  const CONTRAIL_MAX_SIZE = 64;   // maximum size of contrail squares (larger)
  const CONTRAIL_FADE_TIME = 3000; // time for squares to shrink and fade

  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let contrails = [];
  let animationId = null;

  function resize() {
    canvas.width = window.innerWidth;
    // Get height of actual content (excluding canvas itself)
    const body = document.body;
    const html = document.documentElement;
    let contentHeight = 0;

    // Find the last element that's not the canvas
    const allElements = Array.from(document.body.children);
    for (const el of allElements) {
      if (el !== canvas) {
        const rect = el.getBoundingClientRect();
        const bottom = rect.bottom + window.scrollY;
        contentHeight = Math.max(contentHeight, bottom);
      }
    }

    // Add buffer for bottom padding/margin
    canvas.height = Math.max(window.innerHeight, contentHeight + 100);
  }
  window.addEventListener('resize', resize);
  resize();

  class Star {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 2;   // larger stars
      this.type = Math.random() < 0.5 ? 'circle' : 'diamond';
      this.birth = performance.now();
      this.life = STAR_LIFE * (0.5 + Math.random() * 0.5);

      // Calculate max opacity based on "blueness" (vertical position)
      // Top of screen (blue) = high opacity, bottom (red/orange) = low opacity
      const verticalRatio = this.y / canvas.height;  // 0 at top, 1 at bottom
      // Cubic falloff for steeper gradient - bottom third will be nearly invisible
      this.maxOpacity = Math.pow(1 - verticalRatio, 2.5);
    }

    draw(now) {
      const age = now - this.birth;
      if (age > this.life) return false;

      // alpha oscillates slowly for twinkle effect
      const phase = Math.sin((age / this.life) * Math.PI);
      const baseAlpha = phase * 0.8 + 0.2;  // 0.2 to 1.0

      // Scale by max opacity based on vertical position
      const alpha = baseAlpha * this.maxOpacity;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      if (this.type === 'circle') {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
      }
      ctx.restore();
      return true;
    }
  }

  class Contrail {
    constructor() {
      const edge = Math.random();
      if (edge < 0.5) {
        // Spawn from top
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.vx = (Math.random() - 0.5) * 0.003;  // much slower lateral
        this.vy = 0.005 + Math.random() * 0.005;   // much slower downward
        // Arc acceleration perpendicular to initial velocity
        this.ax = 0.00001 * (Math.random() - 0.5);
        this.ay = 0.00001 * (Math.random() - 0.5);
      } else {
        // Spawn from left
        this.x = -20;
        this.y = Math.random() * canvas.height / 2;
        this.vx = 0.005 + Math.random() * 0.005;   // much slower rightward
        this.vy = (Math.random() - 0.5) * 0.003;  // much slower lateral
        // Arc acceleration perpendicular to initial velocity
        this.ax = 0.00001 * (Math.random() - 0.5);
        this.ay = 0.00001 * (Math.random() - 0.5);
      }
      this.path = [];  // Array of {x, y, birth} objects
      this.birth = performance.now();
      this.life = CONTRAIL_LIFE;
      this.frameCounter = 0;  // Counter for spacing
    }

    update(now) {
      // Add current position to path every 2 frames for more spacing
      this.frameCounter++;
      if (this.frameCounter % 2 === 0) {
        this.path.push({ x: this.x, y: this.y, birth: now });
      }

      // Apply acceleration for curved arc
      this.vx += this.ax;
      this.vy += this.ay;

      // Move the contrail
      this.x += this.vx * canvas.width;
      this.y += this.vy * canvas.height;

      // Remove old trail squares (older than fade time)
      this.path = this.path.filter(point => (now - point.birth) < CONTRAIL_FADE_TIME);

      return (now - this.birth) < this.life;
    }

    draw(now) {
      ctx.save();

      // Draw each square in the trail
      this.path.forEach(point => {
        const age = now - point.birth;
        const ageRatio = age / CONTRAIL_FADE_TIME;  // 0 to 1 over fade time

        // Size decreases from max to near-zero
        const size = CONTRAIL_MAX_SIZE * (1 - ageRatio);

        if (size > 0.5) {  // Only draw if visible
          // Calculate opacity based on blueness (vertical position)
          const verticalRatio = point.y / canvas.height;
          const maxOpacityForPosition = Math.pow(1 - verticalRatio, 2.5);

          // Low base opacity that fades with age
          const baseOpacity = 0.3 * (1 - ageRatio);
          const opacity = baseOpacity * maxOpacityForPosition;

          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

          // Draw rotated square (45 degrees)
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(Math.PI / 4);  // 45 degrees
          ctx.fillRect(-size/2, -size/2, size, size);
          ctx.restore();
        }
      });

      ctx.restore();
    }
  }

  function loop(now) {
    // Check if content height changed
    let contentHeight = 0;
    const allElements = Array.from(document.body.children);
    for (const el of allElements) {
      if (el !== canvas) {
        const rect = el.getBoundingClientRect();
        const bottom = rect.bottom + window.scrollY;
        contentHeight = Math.max(contentHeight, bottom);
      }
    }
    const newHeight = Math.max(window.innerHeight, contentHeight + 100);
    if (canvas.height !== newHeight) {
      resize();
    }

    // Sunrise gradient background (same as clouds.js)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#C5E1F7');    // Top: light blue
    gradient.addColorStop(0.5, '#F7DAD2');  // Middle: dusky orange
    gradient.addColorStop(1, '#EAA390');    // Bottom: reddish
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // spawn stars
    if (stars.length < MAX_STARS && Math.random() < STAR_SPAWN_RATE) {
      stars.push(new Star());
    }

    // spawn contrails
    if (Math.random() < CONTRAIL_CHANCE) {
      contrails.push(new Contrail());
    }

    // draw and clean up stars
    stars = stars.filter(s => s.draw(now));

    // draw and clean up contrails
    contrails = contrails.filter(c => {
      const alive = c.update(now);
      c.draw(now);
      return alive;
    });

    animationId = requestAnimationFrame(loop);
  }

  // Export control functions
  window.lightStarfield = {
    start: function() {
      if (!animationId) {
        animationId = requestAnimationFrame(loop);
      }
    },
    stop: function() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        stars = [];
        contrails = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };
})();
