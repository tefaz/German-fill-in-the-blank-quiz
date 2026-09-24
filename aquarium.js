const canvas = document.querySelector('#aquarium');
const context = canvas.getContext('2d');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;
const PULSE_MS = 700;
const DIM_MS = 250;
const glimmers = [];
const sprites = [];
const routes = [
  { start: .06, end: .29, bend: 1.3, phase: .1, amplitude: .065, speed: .018, reverse: false },
  { start: .32, end: .08, bend: 1.6, phase: 1.9, amplitude: .07, speed: .022, reverse: true },
  { axis: 'vertical', start: .18, end: .62, bend: 1.4, phase: 3.1, amplitude: .1, speed: .02, reverse: false },
  { start: .62, end: .37, bend: 1.25, phase: 5.2, amplitude: .085, speed: .024, reverse: true },
  { start: .52, end: .88, bend: 1.55, phase: 1.1, amplitude: .07, speed: .018, reverse: false },
  { axis: 'vertical', start: .87, end: .36, bend: 1.5, phase: 4.1, amplitude: .09, speed: .022, reverse: true }
];

let width = 0;
let height = 0;
let dpr = 1;
let background;
let currentLayer;
let currentContext;
let frame;
let lastTime = performance.now();
let reactionStart = -Infinity;
let dimStart = -Infinity;

function random(min, max) { return min + Math.random() * (max - min); }

