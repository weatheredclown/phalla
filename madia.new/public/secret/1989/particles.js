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

function createParticle(width, height, palette) {
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
    color: palette[Math.floor(Math.random() * palette.length)],
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
  } = options;

  ensureStyles(container);
  const palette = resolvePalette(colors);

  const canvas = document.createElement("canvas");
  canvas.className = "particle-field-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.prepend(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return () => {};
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
      particles.push(createParticle(width, height, palette));
    }
    if (particles.length > targetCount) {
      particles.splice(targetCount);
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      if (!updateParticle(particle, width, height, delta)) {
        particles[i] = createParticle(width, height, palette);
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

  return () => {
    if (animationId !== null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
    window.removeEventListener("resize", resizeCanvas);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    canvas.remove();
    cleanupStyles(container);
  };
}
