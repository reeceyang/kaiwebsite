// starfield.js

(function() {
  // Adjusted parameters as requested
  const STAR_SPAWN_RATE = 0.15;   // higher spawn rate for more stars
  const MAX_STARS = 600;          // cap total simultaneous stars (~3x)
  const COMET_CHANCE = 0.002;     // occasional comets
  const STAR_LIFE = 6000;         // longer life for slower twinkle
  const COMET_LIFE = 10000;        // lifespan of each comet in ms

  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let comets = [];
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
    }
    draw(now) {
      const age = now - this.birth;
      if (age > this.life) return false;

      // alpha oscillates slowly for twinkle effect
      const phase = Math.sin((age / this.life) * Math.PI);
      const alpha = phase * 0.8 + 0.2;

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

  class Comet {
    constructor() {
      const edge = Math.random();
      if (edge < 0.5) {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.vx = (Math.random() - 0.5) * 0.01;  // slower lateral
        this.vy = 0.02 + Math.random() * 0.02;    // slower downward
      } else {
        this.x = -20;
        this.y = Math.random() * canvas.height / 2;
        this.vx = 0.02 + Math.random() * 0.02;    // slower rightward
        this.vy = (Math.random() - 0.5) * 0.01;  // slower lateral
      }
      this.path = [];
      this.birth = performance.now();
      this.life = COMET_LIFE;
    }
    update(now) {
      this.path.push({ x: this.x, y: this.y });
      if (this.path.length > 30) this.path.shift();
      this.x += this.vx * canvas.width;
      this.y += this.vy * canvas.height;
      return (now - this.birth) < this.life;
    }
    draw(now) {
      const alpha = 1 - ((now - this.birth) / this.life);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.path.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      const head = this.path[this.path.length - 1];
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fill();
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // spawn stars
    if (stars.length < MAX_STARS && Math.random() < STAR_SPAWN_RATE) {
      stars.push(new Star());
    }
    // spawn comets
    if (Math.random() < COMET_CHANCE) {
      comets.push(new Comet());
    }

    // draw and clean up stars
    stars = stars.filter(s => s.draw(now));
    // draw and clean up comets
    comets = comets.filter(c => {
      const alive = c.update(now);
      c.draw(now);
      return alive;
    });

    animationId = requestAnimationFrame(loop);
  }

  // Export control functions
  window.starfield = {
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
        comets = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };
})();
