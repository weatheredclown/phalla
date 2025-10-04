const STYLE_ID = "particle-field-style";
const BODY_REF_ATTR = "data-particle-field";

const DEFAULT_COLOR_VARS = [
  "--accent",
  "--accent-strong",
  "--accent-secondary",
  "--primary",
  "--primary-glow",
  "--highlight",
  "--glow",
  "--neon",
  "--cta",
];

const DEFAULT_COLORS = ["#38bdf8", "#f97316", "#facc15"];
const DEFAULT_EFFECT_PALETTE = ["#38bdf8", "#f472b6", "#facc15", "#f97316", "#a855f7"];

function ensureStyles(container) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .with-particle-field {
        position: relative;
        isolation: isolate;
      }
      .with-particle-field .particle-field-canvas {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        mix-blend-mode: screen;
        opacity: 0.85;
      }
      .with-particle-field > *:not(.particle-field-canvas) {
        position: relative;
        z-index: 1;
      }
      .with-particle-field .scanlines {
        z-index: 2;
      }
      .with-particle-field .particle-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 24;
      }
      .with-particle-field .particle-layer .particle {
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
      .with-particle-field .particle-layer .particle.is-shard {
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
    document.head.appendChild(style);
  }

  if (!container.hasAttribute(BODY_REF_ATTR)) {
    container.setAttribute(BODY_REF_ATTR, "1");
    container.classList.add("with-particle-field");
  } else {
    const current = Number.parseInt(container.getAttribute(BODY_REF_ATTR) ?? "0", 10);
    container.setAttribute(BODY_REF_ATTR, String(current + 1));
  }
}

function cleanupStyles(container) {
  const current = Number.parseInt(container.getAttribute(BODY_REF_ATTR) ?? "0", 10);
  if (Number.isNaN(current) || current <= 1) {
    container.removeAttribute(BODY_REF_ATTR);
    container.classList.remove("with-particle-field");
  } else {
    container.setAttribute(BODY_REF_ATTR, String(current - 1));
  }
}

function resolvePalette(colors) {
  if (Array.isArray(colors) && colors.length > 0) {
    return colors;
  }

  const computed = getComputedStyle(document.documentElement);
  const palette = [];
  for (const variable of DEFAULT_COLOR_VARS) {
    const value = computed.getPropertyValue(variable).trim();
    if (value) {
      palette.push(value);
    }
  }

  if (palette.length === 0) {
    return DEFAULT_COLORS.slice();
  }

  return Array.from(new Set(palette));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createCelebrationParticle(layer, palette, overrides = {}) {
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

function mountCelebrationEffects({
  container,
  palette,
  ambientDensity = 0.5,
  zIndex = 24,
}) {
  const layer = document.createElement("div");
  layer.classList.add("particle-layer");
  layer.style.zIndex = String(zIndex);
  layer.setAttribute("aria-hidden", "true");
  container.append(layer);

  let disposed = false;
  let ambientTimer = null;
  const normalizedDensity = Math.max(0, Math.min(1, ambientDensity));
  let currentPalette = Array.isArray(palette) && palette.length > 0 ? [...palette] : [];

  function resolveLocalPalette(overridePalette) {
    if (Array.isArray(overridePalette) && overridePalette.length > 0) {
      return overridePalette;
    }
    if (currentPalette.length > 0) {
      return currentPalette;
    }
    return DEFAULT_EFFECT_PALETTE;
  }

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
      const paletteForAmbient = resolveLocalPalette();
      for (let index = 0; index < count; index += 1) {
        createCelebrationParticle(layer, paletteForAmbient);
      }
      scheduleAmbient();
    }, delay);
  }

  scheduleAmbient();

  function emitBurst(strength = 1, overrides = {}) {
    if (disposed) {
      return;
    }
    const burstStrength = Math.max(0.2, strength);
    const count = Math.round(randomBetween(10, 16) * burstStrength);
    const paletteForBurst = resolveLocalPalette(overrides.palette);
    const { palette: _paletteOverride, ...particleOverrides } = overrides ?? {};
    for (let index = 0; index < count; index += 1) {
      const particleConfig = {
        y: randomBetween(0.4, 0.85),
        lift: randomBetween(160, 280),
        driftX: randomBetween(-80, 80),
        size: randomBetween(5, 12),
        duration: randomBetween(2600, 4600),
        opacity: randomBetween(0.65, 0.95),
        shardChance: 0.45,
      };
      createCelebrationParticle(layer, paletteForBurst, { ...particleConfig, ...particleOverrides });
    }
  }

  function emitSparkle(strength = 1, overrides = {}) {
    if (disposed) {
      return;
    }
    const sparkleStrength = Math.max(0.2, strength);
    const count = Math.round(randomBetween(4, 8) * sparkleStrength);
    const paletteForSparkle = resolveLocalPalette(overrides.palette);
    const { palette: _sparkPalette, ...particleOverrides } = overrides ?? {};
    for (let index = 0; index < count; index += 1) {
      const particleConfig = {
        y: randomBetween(0.15, 0.65),
        lift: randomBetween(120, 180),
        driftX: randomBetween(-40, 40),
        size: randomBetween(4, 8),
        duration: randomBetween(2200, 3600),
        shardChance: 0.25,
      };
      createCelebrationParticle(layer, paletteForSparkle, { ...particleConfig, ...particleOverrides });
    }
  }

  function setPalette(newPalette) {
    currentPalette = Array.isArray(newPalette) && newPalette.length > 0 ? [...newPalette] : [];
  }

  function destroy() {
    disposed = true;
    if (ambientTimer) {
      window.clearTimeout(ambientTimer);
      ambientTimer = null;
    }
    layer.remove();
  }

  return { emitBurst, emitSparkle, setPalette, setEffectPalette: setPalette, destroy };
}

