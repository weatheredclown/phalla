const DEFAULT_PALETTE = ["#38bdf8", "#f472b6", "#facc15", "#f97316", "#a855f7"];
const STYLE_ID = "particle-effects-style";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .particle-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 24;
    }

    .particle-layer .particle {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--particle-size, 8px);
      height: var(--particle-size, 8px);
      background: var(--particle-color, rgba(248, 250, 252, 0.9));
      border-radius: 999px;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
      filter: drop-shadow(0 0 6px rgba(148, 163, 184, 0.45));
      animation: particle-float var(--particle-duration, 3200ms) ease-out forwards;
    }

    .particle-layer .particle.is-shard {
      border-radius: 3px;
      transform: translate(-50%, -50%) rotate(var(--particle-rotation, 0deg)) scale(0.7);
      animation: particle-shard var(--particle-duration, 2800ms) ease-out forwards;
    }

    @keyframes particle-float {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(var(--particle-scale-start, 0.6));
      }
      12% {
        opacity: var(--particle-opacity, 0.9);
      }
      70% {
        opacity: calc(var(--particle-opacity, 0.9) * 0.7);
      }
      100% {
        opacity: 0;
        transform: translate(
          calc(-50% + var(--particle-drift-x, 0px)),
          calc(-50% - var(--particle-lift, 140px))
        )
        scale(var(--particle-scale-end, 0.35));
      }
    }

    @keyframes particle-shard {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(var(--particle-rotation, 0deg)) scale(0.7);
      }
      18% {
        opacity: var(--particle-opacity, 0.85);
      }
      60% {
        opacity: calc(var(--particle-opacity, 0.85) * 0.75);
      }
      100% {
        opacity: 0;
        transform: translate(
          calc(-50% + var(--particle-drift-x, 0px)),
          calc(-50% - var(--particle-lift, 160px))
        )
        rotate(calc(var(--particle-rotation, 0deg) + var(--particle-spin, 180deg)))
        scale(var(--particle-scale-end, 0.45));
      }
    }
  `;
  document.head.append(style);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createParticle(layer, palette, overrides = {}) {
  const particle = document.createElement("span");
  particle.classList.add("particle");

  const isShard = Math.random() < (overrides.shardChance ?? 0.35);
  if (isShard) {
    particle.classList.add("is-shard");
  }

  const color = overrides.color ?? randomChoice(palette);
  const size = overrides.size ?? randomBetween(4, 10);
  const duration = overrides.duration ?? randomBetween(2400, 4200);
  const opacity = overrides.opacity ?? randomBetween(0.55, 0.95);
  const lift = overrides.lift ?? randomBetween(120, 220);
  const driftX = overrides.driftX ?? randomBetween(-60, 60);
  const scaleEnd = overrides.scaleEnd ?? randomBetween(0.25, 0.45);
  const rotation = overrides.rotation ?? randomBetween(-40, 40);
  const spin = overrides.spin ?? randomBetween(120, 320);
  const x = overrides.x ?? Math.random();
  const y = overrides.y ?? randomBetween(0.2, 0.9);

  particle.style.setProperty("--particle-color", color);
  particle.style.setProperty("--particle-size", `${size}px`);
  particle.style.setProperty("--particle-duration", `${duration}ms`);
  particle.style.setProperty("--particle-opacity", String(opacity));
  particle.style.setProperty("--particle-lift", `${lift}px`);
  particle.style.setProperty("--particle-drift-x", `${driftX}px`);
  particle.style.setProperty("--particle-scale-end", String(scaleEnd));
  particle.style.setProperty("--particle-rotation", `${rotation}deg`);
  particle.style.setProperty("--particle-spin", `${spin}deg`);

  const scaleStart = overrides.scaleStart ?? randomBetween(0.55, 0.85);
  particle.style.setProperty("--particle-scale-start", String(scaleStart));

  particle.style.left = `${x * 100}%`;
  particle.style.top = `${y * 100}%`;

  layer.append(particle);

  window.setTimeout(() => {
    particle.remove();
  }, duration + 60);
}

export function initParticleSystem(options = {}) {
  const {
    container = document.body,
    palette = DEFAULT_PALETTE,
    ambientDensity = 0.5,
    zIndex = 24,
  } = options;

  ensureStyles();

  const layer = document.createElement("div");
  layer.classList.add("particle-layer");
  layer.style.zIndex = String(zIndex);
  layer.setAttribute("aria-hidden", "true");
  container.append(layer);

  let disposed = false;
  let ambientTimer = null;

  const normalizedDensity = Math.max(0, Math.min(1, ambientDensity));

  function scheduleAmbient() {
    if (disposed || normalizedDensity === 0) {
      return;
    }
    const minDelay = 450 - normalizedDensity * 180;
    const maxDelay = 1200 - normalizedDensity * 280;
    const delay = randomBetween(Math.max(160, minDelay), Math.max(400, maxDelay));
    ambientTimer = window.setTimeout(() => {
      if (disposed) {
        return;
      }
      const count = Math.round(randomBetween(1, 2 + normalizedDensity * 2));
      for (let index = 0; index < count; index += 1) {
        createParticle(layer, palette);
      }
      scheduleAmbient();
    }, delay);
  }

  scheduleAmbient();

  function emitBurst(strength = 1) {
    if (disposed) {
      return;
    }
    const burstStrength = Math.max(0.2, strength);
    const count = Math.round(randomBetween(10, 16) * burstStrength);
    for (let index = 0; index < count; index += 1) {
      createParticle(layer, palette, {
        y: randomBetween(0.4, 0.85),
        lift: randomBetween(160, 280),
        driftX: randomBetween(-80, 80),
        size: randomBetween(5, 12),
        duration: randomBetween(2600, 4600),
        opacity: randomBetween(0.65, 0.95),
        shardChance: 0.45,
      });
    }
  }

  function emitSparkle(strength = 1) {
    if (disposed) {
      return;
    }
    const sparkleStrength = Math.max(0.2, strength);
    const count = Math.round(randomBetween(4, 8) * sparkleStrength);
    for (let index = 0; index < count; index += 1) {
      createParticle(layer, palette, {
        y: randomBetween(0.15, 0.65),
        lift: randomBetween(120, 180),
        driftX: randomBetween(-40, 40),
        size: randomBetween(4, 8),
        duration: randomBetween(2200, 3600),
        shardChance: 0.25,
      });
    }
  }

  function destroy() {
    disposed = true;
    if (ambientTimer) {
      window.clearTimeout(ambientTimer);
      ambientTimer = null;
    }
    layer.remove();
  }

  return { emitBurst, emitSparkle, destroy };
}

