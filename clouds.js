// clouds.js - Animated cloud background for light mode

(function() {
  // Cloud parameters
  const CLOUD_SPAWN_RATE = 0.02;   // Probability per frame (faster spawning)
  const MAX_CLOUDS = 4;            // Maximum simultaneous clouds (reduced)

  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let clouds = [];
  let animationId = null;

  function resize() {
    canvas.width = window.innerWidth;
    // Extend canvas to cover full document height (including scrollable content)
    canvas.height = Math.max(
      window.innerHeight,
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  }
  window.addEventListener('resize', resize);
  resize();

  // Gaussian random number generator using Box-Muller transform
  function gaussianRandom(mean, stdev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1, Math.round(z0 * stdev + mean));
  }

  class Cloud {
    constructor() {
      // Cloud position - randomize horizontal start position
      this.x = -400 + Math.random() * -200;  // Random offset between -600 and -400
      this.y = Math.random() * canvas.height;  // Uniform height distribution

      // Vertical extent (number of rows) - normal distribution with hard cap
      this.rowCount = Math.min(12, gaussianRandom(5, 2));  // Mean 5, max 12 rows
      this.rows = [];

      // Movement - faster clouds with more variation
      this.speed = 0.3 + Math.random() * 0.9;  // Variable horizontal speed (0.3-1.2)

      // Timing
      this.birth = performance.now();

      // Generate the row structure
      this.generateRows();
    }

    generateRows() {
      let cumulativeYOffset = 0;

      for (let i = 0; i < this.rowCount; i++) {
        // Ratio from 0 (bottom) to 1 (top)
        const ratio = this.rowCount > 1 ? i / (this.rowCount - 1) : 0;

        // Parabolic distribution: more squares in middle, fewer at top/bottom
        const parabola = 1 - 4 * Math.pow(ratio - 0.5, 2);  // 0 at edges, 1 at middle
        const squareCount = Math.round(2 + 5 * parabola);  // 2 at edges, 7 at middle

        // Generate individual squares with varying sizes
        const squares = [];
        for (let j = 0; j < squareCount; j++) {
          const size = 40 + Math.random() * 60;  // 40-100px (even larger)
          const horzSpacing = (Math.random() - 0.4) * size;  // Decreased spacing
          squares.push({ size, horzSpacing });
        }

        // Random horizontal offset for this row (creates irregular left edge)
        const rowXOffset = (Math.random() - 0.5) * 150;  // Random offset ±75px

        // Vertical spacing: use average square size for this row (reduced)
        const avgSize = squares.reduce((sum, sq) => sum + sq.size, 0) / squares.length;
        const vertSpacing = (Math.random() - 0.5) * avgSize * 1.5;  // Reduced from 3
        if (i > 0) {
          cumulativeYOffset += vertSpacing;
        }

        // Base opacity for this row
        const baseOpacity = 0.1 + Math.random() * 0.4;  // 0.1-0.5 range

        this.rows.push({
          squares,
          xOffset: rowXOffset,
          yOffset: cumulativeYOffset,
          baseOpacity,
          opacityPhase: Math.random() * Math.PI * 2  // Random phase for oscillation
        });
      }
    }

    update(now) {
      // Move horizontally
      this.x += this.speed;

      // Calculate max cloud width (widest row)
      const maxWidth = Math.max(...this.rows.map(row => {
        let width = 0;
        row.squares.forEach(sq => {
          width += sq.size + sq.horzSpacing;
        });
        return width;
      }));

      // Check if completely offscreen right
      return this.x < canvas.width + maxWidth;
    }

    draw(now) {
      const age = now - this.birth;

      this.rows.forEach(row => {
        // Oscillating opacity: slow sine wave
        const opacityMod = Math.sin((age / 3000) + row.opacityPhase) * 0.1;
        const opacity = Math.max(0, Math.min(0.5, row.baseOpacity + opacityMod));

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;  // White clouds

        let xOffset = row.xOffset;  // Start from row's random x offset
        row.squares.forEach(square => {
          const squareX = this.x + xOffset;
          const squareY = this.y + row.yOffset;

          ctx.fillRect(squareX, squareY, square.size, square.size);
          xOffset += square.size + square.horzSpacing;
        });
      });
    }
  }

  function loop(now) {
    // Check if document height changed (e.g., Tortellini appeared)
    const newHeight = Math.max(window.innerHeight, document.body.scrollHeight, document.documentElement.scrollHeight);
    if (canvas.height !== newHeight) {
      resize();
    }

    // Sunrise gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#C5E1F7');    // Top: light blue
    gradient.addColorStop(0.5, '#F7DAD2');  // Middle: dusky orange
    gradient.addColorStop(1, '#EAA390');    // Bottom: reddish
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Spawn new clouds
    if (clouds.length < MAX_CLOUDS && Math.random() < CLOUD_SPAWN_RATE) {
      clouds.push(new Cloud());
    }

    // Update and draw clouds
    clouds = clouds.filter(cloud => {
      const alive = cloud.update(now);
      if (alive) cloud.draw(now);
      return alive;
    });

    animationId = requestAnimationFrame(loop);
  }

  // Export control functions
  window.clouds = {
    start: function() {
      if (!animationId) {
        animationId = requestAnimationFrame(loop);
      }
    },
    stop: function() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        clouds = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };
})();