function createParticle(width, height, palette) {
  const paletteSource = Array.isArray(palette) && palette.length > 0 ? palette : DEFAULT_COLORS;
  const angle = Math.random() * Math.PI * 2;
  const baseSpeed = 0.018 + Math.random() * 0.06;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * baseSpeed,
    vy: Math.sin(angle) * baseSpeed,
    sway: (Math.random() - 0.5) * 0.002,
    radius: 0.6 + Math.random() * 2.2,
    life: 0,
    ttl: 260 + Math.random() * 360,
    color: paletteSource[Math.floor(Math.random() * paletteSource.length)],
    alpha: 0.35 + Math.random() * 0.45,
  };
}

function updateParticle(particle, width, height, delta) {
  particle.life += delta;
  if (particle.life >= particle.ttl) {
    return false;
  }

  particle.x += particle.vx * delta;
  particle.y += particle.vy * delta;

  particle.vx += (Math.random() - 0.5) * particle.sway * delta;
  particle.vy += (Math.random() - 0.5) * particle.sway * delta;

  if (particle.x < -20) {
    particle.x = width + 20;
  } else if (particle.x > width + 20) {
    particle.x = -20;
  }

  if (particle.y < -20) {
    particle.y = height + 20;
  } else if (particle.y > height + 20) {
    particle.y = -20;
  }

  return true;
}

function drawParticle(ctx, particle) {
  const progress = particle.life / particle.ttl;
  const fade = progress < 0.5 ? progress / 0.5 : (1 - progress) / 0.5;
  ctx.globalAlpha = Math.max(0, Math.min(1, fade * particle.alpha));
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
}

export function mountParticleField(options = {}) {
  const {
    container = document.body,
    colors,
    density = 0.00012,
    effects,
  } = options;

  ensureStyles(container);
  const basePalette = resolvePalette(colors);
  let ambientPalette = basePalette.slice();

  function getAmbientPalette() {
    if (ambientPalette.length > 0) {
      return ambientPalette;
    }
    if (basePalette.length > 0) {
      return basePalette;
    }
    return DEFAULT_COLORS;
  }

  let celebrationControls = null;
  if (effects) {
    const effectPalette = Array.isArray(effects.palette) && effects.palette.length > 0
      ? effects.palette
      : basePalette.length > 0
        ? basePalette
        : DEFAULT_EFFECT_PALETTE;
    celebrationControls = mountCelebrationEffects({
      container,
      palette: effectPalette,
      ambientDensity: effects.ambientDensity ?? 0.5,
      zIndex: effects.zIndex ?? 24,
    });
  }

  const canvas = document.createElement("canvas");
  canvas.className = "particle-field-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.prepend(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return {
      emitBurst: celebrationControls ? celebrationControls.emitBurst : () => {},
      emitSparkle: celebrationControls ? celebrationControls.emitSparkle : () => {},
      setEffectPalette: celebrationControls ? celebrationControls.setEffectPalette : () => {},
      setAmbientPalette() {},
      destroy() {
        if (celebrationControls) {
          celebrationControls.destroy();
        }
        canvas.remove();
        cleanupStyles(container);
      },
    };
  }

  let width = window.innerWidth;
  let height = window.innerHeight;
  let animationId = null;
  let lastTimestamp = performance.now();
  const particles = [];

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    if (typeof ctx.resetTransform === "function") {
      ctx.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.scale(ratio, ratio);
  }

  function step(timestamp) {
    const delta = Math.min((timestamp - lastTimestamp) / 16.6667, 3.5);
    lastTimestamp = timestamp;

    const targetCount = Math.round(width * height * density);
    while (particles.length < targetCount) {
      particles.push(createParticle(width, height, getAmbientPalette()));
    }
    if (particles.length > targetCount) {
      particles.splice(targetCount);
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      if (!updateParticle(particle, width, height, delta)) {
        particles[i] = createParticle(width, height, getAmbientPalette());
        continue;
      }
      drawParticle(ctx, particle);
    }

    animationId = window.requestAnimationFrame(step);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else if (animationId === null) {
      lastTimestamp = performance.now();
      animationId = window.requestAnimationFrame(step);
    }
  }

  resizeCanvas();
  animationId = window.requestAnimationFrame(step);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  function setAmbientPalette(nextPalette) {
    if (Array.isArray(nextPalette) && nextPalette.length > 0) {
      ambientPalette = [...nextPalette];
    } else {
      ambientPalette = [];
    }

    const paletteForParticles = getAmbientPalette();
    if (paletteForParticles.length > 0) {
      for (const particle of particles) {
        particle.color = paletteForParticles[Math.floor(Math.random() * paletteForParticles.length)];
      }
    }
  }

  return {
    emitBurst: celebrationControls ? celebrationControls.emitBurst : () => {},
    emitSparkle: celebrationControls ? celebrationControls.emitSparkle : () => {},
    setEffectPalette: celebrationControls ? celebrationControls.setEffectPalette : () => {},
    setAmbientPalette,
    destroy() {
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.remove();
      cleanupStyles(container);
      if (celebrationControls) {
        celebrationControls.destroy();
      }
    },
  };
}

export function unmountParticleField(handle) {
  if (!handle) {
    return;
  }
  if (typeof handle === "function") {
    handle();
    return;
  }
  if (typeof handle.destroy === "function") {
    handle.destroy();
  }
}
