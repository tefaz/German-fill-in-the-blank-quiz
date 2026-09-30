const canvas = document.querySelector('#aquarium');
const context = canvas.getContext('2d');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;
const PULSE_MS = 700;
const DIM_MS = 250;
const glimmers = [];
const sprites = [];
const bokeh = [];
const highlights = [];
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
let sparkleSprite;
let frame;
let lastTime = performance.now();
let reactionStart = -Infinity;
let dimStart = -Infinity;
let enabled = true;

function random(min, max) { return min + Math.random() * (max - min); }

function makeSprites() {
  for (let i = 0; i < 19; i++) {
    const hue = 38 + i * .9;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const spriteContext = sprite.getContext('2d');
    const glow = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`);
    glow.addColorStop(0.16, `hsla(${hue}, 85%, 76%, 1)`);
    glow.addColorStop(0.35, `hsla(${hue}, 78%, 62%, .45)`);
    glow.addColorStop(1, `hsla(${hue}, 100%, 45%, 0)`);
    spriteContext.fillStyle = glow;
    spriteContext.fillRect(0, 0, 64, 64);
    sprites.push(sprite);
  }

  // A crisp white core and tapered rays stay distinct from the soft bokeh.
  sparkleSprite = document.createElement('canvas');
  sparkleSprite.width = sparkleSprite.height = 256;
  const star = sparkleSprite.getContext('2d');
  star.translate(128, 128);
  const halo = star.createRadialGradient(0, 0, 0, 0, 0, 128);
  halo.addColorStop(0, '#fffef0');
  halo.addColorStop(.025, 'rgba(255, 251, 218, 1)');
  halo.addColorStop(.09, 'rgba(255, 233, 144, .65)');
  halo.addColorStop(.3, 'rgba(223, 179, 62, .18)');
  halo.addColorStop(1, 'rgba(223, 179, 62, 0)');
  star.fillStyle = halo;
  star.fillRect(-128, -128, 256, 256);
  for (let ray = 0; ray < 8; ray++) {
    star.save();
    star.rotate(ray * Math.PI / 4);
    const length = ray % 2 ? 65 : 128;
    const beam = star.createLinearGradient(0, 0, length, 0);
    beam.addColorStop(0, ray % 2 ? 'rgba(255, 246, 187, .45)' : '#fff8cf');
    beam.addColorStop(.3, 'rgba(248, 215, 116, .5)');
    beam.addColorStop(1, 'rgba(248, 215, 116, 0)');
    star.fillStyle = beam;
    star.beginPath();
    star.moveTo(0, -2.4);
    star.lineTo(length, 0);
    star.lineTo(0, 2.4);
    star.fill();
    star.restore();
  }
}

function makeBackground() {
  background = document.createElement('canvas');
  background.width = Math.ceil(width);
  background.height = Math.ceil(height);
  const bg = background.getContext('2d');
  bg.fillStyle = '#000000';
  bg.fillRect(0, 0, width, height);

  const pools = [
    [0.85, 0.02, 0.46, 'rgba(151, 104, 28, .3)'],
    [0.92, 0.82, 0.32, 'rgba(115, 91, 23, .18)'],
    [0.15, 0.2, 0.25, 'rgba(133, 95, 25, .18)']
  ];
  for (const [x, y, reach, color] of pools) {
    const radius = Math.min(width, height) * reach;
    const gradient = bg.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(.75, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, width, height);
  }
}

function seedGlimmers() {
  glimmers.length = 0;
  bokeh.length = 0;
  highlights.length = 0;
  const sceneScale = Math.min(width, height) / 900;
  const bokehCount = Math.min(90, Math.max(32, Math.round(width * height / 17000)));
  for (let i = 0; i < bokehCount; i++) {
    // Most discs flank the text; a lighter scattering fills the upper scene.
    const x = i % 4 === 0 ? random(.2, .8) : i % 2 ? random(.72, 1) : random(0, .28);
    const y = i % 4 === 0 ? random(0, .34) : random(0, 1);
    bokeh.push({
      x: width * x, y: height * y,
      radius: random(12, 55) * Math.min(1.2, Math.max(.65, sceneScale)),
      alpha: random(.25, .6),
      phase: random(0, TAU), speed: random(.04, .12)
    });
  }
  for (const [x, y, radius] of [
    [.84, .015, 175], [.12, .25, 60], [.94, .22, 48], [.06, .87, 65],
    [.68, .15, 34], [.88, .68, 42], [.27, .74, 28]
  ]) {
    highlights.push({
      x: width * x, y: height * y,
      radius: radius * Math.min(1.15, Math.max(.65, sceneScale)),
      phase: random(0, TAU), rotation: random(-.25, .25)
    });
  }
  const flowCount = Math.min(180, Math.max(70, Math.round(width * height / 8000)));
  for (let i = 0; i < flowCount; i++) {
    glimmers.push({
      route: i % routes.length,
      progress: random(0, 1),
      speed: random(.65, 1.4),
      offset: random(-55, 55),
      size: random(2.5, 9),
      alpha: random(.5, .9),
      colorPhase: random(0, TAU),
      colorSpeed: random(0.25, 0.6),
      shimmerPhase: random(0, TAU),
      shimmerSpeed: random(0.6, 1.3),
      flashPhase: random(0, TAU),
      flashSpeed: random(0.13, 0.27),
      pulsePhase: random(0, TAU)
    });
  }

  // Sparse scattered lights leave generous black space between the currents.
  const columns = Math.max(1, Math.ceil(width / 120));
  const rows = Math.max(1, Math.ceil(height / 120));
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      glimmers.push({
        x: (column + random(.2, .8)) * width / columns,
        y: (row + random(.2, .8)) * height / rows,
        drift: random(8, 25),
        speed: random(.15, .35),
        size: random(2.8, 7.3),
        alpha: random(.45, .75),
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

function drawSparkle(x, y, radius, alpha, rotation = 0) {
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  context.rotate(rotation);
  context.drawImage(sparkleSprite, -radius, -radius, radius * 2, radius * 2);
  context.restore();
}

// Soft gold discs sit behind sharper, slowly glittering stars.
function drawAtmosphere(time) {
  for (const light of bokeh) {
    const x = light.x + Math.sin(time * light.speed + light.phase) * 12;
    const y = light.y + Math.cos(time * light.speed + light.phase) * 9;
    const radius = light.radius;
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    const shimmer = .9 + Math.sin(time * .3 + light.phase) * .1;
    glow.addColorStop(0, `rgba(242, 217, 127, ${light.alpha * shimmer})`);
    glow.addColorStop(.65, `rgba(222, 186, 77, ${light.alpha * shimmer * .9})`);
    glow.addColorStop(1, 'rgba(173, 132, 39, 0)');
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (const light of highlights) {
    const shimmer = .8 + Math.sin(time * .65 + light.phase) * .2;
    drawSparkle(light.x, light.y, light.radius, shimmer, light.rotation);
  }
}

function draw(now) {
  const time = motionPreference.matches ? 0 : now / 1000;
  const pulseAge = now - reactionStart;
  const pulseActive = !motionPreference.matches && pulseAge >= 0 && pulseAge < PULSE_MS;
  const decay = pulseActive ? Math.exp(-pulseAge / 230) : 0;
  const dim = motionPreference.matches ? 0 : Math.max(0, 1 - (now - dimStart) / DIM_MS) * .17;

  context.drawImage(background, 0, 0);
  drawAtmosphere(time);

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
    context.globalAlpha = 1;
    if (flash > .35 && glimmer.size > 6) {
      drawSparkle(x, y, size * 1.3, (flash - .35) * .85, glimmer.colorPhase);
    }
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
  if (!enabled) return;
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

export function setEnabled(value) {
  enabled = value;
  reactionStart = dimStart = -Infinity;
  syncAnimation();
}

makeSprites();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', syncAnimation);
motionPreference.addEventListener('change', syncAnimation);
resize();
syncAnimation();
