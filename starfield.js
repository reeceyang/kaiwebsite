// starfield.js — the background for every page except the gallery.
//
// One implementation drives both themes: the colours come from the --star-color
// and --comet-color custom properties, so light mode is the same sky reversed
// (light red on off-white) rather than a separate animation. Call
// window.starfield.refresh() after flipping data-theme.

(function () {
  const STAR_SPAWN_RATE = 0.15;   // chance per frame of adding a star
  const MAX_STARS = 600;          // cap total simultaneous stars
  const COMET_CHANCE = 0.002;     // occasional comets
  const STAR_LIFE = 6000;         // ms, longer life for a slower twinkle
  const COMET_LIFE = 10000;       // ms, lifespan of each comet

  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let stars = [];
  let comets = [];
  let animationId = null;
  let starColor = '#fff';
  let cometColor = '#fff';

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    starColor = cs.getPropertyValue('--star-color').trim() || '#fff';
    cometColor = cs.getPropertyValue('--comet-color').trim() || starColor;
  }

  // How tall is the page? Measured from the in-flow children rather than
  // scrollHeight, because the canvas is absolutely positioned and would
  // otherwise feed its own height back in and grow without bound.
  function contentHeight() {
    let bottom = 0;
    for (const el of document.body.children) {
      if (el === canvas) continue;
      const rect = el.getBoundingClientRect();
      bottom = Math.max(bottom, rect.bottom + window.scrollY);
    }
    return Math.max(window.innerHeight, bottom + 100);
  }

  // Only ever called from resize/observer callbacks — never from the animation
  // loop, where forcing a layout per child per frame used to cost more than the
  // drawing did.
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = contentHeight();
    if (reduced) drawStatic();
  }

  class Star {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 2;
      this.type = Math.random() < 0.5 ? 'circle' : 'diamond';
      this.birth = performance.now();
      this.life = STAR_LIFE * (0.5 + Math.random() * 0.5);
    }
    draw(now) {
      const age = now - this.birth;
      if (age > this.life) return false;

      // alpha oscillates slowly for a twinkle
      const phase = Math.sin((age / this.life) * Math.PI);
      this.paint(phase * 0.8 + 0.2);
      return true;
    }
    paint(alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = starColor;
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
    }
  }

  class Comet {
    constructor() {
      const edge = Math.random();
      if (edge < 0.5) {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.vx = (Math.random() - 0.5) * 0.01;
        this.vy = 0.02 + Math.random() * 0.02;
      } else {
        this.x = -20;
        this.y = Math.random() * canvas.height / 2;
        this.vx = 0.02 + Math.random() * 0.02;
        this.vy = (Math.random() - 0.5) * 0.01;
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
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = cometColor;
      ctx.fillStyle = cometColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.path.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      const head = this.path[this.path.length - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (stars.length < MAX_STARS && Math.random() < STAR_SPAWN_RATE) {
      stars.push(new Star());
    }
    if (Math.random() < COMET_CHANCE) {
      comets.push(new Comet());
    }

    stars = stars.filter(s => s.draw(now));
    comets = comets.filter(c => {
      const alive = c.update(now);
      c.draw(now);
      return alive;
    });

    animationId = requestAnimationFrame(loop);
  }

  // With reduced motion the sky is still there, it just doesn't twinkle.
  function drawStatic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const wanted = Math.round(canvas.width * canvas.height / 9000);
    while (stars.length < wanted) stars.push(new Star());
    stars.length = wanted;
    stars.forEach(s => s.paint(0.55));
  }

  readColors();
  resize();
  window.addEventListener('resize', resize);
  // catches content that grows after load — images, fonts, a filter change
  if (window.ResizeObserver) new ResizeObserver(resize).observe(document.body);

  window.starfield = {
    start: function () {
      if (reduced) { drawStatic(); return; }
      if (!animationId) animationId = requestAnimationFrame(loop);
    },
    stop: function () {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      stars = [];
      comets = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    // re-read the palette after a theme change and repaint immediately, so the
    // sky doesn't stay the old colour until the next star spawns
    refresh: function () {
      readColors();
      if (reduced) { drawStatic(); return; }
      if (!animationId) animationId = requestAnimationFrame(loop);
    },
  };

  window.starfield.start();
})();
