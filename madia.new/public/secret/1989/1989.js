/**
 * Register launchable cabinets here. You can also import { registerGame }
 * elsewhere and call it at runtime for dynamic catalogs.
 */
const games = [
  {
    id: "cooler-chaos",
    name: "Cooler Chaos",
    description: "Contain the Double Deuce chaos by sliding rowdies into the exits before glass locks the grid.",
    url: "./cooler-chaos/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cooler Chaos preview">
        <defs>
          <linearGradient id="floorGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
          <linearGradient id="floorBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.25)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.85)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(6,10,22,0.92)" stroke="rgba(148,163,184,0.4)" />
        <rect x="18" y="18" width="124" height="84" rx="16" fill="url(#floorBase)" stroke="rgba(148,163,184,0.3)" />
        <g stroke="rgba(148,163,184,0.22)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${34 + i * 18}" y1="24" x2="${34 + i * 18}" y2="96" />`).join("")}
          ${Array.from({ length: 4 }, (_, i) => `<line x1="26" y1="${36 + i * 15}" x2="134" y2="${36 + i * 15}" />`).join("")}
        </g>
        <g>
          <rect x="46" y="40" width="20" height="20" rx="5" fill="rgba(56,189,248,0.7)" stroke="rgba(56,189,248,0.8)" />
          <rect x="70" y="40" width="20" height="20" rx="5" fill="rgba(249,115,22,0.7)" stroke="rgba(249,115,22,0.8)" />
          <rect x="94" y="40" width="20" height="20" rx="5" fill="rgba(249,115,22,0.55)" stroke="rgba(249,115,22,0.6)" />
          <rect x="70" y="64" width="20" height="20" rx="5" fill="rgba(148,163,184,0.35)" stroke="rgba(148,163,184,0.5)" />
        </g>
        <g stroke="url(#floorGlow)" stroke-width="4" stroke-linecap="round">
          <line x1="26" y1="36" x2="26" y2="96" />
          <line x1="134" y1="36" x2="134" y2="96" />
          <line x1="50" y1="24" x2="120" y2="24" />
          <line x1="50" y1="104" x2="120" y2="104" />
        </g>
        <circle cx="58" cy="50" r="5" fill="#38bdf8" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" />
        <circle cx="102" cy="50" r="5" fill="#f97316" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" />
        <circle cx="80" cy="74" r="5" fill="#94a3b8" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" />
        <path d="M58 50 L102 50" stroke="rgba(249,115,22,0.5)" stroke-width="3" stroke-linecap="round" />
        <path d="M102 50 L80 74" stroke="rgba(148,163,184,0.55)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 4" />
      </svg>
    `,
  },
  {
    id: "heatwave-block-party",
    name: "Heatwave Block Party",
    description: "Route cooling fans to vent grievances before the block boils over.",
    url: "./heatwave-block-party/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Heatwave Block Party preview">
        <defs>
          <linearGradient id="heatWave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.85)" />
            <stop offset="100%" stop-color="rgba(5,8,20,0.92)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#nightSky)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(26 26)">
          <rect x="0" y="0" width="48" height="68" rx="12" fill="rgba(15,23,42,0.7)" stroke="rgba(148,163,184,0.35)" />
          <rect x="10" y="12" width="28" height="44" rx="10" fill="rgba(30,41,59,0.9)" stroke="rgba(56,189,248,0.55)" />
          <rect x="10" y="44" width="28" height="12" rx="6" fill="rgba(249,115,22,0.75)" />
          <rect x="10" y="28" width="28" height="12" rx="6" fill="rgba(234,179,8,0.7)" />
          <rect x="10" y="12" width="28" height="12" rx="6" fill="rgba(56,189,248,0.75)" />
          <rect x="6" y="58" width="36" height="6" rx="3" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.3)" />
        </g>
        <g transform="translate(92 34)">
          <rect x="0" y="12" width="38" height="50" rx="10" fill="rgba(20,27,45,0.86)" stroke="rgba(148,163,184,0.4)" />
          <rect x="8" y="0" width="22" height="12" rx="4" fill="rgba(56,189,248,0.4)" stroke="rgba(148,163,184,0.35)" />
          <rect x="6" y="12" width="26" height="30" fill="rgba(15,23,42,0.75)" stroke="rgba(148,163,184,0.45)" />
          <line x1="6" y1="16" x2="32" y2="16" stroke="rgba(56,189,248,0.3)" stroke-width="2" />
          <line x1="6" y1="24" x2="32" y2="24" stroke="rgba(56,189,248,0.3)" stroke-width="2" />
          <line x1="6" y1="32" x2="32" y2="32" stroke="rgba(56,189,248,0.3)" stroke-width="2" />
          <rect x="4" y="42" width="30" height="14" rx="6" fill="rgba(249,115,22,0.75)" stroke="rgba(249,115,22,0.9)" />
        </g>
        <g transform="translate(28 20)">
          <path d="M0 72 C24 60 56 28 96 18" fill="none" stroke="url(#heatWave)" stroke-width="6" stroke-linecap="round" />
          <circle cx="96" cy="18" r="8" fill="#f97316" stroke="rgba(248,250,252,0.6)" stroke-width="2" />
          <circle cx="48" cy="48" r="6" fill="#38bdf8" stroke="rgba(148,163,184,0.45)" stroke-width="2" />
          <circle cx="26" cy="68" r="5" fill="#7b5bff" stroke="rgba(148,163,184,0.45)" stroke-width="2" />
        </g>
      </svg>
    `,
  },
  {
    id: "cable-clash",
    name: "The Cable Clash",
    description: "Route the cobalt line across the ring while juking roaming rivals.",
    url: "./cable-clash/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Cable Clash preview">
        <defs>
          <linearGradient id="postGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f87171" />
          </linearGradient>
          <linearGradient id="canvasFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.35)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.65)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(5,8,20,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="24" y="28" width="112" height="64" rx="12" fill="url(#canvasFill)" stroke="rgba(148,163,184,0.4)" />
        <g stroke="url(#postGlow)" stroke-width="3" stroke-linecap="round">
          <line x1="36" y1="36" x2="36" y2="84" />
          <line x1="124" y1="36" x2="124" y2="84" />
        </g>
        <g>
          <circle cx="36" cy="34" r="6" fill="#38bdf8" />
          <circle cx="124" cy="90" r="6" fill="#f87171" />
          <circle cx="124" cy="34" r="5" fill="#facc15" />
          <circle cx="36" cy="90" r="5" fill="#f97316" />
        </g>
        <path d="M36 62 C64 52 92 72 124 56" fill="none" stroke="rgba(59,130,246,0.8)" stroke-width="4" stroke-linecap="round" />
        <path d="M36 90 L60 72 L84 90" fill="none" stroke="rgba(148,163,184,0.6)" stroke-width="3" stroke-dasharray="4 6" />
        <circle cx="96" cy="58" r="7" fill="rgba(248,113,113,0.8)" stroke="rgba(248,250,252,0.7)" stroke-width="2" />
      </svg>
    `,
  },
  {
    id: "argumentum",
    name: "Argumentum",

    description: "Synth-grid puzzle fusion hidden deep in the archives.",
    url: "../augmentum/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Augmentum preview">
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
    id: "amore-express",
    name: "Amore Express",
    description: "Chart cul-de-sac deliveries while keeping scooter trails pristine.",
    url: "./amore-express/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Amore Express preview">
        <defs>
          <linearGradient id="amoreGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
          <linearGradient id="trailFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(56,189,248,0.6)" />
            <stop offset="100%" stop-color="rgba(249,115,22,0.6)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(10,15,30,0.92)" stroke="url(#amoreGlow)" />
        <circle cx="60" cy="60" r="30" fill="rgba(250,204,21,0.2)" stroke="rgba(250,204,21,0.65)" stroke-width="3" />
        <path d="M60 30c16 0 30 13 30 30s-14 30-30 30-30-13-30-30 14-30 30-30z" fill="rgba(249,115,22,0.25)" stroke="rgba(249,115,22,0.75)" stroke-width="2" />
        <path d="M60 30L60 90" stroke="rgba(249,115,22,0.75)" stroke-width="3" />
        <path d="M30 60L90 60" stroke="rgba(249,115,22,0.75)" stroke-width="3" />
        <circle cx="48" cy="48" r="5" fill="#f97316" />
        <circle cx="72" cy="68" r="5" fill="#ef4444" />
        <circle cx="50" cy="72" r="6" fill="#fbbf24" />
        <path d="M96 76c10-10 30-10 38 0" stroke="url(#trailFade)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        <g transform="translate(102 70)">
          <circle cx="0" cy="20" r="6" fill="#38bdf8" stroke="rgba(148,163,184,0.6)" />
          <circle cx="28" cy="20" r="6" fill="#7b5bff" stroke="rgba(148,163,184,0.6)" />
          <path d="M2 8h16l8 12" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="8" cy="8" r="4" fill="#38bdf8" />
          <circle cx="24" cy="20" r="3" fill="#f97316" />
        </g>
      </svg>
    `,
  },
  {
    id: "halo-hustle",
    name: "Halo Hustle",
    description: "Keep the Time-Sand alive with cup runs, lucky sums, and haloed sequences.",
    url: "./halo-hustle/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Halo Hustle preview">
        <defs>
          <linearGradient id="haloGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7b5bff" />
            <stop offset="100%" stop-color="#14b8a6" />
          </linearGradient>
          <linearGradient id="sandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(123,91,255,0.35)" />
            <stop offset="100%" stop-color="rgba(20,184,166,0.2)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,10,24,0.92)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(36 18)">
          <rect x="0" y="0" width="88" height="84" rx="18" fill="rgba(10,16,32,0.9)" stroke="url(#haloGlow)" />
          <path d="M24 14h40l-12 20 12 20H24l12-20z" fill="url(#sandFill)" stroke="rgba(148,163,184,0.35)" stroke-width="2" />
          <circle cx="44" cy="12" r="10" fill="rgba(250,204,21,0.35)" stroke="#facc15" stroke-width="2" />
          <circle cx="44" cy="72" r="14" fill="rgba(20,184,166,0.2)" stroke="rgba(20,184,166,0.75)" stroke-width="2" />
          <g transform="translate(8 32)">
            <circle cx="12" cy="0" r="6" fill="#facc15" stroke="rgba(17,24,39,0.9)" />
            <circle cx="44" cy="0" r="6" fill="#38bdf8" stroke="rgba(17,24,39,0.9)" />
            <circle cx="76" cy="0" r="6" fill="#ec4899" stroke="rgba(17,24,39,0.9)" />
          </g>
          <g transform="translate(18 54)">
            <rect x="0" y="0" width="20" height="10" rx="5" fill="rgba(123,91,255,0.35)" />
            <rect x="34" y="0" width="20" height="10" rx="5" fill="rgba(123,91,255,0.35)" />
            <rect x="68" y="0" width="20" height="10" rx="5" fill="rgba(123,91,255,0.35)" />
          </g>
        </g>
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
    id: "dream-team-breakout",
    name: "Dream Team Breakout",
    description: "Plan six simultaneous moves to sneak the quartet into the stadium gates.",
    url: "./dream-team-breakout/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dream Team Breakout preview">
        <defs>
          <linearGradient id="cityGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#7b5bff" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(9, 14, 28, 0.95)" stroke="rgba(120,255,255,0.4)" />
        <g transform="translate(24 20)">
          <rect x="0" y="0" width="112" height="80" rx="14" fill="rgba(10,18,36,0.9)" stroke="url(#cityGlow)" />
          <g stroke="rgba(120,255,255,0.25)" stroke-width="1">
            ${Array.from({ length: 3 }, (_, i) => `<line x1="16" y1="${20 + i * 20}" x2="96" y2="${20 + i * 20}" />`).join("")}
            ${Array.from({ length: 3 }, (_, i) => `<line x1="${32 + i * 20}" y1="8" x2="${32 + i * 20}" y2="72" />`).join("")}
          </g>
          <g>
            <rect x="84" y="8" width="20" height="16" rx="6" fill="rgba(59,130,246,0.45)" stroke="rgba(56,189,248,0.8)" />
            <rect x="84" y="32" width="20" height="16" rx="6" fill="rgba(59,130,246,0.3)" stroke="rgba(123,91,255,0.6)" />
            <rect x="84" y="56" width="20" height="16" rx="6" fill="rgba(59,130,246,0.3)" stroke="rgba(123,91,255,0.6)" />
          </g>
          <g>
            <circle cx="32" cy="20" r="8" fill="#facc15" stroke="rgba(17,24,39,0.85)" />
            <circle cx="52" cy="20" r="8" fill="#f97316" stroke="rgba(17,24,39,0.85)" />
            <circle cx="32" cy="44" r="8" fill="#38bdf8" stroke="rgba(17,24,39,0.85)" />
            <circle cx="52" cy="60" r="8" fill="#ec4899" stroke="rgba(17,24,39,0.85)" />
          </g>
          <g stroke="rgba(234,179,8,0.7)" stroke-width="2">
            <path d="M24 52h20" stroke-dasharray="2 4" />
            <circle cx="44" cy="52" r="4" fill="rgba(250,204,21,0.35)" />
          </g>
          <rect x="20" y="8" width="12" height="12" rx="4" fill="rgba(34,197,94,0.35)" stroke="rgba(34,197,94,0.9)" />
        </g>
      </svg>
    `,
  },
  {
    id: "say-anything",
    name: "Say Anything...",
    description: "Sync emotional frequencies before the silence fractures the conversation.",
    url: "./say-anything/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Say Anything preview">
        <defs>
          <linearGradient id="sayBackdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
          <linearGradient id="sayGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.25)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.8)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(6,11,26,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="22" y="24" width="116" height="36" rx="12" fill="url(#sayGlow)" stroke="rgba(148,163,184,0.35)" />
        <g fill="none" stroke="url(#sayBackdrop)" stroke-width="3" stroke-linecap="round">
          <path d="M34 38c6-6 14-6 20 0" />
          <path d="M102 38c6 6 14 6 20 0" />
          <line x1="56" y1="32" x2="56" y2="48" />
          <line x1="80" y1="28" x2="80" y2="52" />
        </g>
        <g fill="rgba(56,189,248,0.35)">
          <circle cx="38" cy="36" r="6" />
          <circle cx="54" cy="36" r="6" fill="rgba(148,163,184,0.6)" />
          <circle cx="70" cy="36" r="6" />
          <circle cx="102" cy="36" r="6" fill="rgba(236,72,153,0.55)" />
          <circle cx="118" cy="36" r="6" fill="rgba(249,115,22,0.55)" />
        </g>
        <g transform="translate(40 70)">
          <rect x="0" y="0" width="80" height="32" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <circle cx="16" cy="16" r="9" fill="rgba(56,189,248,0.7)" stroke="rgba(148,163,184,0.5)" stroke-width="2" />
          <circle cx="64" cy="16" r="9" fill="rgba(236,72,153,0.65)" stroke="rgba(148,163,184,0.5)" stroke-width="2" />
          <rect x="32" y="8" width="16" height="6" rx="3" fill="rgba(148,163,184,0.6)" />
          <rect x="32" y="18" width="16" height="6" rx="3" fill="rgba(148,163,184,0.6)" />
          <rect x="-8" y="14" width="96" height="6" rx="3" fill="url(#sayBackdrop)" opacity="0.4" />
        </g>
        <path d="M24 74 L36 88" stroke="rgba(56,189,248,0.4)" stroke-width="3" stroke-linecap="round" />
        <path d="M136 74 L124 88" stroke="rgba(236,72,153,0.4)" stroke-width="3" stroke-linecap="round" />
      </svg>
    `,
  },
  {
    id: "speed-zone",
    name: "Speed Zone",
    description: "Chart a cannonball sprint past sirens, tolls, and neon checkpoints.",
    url: "./speed-zone/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Speed Zone preview">
        <defs>
          <linearGradient id="speedRoad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
          <linearGradient id="speedSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.35)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.8)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(5,8,20,0.9)" stroke="rgba(120,255,255,0.4)" />
        <rect x="12" y="12" width="136" height="96" rx="16" fill="url(#speedSky)" stroke="rgba(120,255,255,0.25)" />
        <g stroke="url(#speedRoad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M24 86 L54 70 L86 82 L120 48" fill="none" />
          <path d="M28 40 L60 32 L92 48 L132 28" fill="none" opacity="0.7" />
        </g>
        <g>
          <circle cx="54" cy="70" r="7" fill="#38bdf8" stroke="rgba(120,255,255,0.6)" />
          <circle cx="86" cy="82" r="7" fill="#f97316" stroke="rgba(255,255,255,0.4)" />
          <circle cx="120" cy="48" r="8" fill="#7b5bff" stroke="rgba(255,255,255,0.6)" />
          <circle cx="92" cy="48" r="6" fill="#facc15" stroke="rgba(255,255,255,0.45)" />
        </g>
        <g transform="translate(32 20)">
          <rect x="72" y="0" width="28" height="28" rx="6" fill="rgba(15,23,42,0.85)" stroke="rgba(120,255,255,0.35)" />
          <g transform="translate(76 4)" fill="#38bdf8" stroke="rgba(255,255,255,0.65)" stroke-width="1.2">
            <rect x="0" y="0" width="6" height="6" rx="1" />
            <rect x="8" y="4" width="6" height="6" rx="1" fill="#f97316" />
            <rect x="4" y="12" width="6" height="6" rx="1" fill="#facc15" />
            <rect x="12" y="16" width="6" height="6" rx="1" fill="#7b5bff" />
          </g>
        </g>
      </svg>
    `,
  },
  {
    id: "vendetta-convoy",
    name: "Vendetta Convoy",
    description: "Chain sabotage charges to shepherd the rogue tanker convoy past concealed explosives.",
    url: "./vendetta-convoy/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vendetta Convoy preview">
        <defs>
          <linearGradient id="convoySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.35)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.9)" />
          </linearGradient>
          <linearGradient id="convoyLane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="148" height="104" rx="18" fill="rgba(7,11,24,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="18" width="128" height="84" rx="16" fill="url(#convoySky)" stroke="rgba(148,163,184,0.28)" />
        <g transform="translate(30 28)">
          <rect x="0" y="0" width="100" height="56" rx="12" fill="rgba(10,16,32,0.88)" stroke="rgba(56,189,248,0.35)" />
          <rect x="8" y="6" width="84" height="44" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(168,85,247,0.45)" />
          <g stroke="rgba(56,189,248,0.25)" stroke-width="1.2">
            ${Array.from({ length: 3 }, (_, i) => `<line x1="${18 + i * 24}" y1="6" x2="${18 + i * 24}" y2="50" />`).join("")}
          </g>
          <g>
            ${[0, 1, 2, 3].map((i) => `<rect x="${6 + i * 20}" y="12" width="16" height="16" rx="4" fill="rgba(148,163,184,0.35)" stroke="rgba(148,163,184,0.4)" />`).join("")}
            ${[0, 1, 2].map((i) => `<rect x="${12 + i * 24}" y="30" width="12" height="12" rx="3" fill="rgba(249,115,22,0.6)" stroke="rgba(249,115,22,0.65)" />`).join("")}
          </g>
          <g transform="translate(24 14)">
            <rect x="0" y="16" width="36" height="20" rx="6" fill="rgba(56,189,248,0.72)" stroke="rgba(56,189,248,0.8)" />
            <rect x="36" y="8" width="16" height="28" rx="6" fill="rgba(168,85,247,0.65)" stroke="rgba(168,85,247,0.75)" />
            <rect x="52" y="16" width="20" height="20" rx="6" fill="rgba(34,197,94,0.55)" stroke="rgba(34,197,94,0.7)" />
          </g>
          <path d="M12 44 Q32 60 52 44 T92 44" fill="none" stroke="url(#convoyLane)" stroke-width="4" stroke-linecap="round" />
          <g>
            <circle cx="18" cy="44" r="6" fill="#38bdf8" stroke="rgba(255,255,255,0.4)" />
            <circle cx="52" cy="44" r="6" fill="#a855f7" stroke="rgba(255,255,255,0.4)" />
            <circle cx="86" cy="44" r="6" fill="#f97316" stroke="rgba(255,255,255,0.4)" />
          </g>
        </g>
        <g transform="translate(22 20)" stroke="rgba(239,68,68,0.6)" stroke-width="2" stroke-dasharray="4 6">
          <rect x="0" y="0" width="28" height="20" rx="6" fill="rgba(239,68,68,0.15)" />
          <rect x="108" y="12" width="28" height="20" rx="6" fill="rgba(239,68,68,0.15)" />
        </g>
        <g transform="translate(30 84)">
          <rect x="0" y="0" width="100" height="18" rx="8" fill="rgba(10,16,32,0.88)" stroke="rgba(56,189,248,0.35)" />
          <rect x="6" y="4" width="88" height="10" rx="5" fill="rgba(56,189,248,0.35)" stroke="rgba(168,85,247,0.45)" />
        </g>
      </svg>
    `,
  },
  {
    id: "prototype",
    name: "Prototype Cabinet",
    description: "Drop a new game folder in \"secret\" and point the cab here.",
    url: "../augmentum/index.html",
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
  {
    id: "paper-trail-blaze",
    name: "Paper Trail Blaze",
    description: "Guide the bill past Blaze's scandals and into the archives before Capital dries up.",
    url: "./blaze/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Paper Trail Blaze preview">
        <defs>
          <linearGradient id="deskGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#5eead4" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="scandalGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#ef4444" />
          </linearGradient>
          <linearGradient id="paperTrail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(94,234,212,0.7)" />
            <stop offset="100%" stop-color="rgba(14,165,233,0.45)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,10,22,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="22" width="56" height="76" rx="12" fill="rgba(15,23,42,0.88)" stroke="url(#deskGlow)" />
        <rect x="86" y="22" width="56" height="76" rx="12" fill="rgba(15,23,42,0.88)" stroke="url(#scandalGlow)" />
        <g stroke="rgba(94,234,212,0.6)" stroke-width="3" stroke-linecap="round">
          <path d="M42 36 C42 60 64 48 64 72" fill="none" />
          <path d="M64 72 C70 84 90 82 96 94" fill="none" />
        </g>
        <g stroke="rgba(248,113,113,0.5)" stroke-width="3" stroke-linecap="round">
          <path d="M112 36 C120 48 124 60 122 72" fill="none" />
          <path d="M122 72 C118 86 98 88 96 94" fill="none" stroke-dasharray="4 4" />
        </g>
        <rect x="34" y="30" width="22" height="32" rx="8" fill="url(#paperTrail)" stroke="rgba(94,234,212,0.8)" />
        <circle cx="118" cy="40" r="10" fill="rgba(248,113,113,0.75)" stroke="rgba(248,113,113,0.9)" />
        <circle cx="98" cy="90" r="8" fill="rgba(251,191,36,0.75)" stroke="rgba(251,191,36,0.9)" />
        <rect x="102" y="70" width="18" height="20" rx="6" fill="rgba(148,163,184,0.35)" stroke="rgba(148,163,184,0.6)" />
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
