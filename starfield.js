const canvas = document.querySelector('#starfield');
const context = canvas.getContext('2d');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let enabled = false;
const layers = [
  { count: 390, size: [0.35, 0.8], speed: 2.2, alpha: [0.16, 0.45], parallax: 2, glow: false },
  { count: 170, size: [0.65, 1.35], speed: 5.2, alpha: [0.28, 0.7], parallax: 6, glow: false },
  { count: 65, size: [1.1, 2.1], speed: 10, alpha: [0.48, 1], parallax: 13, glow: true }
];

let width = 0;
let height = 0;
let dpr = 1;
let stars = [];
let pointer = { x: 0, y: 0 };
let pulseStart = -Infinity;
let dimStart = -Infinity;
let frame;
let lastTime = performance.now();
const glowSprites = new Map();

function randomBetween([min, max]) { return min + Math.random() * (max - min); }

function makeGlowSprite(radius) {
  const key = Math.round(radius * 2) / 2;
  if (glowSprites.has(key)) return glowSprites.get(key);
  const size = Math.ceil(radius * 8);
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const spriteContext = sprite.getContext('2d');
  const center = size / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(210,225,255,0.85)');
  gradient.addColorStop(0.18, 'rgba(155,190,255,0.34)');
  gradient.addColorStop(1, 'rgba(100,145,255,0)');
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, size, size);
  glowSprites.set(key, sprite);
  return sprite;
}

function populateStars() {
  stars = layers.flatMap((layer, layerIndex) => Array.from({ length: layer.count }, () => ({
    layer, layerIndex,
    x: Math.random() * width,
    y: Math.random() * height,
    size: randomBetween(layer.size),
    alpha: randomBetween(layer.alpha),
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.45,
    pulsePhase: Math.random() * Math.PI * 2
  })));
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  populateStars();
  draw(performance.now());
}

function draw(now) {
  const elapsed = now / 1000;
  const pulseAge = now - pulseStart;
  const pulseActive = pulseAge >= 0 && pulseAge < 700;
  const dim = motionPreference.matches ? 0 : Math.max(0, 1 - (now - dimStart) / 250) * 0.17;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#02040c';
  context.fillRect(0, 0, width, height);

  for (const star of stars) {
    const depth = star.layerIndex + 1;
    const parallaxX = pointer.x * star.layer.parallax;
    const parallaxY = pointer.y * star.layer.parallax;
    let x = star.x + parallaxX;
    let y = star.y + parallaxY;
    let boost = 0;

    if (pulseActive && !motionPreference.matches) {
      // A radial travelling sine wave gives each depth a liquid-like, decaying nudge.
      const dx = x - width / 2;
      const dy = y - height / 2;
      const distance = Math.hypot(dx, dy) || 1;
      const decay = Math.exp(-pulseAge / 230);
      const wave = Math.sin(distance * 0.035 - pulseAge * 0.022 + star.pulsePhase);
      const displacement = wave * decay * depth * 12;
      x += (dx / distance) * displacement;
      y += (dy / distance) * displacement;
      boost = decay * 0.45;
    }

    const twinkle = motionPreference.matches ? 1 : 0.82 + Math.sin(elapsed * (1.4 + depth * 0.28) + star.phase) * 0.18;
    const alpha = Math.max(0, star.alpha * twinkle + boost - dim);
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;

    if (star.layer.glow) {
      const sprite = makeGlowSprite(star.size);
      const spriteSize = star.size * 8 * (1 + boost * 0.6);
      context.globalAlpha = alpha;
      context.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    }
    context.globalAlpha = alpha;
    context.fillStyle = '#e9f1ff';
    context.beginPath();
    context.arc(x, y, star.size * (1 + boost * 0.35), 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function animate(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  for (const star of stars) {
    star.y += star.layer.speed * delta;
    star.x += star.drift * star.layer.speed * delta;
    if (star.y > height + 4) star.y = -4;
    if (star.x > width + 4) star.x = -4;
    if (star.x < -4) star.x = width + 4;
  }
  draw(now);
  frame = requestAnimationFrame(animate);
}

function setPointer(clientX, clientY) {
  pointer.x = (clientX / width - 0.5) * -1;
  pointer.y = (clientY / height - 0.5) * -1;
}

export function pulse() { pulseStart = performance.now(); }
export function softDim() { dimStart = performance.now(); }

function syncAnimation() {
  cancelAnimationFrame(frame);
  if (!enabled) return;
  if (motionPreference.matches || document.hidden) draw(performance.now());
  else {
    lastTime = performance.now();
    frame = requestAnimationFrame(animate);
  }
}

export function setEnabled(value) {
  enabled = value;
  pulseStart = dimStart = -Infinity;
  syncAnimation();
}

window.addEventListener('resize', resize);
window.addEventListener('pointermove', event => {
  if (enabled && !motionPreference.matches) setPointer(event.clientX, event.clientY);
}, { passive: true });
window.addEventListener('touchmove', event => {
  const touch = event.touches[0];
  if (enabled && !motionPreference.matches && touch) setPointer(touch.clientX, touch.clientY);
}, { passive: true });
document.addEventListener('visibilitychange', syncAnimation);
motionPreference.addEventListener('change', syncAnimation);

resize();
