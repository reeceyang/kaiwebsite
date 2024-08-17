const canvas = document.getElementById("pendulumCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const G = 0.98; // Gravitational constant
const dt = 0.1; // Time step

let originX = canvas.width / 2;
let originY = canvas.height / 3;

// Pendulum lengths and masses
let r1 = 200;
let r2 = 200;
let m1 = 10;
let m2 = 10;

// Angles
let a1 = Math.PI / 2;
let a2 = Math.PI / 2;

// Angular velocities
let a1_v = 0;
let a2_v = 0;

// Coordinates for pendulum ends
let x1, y1, x2, y2;

// Function to update the physics of the pendulum
function update() {
  const num1 = -G * (2 * m1 + m2) * Math.sin(a1);
  const num2 = -m2 * G * Math.sin(a1 - 2 * a2);
  const num3 = -2 * Math.sin(a1 - a2) * m2;
  const num4 = a2_v * a2_v * r2 + a1_v * a1_v * r1 * Math.cos(a1 - a2);
  const den = r1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));

  const a1_a = (num1 + num2 + num3 * num4) / den;

  const num5 = 2 * Math.sin(a1 - a2);
  const num6 = a1_v * a1_v * r1 * (m1 + m2);
  const num7 = G * (m1 + m2) * Math.cos(a1);
  const num8 = a2_v * a2_v * r2 * m2 * Math.cos(a1 - a2);
  const a2_a =
    (num5 * (num6 + num7 + num8)) /
    (r2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2)));

  // Update angular velocities and angles
  a1_v += a1_a * dt;
  a2_v += a2_a * dt;
  a1 += a1_v * dt;
  a2 += a2_v * dt;

  // Calculate positions
  x1 = originX + r1 * Math.sin(a1);
  y1 = originY + r1 * Math.cos(a1);
  x2 = x1 + r2 * Math.sin(a2);
  y2 = y1 + r2 * Math.cos(a2);
}

// Function to draw the pendulum
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the first arm
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw the second arm
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw the masses
  ctx.beginPath();
  ctx.arc(x1, y1, m1, 0, 2 * Math.PI);
  ctx.fillStyle = "#ff0000";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x2, y2, m2, 0, 2 * Math.PI);
  ctx.fillStyle = "#0000ff";
  ctx.fill();
}

// Function to animate the pendulum
function animate() {
  update();
  draw();
  requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  originX = canvas.width / 2;
  originY = canvas.height / 3;
});

// Start the animation
animate();
