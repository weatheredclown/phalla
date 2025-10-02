/**
 * Register launchable cabinets here. You can also import { registerGame }
 * elsewhere and call it at runtime for dynamic catalogs.
 */
const games = [
  {
    id: "argumentum",
    name: "Argumentum",
    description: "Synth-grid puzzle fusion hidden deep in the archives.",
    url: "../argumentum/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Argumentum preview">
        <defs>
          <linearGradient id="gridGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7b5bff" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="tileFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="rgba(123, 91, 255, 0.5)" />
            <stop offset="1" stop-color="rgba(56, 189, 248, 0.3)" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="152" height="112" rx="16" fill="rgba(7, 11, 28, 0.9)" stroke="url(#gridGlow)" />
        <g stroke="rgba(120,255,255,0.35)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${32 + i * 24}" y1="16" x2="${32 + i * 24}" y2="104" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="32" y1="${32 + i * 24}" x2="128" y2="${32 + i * 24}" />`).join("")}
        </g>
        <rect x="56" y="40" width="24" height="24" rx="6" fill="url(#tileFill)" stroke="rgba(123,91,255,0.9)" />
        <rect x="80" y="64" width="24" height="24" rx="6" fill="url(#tileFill)" stroke="rgba(123,91,255,0.9)" />
        <rect x="104" y="40" width="24" height="24" rx="6" fill="url(#tileFill)" stroke="rgba(123,91,255,0.9)" />
        <circle cx="48" cy="72" r="12" fill="rgba(56,189,248,0.4)" stroke="#38bdf8" />
        <circle cx="72" cy="88" r="8" fill="rgba(248,113,113,0.35)" stroke="#f97316" />
      </svg>
    `,
  },
  {
    id: "velvet-syncopation",
    name: "Velvet Syncopation",
    description: "Three-lane rhythm rehearsal with the lounge trio's velvet slips.",
    url: "./velvet-syncopation/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Velvet Syncopation preview">
        <defs>
          <linearGradient id="velvetGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7b5bff" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="keyShine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.9)" />
            <stop offset="100%" stop-color="rgba(148,163,184,0.4)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(10,15,30,0.92)" stroke="url(#velvetGlow)" />
        <g transform="translate(24 24)">
          <rect x="0" y="0" width="112" height="24" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(120,255,255,0.35)" />
          <rect x="0" y="36" width="112" height="24" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(120,255,255,0.35)" />
          <rect x="0" y="72" width="112" height="16" rx="8" fill="rgba(15,23,42,0.75)" stroke="rgba(120,255,255,0.25)" />
          ${[0, 1, 2, 3, 4].map((i) => `<rect x="${4 + i * 22}" y="4" width="16" height="16" rx="4" fill="url(#keyShine)" />`).join("")}
          ${[0, 1, 2, 3, 4].map((i) => `<rect x="${12 + i * 22}" y="40" width="16" height="16" rx="4" fill="rgba(123,91,255,0.65)" />`).join("")}
          <g>
            <circle cx="16" cy="80" r="6" fill="#38bdf8" />
            <circle cx="48" cy="80" r="6" fill="#7b5bff" />
            <circle cx="80" cy="80" r="6" fill="#f97316" />
            <circle cx="104" cy="80" r="6" fill="#ec4899" />
          </g>
        </g>
      </svg>
    `,
  },
  {
    id: "amore-express",
    name: "Amore Express",
    description: "Plan neon scooter runs through the cul-de-sac without tangling past deliveries.",
    url: "./amore-express/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Amore Express preview">
        <defs>
          <linearGradient id="routeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7b5bff" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="scooterBody" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(248,113,113,0.95)" />
            <stop offset="100%" stop-color="rgba(236,72,153,0.75)" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="140" height="100" rx="20" fill="rgba(9,14,28,0.9)" stroke="rgba(120,255,255,0.4)" />
        <path d="M30 84h84c6 0 12-4 14-10l8-26" fill="none" stroke="url(#routeGlow)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
        <path d="M34 46c12-16 28-26 48-26 16 0 30 6 42 18" fill="none" stroke="rgba(56,189,248,0.4)" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 8" />
        <g transform="translate(50 64)">
          <path d="M8 0h24l10 16-8 10H8z" fill="url(#scooterBody)" stroke="rgba(248,250,252,0.8)" stroke-width="1.5" />
          <circle cx="14" cy="34" r="10" fill="rgba(15,23,42,0.9)" stroke="url(#routeGlow)" stroke-width="4" />
          <circle cx="42" cy="34" r="10" fill="rgba(15,23,42,0.9)" stroke="url(#routeGlow)" stroke-width="4" />
          <path d="M22 10h12l6 8" fill="none" stroke="rgba(248,250,252,0.9)" stroke-width="3" stroke-linecap="round" />
        </g>
        <circle cx="42" cy="32" r="6" fill="rgba(248,250,252,0.85)" stroke="rgba(236,72,153,0.8)" stroke-width="2" />
        <rect x="24" y="20" width="36" height="18" rx="6" fill="rgba(123,91,255,0.25)" stroke="rgba(120,255,255,0.3)" />
        <rect x="102" y="72" width="26" height="18" rx="6" fill="rgba(123,91,255,0.35)" stroke="rgba(120,255,255,0.3)" />
      </svg>
    `,
  },
  {
    id: "prototype",
    name: "Prototype Cabinet",
    description: "Drop a new game folder in \"secret\" and point the cab here.",
    url: "../argumentum/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder cabinet">
        <defs>
          <linearGradient id="cabGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="rgba(123,91,255,0.6)" />
            <stop offset="1" stop-color="rgba(56,189,248,0.6)" />
          </linearGradient>
        </defs>
        <rect x="12" y="12" width="136" height="96" rx="18" fill="rgba(8, 12, 26, 0.9)" stroke="rgba(120,255,255,0.4)" />
        <rect x="36" y="28" width="88" height="52" rx="10" fill="rgba(15,23,42,0.9)" stroke="url(#cabGradient)" />
        <path d="M36 88h88l-12 12H48z" fill="rgba(123, 91, 255, 0.45)" stroke="rgba(120,255,255,0.4)" />
        <circle cx="80" cy="54" r="8" fill="rgba(56,189,248,0.5)" />
        <circle cx="60" cy="98" r="6" fill="#38bdf8" />
        <circle cx="100" cy="98" r="6" fill="#7b5bff" />
      </svg>
    `,
  },
];

const grid = document.getElementById("game-grid");
const template = document.getElementById("game-card-template");
const overlay = document.getElementById("player-overlay");
const closeButton = document.getElementById("close-player");
const overlayBackdrop = document.getElementById("overlay-backdrop");
const overlayFrame = document.getElementById("overlay-frame");
const frame = document.getElementById("game-frame");
const title = document.getElementById("player-title");
const description = document.getElementById("player-description");

const gameLookup = new Map(games.map((game) => [game.id, game]));
let lastFocusElement = null;

function renderGames() {
  const fragment = document.createDocumentFragment();
  games.forEach((game) => {
    const card = template.content.cloneNode(true);
    const tile = card.querySelector(".game-card");
    tile.dataset.gameId = game.id;
    const thumb = card.querySelector(".game-thumb");
    thumb.innerHTML = game.thumbnail;
    card.querySelector(".game-title").textContent = game.name;
    card.querySelector(".game-meta").textContent = game.description;
    card.querySelector(".play-button").dataset.gameId = game.id;
    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
}

function openGame(game) {
  title.textContent = game.name;
  description.textContent = game.description;
  frame.src = game.url;
  overlay.hidden = false;
  overlay.dataset.activeGame = game.id;
  requestAnimationFrame(() => {
    overlayFrame.focus({ preventScroll: true });
  });
}

function closeGame() {
  overlay.hidden = true;
  overlay.dataset.activeGame = "";
  frame.src = "";
  if (lastFocusElement && document.body.contains(lastFocusElement)) {
    lastFocusElement.focus({ preventScroll: true });
  } else {
    const fallbackButton = grid.querySelector(".play-button");
    fallbackButton?.focus({ preventScroll: true });
  }
}

renderGames();

grid.addEventListener("click", (event) => {
  const button = event.target.closest(".play-button");
  if (!button) {
    return;
  }
  const game = gameLookup.get(button.dataset.gameId);
  if (!game) {
    console.warn("No game registered for", button.dataset.gameId);
    return;
  }
  lastFocusElement = button;
  openGame(game);
});

closeButton.addEventListener("click", closeGame);
overlayBackdrop.addEventListener("click", closeGame);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && overlay.hidden === false) {
    closeGame();
  }
});

export function registerGame(gameConfig) {
  const { id, name, description, url, thumbnail } = gameConfig;
  if (!id || !name || !url) {
    throw new Error("registerGame requires id, name, and url properties");
  }
  if (gameLookup.has(id)) {
    throw new Error(`A game with id "${id}" is already registered.`);
  }
  const game = {
    id,
    name,
    description: description ?? "",
    url,
    thumbnail: thumbnail ?? "",
  };
  gameLookup.set(id, game);
  games.push(game);
  const card = template.content.cloneNode(true);
  card.querySelector(".game-thumb").innerHTML = game.thumbnail;
  card.querySelector(".game-title").textContent = game.name;
  card.querySelector(".game-meta").textContent = game.description;
  const playButton = card.querySelector(".play-button");
  playButton.dataset.gameId = game.id;
  grid.appendChild(card);
}
