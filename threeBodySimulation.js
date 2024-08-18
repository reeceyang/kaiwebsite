const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

    const mouse = new Body(mouseX, mouseY, 0, 0, 100, { r: 0, g: 0, b: 0 });
    console.log(mouse);

    [mouse, ...bodies].forEach((body) => {
      if (body !== this) {
        const dx = body.x - this.x;
        const dy = body.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.mass + body.mass) {
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

    this.x += this.vx;
    this.y += this.vy;

    // Bounce off the edges
    if (this.x - this.mass < 0 || this.x + this.mass > canvas.width) {
      this.vx *= -1;
    }
    if (this.y - this.mass < 0 || this.y + this.mass > canvas.height) {
      this.vy *= -1;
    }

    // Store the history of positions
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 50) {
      this.history.shift(); // Remove the oldest point if history is too long
    }
  }

  draw() {
    // Draw the trail
    for (let i = this.history.length - 1; i >= 0; i--) {
      const point = this.history[i];
      const trailSize = this.mass * (i / this.history.length);
      const opacity = i / this.history.length;
      ctx.beginPath();
      ctx.arc(point.x, point.y, trailSize, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${opacity})`;
      ctx.fill();
    }

    // Draw the body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.mass, 0, 2 * Math.PI);
    ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    ctx.fill();
  }
}

// Initialize three bodies with random positions and velocities
const bodies = [
  new Body(canvas.width / 2 - 200, canvas.height / 2, 0, 2, 100, {
    r: 255,
    g: 89,
    b: 85,
  }),
  new Body(canvas.width / 2 + 200, canvas.height / 2, 0, -2, 100, {
    r: 138,
    g: 201,
    b: 38,
  }),
  new Body(canvas.width / 2, canvas.height / 2 + 200, -2, 0, 100, {
    r: 25,
    g: 130,
    b: 196,
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
}

// Function to animate the simulation
function animate() {
  update();
  draw();
  requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

document.addEventListener(
  "mousemove",
  (e) => {
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
  },
  false
);

// Start the animation
animate();