function makeSprites() {
  for (let i = 0; i < 19; i++) {
    const hue = 20 + i * 2;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const spriteContext = sprite.getContext('2d');
    const glow = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`);
    glow.addColorStop(0.09, `hsla(${hue}, 100%, 62%, .95)`);
    glow.addColorStop(0.27, `hsla(${hue}, 100%, 50%, .4)`);
    glow.addColorStop(1, `hsla(${hue}, 100%, 45%, 0)`);
    spriteContext.fillStyle = glow;
    spriteContext.fillRect(0, 0, 64, 64);
    sprites.push(sprite);
  }
}

function makeBackground() {
  background = document.createElement('canvas');
  background.width = Math.ceil(width);
  background.height = Math.ceil(height);
  const bg = background.getContext('2d');
  bg.fillStyle = '#0e0c0b';
  bg.fillRect(0, 0, width, height);

  const pools = [
    [0.14, 0.19, 0.64, 'rgba(113, 72, 22, .16)'],
    [0.88, 0.76, 0.72, 'rgba(91, 58, 15, .15)'],
    [0.57, 0.48, 0.7, 'rgba(72, 59, 16, .1)']
  ];
  for (const [x, y, reach, color] of pools) {
    const radius = Math.max(width, height) * reach;
    const gradient = bg.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, width, height);
  }
}

function seedGlimmers() {
  glimmers.length = 0;
  const flowCount = Math.min(280, Math.max(140, Math.round(width * height / 4700)));
  for (let i = 0; i < flowCount; i++) {
    glimmers.push({
      route: i % routes.length,
      progress: random(0, 1),
      speed: random(.65, 1.4),
      offset: random(-55, 55),
      size: random(2.5, 9),
      alpha: random(.3, .75),
      colorPhase: random(0, TAU),
      colorSpeed: random(0.25, 0.6),
      shimmerPhase: random(0, TAU),
      shimmerSpeed: random(0.6, 1.3),
      flashPhase: random(0, TAU),
      flashSpeed: random(0.13, 0.27),
      pulsePhase: random(0, TAU)
    });
  }

  // One independent glimmer per cell keeps the space between currents alive.
  const columns = Math.max(1, Math.ceil(width / 72));
  const rows = Math.max(1, Math.ceil(height / 72));
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      glimmers.push({
        x: (column + random(.2, .8)) * width / columns,
        y: (row + random(.2, .8)) * height / rows,
        drift: random(8, 25),
        speed: random(.15, .35),
        size: random(2.8, 7.3),
        alpha: random(.32, .55),
        colorPhase: random(0, TAU),
        colorSpeed: random(.25, .6),
        shimmerPhase: random(0, TAU),
        shimmerSpeed: random(.6, 1.3),
        flashPhase: random(0, TAU),
        flashSpeed: random(.13, .27),
        pulsePhase: random(0, TAU)
      });
    }
  }
}

function routePoint(routeIndex, progress, offset = 0, time = 0) {
  const route = routes[routeIndex];
  const motionTime = motionPreference.matches ? 0 : time;
  const phase = progress * TAU * route.bend + route.phase + motionTime * .19;
  const secondaryPhase = progress * TAU * (route.bend + .7) + route.phase * .7 - motionTime * .12;
  const margin = 70;
  const vertical = route.axis === 'vertical';
  const lengthAlongRoute = (vertical ? height : width) + margin * 2;
  const across = vertical ? width : height;
  const primary = -margin + progress * lengthAlongRoute;
  const secondary = across * (route.start + (route.end - route.start) * progress +
    Math.sin(phase) * route.amplitude + Math.sin(secondaryPhase) * route.amplitude * .32);
  const secondarySlope = across * (route.end - route.start +
    Math.cos(phase) * TAU * route.bend * route.amplitude +
    Math.cos(secondaryPhase) * TAU * (route.bend + .7) * route.amplitude * .32);
  const x = vertical ? secondary : primary;
  const y = vertical ? primary : secondary;
  const dx = vertical ? secondarySlope : lengthAlongRoute;
  const dy = vertical ? lengthAlongRoute : secondarySlope;
  const length = Math.hypot(dx, dy) || 1;
  return { x: x - dy / length * offset, y: y + dx / length * offset };
}

function drawCurrent(time) {
  currentContext.clearRect(0, 0, width, height);
  currentContext.filter = 'blur(13px)';
  currentContext.lineCap = 'round';
  currentContext.lineJoin = 'round';
  for (let i = 0; i < routes.length; i++) {
    currentContext.beginPath();
    for (let step = 0; step <= 60; step++) {
      const point = routePoint(i, step / 60, 0, time);
      if (step === 0) currentContext.moveTo(point.x, point.y);
      else currentContext.lineTo(point.x, point.y);
    }
    currentContext.strokeStyle = i % 2 ? 'rgba(255, 185, 37, .17)' : 'rgba(255, 108, 24, .17)';
    currentContext.lineWidth = Math.min(90, Math.max(50, height * .095));
    currentContext.stroke();
  }
  currentContext.filter = 'none';
  context.drawImage(currentLayer, 0, 0, width, height);

  for (let i = 0; i < routes.length; i++) {
    const point = routePoint(i, (time * routes[i].speed + i * .23) % 1, 0, time);
    const radius = Math.min(width * .2, 190);
    const light = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    const color = i % 2 ? '255, 197, 46' : '255, 116, 26';
    light.addColorStop(0, `rgba(${color}, .09)`);
    light.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = light;
    context.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
  }
}

function draw(now) {
  const time = motionPreference.matches ? 0 : now / 1000;
  const pulseAge = now - reactionStart;
  const pulseActive = !motionPreference.matches && pulseAge >= 0 && pulseAge < PULSE_MS;
  const decay = pulseActive ? Math.exp(-pulseAge / 230) : 0;
  const dim = motionPreference.matches ? 0 : Math.max(0, 1 - (now - dimStart) / DIM_MS) * .17;

  context.drawImage(background, 0, 0);
  drawCurrent(time);

  for (const glimmer of glimmers) {
    const point = glimmer.route === undefined
      ? { x: glimmer.x + Math.sin(time * glimmer.speed + glimmer.shimmerPhase) * glimmer.drift,
          y: glimmer.y + Math.cos(time * glimmer.speed * .8 + glimmer.colorPhase) * glimmer.drift }
      : routePoint(glimmer.route, glimmer.progress, glimmer.offset, time);
    let x = point.x;
    let y = point.y;
    let boost = 0;
    if (pulseActive) {
      // The original radial traveling wave, now applied to every glimmer.
      const dx = x - width / 2;
      const dy = y - height / 2;
      const distance = Math.hypot(dx, dy) || 1;
      const wave = Math.sin(distance * .035 - pulseAge * .022 + glimmer.pulsePhase);
      const depth = Math.min(3, Math.max(1, glimmer.size / 3));
      const displacement = wave * decay * depth * 12;
      x += dx / distance * displacement;
      y += dy / distance * displacement;
      boost = decay * .45;
    }
    const shimmer = .77 + Math.sin(time * glimmer.shimmerSpeed + glimmer.shimmerPhase) * .23;
    // The narrow peak makes individual glimmers flare only occasionally.
    const flash = Math.pow(Math.max(0, Math.sin(time * glimmer.flashSpeed + glimmer.flashPhase)), 22);
    const colorWave = Math.sin(time * glimmer.colorSpeed + glimmer.colorPhase + (glimmer.progress ?? 0) * 4);
    const spriteIndex = Math.min(18, Math.max(0, Math.round((colorWave + 1) * 9)));
    const size = glimmer.size * (2.8 + flash * 1.4) * (1 + boost * .6);
    const alpha = Math.min(1, Math.max(0, glimmer.alpha * shimmer + flash * .55 + boost - dim));
    if (x < -size || x > width + size || y < -size || y > height + size) continue;
    context.globalAlpha = alpha;
    context.drawImage(sprites[spriteIndex], x - size / 2, y - size / 2, size, size);
  }
  context.globalAlpha = 1;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeBackground();
  currentLayer = document.createElement('canvas');
  const layerScale = Math.min(.5, 700 / width, 450 / height);
  currentLayer.width = Math.ceil(width * layerScale);
  currentLayer.height = Math.ceil(height * layerScale);
  currentContext = currentLayer.getContext('2d');
  currentContext.setTransform(layerScale, 0, 0, layerScale, 0, 0);
  seedGlimmers();
  draw(performance.now());
}

function animate(now) {
  const delta = Math.min((now - lastTime) / 1000, .05);
  lastTime = now;
  for (const glimmer of glimmers) {
    if (glimmer.route !== undefined) {
      const direction = routes[glimmer.route].reverse ? -1 : 1;
      glimmer.progress = (glimmer.progress + direction * routes[glimmer.route].speed * glimmer.speed * delta + 1) % 1;
    }
  }
  draw(now);
  frame = requestAnimationFrame(animate);
}

function syncAnimation() {
  cancelAnimationFrame(frame);
  if (motionPreference.matches || document.hidden) draw(performance.now());
  else {
    lastTime = performance.now();
    frame = requestAnimationFrame(animate);
  }
}

export function reactToAnswer(correct) {
  const now = performance.now();
  reactionStart = now;
  dimStart = correct ? -Infinity : now;
}

// Keep older cached main.js modules loadable; continue no longer triggers an effect.
export function reactToContinue() {}

makeSprites();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', syncAnimation);
motionPreference.addEventListener('change', syncAnimation);
resize();
syncAnimation();
