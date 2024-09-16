const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
canvas.width = document.documentElement.scrollWidth;
canvas.height = document.documentElement.scrollHeight;

const G = 100; // Gravitational constant
let mouseX = 0;
let mouseY = 0;

class Body {
  constructor(x, y, vx, vy, mass, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.mass = mass;
    this.color = color;
    this.history = [];
  }

  update(bodies) {
    let ax = 0;
    let ay = 0;

    const mouse = new Body(mouseX, mouseY, 0, 0, 100000000, {
      r: 0,
      g: 0,
      b: 0,
    });

    [mouse, ...bodies].forEach((body) => {
      if (body !== this) {
        const dx = body.x - this.x;
        const dy = body.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.mass + body.mass) {
          // this prevents the close bodies from accelerating too much
          return;
        }

        const force = (G * this.mass * body.mass) / (distance * distance);
        const angle = Math.atan2(dy, dx);
        ax += (force * Math.cos(angle)) / this.mass;
        ay += (force * Math.sin(angle)) / this.mass;
      }
    });

    this.vx += ax;
    this.vy += ay;

    this.vx = Math.min(10, Math.max(-10, this.vx));
    this.vy = Math.min(10, Math.max(-10, this.vy));

    this.x += this.vx + canvas.width;
    this.y += this.vy + canvas.height;

    this.x %= canvas.width;
    this.y %= canvas.height;

    // Store the history of positions
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 200) {
      this.history.shift(); // Remove the oldest point if history is too long
    }
  }

  draw() {
    // Draw the trail
    for (let i = this.history.length - 1; i >= 0; i--) {
      const point = this.history[i];
      const trailSize = 5 * Math.sqrt(i / this.history.length);
      ctx.beginPath();
      ctx.arc(point.x, point.y, trailSize, 0, 2 * Math.PI);
      ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
      ctx.fill();
    }

    // Draw the body
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    ctx.fill();
  }
}

// Initialize three bodies with random positions and velocities
const bodies = [
  new Body(canvas.width / 2 - 200, canvas.height / 2, 0, 2, 100, {
    r: 255,
    g: 255,
    b: 255,
  }),
  new Body(canvas.width / 2 + 200, canvas.height / 2, 0, -2, 100, {
    r: 245,
    g: 245,
    b: 245,
  }),
  new Body(canvas.width / 2, canvas.height / 2 + 200, -2, 0, 100, {
    r: 235,
    g: 235,
    b: 235,
  }),
];

// Function to update the simulation
function update() {
  bodies.forEach((body) => body.update(bodies));
}

// Function to draw the simulation
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  bodies.forEach((body) => body.draw());

  // draw the mouse
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();
}

// Function to animate the simulation
function animate() {
  update();
  draw();
  requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener("resize", () => {
  canvas.width = document.innerWidth;
  canvas.height = document.innerHeight;
});

document.addEventListener(
  "mousemove",
  (e) => {
    mouseX = e.pageX - canvas.offsetLeft;
    mouseY = e.pageY - canvas.offsetTop;
  },
  false
);

// Start the animation
animate();
