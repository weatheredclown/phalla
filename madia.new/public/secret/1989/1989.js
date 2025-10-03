import { getHighScore, onHighScoreChange } from "./arcade-scores.js";
import { getScoreConfig } from "./score-config.js";

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
    id: "three-fugitives",
    name: "Three Fugitives",
    description: "Forge filing stones, sever each lock, and body-check patrols while you usher the kid to the safe balcony.",
    url: "./three-fugitives/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three Fugitives preview">
        <defs>
          <linearGradient id="custodyBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(6,11,22,0.95)" />
          </linearGradient>
          <linearGradient id="safeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(74,222,128,0.85)" />
            <stop offset="100%" stop-color="rgba(59,130,246,0.6)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="url(#custodyBg)" stroke="rgba(148,163,184,0.4)" />
        <rect x="28" y="24" width="104" height="72" rx="14" fill="rgba(12,20,38,0.85)" stroke="rgba(148,163,184,0.35)" />
        <g stroke="rgba(71,85,105,0.55)" stroke-width="1">
          ${Array.from({ length: 4 }, (_, i) => `<line x1="${44 + i * 24}" y1="26" x2="${44 + i * 24}" y2="94" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="30" y1="${42 + i * 20}" x2="130" y2="${42 + i * 20}" />`).join("")}
        </g>
        <rect x="110" y="30" width="20" height="20" rx="6" fill="url(#safeGlow)" stroke="rgba(148,163,184,0.45)" />
        <rect x="56" y="62" width="20" height="20" rx="6" fill="rgba(56,189,248,0.85)" stroke="rgba(14,116,144,0.9)" />
        <rect x="80" y="62" width="20" height="20" rx="6" fill="rgba(248,250,252,0.92)" stroke="rgba(148,163,184,0.7)" />
        <path d="M100 52 L124 40" stroke="rgba(248,250,252,0.6)" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round" />
        <g>
          <rect x="44" y="46" width="18" height="18" rx="5" fill="rgba(239,68,68,0.78)" stroke="rgba(76,29,149,0.8)" />
          <rect x="74" y="34" width="18" height="18" rx="5" fill="rgba(239,68,68,0.7)" stroke="rgba(76,29,149,0.75)" />
          <path d="M53 46 L90 38" stroke="rgba(239,68,68,0.4)" stroke-width="2" stroke-dasharray="4 3" />
        </g>
        <circle cx="68" cy="84" r="6" fill="rgba(250,204,21,0.6)" stroke="rgba(250,204,21,0.9)" />
        <circle cx="92" cy="84" r="6" fill="rgba(248,113,113,0.65)" stroke="rgba(76,29,149,0.8)" />
      </svg>
    `,
  },
  {
    id: "k-mart-countdown",
    name: "The K-Mart Countdown",
    description: "Memorize the spilled matchstick pile and slam your final count before the multiplier fizzles.",
    url: "./k-mart-countdown/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The K-Mart Countdown preview">
        <defs>
          <linearGradient id="countdownBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(8,12,28,0.95)" />
            <stop offset="100%" stop-color="rgba(5,9,20,0.9)" />
          </linearGradient>
          <linearGradient id="displayGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>
        </defs>
        <rect x="10" y="12" width="140" height="96" rx="20" fill="url(#countdownBg)" stroke="rgba(148,163,184,0.38)" />
        <rect x="24" y="20" width="112" height="30" rx="10" fill="rgba(10,19,42,0.85)" stroke="rgba(56,189,248,0.6)" />
        <text x="36" y="40" font-size="10" fill="rgba(148,163,184,0.75)" font-family="'Share Tech Mono', monospace">COUNT</text>
        <text x="116" y="40" text-anchor="end" font-size="20" fill="#38bdf8" font-family="'Segment7Standard', 'Share Tech Mono', monospace">054</text>
        <rect x="26" y="58" width="108" height="40" rx="16" fill="rgba(12,18,35,0.95)" stroke="rgba(148,163,184,0.35)" />
        <g stroke-width="5" stroke-linecap="round">
          <line x1="54" y1="78" x2="90" y2="96" stroke="#facc15" />
          <line x1="64" y1="88" x2="104" y2="70" stroke="#f97316" />
          <line x1="76" y1="74" x2="118" y2="92" stroke="#38bdf8" />
          <line x1="44" y1="90" x2="80" y2="72" stroke="#f472b6" />
          <line x1="38" y1="74" x2="70" y2="94" stroke="#34d399" />
        </g>
        <circle cx="118" cy="70" r="6" fill="#facc15" stroke="rgba(248,250,252,0.65)" stroke-width="2" />
        <circle cx="42" cy="96" r="5" fill="#f472b6" stroke="rgba(248,250,252,0.5)" stroke-width="2" />
      </svg>
    `,
  },
  {
    id: "dojo-duality",
    name: "Dojo Duality",
    description: "Balance Miyagi-Do focus against Cobra Kai pressure while keeping the fear meter at bay.",
    url: "./dojo-duality/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dojo Duality preview">
        <defs>
          <linearGradient id="dojoSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(8,12,28,0.92)" />
          </linearGradient>
          <linearGradient id="focusGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ef4444" />
            <stop offset="50%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#fbbf24" />
          </linearGradient>
        </defs>
        <rect x="10" y="12" width="140" height="96" rx="20" fill="url(#dojoSky)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(36 26)">
          <circle cx="44" cy="34" r="32" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.6)" stroke-width="3" />
          <circle cx="44" cy="34" r="22" fill="rgba(251,191,36,0.08)" stroke="rgba(249,115,22,0.45)" stroke-width="2" />
          <path d="M24 36 C44 12 64 12 84 36" fill="none" stroke="rgba(249,115,22,0.6)" stroke-width="3" stroke-linecap="round" />
          <path d="M28 44 C44 64 60 64 76 44" fill="none" stroke="rgba(55,65,81,0.45)" stroke-width="2" stroke-linecap="round" />
          <text x="44" y="40" text-anchor="middle" font-size="16" fill="#fbbf24" font-family="'Press Start 2P', monospace">心</text>
        </g>
        <g transform="translate(32 82)">
          <rect x="0" y="0" width="96" height="12" rx="6" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="8" y="2" width="80" height="8" rx="4" fill="rgba(15,23,42,0.7)" stroke="rgba(148,163,184,0.25)" />
          <rect x="8" y="2" width="48" height="8" rx="4" fill="url(#focusGlow)" />
          <circle cx="48" cy="6" r="6" fill="rgba(248,250,252,0.85)" stroke="rgba(148,163,184,0.3)" stroke-width="1.5" />
        </g>
        <g transform="translate(112 32)">
          <rect x="0" y="0" width="22" height="48" rx="10" fill="rgba(15,23,42,0.7)" stroke="rgba(148,163,184,0.35)" />
          <rect x="6" y="10" width="10" height="20" rx="4" fill="rgba(239,68,68,0.8)" />
          <rect x="6" y="32" width="10" height="10" rx="4" fill="rgba(56,189,248,0.75)" />
        </g>
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
    id: "hoverboard-pursuit",
    name: "Hoverboard Pursuit",
    description: "Dodge neon traffic, skim the suburbs, and outpace Griff for a flawless Hill Valley time trial.",
    url: "./hoverboard-pursuit/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hoverboard Pursuit preview">
        <defs>
          <linearGradient id="hpSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.45)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.95)" />
          </linearGradient>
          <linearGradient id="hpTrack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.6)" />
            <stop offset="100%" stop-color="rgba(8,11,26,0.95)" />
          </linearGradient>
          <linearGradient id="hpBoost" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c084fc" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#hpSky)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(24 20)">
          <path
            d="M18 88 L56 20 C64 10 96 10 104 20 L132 88"
            fill="url(#hpTrack)"
            stroke="rgba(148,163,184,0.45)"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M32 88 L62 26 C66 22 94 22 98 26 L128 88"
            fill="none"
            stroke="rgba(56,189,248,0.35)"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="6 12"
          />
          <path
            d="M46 88 L72 34 C76 30 84 30 88 34 L114 88"
            fill="none"
            stroke="rgba(236,72,153,0.45)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="4 10"
          />
          <g transform="translate(74 58)">
            <ellipse cx="0" cy="28" rx="16" ry="6" fill="rgba(168,85,247,0.32)" />
            <rect x="-14" y="12" width="28" height="10" rx="5" fill="url(#hpBoost)" stroke="rgba(248,250,252,0.7)" />
            <circle cx="-6" cy="7" r="4" fill="#facc15" stroke="rgba(248,250,252,0.7)" />
            <circle cx="6" cy="7" r="4" fill="#38bdf8" stroke="rgba(248,250,252,0.7)" />
            <path d="M-8 4 L8 4" stroke="rgba(248,250,252,0.6)" stroke-width="2" stroke-linecap="round" />
          </g>
        <g transform="translate(44 32)">
            <rect x="-10" y="18" width="20" height="14" rx="6" fill="rgba(239,68,68,0.75)" />
            <rect x="30" y="6" width="18" height="12" rx="5" fill="rgba(56,189,248,0.65)" />
            <rect x="54" y="32" width="14" height="10" rx="4" fill="rgba(250,204,21,0.75)" />
          </g>
        </g>
      </svg>
    `,
  },
  // Level 9
  {
    id: "osaka-motorcycle-dash",
    name: "Osaka Motorcycle Dash",
    description:
      "Shadow the witness through Osaka's neon arteries, stay locked in the halo, and trade boost for disabler pulses before gangs box you out.",
    url: "./osaka-motorcycle-dash/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Osaka Motorcycle Dash preview">
        <defs>
          <linearGradient id="omdSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.4)" />
            <stop offset="100%" stop-color="rgba(2,6,23,0.95)" />
          </linearGradient>
          <linearGradient id="omdLane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(236,72,153,0.65)" />
            <stop offset="100%" stop-color="rgba(37,99,235,0.55)" />
          </linearGradient>
          <radialGradient id="omdHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(250,204,21,0.75)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0)" />
          </radialGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(5,8,20,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="18" width="128" height="84" rx="16" fill="url(#omdSky)" stroke="rgba(148,163,184,0.32)" />
        <g opacity="0.45">
          <path d="M32 102 L54 36 C60 20 100 18 118 34 L140 102" fill="none" stroke="rgba(59,130,246,0.35)" stroke-width="5" stroke-linecap="round" />
          <path d="M24 94 L48 42 C56 24 106 24 126 46 L144 102" fill="none" stroke="rgba(236,72,153,0.4)" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 10" />
        </g>
        <g transform="translate(0 -6)">
          <ellipse cx="90" cy="68" rx="26" ry="16" fill="url(#omdHalo)" />
          <rect x="78" y="52" width="24" height="40" rx="10" fill="url(#omdLane)" stroke="rgba(248,250,252,0.35)" />
          <rect x="84" y="56" width="12" height="20" rx="6" fill="rgba(15,23,42,0.85)" />
        </g>
        <g transform="translate(0 -2)">
          <rect x="58" y="66" width="18" height="34" rx="8" fill="rgba(59,130,246,0.9)" stroke="rgba(248,250,252,0.4)" />
          <rect x="60" y="70" width="14" height="16" rx="6" fill="rgba(15,23,42,0.85)" />
          <path d="M67 98 L67 110" stroke="rgba(56,189,248,0.6)" stroke-width="3" stroke-linecap="round" />
        </g>
        <g transform="translate(0 -6)" opacity="0.75">
          <rect x="36" y="40" width="18" height="40" rx="8" fill="rgba(248,113,113,0.85)" stroke="rgba(248,250,252,0.4)" />
          <rect x="38" y="44" width="14" height="18" rx="6" fill="rgba(15,23,42,0.85)" />
          <path d="M45 80 L45 94" stroke="rgba(248,113,113,0.6)" stroke-width="3" stroke-linecap="round" />
        </g>
        <g>
          <path d="M24 26 L42 34" stroke="rgba(59,130,246,0.5)" stroke-width="3" stroke-linecap="round" />
          <path d="M118 26 L102 38" stroke="rgba(236,72,153,0.5)" stroke-width="3" stroke-linecap="round" />
          <circle cx="118" cy="26" r="6" fill="#facc15" stroke="rgba(248,250,252,0.5)" />
          <circle cx="24" cy="26" r="6" fill="#38bdf8" stroke="rgba(248,250,252,0.45)" />
          <circle cx="56" cy="30" r="4" fill="#c084fc" />
          <circle cx="100" cy="32" r="4" fill="#f472b6" />
        </g>
      </svg>
    `,
  }, // Level 9
  {
    id: "rollercoaster-of-life",
    name: "Rollercoaster of Life",
    description: "Race through parenting crises, weigh safe answers against wild gambles, and keep Family Harmony glowing.",
    url: "./rollercoaster-of-life/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rollercoaster of Life preview">
        <defs>
          <linearGradient id="rolBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
          <linearGradient id="rolPanel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.92)" />
            <stop offset="100%" stop-color="rgba(30,64,175,0.82)" />
          </linearGradient>
          <linearGradient id="rolTimer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#22c55e" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="20" fill="rgba(15,23,42,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="14" y="14" width="132" height="92" rx="16" fill="url(#rolBg)" opacity="0.25" />
        <g transform="translate(24 24)">
          <rect x="0" y="0" width="112" height="24" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="6" y="6" width="62" height="12" rx="6" fill="rgba(248,250,252,0.92)" />
          <rect x="72" y="6" width="34" height="12" rx="6" fill="url(#rolTimer)" />
          <text x="24" y="15" font-family="'Press Start 2P', monospace" font-size="6" fill="#0ea5e9">Harmony</text>
          <text x="97" y="15" font-family="'Press Start 2P', monospace" font-size="6" fill="#f8fafc" text-anchor="end">540</text>
        </g>
        <g transform="translate(24 52)">
          <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#rolPanel)" stroke="rgba(148,163,184,0.35)" />
          <path d="M8 38 C18 26 30 18 40 10" fill="none" stroke="#facc15" stroke-width="4" stroke-linecap="round" />
          <circle cx="20" cy="26" r="5" fill="#38bdf8" />
          <circle cx="32" cy="18" r="4" fill="#f97316" />
          <path d="M12 12 L22 4" stroke="rgba(248,250,252,0.6)" stroke-width="3" stroke-linecap="round" />
        </g>
        <g transform="translate(80 52)">
          <rect x="0" y="0" width="56" height="24" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="4" y="4" width="24" height="16" rx="8" fill="rgba(34,197,94,0.85)" />
          <rect x="28" y="4" width="24" height="16" rx="8" fill="rgba(248,113,113,0.85)" />
          <text x="16" y="15" font-size="7" font-family="'Press Start 2P', monospace" fill="#0f172a" text-anchor="middle">SAFE</text>
          <text x="40" y="15" font-size="7" font-family="'Press Start 2P', monospace" fill="#0f172a" text-anchor="middle">WILD</text>
        </g>
        <g transform="translate(80 82)">
          <rect x="0" y="0" width="56" height="24" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <path d="M12 16 C18 12 26 12 32 8" stroke="#f472b6" stroke-width="3" stroke-linecap="round" />
          <path d="M24 8 L36 4" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
          <circle cx="12" cy="16" r="4" fill="#22d3ee" />
          <circle cx="32" cy="8" r="4" fill="#facc15" />
        </g>
      </svg>
    `,
  },
  // Level 12
  {
    id: "truvys-salon-style",
    name: "Truvy's Salon Style",
    description: "Spin Truvy's chairs, juggle Magnolia-style tickets, and gamble on gossip pauses to keep tips overflowing.",
    url: "./truvys-salon-style/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Truvy's Salon Style preview">
        <defs>
          <linearGradient id="salonBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(253, 213, 224, 0.95)" />
            <stop offset="100%" stop-color="rgba(191, 219, 254, 0.9)" />
          </linearGradient>
          <linearGradient id="mirrorGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.9)" />
            <stop offset="100%" stop-color="rgba(236, 72, 153, 0.4)" />
          </linearGradient>
          <linearGradient id="chairSeat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbcfe8" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
          <linearGradient id="ticketPad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fde68a" />
            <stop offset="100%" stop-color="#fcd34d" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="20" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="16" width="128" height="88" rx="18" fill="url(#salonBg)" />
        <g transform="translate(28 24)">
          <rect x="0" y="0" width="56" height="72" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(148,163,184,0.4)" />
          <rect x="6" y="6" width="44" height="38" rx="14" fill="url(#mirrorGlow)" />
          <rect x="10" y="48" width="36" height="18" rx="9" fill="rgba(15,23,42,0.2)" stroke="rgba(148,163,184,0.4)" />
          <circle cx="28" cy="58" r="8" fill="rgba(255,255,255,0.9)" stroke="rgba(236,72,153,0.6)" />
        </g>
        <g transform="translate(94 28)">
          <rect x="0" y="16" width="44" height="40" rx="14" fill="url(#chairSeat)" stroke="rgba(236,72,153,0.6)" />
          <rect x="6" y="0" width="32" height="18" rx="8" fill="rgba(236,72,153,0.55)" stroke="rgba(236,72,153,0.75)" />
          <rect x="14" y="56" width="20" height="10" rx="5" fill="rgba(79,70,229,0.55)" />
          <path d="M6 66 L38 66" stroke="rgba(79,70,229,0.6)" stroke-width="4" stroke-linecap="round" />
        </g>
        <g transform="translate(84 70)">
          <rect x="-32" y="0" width="54" height="26" rx="10" fill="url(#ticketPad)" stroke="rgba(249,115,22,0.6)" />
          <g font-family="'Press Start 2P', monospace" font-size="6" fill="rgba(120,53,15,0.9)">
            <text x="-26" y="10">Wash</text>
            <text x="-26" y="18">Tease</text>
            <text x="-26" y="26">Spray</text>
          </g>
        </g>
        <g transform="translate(34 82)">
          <rect x="0" y="0" width="32" height="12" rx="6" fill="rgba(59,130,246,0.6)" />
          <text x="16" y="9" font-size="7" font-family="'Press Start 2P', monospace" fill="#0f172a" text-anchor="middle">TIP</text>
        </g>
        <g transform="translate(110 18)">
          <rect x="0" y="0" width="20" height="20" rx="6" fill="rgba(255,255,255,0.85)" stroke="rgba(236,72,153,0.6)" />
          <path d="M6 10 H14" stroke="#ec4899" stroke-width="3" stroke-linecap="round" />
          <path d="M10 6 V14" stroke="#ec4899" stroke-width="3" stroke-linecap="round" />
        </g>
      </svg>
    `,
  }, // Level 12
  {
    id: "flapjack-flip-out",
    name: "Flapjack Flip-Out",
    description: "Juggle Uncle Buck's oversized flapjacks and gamble on nudges to keep the stack sky-high.",
    url: "./flapjack-flip-out/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flapjack Flip-Out preview">
        <defs>
          <linearGradient id="flapjackSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(8,13,28,0.92)" />
          </linearGradient>
          <linearGradient id="flapjackPlate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.75)" />
            <stop offset="100%" stop-color="rgba(37,99,235,0.55)" />
          </linearGradient>
          <linearGradient id="flapjackStack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fde68a" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="140" height="100" rx="18" fill="rgba(6,10,22,0.95)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="18" width="124" height="84" rx="16" fill="url(#flapjackSky)" stroke="rgba(148,163,184,0.28)" />
        <g transform="translate(0 6)">
          <rect x="32" y="70" width="96" height="18" rx="9" fill="url(#flapjackPlate)" stroke="rgba(148,163,184,0.4)" />
          <ellipse cx="80" cy="79" rx="32" ry="6" fill="rgba(14,116,144,0.35)" />
        </g>
        <g transform="translate(0 -2)">
          <g>
            <rect x="60" y="60" width="40" height="10" rx="4" fill="#f97316" stroke="rgba(148,163,184,0.3)" />
            <ellipse cx="80" cy="58" rx="32" ry="12" fill="url(#flapjackStack)" stroke="rgba(148,163,184,0.3)" />
            <ellipse cx="80" cy="50" rx="28" ry="10" fill="#fde68a" stroke="rgba(148,163,184,0.28)" />
            <ellipse cx="80" cy="42" rx="24" ry="9" fill="#fbbf24" stroke="rgba(148,163,184,0.26)" />
            <ellipse cx="80" cy="34" rx="20" ry="8" fill="#fb7185" stroke="rgba(148,163,184,0.25)" />
          </g>
          <path d="M110 24 L142 16" stroke="rgba(59,130,246,0.65)" stroke-width="4" stroke-linecap="round" />
          <path d="M112 24 L134 34" stroke="rgba(248,113,113,0.8)" stroke-width="5" stroke-linecap="round" />
          <circle cx="134" cy="34" r="6" fill="#facc15" stroke="rgba(248,250,252,0.6)" stroke-width="2" />
        </g>
        <g>
          <circle cx="44" cy="90" r="4" fill="#38bdf8" />
          <circle cx="116" cy="90" r="4" fill="#f97316" />
          <circle cx="80" cy="22" r="3" fill="#facc15" />
        </g>
      </svg>
    `,
  },
  // Level 6
  {
    id: "frank-drebins-follies",
    name: "Frank Drebin's Follies",
    description:
      "Sprint through slapstick desk duty. Time every prompt, choose when to intervene, and weaponize the collateral damage.",
    url: "./frank-drebins-follies/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Frank Drebin's Follies preview">
        <defs>
          <linearGradient id="folliesBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(30,41,59,0.9)" />
          </linearGradient>
          <linearGradient id="folliesBurst" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
          <linearGradient id="folliesTape" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#fb923c" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="140" height="100" rx="20" fill="url(#folliesBg)" stroke="rgba(148,163,184,0.4)" />
        <g transform="translate(18 18)">
          <rect x="0" y="0" width="124" height="84" rx="18" fill="rgba(6,11,22,0.7)" stroke="rgba(148,163,184,0.35)" />
          <g transform="translate(10 12)">
            <rect x="0" y="36" width="56" height="32" rx="10" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.4)" />
            <rect x="64" y="0" width="40" height="20" rx="8" fill="rgba(56,189,248,0.65)" />
            <rect x="66" y="22" width="36" height="18" rx="8" fill="rgba(244,114,182,0.75)" />
            <rect x="64" y="44" width="44" height="20" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.3)" />
            <text x="86" y="14" text-anchor="middle" font-size="9" fill="#0f172a" font-family="'Press Start 2P', monospace">CHAOS</text>
            <text x="86" y="58" text-anchor="middle" font-size="10" fill="#38bdf8" font-family="'Press Start 2P', monospace">9999</text>
          </g>
          <g transform="translate(14 14)">
            <rect x="0" y="0" width="42" height="62" rx="16" fill="rgba(37,99,235,0.42)" stroke="rgba(148,163,184,0.35)" />
            <path d="M12 14 L30 14" stroke="rgba(248,250,252,0.7)" stroke-width="3" stroke-linecap="round" />
            <path d="M10 28 C20 22 28 34 34 28" stroke="rgba(244,114,182,0.7)" stroke-width="3" stroke-linecap="round" />
            <circle cx="21" cy="44" r="10" fill="rgba(248,250,252,0.88)" stroke="rgba(148,163,184,0.4)" />
            <circle cx="21" cy="44" r="4" fill="#1e293b" />
          </g>
          <g transform="translate(4 4)">
            <path d="M8 68 L108 22" stroke="url(#folliesTape)" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 6" />
            <path d="M18 78 L118 32" stroke="url(#folliesTape)" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 6" />
          </g>
          <g transform="translate(26 18)">
            <circle cx="70" cy="28" r="16" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.4)" />
            <circle cx="70" cy="28" r="12" fill="url(#folliesBurst)" opacity="0.75" />
            <path d="M62 20 L78 36" stroke="rgba(248,250,252,0.8)" stroke-width="2" stroke-linecap="round" />
            <path d="M78 20 L62 36" stroke="rgba(248,250,252,0.8)" stroke-width="2" stroke-linecap="round" />
            <circle cx="70" cy="28" r="4" fill="#facc15" />
          </g>
        </g>
      </svg>
    `,
  }, // Level 6
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
    id: "culdesac-curiosity",
    name: "Cul-de-sac Curiosity",
    description: "Swap gossip to earn dig tokens while paranoia creeps toward a suburban outburst.",
    url: "./culdesac-curiosity/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cul-de-sac Curiosity preview">
        <defs>
          <linearGradient id="curiositySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.85)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.9)" />
          </linearGradient>
          <linearGradient id="basementGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(192,132,252,0.65)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.4)" />
          </linearGradient>
          <linearGradient id="paranoiaMeter" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(248,113,113,0.9)" />
            <stop offset="100%" stop-color="rgba(251,191,36,0.9)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,10,22,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="20" y="20" width="120" height="48" rx="14" fill="url(#curiositySky)" stroke="rgba(148,163,184,0.28)" />
        <g transform="translate(38 28)">
          <polygon points="24,0 48,18 0,18" fill="rgba(226,232,240,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="6" y="18" width="36" height="20" rx="6" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="14" y="24" width="8" height="10" fill="rgba(56,189,248,0.75)" />
          <rect x="28" y="24" width="8" height="10" fill="rgba(249,115,22,0.75)" />
        </g>
        <g transform="translate(20 70)">
          <rect x="0" y="0" width="120" height="34" rx="10" fill="rgba(9,13,28,0.9)" stroke="rgba(148,163,184,0.28)" />
          <rect x="10" y="8" width="32" height="18" rx="6" fill="rgba(226,232,240,0.1)" stroke="rgba(148,163,184,0.25)" />
          <rect x="50" y="8" width="32" height="18" rx="6" fill="rgba(226,232,240,0.1)" stroke="rgba(148,163,184,0.25)" />
          <rect x="90" y="8" width="20" height="18" rx="6" fill="rgba(226,232,240,0.1)" stroke="rgba(148,163,184,0.25)" />
          <rect x="12" y="10" width="12" height="14" rx="4" fill="rgba(248,250,252,0.85)" />
          <rect x="54" y="10" width="12" height="14" rx="4" fill="rgba(251,191,36,0.75)" />
          <rect x="94" y="10" width="12" height="14" rx="4" fill="rgba(192,132,252,0.75)" />
        </g>
        <rect x="28" y="92" width="104" height="10" rx="5" fill="rgba(15,23,42,0.8)" stroke="rgba(148,163,184,0.25)" />
        <rect x="30" y="94" width="70" height="6" rx="3" fill="url(#paranoiaMeter)" />
        <g transform="translate(110 28)">
          <rect x="0" y="0" width="22" height="40" rx="8" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.28)" />
          <rect x="4" y="26" width="14" height="10" rx="4" fill="url(#basementGlow)" />
          <circle cx="11" cy="12" r="6" fill="rgba(192,132,252,0.8)" stroke="rgba(248,250,252,0.6)" stroke-width="1.5" />
        </g>
      </svg>
    `,
  },
  {
    id: "augmentum",
    name: "Augmentum",

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
    id: "gates-of-eastside",
    name: "Gates of Eastside",
    description: "Expel the hall blockers and channel MBST charge before chaos rings the alarm.",
    url: "./gates-of-eastside/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gates of Eastside preview">
        <defs>
          <linearGradient id="leanGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>
          <linearGradient id="leanFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.25)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.85)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(6,10,24,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="22" width="124" height="76" rx="16" fill="url(#leanFloor)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(28 32)">
          <rect x="0" y="0" width="28" height="56" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.45)" />
          <rect x="0" y="18" width="28" height="20" rx="8" fill="rgba(248,113,113,0.45)" />
          <rect x="46" y="0" width="28" height="56" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(250,204,21,0.45)" />
          <rect x="46" y="18" width="28" height="20" rx="8" fill="rgba(250,204,21,0.45)" />
          <rect x="92" y="0" width="28" height="56" rx="10" fill="rgba(15,23,42,0.85)" stroke="rgba(45,212,191,0.45)" />
          <rect x="92" y="18" width="28" height="20" rx="8" fill="rgba(45,212,191,0.4)" />
        </g>
        <g transform="translate(34 28)" stroke="rgba(148,163,184,0.4)" stroke-width="1.2">
          ${Array.from({ length: 3 }, (_, i) => `<line x1="0" y1="${12 + i * 16}" x2="112" y2="${12 + i * 16}" />`).join("")}
        </g>
        <g transform="translate(32 24)">
          <rect x="16" y="64" width="84" height="12" rx="6" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.4)" />
          <rect x="20" y="66" width="46" height="8" rx="4" fill="rgba(56,189,248,0.5)" />
          <rect x="70" y="66" width="26" height="8" rx="4" fill="rgba(34,197,94,0.55)" />
        </g>
        <g transform="translate(42 18)">
          <rect x="0" y="0" width="76" height="20" rx="8" fill="rgba(15,23,42,0.85)" stroke="url(#leanGlow)" />
          <rect x="6" y="6" width="24" height="8" rx="3" fill="rgba(56,189,248,0.6)" />
          <rect x="38" y="6" width="20" height="8" rx="3" fill="rgba(250,204,21,0.6)" />
          <rect x="62" y="6" width="8" height="8" rx="3" fill="rgba(45,212,191,0.6)" />
        </g>
        <g transform="translate(36 44)">
          <circle cx="0" cy="0" r="6" fill="#38bdf8" stroke="rgba(255,255,255,0.6)" />
          <circle cx="40" cy="12" r="6" fill="#facc15" stroke="rgba(255,255,255,0.6)" />
          <circle cx="80" cy="-4" r="6" fill="#2dd4bf" stroke="rgba(255,255,255,0.6)" />
          <path d="M0 0 L40 12 L80 -4" fill="none" stroke="url(#leanGlow)" stroke-width="3" stroke-linecap="round" />
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
  // Level 15
  {
    id: "grail-trial",
    name: "The Grail Trial",
    description:
      "Step through the Breath, Word, and Path of God: memorize the sacred letters, kneel beneath the blades, and race across the invisible bridge before time erodes your worthiness.",
    url: "./grail-trial/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Grail Trial preview">
        <defs>
          <linearGradient id="grailSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(8,11,24,0.92)" />
          </linearGradient>
          <linearGradient id="grailGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <radialGradient id="grailDust" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stop-color="rgba(248,250,252,0.8)" />
            <stop offset="100%" stop-color="rgba(248,250,252,0)" />
          </radialGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#grailSky)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(18 24)">
          <rect x="0" y="0" width="46" height="72" rx="12" fill="rgba(15,23,42,0.8)" stroke="rgba(148,163,184,0.32)" />
          ${['I','X','Q','M','S','E','T','R','H','L','O','D','N','V','A','G'].map((letter, index) => {
            const x = (index % 4) * 11 + 6;
            const y = Math.floor(index / 4) * 16 + 14;
            const highlight = [0,5,8,10,13,14].includes(index) ? 'rgba(250,204,21,0.35)' : 'rgba(30,41,59,0.65)';
            const stroke = [0,5,8,10,13,14].includes(index) ? 'rgba(250,204,21,0.6)' : 'rgba(148,163,184,0.2)';
            return `<rect x="${x - 5}" y="${y - 10}" width="10" height="12" rx="3" fill="${highlight}" stroke="${stroke}" />` +
              `<text x="${x}" y="${y}" text-anchor="middle" font-size="6" fill="rgba(248,250,252,0.85)" font-family="'Press Start 2P', monospace">${letter}</text>`;
          }).join('')}
        </g>
        <g transform="translate(72 24)">
          <rect x="0" y="12" width="32" height="48" rx="10" fill="rgba(15,23,42,0.78)" stroke="rgba(148,163,184,0.28)" />
          <path d="M0 24 L32 24" stroke="rgba(248,250,252,0.18)" stroke-width="2" stroke-dasharray="4 4" />
          <path d="M4 28 L28 40" stroke="#f97316" stroke-width="4" stroke-linecap="round" />
          <path d="M4 40 L28 28" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
          <rect x="10" y="46" width="12" height="16" rx="6" fill="rgba(250,204,21,0.65)" stroke="rgba(148,163,184,0.4)" />
          <rect x="8" y="58" width="16" height="10" rx="4" fill="rgba(59,130,246,0.55)" />
        </g>
        <g transform="translate(110 20)">
          <rect x="0" y="0" width="32" height="80" rx="12" fill="rgba(15,23,42,0.82)" stroke="rgba(148,163,184,0.3)" />
          <path d="M16 10 L16 70" stroke="rgba(56,189,248,0.4)" stroke-width="2" stroke-dasharray="6 6" />
          <g fill="rgba(248,250,252,0.75)" opacity="0.85">
            <circle cx="16" cy="18" r="4" />
            <circle cx="16" cy="36" r="4" />
            <circle cx="16" cy="54" r="4" />
          </g>
          <rect x="10" y="32" width="12" height="12" rx="4" fill="rgba(250,204,21,0.5)" stroke="rgba(250,204,21,0.7)" />
          <path d="M10 64 L22 74" stroke="rgba(248,250,252,0.4)" stroke-width="3" stroke-linecap="round" />
        </g>
        <circle cx="120" cy="56" r="20" fill="url(#grailDust)" opacity="0.4" />
        <path d="M18 100 L142 100" stroke="url(#grailGlow)" stroke-width="6" stroke-linecap="round" opacity="0.55" />
      </svg>
    `,
  }, // Level 15
  // Level 14
  {
    id: "the-final-barrier",
    name: "The Final Barrier",
    description: "Pilot the Enterprise through the Great Barrier, juggle power diversion, and shatter the sentinel beyond the veil.",
    url: "./the-final-barrier/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Final Barrier preview">
        <defs>
          <radialGradient id="barrierCore" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="45%" stop-color="rgba(236,72,153,0.65)" />
            <stop offset="80%" stop-color="rgba(37,99,235,0.4)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.9)" />
          </radialGradient>
          <linearGradient id="warpRings" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#c084fc" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,10,24,0.95)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="18" width="124" height="84" rx="16" fill="url(#barrierCore)" stroke="rgba(56,189,248,0.35)" />
        <g stroke="rgba(148,163,184,0.35)" stroke-width="1" opacity="0.6">
          <path d="M30 60 C60 36 100 36 130 60" fill="none" />
          <path d="M30 68 C60 44 100 44 130 68" fill="none" />
          <path d="M30 76 C60 52 100 52 130 76" fill="none" />
        </g>
        <g stroke="url(#warpRings)" stroke-width="3" stroke-linecap="round" opacity="0.75">
          <path d="M40 86 C66 70 94 70 120 86" fill="none" />
          <path d="M46 92 C72 78 88 78 114 92" fill="none" />
        </g>
        <g fill="rgba(56,189,248,0.9)" opacity="0.85">
          <circle cx="56" cy="44" r="6" />
          <circle cx="104" cy="40" r="5" />
          <circle cx="86" cy="54" r="4" />
          <circle cx="72" cy="32" r="3" />
        </g>
        <g transform="translate(40 74)">
          <path d="M32 18 L52 8 L72 18 L52 28 Z" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.45)" stroke-width="1.4" />
          <path d="M40 18 L52 4 L64 18" fill="none" stroke="rgba(248,250,252,0.8)" stroke-width="2" stroke-linecap="round" />
          <path d="M38 18 L52 24 L66 18" fill="none" stroke="rgba(236,72,153,0.7)" stroke-width="2" stroke-linecap="round" />
        </g>
      </svg>
    `,
  }, // Level 14
  {
    id: "wardline-breakout",
    name: "Wardline Breakout",
    description: "Plan six simultaneous moves to sneak the quartet into the stadium gates.",
    url: "./wardline-breakout/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wardline Breakout preview">
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
    id: "dialtone-honor-roll",
    name: "Dialtone Honor Roll",
    description: "Warp fixed-shape figures into the correct era bays via a plotted phone booth trail.",
    url: "./dialtone-honor-roll/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dialtone Honor Roll preview">
        <defs>
          <linearGradient id="dialtoneSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#7b5bff" />
          </linearGradient>
          <linearGradient id="dialtoneTrail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#22c55e" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(8,12,28,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="22" y="20" width="116" height="80" rx="16" fill="rgba(10,16,36,0.9)" stroke="url(#dialtoneSky)" />
        <g stroke="rgba(56,189,248,0.25)" stroke-width="1">
          ${Array.from({ length: 3 }, (_, i) => `<line x1="${38 + i * 36}" y1="24" x2="${38 + i * 36}" y2="96" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="32" y1="${48 + i * 16}" x2="132" y2="${48 + i * 16}" />`).join("")}
        </g>
        <g transform="translate(36 28)">
          <rect x="0" y="0" width="28" height="56" rx="8" fill="rgba(234,179,8,0.75)" stroke="rgba(251,191,36,0.9)" />
          <rect x="38" y="10" width="28" height="56" rx="8" fill="rgba(139,92,246,0.7)" stroke="rgba(167,139,250,0.9)" />
          <rect x="76" y="4" width="28" height="56" rx="8" fill="rgba(59,130,246,0.75)" stroke="rgba(147,197,253,0.9)" />
        </g>
        <g transform="translate(30 20)">
          <rect x="44" y="0" width="24" height="48" rx="6" fill="rgba(15,23,42,0.95)" stroke="rgba(226,232,240,0.35)" />
          <rect x="48" y="6" width="16" height="24" rx="4" fill="rgba(8,145,178,0.7)" />
          <rect x="48" y="34" width="16" height="8" rx="3" fill="rgba(226,232,240,0.6)" />
        </g>
        <path d="M40 30 Q64 16 88 26 T132 42" fill="none" stroke="url(#dialtoneTrail)" stroke-width="6" stroke-linecap="round" stroke-dasharray="6 8" />
        <circle cx="40" cy="30" r="6" fill="#facc15" stroke="rgba(17,24,39,0.8)" stroke-width="2" />
        <circle cx="132" cy="42" r="7" fill="#22c55e" stroke="rgba(17,24,39,0.8)" stroke-width="2" />
      </svg>
    `,
  },
  {
    id: "half-inch-heroes",
    name: "Half-Inch Heroes",
    description: "Steer the micro squad across the lawn while juggling dew, loyalty, and sprinkler cycles.",
    url: "./half-inch-heroes/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Half-Inch Heroes preview">
        <defs>
          <linearGradient id="microSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.4)" />
            <stop offset="100%" stop-color="rgba(13,22,38,0.92)" />
          </linearGradient>
          <linearGradient id="grassGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(132,204,22,0.85)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.4)" />
          </linearGradient>
          <radialGradient id="dewDrop" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#e0f2fe" />
            <stop offset="70%" stop-color="rgba(56,189,248,0.65)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.85)" />
          </radialGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(9,14,32,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="20" width="124" height="80" rx="16" fill="url(#microSky)" stroke="rgba(56,189,248,0.35)" />
        <g stroke="rgba(148,163,184,0.18)" stroke-width="1" opacity="0.9">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${30 + i * 20}" y1="26" x2="${30 + i * 16}" y2="92" />`).join("")}
        </g>
        <g fill="url(#grassGlow)" opacity="0.88">
          <path d="M28 94 C36 70 48 46 60 32 L70 34 C58 58 46 84 40 102 Z" />
          <path d="M62 96 C68 72 84 46 96 32 L104 36 C92 60 82 84 76 104 Z" />
          <path d="M100 94 C110 68 124 44 132 30 L138 36 C130 58 118 84 112 104 Z" />
        </g>
        <ellipse cx="70" cy="54" rx="18" ry="12" fill="url(#dewDrop)" stroke="rgba(226,232,240,0.45)" stroke-width="1.5" />
        <path d="M82 66 Q92 70 100 78 T122 94" fill="none" stroke="rgba(132,204,22,0.7)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 8" />
        <g transform="translate(48 72)">
          <path d="M0 18 Q10 10 22 12" fill="none" stroke="rgba(59,130,246,0.6)" stroke-width="2" stroke-linecap="round" />
          <circle cx="22" cy="12" r="5" fill="#84cc16" stroke="rgba(15,23,42,0.8)" stroke-width="1.5" />
          <circle cx="6" cy="18" r="4" fill="#facc15" stroke="rgba(15,23,42,0.85)" stroke-width="1.5" />
          <path d="M-4 24 C6 12 12 4 18 0" fill="none" stroke="rgba(38,198,218,0.45)" stroke-width="2" stroke-linecap="round" />
        </g>
        <g transform="translate(96 64)">
          <path d="M0 16 C8 12 18 12 26 16" fill="none" stroke="rgba(15,23,42,0.7)" stroke-width="6" stroke-linecap="round" />
          <circle cx="4" cy="16" r="4" fill="#0f172a" />
          <circle cx="20" cy="16" r="4" fill="#0f172a" />
          <path d="M8 12 C12 4 18 4 22 12" fill="none" stroke="#84cc16" stroke-width="2" stroke-linecap="round" />
        </g>
      </svg>
    `,
  },
  {
    id: "boombox-serenade",
    name: "Boombox Serenade",
    description: "Sync emotional frequencies before the silence fractures the conversation.",
    url: "./boombox-serenade/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Boombox Serenade preview">
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
    id: "diner-debate",
    name: "The Diner Debate",
    description: "Time every cue, shatter the doubts, and choose the perfect moment for the neon climax.",
    url: "./diner-debate/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Diner Debate preview">
        <defs>
          <linearGradient id="dinerBackdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
          <linearGradient id="boothGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(244,114,182,0.65)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.45)" />
          </linearGradient>
          <linearGradient id="timelineSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#f472b6" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(8,11,22,0.94)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="18" width="128" height="84" rx="16" fill="url(#dinerBackdrop)" stroke="rgba(148,163,184,0.28)" />
        <g>
          <rect x="24" y="32" width="44" height="52" rx="16" fill="rgba(244,114,182,0.3)" stroke="rgba(244,114,182,0.55)" />
          <rect x="92" y="32" width="44" height="52" rx="16" fill="rgba(56,189,248,0.28)" stroke="rgba(56,189,248,0.5)" />
        </g>
        <rect x="50" y="56" width="60" height="26" rx="12" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.45)" />
        <rect x="62" y="44" width="36" height="12" rx="6" fill="url(#boothGlow)" stroke="rgba(248,250,252,0.35)" />
        <g>
          <rect x="24" y="84" width="112" height="18" rx="9" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.4)" />
          <rect x="28" y="88" width="104" height="10" rx="5" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.4)" />
          <rect x="30" y="90" width="100" height="6" rx="3" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.3)" />
          <rect x="30" y="90" width="70" height="6" rx="3" fill="rgba(59,130,246,0.35)" />
          <line x1="80" y1="86" x2="80" y2="104" stroke="url(#timelineSweep)" stroke-width="4" stroke-linecap="round" />
          <circle cx="108" cy="93" r="8" fill="rgba(244,114,182,0.85)" stroke="rgba(248,250,252,0.5)" />
          <circle cx="52" cy="93" r="8" fill="rgba(56,189,248,0.85)" stroke="rgba(248,250,252,0.45)" />
          <circle cx="80" cy="93" r="9" fill="rgba(250,204,21,0.88)" stroke="rgba(248,250,252,0.6)" />
        </g>
        <g>
          <path d="M34 28 C46 20 68 18 80 24" fill="none" stroke="rgba(244,114,182,0.55)" stroke-width="3" stroke-linecap="round" />
          <path d="M80 24 C92 18 114 22 126 30" fill="none" stroke="rgba(56,189,248,0.5)" stroke-width="3" stroke-linecap="round" />
          <circle cx="44" cy="28" r="5" fill="#facc15" stroke="rgba(248,250,252,0.6)" stroke-width="1.2" />
          <circle cx="80" cy="24" r="5" fill="#38bdf8" stroke="rgba(248,250,252,0.6)" stroke-width="1.2" />
          <circle cx="118" cy="30" r="5" fill="#f472b6" stroke="rgba(248,250,252,0.6)" stroke-width="1.2" />
        </g>
      </svg>
    `,
  },
  // Level 11
  {
    id: "wild-thing-wind-up",
    name: "Wild Thing Wind-Up",
    description:
      "Balance searing velocity with pin-point snaps while gambling on the Wild Thing zone to freeze the order.",
    url: "./wild-thing-wind-up/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wild Thing Wind-Up preview">
        <defs>
          <linearGradient id="wildSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(8,15,36,0.95)" />
            <stop offset="100%" stop-color="rgba(5,10,24,0.88)" />
          </linearGradient>
          <linearGradient id="wildMound" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
          <linearGradient id="wildMeter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.85)" />
            <stop offset="70%" stop-color="rgba(56,189,248,0.35)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.85)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="url(#wildSky)" stroke="rgba(148,163,184,0.35)" />
        <g>
          <rect x="22" y="20" width="116" height="28" rx="12" fill="rgba(15,23,42,0.75)" stroke="rgba(59,130,246,0.45)" />
          <text x="30" y="38" font-size="10" fill="#38bdf8" font-family="'Share Tech Mono', monospace">WILD THING</text>
          <text x="134" y="38" font-size="10" fill="#f97316" font-family="'Share Tech Mono', monospace" text-anchor="end">102 MPH</text>
        </g>
        <g transform="translate(28 56)">
          <rect x="0" y="0" width="32" height="48" rx="14" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.35)" />
          <rect x="6" y="6" width="20" height="36" rx="8" fill="rgba(8,12,28,0.92)" stroke="rgba(56,189,248,0.4)" />
          <rect x="6" y="6" width="20" height="20" rx="8" fill="url(#wildMeter)" />
          <rect x="6" y="6" width="20" height="8" rx="4" fill="rgba(249,115,22,0.75)" opacity="0.75" />
          <text x="16" y="44" font-size="8" fill="#f97316" font-family="'Share Tech Mono', monospace" text-anchor="middle">HEAT</text>
        </g>
        <g transform="translate(76 50)">
          <rect x="0" y="0" width="70" height="60" rx="18" fill="rgba(12,18,42,0.9)" stroke="rgba(148,163,184,0.35)" />
          <rect x="18" y="8" width="34" height="44" rx="10" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.55)" />
          <rect x="24" y="14" width="22" height="32" rx="6" fill="rgba(15,23,42,0.75)" stroke="rgba(148,163,184,0.45)" />
          <circle cx="35" cy="30" r="9" fill="rgba(249,115,22,0.35)" stroke="rgba(249,115,22,0.65)" />
          <circle cx="38" cy="26" r="5" fill="#facc15" stroke="rgba(248,250,252,0.55)" />
          <circle cx="33" cy="36" r="4" fill="#38bdf8" stroke="rgba(248,250,252,0.4)" />
          <path d="M6 52 L64 16" stroke="rgba(249,115,22,0.6)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 4" />
          <path d="M6 18 L64 44" stroke="rgba(56,189,248,0.4)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 6" />
          <circle cx="12" cy="18" r="4" fill="#38bdf8" />
          <circle cx="62" cy="44" r="4" fill="#f97316" />
        </g>
        <g>
          <path d="M56 98 C72 90 90 90 104 98" fill="none" stroke="rgba(56,189,248,0.4)" stroke-width="6" stroke-linecap="round" />
          <circle cx="80" cy="92" r="8" fill="#f97316" stroke="rgba(248,250,252,0.6)" stroke-width="1.5" />
          <path d="M80 84 L92 72" stroke="#facc15" stroke-width="3" stroke-linecap="round" />
        </g>
      </svg>
    `,
  }, // Level 11
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
    id: "gilded-partition",
    name: "Gilded Partition",
    description: "Broker rival deeds while avoiding the ruinous sparks of a split estate.",
    url: "./gilded-partition/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gilded Partition preview">
        <defs>
          <linearGradient id="partitionGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f87171" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
          <linearGradient id="estateFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(248,113,113,0.32)" />
            <stop offset="50%" stop-color="rgba(15,23,42,0.88)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.32)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(7,11,24,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="22" width="124" height="76" rx="16" fill="url(#estateFloor)" stroke="rgba(148,163,184,0.35)" />
        <g stroke="rgba(148,163,184,0.2)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${32 + i * 18}" y1="28" x2="${32 + i * 18}" y2="92" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="26" y1="${44 + i * 16}" x2="134" y2="${44 + i * 16}" />`).join("")}
        </g>
        <g>
          <rect x="28" y="30" width="40" height="26" rx="8" fill="rgba(248,113,113,0.65)" stroke="rgba(248,250,252,0.45)" />
          <rect x="92" y="54" width="40" height="26" rx="8" fill="rgba(56,189,248,0.65)" stroke="rgba(248,250,252,0.45)" />
        </g>
        <g>
          <rect x="52" y="58" width="24" height="24" rx="6" fill="rgba(15,23,42,0.88)" stroke="url(#partitionGlow)" />
          <path d="M52 70h24" stroke="rgba(248,250,252,0.4)" stroke-width="2" stroke-dasharray="4 6" />
          <path d="M64 58v24" stroke="rgba(248,250,252,0.25)" stroke-width="2" stroke-dasharray="4 6" />
        </g>
        <g>
          <rect x="36" y="82" width="32" height="14" rx="6" fill="rgba(248,113,113,0.8)" stroke="rgba(248,113,113,0.5)" />
          <rect x="92" y="34" width="32" height="14" rx="6" fill="rgba(56,189,248,0.8)" stroke="rgba(56,189,248,0.5)" />
        </g>
        <g>
          <rect x="76" y="42" width="12" height="12" rx="4" fill="rgba(148,163,184,0.45)" />
          <rect x="108" y="74" width="12" height="12" rx="4" fill="rgba(148,163,184,0.45)" />
        </g>
        <rect x="60" y="18" width="40" height="12" rx="6" fill="rgba(15,23,42,0.95)" stroke="url(#partitionGlow)" />
        <rect x="60" y="18" width="20" height="12" rx="6" fill="rgba(248,113,113,0.7)" />
        <rect x="80" y="18" width="20" height="12" rx="6" fill="rgba(56,189,248,0.7)" />
      </svg>
    `,
  },
  {
    id: "tailing-the-trash",
    name: "Tailing the Trash",
    description: "Shadow Dockside Eight's suspect, scrub Hooch's chaos, and keep suspicion below the redline.",
    url: "./tailing-the-trash/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tailing the Trash preview">
        <defs>
          <linearGradient id="dockBackdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(6,12,26,0.95)" />
          </linearGradient>
          <linearGradient id="coneGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(250,204,21,0.65)" />
            <stop offset="100%" stop-color="rgba(248,113,113,0.65)" />
          </linearGradient>
          <linearGradient id="trailGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.6)" />
            <stop offset="100%" stop-color="rgba(147,197,253,0.6)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#dockBackdrop)" stroke="rgba(148,163,184,0.4)" />
        <rect x="18" y="20" width="124" height="80" rx="16" fill="rgba(10,18,36,0.9)" stroke="rgba(148,163,184,0.28)" />
        <g stroke="rgba(94,234,212,0.25)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${32 + i * 18}" y1="26" x2="${32 + i * 18}" y2="94" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="26" y1="${42 + i * 18}" x2="134" y2="${42 + i * 18}" />`).join("")}
        </g>
        <g opacity="0.9">
          <path d="M118 36 L138 58 L98 70 Z" fill="url(#coneGlow)" />
          <path d="M118 36 L136 54" stroke="rgba(250,204,21,0.6)" stroke-width="2" stroke-linecap="round" />
        </g>
        <g>
          <rect x="56" y="58" width="12" height="12" rx="4" fill="rgba(147,197,253,0.85)" stroke="rgba(255,255,255,0.55)" />
          <rect x="42" y="66" width="10" height="10" rx="4" fill="rgba(250,204,21,0.9)" stroke="rgba(255,255,255,0.45)" />
          <circle cx="64" cy="64" r="3" fill="rgba(15,23,42,0.9)" />
          <circle cx="46" cy="71" r="2.5" fill="rgba(15,23,42,0.8)" />
        </g>
        <g>
          <rect x="94" y="42" width="12" height="12" rx="4" fill="rgba(56,189,248,0.92)" stroke="rgba(255,255,255,0.6)" />
          <circle cx="100" cy="48" r="3" fill="rgba(15,23,42,0.9)" />
        </g>
        <g>
          <path d="M48 72 L60 66 L72 74 L86 68" fill="none" stroke="url(#trailGlow)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="72" cy="74" r="3" fill="rgba(94,234,212,0.8)" stroke="rgba(255,255,255,0.5)" />
        </g>
        <g>
          <rect x="34" y="40" width="10" height="10" rx="3" fill="rgba(249,115,22,0.78)" stroke="rgba(255,255,255,0.45)" />
          <rect x="30" y="44" width="6" height="6" rx="2" fill="rgba(248,113,113,0.75)" />
        </g>
        <g>
          <rect x="28" y="90" width="40" height="12" rx="6" fill="rgba(10,18,36,0.85)" stroke="rgba(148,163,184,0.35)" />
          <rect x="32" y="92" width="12" height="8" rx="3" fill="rgba(94,234,212,0.6)" />
          <rect x="48" y="92" width="8" height="8" rx="3" fill="rgba(250,204,21,0.7)" />
          <rect x="60" y="92" width="6" height="8" rx="3" fill="rgba(248,113,113,0.7)" />
        </g>
      </svg>
    `,
  },
  { // Level 22
    id: "disorient-express",
    name: "The Disorient Express",
    description: "Split the senses, track the ringing cabin phone, and balance rush orders against costly miscommunications.",
    url: "./disorient-express/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Disorient Express preview">
        <defs>
          <linearGradient id="cabinGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(34,211,238,0.75)" />
            <stop offset="100%" stop-color="rgba(168,85,247,0.7)" />
          </linearGradient>
          <linearGradient id="floorLines" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.92)" />
            <stop offset="100%" stop-color="rgba(6,10,24,0.92)" />
          </linearGradient>
          <linearGradient id="rushArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(34,211,238,0.6)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0.6)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,10,24,0.94)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="18" width="124" height="84" rx="16" fill="url(#floorLines)" stroke="rgba(148,163,184,0.28)" />
        <g stroke="rgba(56,189,248,0.25)" stroke-width="1">
          ${Array.from({ length: 4 }, (_, i) => `<line x1="${34 + i * 22}" y1="26" x2="${34 + i * 22}" y2="94" />`).join("")}
        </g>
        <g>
          <rect x="30" y="32" width="44" height="56" rx="10" fill="rgba(15,23,42,0.9)" stroke="rgba(56,189,248,0.45)" />
          <g stroke="rgba(34,211,238,0.5)" stroke-width="1.4" stroke-dasharray="4 6">
            <rect x="36" y="42" width="32" height="32" rx="8" fill="rgba(15,23,42,0.85)" />
            <line x1="36" y1="58" x2="68" y2="58" />
            <line x1="52" y1="42" x2="52" y2="74" />
          </g>
          <circle cx="38" cy="90" r="4" fill="rgba(250,204,21,0.8)" stroke="rgba(255,255,255,0.6)" />
          <circle cx="66" cy="46" r="3.5" fill="rgba(244,114,182,0.7)" stroke="rgba(255,255,255,0.45)" />
        </g>
        <g>
          <rect x="88" y="30" width="44" height="60" rx="12" fill="rgba(9,13,28,0.92)" stroke="rgba(168,85,247,0.45)" />
          <circle cx="110" cy="60" r="18" fill="rgba(15,23,42,0.92)" stroke="rgba(168,85,247,0.55)" stroke-width="2" />
          <path d="M94 60 A16 16 0 0 1 126 60" fill="none" stroke="url(#rushArc)" stroke-width="3" stroke-linecap="round" />
          <path d="M110 44 L110 76" stroke="rgba(34,211,238,0.35)" stroke-width="2" stroke-dasharray="3 5" />
          <path d="M98 60 L122 60" stroke="rgba(34,211,238,0.35)" stroke-width="2" stroke-dasharray="3 5" />
          <circle cx="110" cy="60" r="8" fill="rgba(34,211,238,0.75)" stroke="rgba(255,255,255,0.6)" />
          <path d="M102 88 C110 94 120 94 128 88" stroke="rgba(168,85,247,0.45)" stroke-width="3" stroke-linecap="round" />
        </g>
        <g>
          <rect x="22" y="22" width="116" height="12" rx="6" fill="rgba(15,23,42,0.88)" stroke="rgba(148,163,184,0.25)" />
          <rect x="28" y="24" width="36" height="8" rx="4" fill="rgba(34,211,238,0.6)" />
          <rect x="70" y="24" width="20" height="8" rx="4" fill="rgba(250,204,21,0.6)" />
          <rect x="96" y="24" width="36" height="8" rx="4" fill="rgba(168,85,247,0.6)" />
        </g>
      </svg>
    `,
  }, // Level 22
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
  // Level 22
  {
    id: "merger-madness",
    name: "Merger Madness",
    description: "Juggle memos, documents, and ringing phones to keep the merger pitch spotless before stress overloads the desk.",
    url: "./merger-madness/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Merger Madness preview">
        <defs>
          <linearGradient id="mergerPanel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(34,211,238,0.8)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0.7)" />
          </linearGradient>
          <linearGradient id="mergerDesk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(252,211,77,0.35)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.9)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(8,13,32,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="16" width="128" height="88" rx="16" fill="rgba(15,23,42,0.85)" stroke="rgba(34,211,238,0.35)" />
        <rect x="24" y="28" width="112" height="32" rx="12" fill="rgba(15,23,42,0.9)" stroke="rgba(34,211,238,0.45)" />
        <rect x="28" y="32" width="104" height="24" rx="10" fill="url(#mergerPanel)" opacity="0.55" />
        <g transform="translate(30 70)">
          <rect x="0" y="0" width="100" height="32" rx="12" fill="url(#mergerDesk)" stroke="rgba(250,204,21,0.45)" />
          <rect x="8" y="6" width="26" height="20" rx="6" fill="rgba(15,23,42,0.88)" stroke="rgba(34,211,238,0.5)" />
          <rect x="40" y="4" width="24" height="24" rx="6" fill="rgba(248,250,252,0.85)" stroke="rgba(148,163,184,0.45)" />
          <rect x="70" y="4" width="22" height="24" rx="6" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.75)" />
        </g>
        <g fill="none" stroke="rgba(148,163,184,0.45)" stroke-width="1.4" stroke-linecap="round">
          <path d="M40 40 H120" />
          <path d="M48 46 H112" />
          <path d="M38 84 L54 96" />
          <path d="M70 84 L90 96" />
        </g>
        <g>
          <circle cx="46" cy="86" r="6" fill="#38bdf8" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" />
          <circle cx="76" cy="86" r="6" fill="#facc15" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" />
          <circle cx="104" cy="86" r="6" fill="#fb7185" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" />
        </g>
        <rect x="44" y="24" width="72" height="8" rx="4" fill="rgba(15,23,42,0.8)" stroke="rgba(34,211,238,0.45)" />
        <rect x="60" y="20" width="40" height="6" rx="3" fill="rgba(248,113,113,0.75)" opacity="0.8" />
      </svg>
    `,
  }, // Level 22
  {
    id: "whispers-garden",
    name: "Whisper's Garden",
    description: "Follow midnight whispers to raise a diamond before the moon fades.",
    url: "./whispers-garden/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Whisper's Garden preview">
        <defs>
          <radialGradient id="gardenNight" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.4" />
            <stop offset="60%" stop-color="#1e3a8a" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#020617" stop-opacity="0.95" />
          </radialGradient>
          <radialGradient id="gardenField" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stop-color="#facc15" stop-opacity="0.75" />
            <stop offset="55%" stop-color="#4ade80" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.85" />
          </radialGradient>
          <linearGradient id="gardenLines" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fde68a" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(2,6,23,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="16" y="16" width="128" height="88" rx="16" fill="url(#gardenNight)" stroke="rgba(148,163,184,0.25)" />
        <g>
          <ellipse cx="80" cy="84" rx="52" ry="28" fill="url(#gardenField)" stroke="rgba(250,204,21,0.35)" stroke-width="2" />
          <path d="M40 84 Q80 54 120 84" fill="none" stroke="rgba(250,204,21,0.5)" stroke-width="3" stroke-linecap="round" />
          <path d="M80 84 L80 60" stroke="rgba(56,189,248,0.6)" stroke-width="3" stroke-linecap="round" />
          <circle cx="80" cy="60" r="6" fill="rgba(250,204,21,0.9)" stroke="rgba(248,250,252,0.55)" stroke-width="1.4" />
        </g>
        <g stroke="url(#gardenLines)" stroke-width="2.4" stroke-linecap="round">
          <path d="M52 78 L68 68" />
          <path d="M92 68 L108 78" />
        </g>
        <g fill="rgba(248,250,252,0.45)">
          ${[15, 34, 122, 140].map((x, idx) => `<circle cx="${x}" cy="${idx % 2 === 0 ? 30 : 22}" r="1.6" />`).join("")}
        </g>
        <circle cx="48" cy="36" r="10" fill="rgba(252,255,255,0.85)" stroke="rgba(148,163,184,0.6)" stroke-width="2" />
        <circle cx="48" cy="36" r="6" fill="rgba(252,211,77,0.7)" />
        <g opacity="0.7">
          <path d="M24 96 Q32 80 48 76" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="2" stroke-dasharray="4 6" />
          <path d="M136 96 Q128 80 112 76" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="2" stroke-dasharray="4 6" />
        </g>
      </svg>
    `,
  },
  {
    id: "kodiak-covenant",
    name: "Kodiak Covenant",
    description: "Coordinate guardian and cub trails while shielding them from the roaming hunter.",
    url: "./kodiak-covenant/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kodiak Covenant preview">
        <defs>
          <linearGradient id="kodiakSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(94,234,212,0.65)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.85)" />
          </linearGradient>
          <linearGradient id="trailGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(94,234,212,0.5)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.25)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(4,7,12,0.92)" stroke="rgba(94,234,212,0.35)" />
        <rect x="22" y="24" width="116" height="72" rx="16" fill="url(#kodiakSky)" stroke="rgba(94,234,212,0.35)" />
        <g stroke="rgba(94,234,212,0.28)" stroke-width="1.2">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${34 + i * 18}" y1="28" x2="${34 + i * 18}" y2="92" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="28" y1="${40 + i * 18}" x2="136" y2="${40 + i * 18}" />`).join("")}
        </g>
        <path d="M36 88 L70 72 L94 82 L118 48 L134 36" fill="none" stroke="url(#trailGlow)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M36 70 L58 58 L84 60" fill="none" stroke="rgba(250,204,21,0.4)" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round" />
        <g>
          <circle cx="70" cy="72" r="9" fill="rgba(249,115,22,0.85)" stroke="rgba(249,115,22,0.6)" stroke-width="2" />
          <circle cx="94" cy="82" r="8" fill="rgba(56,189,248,0.85)" stroke="rgba(56,189,248,0.6)" stroke-width="2" />
          <circle cx="118" cy="48" r="7" fill="rgba(226,232,240,0.9)" stroke="rgba(148,163,184,0.6)" stroke-width="2" />
          <circle cx="134" cy="36" r="6" fill="rgba(163,230,53,0.8)" stroke="rgba(163,230,53,0.6)" stroke-width="2" />
        </g>
        <g stroke="rgba(148,163,184,0.35)" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round">
          <line x1="46" y1="52" x2="58" y2="40" />
          <line x1="82" y1="64" x2="94" y2="52" />
        </g>
      </svg>
    `,
  },
  {
    id: "nose-for-trouble",
    name: "Nose for Trouble",
    description: "Route Jerry’s scent trail past explosive tunnels before the frustration spike drags him off course.",
    url: "./nose-for-trouble/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nose for Trouble preview">
        <defs>
          <linearGradient id="k9Backdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.92)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.76)" />
          </linearGradient>
          <linearGradient id="trailStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#34d399" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#k9Backdrop)" stroke="rgba(56,189,248,0.35)" />
        <rect x="26" y="24" width="108" height="72" rx="16" fill="rgba(9,14,32,0.9)" stroke="rgba(148,163,184,0.3)" />
        <g stroke="rgba(71,85,105,0.4)" stroke-width="1">
          ${Array.from({ length: 6 }, (_, i) => `<line x1="${40 + i * 16}" y1="28" x2="${40 + i * 16}" y2="92" />`).join("")}
          ${Array.from({ length: 4 }, (_, i) => `<line x1="30" y1="${40 + i * 14}" x2="130" y2="${40 + i * 14}" />`).join("")}
        </g>
        <path d="M38 88 L58 72 Q74 60 94 68 T122 56" fill="none" stroke="url(#trailStroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <g>
          <circle cx="42" cy="84" r="10" fill="rgba(59,130,246,0.85)" stroke="rgba(148,163,184,0.5)" stroke-width="2" />
          <path d="M38 82 Q42 78 46 82" fill="none" stroke="rgba(241,245,249,0.85)" stroke-width="2" stroke-linecap="round" />
          <circle cx="120" cy="56" r="7" fill="rgba(34,197,94,0.85)" stroke="rgba(148,163,184,0.45)" stroke-width="1.5" />
          <rect x="116" y="52" width="8" height="8" rx="2" fill="rgba(14,165,233,0.4)" stroke="rgba(148,163,184,0.3)" />
        </g>
        <g>
          <rect x="54" y="48" width="12" height="12" rx="3" fill="rgba(15,23,42,0.8)" stroke="rgba(94,234,212,0.55)" />
          <rect x="70" y="38" width="12" height="12" rx="3" fill="rgba(15,23,42,0.8)" stroke="rgba(94,234,212,0.55)" />
          <rect x="88" y="62" width="12" height="12" rx="3" fill="rgba(15,23,42,0.8)" stroke="rgba(94,234,212,0.55)" />
        </g>
        <g transform="translate(30 26)">
          <rect x="0" y="0" width="32" height="10" rx="5" fill="rgba(14,165,233,0.2)" stroke="rgba(56,189,248,0.45)" />
          <rect x="0" y="0" width="22" height="10" rx="5" fill="rgba(56,189,248,0.75)" />
        </g>
        <g transform="translate(108 80)">
          <rect x="0" y="0" width="32" height="18" rx="6" fill="rgba(30,41,59,0.85)" stroke="rgba(148,163,184,0.35)" />
          <path d="M6 9 L26 9" stroke="rgba(250,204,21,0.65)" stroke-width="3" stroke-linecap="round" />
          <circle cx="16" cy="9" r="4" fill="rgba(250,204,21,0.85)" stroke="rgba(248,250,252,0.6)" stroke-width="1" />
        </g>
      </svg>
    `,
  },
  {
    id: "river-of-slime-escape",
    name: "River of Slime Escape",
    description: "Climb the mood-slick lattice, gather courage trinkets, and outrun the pink surge.",
    url: "./river-of-slime-escape/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="River of Slime Escape preview">
        <defs>
          <linearGradient id="slimeRiver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,93,200,0.8)" />
            <stop offset="100%" stop-color="rgba(35,8,32,0.95)" />
          </linearGradient>
          <linearGradient id="mazeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(128,255,234,0.75)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.55)" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="140" height="100" rx="18" fill="rgba(9,12,24,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="24" y="18" width="112" height="72" rx="16" fill="rgba(12,18,36,0.92)" stroke="rgba(148,163,184,0.3)" />
        <g stroke="rgba(37,99,235,0.35)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${32 + i * 20}" y1="24" x2="${32 + i * 20}" y2="86" />`).join("")}
          ${Array.from({ length: 3 }, (_, i) => `<line x1="28" y1="${34 + i * 18}" x2="132" y2="${34 + i * 18}" />`).join("")}
        </g>
        <g stroke="url(#mazeGlow)" stroke-width="4" stroke-linecap="round">
          <path d="M36 84 L48 70 L64 78 L82 60 L100 68 L116 46 L124 52" fill="none" />
          <path d="M48 54 L66 44 L86 52 L108 36" stroke-dasharray="6 8" />
        </g>
        <g>
          <circle cx="52" cy="68" r="6" fill="rgba(128,255,234,0.9)" stroke="rgba(56,189,248,0.75)" stroke-width="2" />
          <circle cx="84" cy="56" r="5" fill="rgba(250,204,21,0.9)" stroke="rgba(248,250,252,0.7)" stroke-width="1.5" />
          <rect x="102" y="48" width="12" height="12" rx="3" fill="rgba(255,93,200,0.2)" stroke="rgba(255,93,200,0.6)" />
          <rect x="112" y="30" width="10" height="10" rx="3" fill="rgba(56,189,248,0.35)" stroke="rgba(148,163,184,0.3)" />
        </g>
        <rect x="24" y="86" width="112" height="18" rx="10" fill="url(#slimeRiver)" stroke="rgba(255,93,200,0.75)" />
        <g stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round">
          <path d="M28 90 C44 86 56 92 68 88" />
          <path d="M86 92 C100 88 112 94 124 90" />
        </g>
        <g>
          <circle cx="68" cy="92" r="5" fill="rgba(56,189,248,0.85)" stroke="rgba(248,250,252,0.7)" stroke-width="1" />
          <circle cx="92" cy="92" r="5" fill="rgba(255,93,200,0.85)" stroke="rgba(248,250,252,0.7)" stroke-width="1" />
        </g>
      </svg>
    `,
  },
  // Level 22
  {
    id: "deepcore-descent",
    name: "Deepcore Descent",
    description: "Pilot the Deepcore prototype through a crushing trench, juggling oxygen, hull fractures, and burst thrusters.",
    url: "./deepcore-descent/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Deepcore Descent preview">
        <defs>
          <linearGradient id="abyssBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(12,30,68,0.95)" />
            <stop offset="100%" stop-color="rgba(2,6,23,0.95)" />
          </linearGradient>
          <radialGradient id="glowCone" cx="0.5" cy="0.25" r="0.6">
            <stop offset="0%" stop-color="rgba(148,233,255,0.75)" />
            <stop offset="60%" stop-color="rgba(59,130,246,0.25)" />
            <stop offset="100%" stop-color="rgba(14,23,42,0)" />
          </radialGradient>
          <linearGradient id="trenchEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(2,132,199,0.45)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.4)" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="140" height="100" rx="18" fill="url(#abyssBg)" stroke="rgba(148,163,184,0.35)" />
        <g stroke="rgba(14,165,233,0.4)" stroke-width="2" stroke-linecap="round">
          <path d="M36 16 C28 42 24 74 28 104" fill="none" />
          <path d="M124 16 C132 46 136 78 132 104" fill="none" />
        </g>
        <path d="M54 18 C70 46 50 76 70 104" fill="none" stroke="url(#trenchEdge)" stroke-width="3" stroke-linecap="round" />
        <path d="M108 18 C92 44 110 78 90 104" fill="none" stroke="url(#trenchEdge)" stroke-width="3" stroke-linecap="round" />
        <g transform="translate(80 66)">
          <ellipse cx="0" cy="0" rx="22" ry="12" fill="rgba(8,47,73,0.85)" stroke="rgba(148,233,255,0.6)" stroke-width="2" />
          <ellipse cx="0" cy="-2" rx="10" ry="6" fill="rgba(191,219,254,0.8)" />
          <g fill="rgba(56,189,248,0.7)">
            <ellipse cx="-14" cy="6" rx="4" ry="8" />
            <ellipse cx="14" cy="6" rx="4" ry="8" />
          </g>
        </g>
        <path d="M70 34 L64 14" stroke="rgba(148,233,255,0.35)" stroke-width="2" stroke-linecap="round" />
        <path d="M90 34 L96 14" stroke="rgba(148,233,255,0.35)" stroke-width="2" stroke-linecap="round" />
        <path d="M60 92 L52 110" stroke="rgba(14,165,233,0.25)" stroke-width="2" stroke-linecap="round" />
        <path d="M100 92 L108 110" stroke="rgba(14,165,233,0.25)" stroke-width="2" stroke-linecap="round" />
        <rect x="48" y="46" width="64" height="58" fill="url(#glowCone)" opacity="0.8" />
        <g>
          <circle cx="42" cy="42" r="6" fill="rgba(56,189,248,0.6)" />
          <circle cx="118" cy="56" r="5" fill="rgba(34,197,94,0.35)" />
          <circle cx="50" cy="80" r="4" fill="rgba(59,130,246,0.4)" />
        </g>
      </svg>
    `,
  }, // Level 22
  {
    id: "restless-acre-rise",
    name: "Restless Acre Rise",
    description: "Climb the burial ridge ahead of the fog, dodge carrion lunges, and chase glowing effigies for doubled gains.",
    url: "./restless-acre-rise/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Restless Acre Rise preview">
        <defs>
          <linearGradient id="restlessSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="70%" stop-color="rgba(2,6,23,0.92)" />
            <stop offset="100%" stop-color="rgba(2,6,23,0.98)" />
          </linearGradient>
          <radialGradient id="effigyGlow" cx="0.5" cy="0.3" r="0.7">
            <stop offset="0%" stop-color="rgba(250,204,21,0.9)" />
            <stop offset="65%" stop-color="rgba(250,204,21,0.35)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="fogSweep" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="rgba(148,163,184,0.45)" />
            <stop offset="100%" stop-color="rgba(148,163,184,0)" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="url(#restlessSky)" stroke="rgba(148,163,184,0.35)" />
        <g stroke="rgba(76,29,149,0.55)" stroke-width="2.4" stroke-linecap="round">
          <path d="M34 94 C48 88 62 74 74 66 C86 58 98 46 114 40" fill="none" />
        </g>
        <g stroke="rgba(248,113,113,0.55)" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round">
          <path d="M46 90 L52 74" />
          <path d="M78 68 L86 54" />
        </g>
        <g>
          <rect x="40" y="78" width="36" height="10" rx="4" fill="rgba(71,85,105,0.8)" />
          <rect x="70" y="60" width="32" height="9" rx="4" fill="rgba(51,65,85,0.8)" />
          <rect x="100" y="42" width="28" height="8" rx="4" fill="rgba(30,41,59,0.82)" />
        </g>
        <g>
          <ellipse cx="116" cy="34" rx="18" ry="12" fill="url(#effigyGlow)" />
          <circle cx="116" cy="34" r="8" fill="rgba(250,204,21,0.9)" stroke="rgba(253,224,71,0.8)" stroke-width="2" />
          <text x="116" y="38" text-anchor="middle" font-size="10" fill="rgba(15,23,42,0.9)" font-family="'Press Start 2P', monospace">×2</text>
        </g>
        <g>
          <ellipse cx="70" cy="92" rx="12" ry="7" fill="rgba(148,163,184,0.2)" />
          <path d="M66 92 L74 92 L76 68 C78 64 82 62 88 62" fill="none" stroke="rgba(226,232,240,0.9)" stroke-width="3" stroke-linecap="round" />
          <circle cx="80" cy="60" r="6" fill="rgba(244,114,182,0.85)" stroke="rgba(148,163,184,0.5)" stroke-width="1.5" />
        </g>
        <rect x="10" y="72" width="140" height="38" rx="18" fill="url(#fogSweep)" />
        </g>
      </svg>
    `,
  },
  // Level 17
  {
    id: "sugar-ray-hustle",
    name: "The Sugar Ray Hustle",
    description: "Catch the shrinking ring in the Rose Room, double the pot, and cash swagger into slow-motion showdowns.",
    url: "./sugar-ray-hustle/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Sugar Ray Hustle preview">
        <defs>
          <linearGradient id="hustleBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(6,11,26,0.95)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.92)" />
          </linearGradient>
          <radialGradient id="ringGlow" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="rgba(250,204,21,0.95)" />
            <stop offset="45%" stop-color="rgba(250,204,21,0.45)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0.05)" />
          </radialGradient>
          <linearGradient id="felt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(17,24,39,0.92)" />
            <stop offset="100%" stop-color="rgba(8,11,24,0.92)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="url(#hustleBg)" stroke="rgba(250,204,21,0.35)" />
        <rect x="20" y="20" width="120" height="80" rx="16" fill="url(#felt)" stroke="rgba(148,163,184,0.3)" />
        <g opacity="0.65">
          <circle cx="80" cy="62" r="34" fill="none" stroke="rgba(250,204,21,0.28)" stroke-width="4" />
          <circle cx="80" cy="62" r="24" fill="none" stroke="rgba(249,115,22,0.4)" stroke-width="4" />
          <circle cx="80" cy="62" r="16" fill="none" stroke="rgba(250,204,21,0.65)" stroke-width="4" />
        </g>
        <circle cx="80" cy="62" r="18" fill="url(#ringGlow)" stroke="rgba(250,204,21,0.8)" stroke-width="2" />
        <g transform="translate(48 36)">
          <rect x="0" y="0" width="20" height="20" rx="5" fill="rgba(15,23,42,0.85)" stroke="rgba(250,204,21,0.55)" />
          <circle cx="10" cy="10" r="4" fill="rgba(250,204,21,0.85)" />
          <rect x="26" y="4" width="24" height="12" rx="6" fill="rgba(14,116,144,0.8)" stroke="rgba(56,189,248,0.6)" />
          <rect x="26" y="20" width="24" height="12" rx="6" fill="rgba(244,114,182,0.78)" stroke="rgba(244,114,182,0.6)" />
        </g>
        <g transform="translate(50 76)">
          <rect x="0" y="0" width="60" height="18" rx="9" fill="rgba(15,23,42,0.92)" stroke="rgba(250,204,21,0.5)" />
          <text x="30" y="12" text-anchor="middle" font-size="10" fill="rgba(250,250,250,0.9)" font-family="'Press Start 2P', monospace">CHALLENGE</text>
        </g>
        <g opacity="0.7">
          <text x="24" y="104" font-size="9" fill="rgba(250,204,21,0.75)" font-family="'Press Start 2P', monospace">×2 POT</text>
          <text x="136" y="104" text-anchor="end" font-size="9" fill="rgba(148,163,184,0.75)" font-family="'Press Start 2P', monospace">SWAGGER</text>
        </g>
      </svg>
    `,
  }, // Level 17
  {
    id: "personal-ad-trap",
    name: "The Personal Ad Trap",
    description: "Cross-link noir clues between lonely hearts and case files before the killer slips the net.",
    url: "./personal-ad-trap/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Personal Ad Trap preview">
        <defs>
          <linearGradient id="patBoard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(11,16,28,0.95)" />
            <stop offset="100%" stop-color="rgba(6,10,22,0.88)" />
          </linearGradient>
          <linearGradient id="patPaper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(248,250,252,0.96)" />
            <stop offset="100%" stop-color="rgba(226,232,240,0.86)" />
          </linearGradient>
          <linearGradient id="patCase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(30,41,59,0.94)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.86)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(6,8,20,0.94)" stroke="rgba(248,113,113,0.32)" />
        <rect x="18" y="18" width="124" height="84" rx="16" fill="url(#patBoard)" stroke="rgba(148,163,184,0.35)" />
        <rect x="26" y="30" width="42" height="60" rx="10" fill="url(#patCase)" stroke="rgba(248,113,113,0.45)" />
        <rect x="32" y="36" width="30" height="8" rx="3" fill="rgba(248,250,252,0.92)" />
        <rect x="32" y="48" width="30" height="5" rx="2.5" fill="rgba(148,163,184,0.45)" />
        <rect x="32" y="57" width="30" height="5" rx="2.5" fill="rgba(148,163,184,0.35)" />
        <rect x="32" y="66" width="30" height="5" rx="2.5" fill="rgba(148,163,184,0.35)" />
        <rect x="32" y="75" width="30" height="5" rx="2.5" fill="rgba(148,163,184,0.3)" />
        <rect x="78" y="26" width="56" height="36" rx="11" fill="url(#patPaper)" stroke="rgba(148,163,184,0.4)" />
        <rect x="78" y="70" width="56" height="34" rx="11" fill="url(#patPaper)" stroke="rgba(148,163,184,0.4)" />
        <rect x="84" y="34" width="44" height="4" rx="2" fill="rgba(71,85,105,0.35)" />
        <rect x="84" y="42" width="40" height="3.5" rx="2" fill="rgba(99,102,241,0.35)" />
        <rect x="84" y="79" width="44" height="4" rx="2" fill="rgba(71,85,105,0.35)" />
        <rect x="84" y="87" width="38" height="3.5" rx="2" fill="rgba(248,113,113,0.35)" />
        <path d="M58 48 C94 44 94 44 126 40" stroke="#f87171" stroke-width="3" stroke-linecap="round" />
        <path d="M58 74 C90 78 108 90 126 86" stroke="#f87171" stroke-width="3" stroke-linecap="round" />
        <circle cx="58" cy="48" r="4" fill="#f472b6" stroke="rgba(248,250,252,0.7)" stroke-width="1.2" />
        <circle cx="126" cy="40" r="4" fill="#facc15" stroke="rgba(248,250,252,0.7)" stroke-width="1.2" />
        <circle cx="58" cy="74" r="4" fill="#f472b6" stroke="rgba(248,250,252,0.7)" stroke-width="1.2" />
        <circle cx="126" cy="86" r="4" fill="#38bdf8" stroke="rgba(248,250,252,0.7)" stroke-width="1.2" />
        <circle cx="98" cy="26" r="5" fill="#ef4444" stroke="rgba(248,250,252,0.75)" stroke-width="1" />
        </g>
      </svg>
    `,
  },
  {
    id: "twenty-five-thousand-bulbs",
    name: "Twenty-Five Thousand Bulbs",
    description:
      "Thread the Griswold blueprint from panel to roofline before the overloaded attic taps torch your holiday score.",
    url: "./twenty-five-thousand-bulbs/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Twenty-Five Thousand Bulbs preview">
        <defs>
          <linearGradient id="bulbBlueprint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.92)" />
            <stop offset="100%" stop-color="rgba(12,20,40,0.85)" />
          </linearGradient>
          <linearGradient id="wireGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>
          <linearGradient id="overloadPulse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(244,114,182,0.8)" />
            <stop offset="100%" stop-color="rgba(244,114,182,0.35)" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="148" height="104" rx="20" fill="rgba(8,12,24,0.95)" stroke="rgba(56,189,248,0.35)" />
        <rect x="18" y="20" width="124" height="80" rx="16" fill="url(#bulbBlueprint)" stroke="rgba(56,189,248,0.25)" />
        <g stroke="rgba(56,189,248,0.16)" stroke-width="1">
          ${Array.from({ length: 6 }, (_, i) => `<line x1="${30 + i * 18}" y1="24" x2="${30 + i * 18}" y2="100" />`).join("")}
          ${Array.from({ length: 4 }, (_, i) => `<line x1="24" y1="${36 + i * 18}" x2="136" y2="${36 + i * 18}" />`).join("")}
        </g>
        <path d="M40 94 L40 78 L60 58 L60 44 L80 32 L104 44 L124 32" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="2"
          stroke-dasharray="6 6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M36 96 L68 68 L88 68 L108 52 L130 60" fill="none" stroke="url(#wireGlow)" stroke-width="4" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M68 68 L68 48 L92 40 L92 28" fill="none" stroke="rgba(250,204,21,0.6)" stroke-width="3" stroke-linecap="round"
          stroke-linejoin="round" />
        <g>
          <circle cx="36" cy="96" r="6" fill="rgba(59,130,246,0.85)" stroke="rgba(148,163,184,0.45)" stroke-width="1.5" />
          <circle cx="68" cy="68" r="6" fill="rgba(250,204,21,0.85)" stroke="rgba(148,163,184,0.45)" stroke-width="1.5" />
          <circle cx="92" cy="40" r="8" fill="url(#overloadPulse)" stroke="rgba(244,114,182,0.6)" stroke-width="2" />
          <circle cx="130" cy="60" r="6" fill="rgba(59,214,164,0.85)" stroke="rgba(148,163,184,0.4)" stroke-width="1.5" />
        </g>
        <g>
          <rect x="26" y="26" width="36" height="12" rx="6" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.35)" />
          <rect x="26" y="26" width="18" height="12" rx="6" fill="rgba(56,189,248,0.75)" />
          <rect x="98" y="82" width="42" height="12" rx="6" fill="rgba(250,204,21,0.18)" stroke="rgba(250,204,21,0.35)" />
          <rect x="98" y="82" width="24" height="12" rx="6" fill="rgba(250,204,21,0.75)" />
        </g>
        <circle cx="92" cy="40" r="12" fill="rgba(244,114,182,0.15)" stroke="rgba(244,114,182,0.5)" stroke-width="2" />
        <path d="M88 38 L96 42" stroke="rgba(248,113,113,0.8)" stroke-width="2" stroke-linecap="round" />
        <path d="M96 38 L88 42" stroke="rgba(248,113,113,0.8)" stroke-width="2" stroke-linecap="round" />
      </svg>
    `,
  },
  {
    id: "captains-echo",
    name: "Captain's Echo",
    description: "Stage the four-beat desk salute before the dean snuffs the Carpe Diem spark.",
    url: "./captains-echo/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Captain's Echo preview">
        <defs>
          <linearGradient id="echoGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#7b5bff" />
          </linearGradient>
          <linearGradient id="deskWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(249,115,22,0.6)" />
            <stop offset="100%" stop-color="rgba(249,115,22,0.35)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="148" height="108" rx="18" fill="rgba(5,8,20,0.92)" stroke="rgba(120,255,255,0.4)" />
        <rect x="16" y="18" width="128" height="84" rx="16" fill="rgba(9,14,32,0.9)" stroke="rgba(120,255,255,0.25)" />
        <path d="M16 68h128" stroke="rgba(120,255,255,0.18)" stroke-width="2" stroke-linecap="round" />
        <g>
          <circle cx="40" cy="32" r="12" fill="rgba(56,189,248,0.35)" stroke="rgba(56,189,248,0.6)" />
          <circle cx="80" cy="30" r="10" fill="rgba(123,91,255,0.3)" stroke="rgba(123,91,255,0.6)" />
          <circle cx="120" cy="34" r="12" fill="rgba(248,113,113,0.28)" stroke="rgba(248,113,113,0.6)" />
        </g>
        <g transform="translate(30 72)">
          <rect x="0" y="0" width="30" height="18" rx="6" fill="url(#deskWood)" stroke="rgba(148,163,184,0.4)" />
          <rect x="4" y="-8" width="22" height="10" rx="4" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.5)" />
          <rect x="6" y="6" width="18" height="6" rx="2" fill="rgba(15,23,42,0.85)" />
        </g>
        <g transform="translate(65 72)">
          <rect x="0" y="0" width="30" height="18" rx="6" fill="url(#deskWood)" stroke="rgba(148,163,184,0.4)" />
          <rect x="4" y="-10" width="22" height="12" rx="5" fill="rgba(123,91,255,0.22)" stroke="rgba(123,91,255,0.55)" />
          <rect x="6" y="6" width="18" height="6" rx="2" fill="rgba(15,23,42,0.85)" />
        </g>
        <g transform="translate(100 72)">
          <rect x="0" y="0" width="30" height="18" rx="6" fill="url(#deskWood)" stroke="rgba(148,163,184,0.4)" />
          <rect x="4" y="-6" width="22" height="8" rx="3" fill="rgba(248,113,113,0.22)" stroke="rgba(248,113,113,0.55)" />
          <rect x="6" y="6" width="18" height="6" rx="2" fill="rgba(15,23,42,0.85)" />
        </g>
        <path d="M32 52 C48 48 64 48 80 52 C96 56 112 56 128 52" fill="none" stroke="url(#echoGlow)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6" />
        <circle cx="28" cy="92" r="4" fill="#38bdf8" />
        <circle cx="64" cy="94" r="4" fill="#7b5bff" />
        <circle cx="100" cy="92" r="4" fill="#f97316" />
      </svg>
    `,
  },
  { // Level 13
    id: "under-the-sea-scramble",
    name: "Under the Sea Scramble",
    description: "Scan Ariel's hideouts for human gadgets before the sandglass empties and Flounder clouds the view.",
    url: "./under-the-sea-scramble/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Under the Sea Scramble preview">
        <defs>
          <linearGradient id="utsBackdrop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(59,130,246,0.85)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.95)" />
          </linearGradient>
          <linearGradient id="utsReef" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(34,197,94,0.65)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.5)" />
          </linearGradient>
          <linearGradient id="utsParchment" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(254,240,138,0.95)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0.7)" />
          </linearGradient>
          <radialGradient id="utsGlow" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stop-color="rgba(252,211,77,0.85)" />
            <stop offset="100%" stop-color="rgba(252,211,77,0)" />
          </radialGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(6,12,26,0.92)" stroke="rgba(148,163,184,0.35)" />
        <rect x="18" y="18" width="124" height="88" rx="16" fill="url(#utsBackdrop)" stroke="rgba(56,189,248,0.35)" />
        <g opacity="0.75">
          <path d="M24 96 C30 74 44 56 58 44 C72 32 88 24 104 20" fill="none" stroke="rgba(16,185,129,0.5)" stroke-width="6" stroke-linecap="round" />
          <path d="M40 96 C46 76 60 60 78 50" fill="none" stroke="rgba(45,212,191,0.45)" stroke-width="5" stroke-linecap="round" />
          <path d="M120 96 C112 78 100 60 86 50" fill="none" stroke="rgba(56,189,248,0.4)" stroke-width="5" stroke-linecap="round" />
        </g>
        <g opacity="0.65">
          ${Array.from({ length: 4 }, (_, i) => `<circle cx="${32 + i * 26}" cy="${34 + (i % 2) * 12}" r="${2 + (i % 3)}" fill="rgba(224,242,254,0.5)" />`).join("")}
        </g>
        <g transform="translate(24 48)">
          <path d="M0 40 C10 22 22 10 40 0" fill="none" stroke="rgba(34,197,94,0.6)" stroke-width="4" stroke-linecap="round" />
          <path d="M12 40 C22 26 34 14 52 6" fill="none" stroke="rgba(6,182,212,0.55)" stroke-width="4" stroke-linecap="round" />
        </g>
        <rect x="92" y="26" width="44" height="32" rx="9" fill="url(#utsParchment)" stroke="rgba(120,53,15,0.4)" />
        <g font-family="'Press Start 2P', monospace" font-size="6" fill="#7f1d1d" transform="translate(98 34)">
          <text x="0" y="6">LIST</text>
          <text x="0" y="16">🍴</text>
          <text x="14" y="16">🪈</text>
          <text x="28" y="16">🎩</text>
        </g>
        <g>
          <circle cx="58" cy="62" r="20" fill="rgba(14,165,233,0.3)" stroke="rgba(14,165,233,0.6)" stroke-width="2" />
          <circle cx="58" cy="62" r="12" fill="url(#utsGlow)" />
          <text x="58" y="66" text-anchor="middle" font-size="14" aria-hidden="true">⌛</text>
        </g>
        <g font-size="14" text-anchor="middle">
          <text x="52" y="86">🍴</text>
          <text x="78" y="90">🪈</text>
          <text x="104" y="88">🌐</text>
        </g>
        <g stroke="url(#utsReef)" stroke-width="4" stroke-linecap="round" opacity="0.7">
          <path d="M28 86 L52 76" />
          <path d="M118 86 L94 74" />
        </g>
        <g transform="translate(32 92)">
          <rect x="0" y="0" width="96" height="14" rx="7" fill="rgba(15,23,42,0.8)" stroke="rgba(56,189,248,0.45)" />
          <rect x="6" y="4" width="56" height="6" rx="3" fill="rgba(56,189,248,0.65)" />
          <rect x="64" y="4" width="24" height="6" rx="3" fill="rgba(234,179,8,0.7)" />
        </g>
      </svg>
    `,
  }, // Level 13
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
  {
    id: "second-star-flight",
    name: "Second Star Flight (Re-issue)",
    description: "Snare Lost Shadows and channel their Pixie Dust to charge the Flight Meter.",
    url: "./second-star-flight/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Second Star Flight (Re-issue) preview">
        <defs>
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.9)" />
            <stop offset="100%" stop-color="rgba(2,6,23,0.95)" />
          </linearGradient>
          <radialGradient id="lanternBeam" cx="0.4" cy="0.3" r="0.7">
            <stop offset="0%" stop-color="rgba(250,204,21,0.65)" />
            <stop offset="100%" stop-color="rgba(250,204,21,0)" />
          </radialGradient>
          <linearGradient id="dustTrail" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>
        <rect x="8" y="10" width="144" height="100" rx="18" fill="rgba(4,10,26,0.9)" stroke="rgba(148,163,184,0.35)" />
        <rect x="22" y="24" width="116" height="72" rx="14" fill="url(#nightSky)" stroke="rgba(120,255,255,0.35)" />
        <g stroke="rgba(120,255,255,0.15)" stroke-width="1">
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${34 + i * 18}" y1="34" x2="${34 + i * 18}" y2="86" />`).join("")}
          ${Array.from({ length: 5 }, (_, i) => `<line x1="30" y1="${38 + i * 12}" x2="132" y2="${38 + i * 12}" />`).join("")}
        </g>
        <circle cx="58" cy="54" r="38" fill="url(#lanternBeam)" />
        <circle cx="56" cy="56" r="8" fill="rgba(250,204,21,0.8)" stroke="rgba(250,250,250,0.6)" stroke-width="2" />
        <g fill="#facc15" opacity="0.8">
          <circle cx="86" cy="70" r="4" />
          <circle cx="100" cy="48" r="5" />
          <circle cx="76" cy="40" r="3.5" />
        </g>
        <path d="M32 92 C48 78 72 70 96 48" fill="none" stroke="url(#dustTrail)" stroke-width="4" stroke-linecap="round" />
        <circle cx="32" cy="92" r="6" fill="#22d3ee" stroke="rgba(148,163,184,0.4)" />
        <circle cx="118" cy="32" r="7" fill="#a855f7" stroke="rgba(148,163,184,0.4)" />
        <rect x="112" y="18" width="28" height="10" rx="5" fill="rgba(56,189,248,0.3)" stroke="rgba(120,255,255,0.4)" />
      </svg>
    `,
  },
  {
    id: "voice-box-swap",
    name: "Voice Box Swap",
    description: "Decode the baby’s sitcom snark and trigger the perfect move before the timer melts.",
    url: "./voice-box-swap/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Voice Box Swap preview">
        <defs>
          <linearGradient id="voiceBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(65,56,160,0.95)" />
            <stop offset="100%" stop-color="rgba(236,72,153,0.85)" />
          </linearGradient>
          <radialGradient id="voiceGlow" cx="0.52" cy="0.28" r="0.7">
            <stop offset="0%" stop-color="rgba(255,214,102,0.55)" />
            <stop offset="100%" stop-color="rgba(255,214,102,0)" />
          </radialGradient>
          <linearGradient id="voiceBubble" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(76,201,240,0.85)" />
            <stop offset="100%" stop-color="rgba(255,133,243,0.85)" />
          </linearGradient>
          <linearGradient id="voiceFloor" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(15,23,42,0.85)" />
            <stop offset="100%" stop-color="rgba(30,41,59,0.85)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="url(#voiceBg)" stroke="rgba(255,255,255,0.35)" />
        <rect x="20" y="66" width="120" height="34" rx="14" fill="url(#voiceFloor)" stroke="rgba(148,163,184,0.4)" />
        <circle cx="80" cy="52" r="46" fill="url(#voiceGlow)" opacity="0.75" />
        <g>
          <circle cx="78" cy="56" r="28" fill="rgba(255,240,248,0.95)" stroke="rgba(255,214,102,0.6)" stroke-width="2" />
          <path d="M60 50 Q78 38 96 50" fill="none" stroke="rgba(236,72,153,0.55)" stroke-width="4" stroke-linecap="round" />
          <path d="M64 66 Q78 76 92 66" fill="none" stroke="rgba(76,201,240,0.6)" stroke-width="4" stroke-linecap="round" />
          <circle cx="68" cy="56" r="5" fill="rgba(30,41,59,0.85)" />
          <circle cx="88" cy="56" r="5" fill="rgba(30,41,59,0.85)" />
        </g>
        <path d="M108 36 C130 24 150 44 140 60 C152 68 142 86 120 80 C104 76 96 60 104 46 Z" fill="url(#voiceBubble)" stroke="rgba(255,255,255,0.55)" stroke-width="2.4" stroke-linejoin="round" />
        <circle cx="104" cy="68" r="6" fill="url(#voiceBubble)" stroke="rgba(255,255,255,0.5)" stroke-width="1.4" />
        <path d="M34 40 C22 50 26 68 44 70" fill="none" stroke="rgba(76,201,240,0.6)" stroke-width="3.4" stroke-linecap="round" />
        <g fill="rgba(255,255,255,0.8)">
          <circle cx="40" cy="32" r="3" />
          <circle cx="124" cy="28" r="2.6" />
          <circle cx="110" cy="84" r="2.2" />
        </g>
        <rect x="30" y="80" width="36" height="10" rx="5" fill="rgba(6,214,160,0.6)" stroke="rgba(255,255,255,0.4)" />
        <rect x="94" y="82" width="28" height="10" rx="5" fill="rgba(255,133,243,0.55)" stroke="rgba(255,255,255,0.4)" />
      </svg>
    `,
  }, // voice box swap
  // Level 5
  {
    id: "freddys-dream-maze",
    name: "Freddy's Dream Maze",
    description: "Navigate the shifting nightmare, confront phobias, and race the claw before your sanity collapses.",
    url: "./freddys-dream-maze/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Freddy's Dream Maze preview">
        <defs>
          <linearGradient id="dreamMazeBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#030617" />
            <stop offset="100%" stop-color="#160414" />
          </linearGradient>
          <radialGradient id="dreamMazeGlow" cx="0.52" cy="0.42" r="0.7">
            <stop offset="0%" stop-color="rgba(248,113,113,0.85)" />
            <stop offset="55%" stop-color="rgba(168,85,247,0.6)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.1)" />
          </radialGradient>
          <linearGradient id="dreamMazeClaw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f87171" />
            <stop offset="100%" stop-color="#fbbf24" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="22" fill="url(#dreamMazeBg)" stroke="rgba(148,163,184,0.35)" />
        <g>
          <path d="M28 94 C36 60 54 40 82 36 C110 32 126 24 134 12" fill="none" stroke="rgba(248,113,113,0.4)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M34 92 C44 66 58 50 84 46 C108 42 120 30 126 22" fill="none" stroke="rgba(59,130,246,0.45)" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round" />
        </g>
        <circle cx="84" cy="56" r="34" fill="url(#dreamMazeGlow)" stroke="rgba(148,163,184,0.25)" stroke-width="2" />
        <path d="M62 58 C74 44 94 44 106 58 C94 72 74 72 62 58 Z" fill="none" stroke="rgba(248,250,252,0.35)" stroke-width="2" />
        <path d="M70 48 L98 64" stroke="rgba(248,250,252,0.4)" stroke-width="2.5" stroke-linecap="round" />
        <g stroke="url(#dreamMazeClaw)" stroke-linecap="round" stroke-width="4">
          <line x1="108" y1="32" x2="132" y2="18" />
          <line x1="114" y1="40" x2="138" y2="28" />
          <line x1="118" y1="50" x2="140" y2="40" />
        </g>
        <g>
          <circle cx="48" cy="86" r="6" fill="rgba(59,130,246,0.45)" stroke="rgba(248,250,252,0.4)" stroke-width="2" />
          <circle cx="66" cy="92" r="4" fill="rgba(168,85,247,0.55)" />
          <circle cx="92" cy="90" r="5" fill="rgba(248,113,113,0.55)" />
        </g>
      </svg>
    `,
  }, // Level 5

  // Level 7
  {
    id: "framed-breakout",
    name: "Framed Breakout",
    description: "Crack mini-heists and gamble QTE haymakers to sneak Tango & Cash past prison patrols.",
    url: "./framed-breakout/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Framed Breakout preview">
        <defs>
          <linearGradient id="framedBackdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(59,130,246,0.85)" />
            <stop offset="100%" stop-color="rgba(15,23,42,0.92)" />
          </linearGradient>
          <linearGradient id="framedCone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(248,113,113,0.6)" />
            <stop offset="100%" stop-color="rgba(56,189,248,0.45)" />
          </linearGradient>
          <linearGradient id="framedFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.85)" />
            <stop offset="100%" stop-color="rgba(2,6,23,0.95)" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="144" height="104" rx="18" fill="rgba(5,8,20,0.92)" stroke="rgba(148,163,184,0.4)" />
        <rect x="16" y="20" width="128" height="80" rx="16" fill="url(#framedBackdrop)" stroke="rgba(148,163,184,0.35)" />
        <g transform="translate(24 28)">
          <rect x="0" y="0" width="104" height="64" rx="14" fill="url(#framedFloor)" stroke="rgba(148,163,184,0.25)" />
          <path d="M80 12 L112 44 L48 60 Z" fill="url(#framedCone)" opacity="0.8" />
          <g>
            <circle cx="36" cy="44" r="10" fill="rgba(251,191,36,0.25)" stroke="rgba(251,191,36,0.65)" stroke-width="2" />
            <circle cx="36" cy="44" r="5" fill="#38bdf8" stroke="rgba(15,23,42,0.9)" />
            <path d="M32 44 L12 56" stroke="rgba(34,197,94,0.7)" stroke-width="3" stroke-linecap="round" />
            <circle cx="14" cy="56" r="5" fill="#22c55e" stroke="rgba(15,23,42,0.8)" />
          </g>
          <g>
            <rect x="70" y="8" width="20" height="20" rx="8" fill="rgba(15,23,42,0.92)" stroke="rgba(148,163,184,0.5)" />
            <circle cx="80" cy="18" r="6" fill="#0f172a" stroke="rgba(148,163,184,0.5)" />
            <path d="M72 4 L88 0 L94 14" fill="none" stroke="rgba(248,250,252,0.55)" stroke-width="2" />
          </g>
          <g stroke="rgba(94,234,212,0.4)" stroke-width="1.2">
            ${Array.from({ length: 4 }, (_, i) => `<line x1="${12 + i * 22}" y1="6" x2="${12 + i * 22}" y2="58" />`).join("")}
            ${Array.from({ length: 3 }, (_, i) => `<line x1="10" y1="${18 + i * 16}" x2="94" y2="${18 + i * 16}" />`).join("")}
          </g>
        </g>
        <rect x="26" y="94" width="108" height="12" rx="6" fill="rgba(10,16,36,0.85)" stroke="rgba(148,163,184,0.35)" />
        <rect x="30" y="96" width="52" height="8" rx="4" fill="rgba(248,113,113,0.65)" />
        <rect x="84" y="96" width="36" height="8" rx="4" fill="rgba(56,189,248,0.65)" />
      </svg>
    `,
  }, // Level 7
  // Level 16
  {
    id: "wind-beneath-my-wings",
    name: "Wind Beneath My Wings",
    description: "Guide the ballad from rehearsal hush to arena roar with flawless taps and soaring holds.",
    url: "./wind-beneath-my-wings/index.html",
    thumbnail: `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wind Beneath My Wings preview">
        <defs>
          <linearGradient id="wbmwBackdrop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(15,23,42,0.95)" />
            <stop offset="100%" stop-color="rgba(30,41,59,0.92)" />
          </linearGradient>
          <radialGradient id="wbmwSpot" cx="0.5" cy="0.28" r="0.7">
            <stop offset="0%" stop-color="rgba(250,250,250,0.85)" />
            <stop offset="100%" stop-color="rgba(250,250,250,0)" />
          </radialGradient>
          <linearGradient id="wbmwStage" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(76,201,240,0.85)" />
            <stop offset="100%" stop-color="rgba(249,168,212,0.85)" />
          </linearGradient>
        </defs>
        <rect x="10" y="12" width="140" height="96" rx="20" fill="rgba(9,13,28,0.95)" stroke="rgba(148,163,184,0.35)" />
        <rect x="22" y="24" width="116" height="72" rx="16" fill="url(#wbmwBackdrop)" stroke="rgba(148,163,184,0.28)" />
        <circle cx="80" cy="54" r="46" fill="url(#wbmwSpot)" />
        <g>
          <rect x="34" y="70" width="92" height="18" rx="9" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.4)" />
          <rect x="42" y="74" width="76" height="10" rx="6" fill="url(#wbmwStage)" />
        </g>
        <g>
          <path d="M46 64 C54 40 106 40 114 64" fill="none" stroke="rgba(236,72,153,0.65)" stroke-width="4" stroke-linecap="round" />
          <path d="M54 58 C64 48 96 48 106 58" fill="none" stroke="rgba(56,189,248,0.6)" stroke-width="4" stroke-linecap="round" />
          <circle cx="80" cy="44" r="10" fill="rgba(248,250,252,0.95)" stroke="rgba(148,163,184,0.4)" stroke-width="2" />
          <path d="M80 34 L70 18" stroke="rgba(251,191,36,0.8)" stroke-width="3" stroke-linecap="round" />
          <path d="M80 34 L90 18" stroke="rgba(251,191,36,0.6)" stroke-width="3" stroke-linecap="round" />
        </g>
        <g fill="rgba(248,250,252,0.85)">
          <circle cx="32" cy="32" r="4" />
          <circle cx="128" cy="36" r="3.5" />
          <circle cx="112" cy="88" r="3.2" />
          <circle cx="48" cy="90" r="2.8" />
        </g>
      </svg>
    `,
  }, // Level 16
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
const fullscreenButton = document.getElementById("fullscreen-toggle");

const gameLookup = new Map(games.map((game) => [game.id, game]));
let lastFocusElement = null;
const scoreSlots = new Map();
const scorePulseTimers = new Map();

function renderScore(gameId, entry = getHighScore(gameId)) {
  const slot = scoreSlots.get(gameId);
  if (!slot) {
    return;
  }
  const { element, config } = slot;
  if (entry) {
    element.textContent = config.format(entry);
    element.dataset.empty = "false";
  } else {
    element.textContent = config.empty;
    element.dataset.empty = "true";
  }
}

function pulseScore(gameId) {
  const slot = scoreSlots.get(gameId);
  if (!slot) {
    return;
  }
  const { element } = slot;
  window.clearTimeout(scorePulseTimers.get(gameId));
  element.classList.add("is-score-updated");
  const timer = window.setTimeout(() => {
    element.classList.remove("is-score-updated");
  }, 900);
  scorePulseTimers.set(gameId, timer);
}

const PIXELATE_SAMPLE_SCALE = 0.24;

function extractSvgDimensions(svgMarkup) {
  const viewBoxMatch = svgMarkup.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!viewBoxMatch) {
    return { width: 160, height: 120 };
  }
  const [, viewBoxValue] = viewBoxMatch;
  const parts = viewBoxValue.trim().split(/[\s,]+/);
  if (parts.length !== 4) {
    return { width: 160, height: 120 };
  }
  const width = Number.parseFloat(parts[2]);
  const height = Number.parseFloat(parts[3]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 160, height: 120 };
  }
  return { width, height };
}

function createPixelatedThumbnail(svgMarkup) {
  const { width, height } = extractSvgDimensions(svgMarkup);
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      const baseWidth = width || img.naturalWidth || 160;
      const baseHeight = height || img.naturalHeight || 120;
      const sampleWidth = Math.max(1, Math.round(baseWidth * PIXELATE_SAMPLE_SCALE));
      const sampleHeight = Math.max(1, Math.round(baseHeight * PIXELATE_SAMPLE_SCALE));
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = sampleWidth;
      sampleCanvas.height = sampleHeight;
      const sampleContext = sampleCanvas.getContext("2d");
      if (!sampleContext) {
        reject(new Error("Unable to acquire 2D context for pixelation"));
        return;
      }
      sampleContext.imageSmoothingEnabled = false;
      sampleContext.drawImage(img, 0, 0, sampleWidth, sampleHeight);

      const displayCanvas = document.createElement("canvas");
      displayCanvas.width = baseWidth;
      displayCanvas.height = baseHeight;
      const displayContext = displayCanvas.getContext("2d");
      if (!displayContext) {
        reject(new Error("Unable to acquire 2D context for display canvas"));
        return;
      }
      displayContext.imageSmoothingEnabled = false;
      displayContext.drawImage(sampleCanvas, 0, 0, baseWidth, baseHeight);
      displayCanvas.classList.add("pixelated-logo");
      resolve(displayCanvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG thumbnail"));
    };
    img.src = url;
  });
}

function applyPixelatedThumbnail(container, svgMarkup) {
  if (!container) {
    return;
  }
  if (!svgMarkup) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";
  createPixelatedThumbnail(svgMarkup)
    .then((canvas) => {
      container.appendChild(canvas);
    })
    .catch((error) => {
      console.warn("Unable to pixelate thumbnail", error);
      container.innerHTML = svgMarkup;
      const fallbackSvg = container.querySelector("svg");
      if (fallbackSvg) {
        fallbackSvg.classList.add("pixelated-fallback");
      }
    });
}

function createGameCard(game) {
  const card = template.content.cloneNode(true);
  const tile = card.querySelector(".game-card");
  tile.dataset.gameId = game.id;
  tile.tabIndex = 0;
  tile.setAttribute("role", "button");
  tile.setAttribute("aria-label", `Play ${game.name}`);
  const thumb = card.querySelector(".game-thumb");
  applyPixelatedThumbnail(thumb, game.thumbnail);
  card.querySelector(".game-title").textContent = game.name;
  card.querySelector(".game-meta").textContent = game.description;
  const scoreElement = card.querySelector("[data-high-score]");
  if (scoreElement) {
    const config = getScoreConfig(game.id);
    scoreSlots.set(game.id, { element: scoreElement, config });
    renderScore(game.id);
  }
  const playButton = card.querySelector(".play-button");
  playButton.dataset.gameId = game.id;
  playButton.setAttribute("aria-label", `Play ${game.name}`);
  return card;
}

function isOverlayFullscreen() {
  return document.fullscreenElement === overlayFrame;
}

function setFullscreenButtonState(active) {
  if (!fullscreenButton) {
    return;
  }
  fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  fullscreenButton.innerHTML = "";
  const label = document.createElement("span");
  label.className = "button-label";
  label.textContent = active ? "Mode 7 Off" : "Mode 7 On";
  const hint = document.createElement("span");
  hint.className = "button-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = active ? "⏏" : "▶";
  fullscreenButton.append(label, hint);
  fullscreenButton.title = active ? "Exit fullscreen (Mode 7)" : "Enter fullscreen (Mode 7)";
}

async function toggleFullscreen() {
  if (!fullscreenButton) {
    return;
  }

  if (isOverlayFullscreen()) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn("Unable to exit fullscreen", error);
    }
    return;
  }

  try {
    await overlayFrame.requestFullscreen();
  } catch (error) {
    console.warn("Fullscreen request was denied", error);
  }
}

function renderGames() {
  const fragment = document.createDocumentFragment();
  games.forEach((game) => {
    fragment.appendChild(createGameCard(game));
  });
  grid.appendChild(fragment);
}

function openGame(game) {
  title.textContent = game.name;
  description.textContent = game.description;
  frame.src = game.url;
  overlay.hidden = false;
  overlay.dataset.activeGame = game.id;
  setFullscreenButtonState(isOverlayFullscreen());
  requestAnimationFrame(() => {
    overlayFrame.focus({ preventScroll: true });
  });
}

function closeGame() {
  if (isOverlayFullscreen()) {
    document.exitFullscreen().catch((error) => {
      console.warn("Unable to exit fullscreen", error);
    });
  }
  overlay.hidden = true;
  overlay.dataset.activeGame = "";
  frame.src = "";
  setFullscreenButtonState(false);
  if (lastFocusElement && document.body.contains(lastFocusElement)) {
    lastFocusElement.focus({ preventScroll: true });
  } else {
    const fallbackButton = grid.querySelector(".play-button");
    fallbackButton?.focus({ preventScroll: true });
  }
}

renderGames();

onHighScoreChange(({ gameId, entry }) => {
  if (!gameId) {
    return;
  }
  renderScore(gameId, entry);
  pulseScore(gameId);
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest(".play-button");
  const card = button ? null : event.target.closest(".game-card");
  const sourceElement = button ?? card;
  if (!sourceElement) {
    return;
  }
  const game = gameLookup.get(sourceElement.dataset.gameId);
  if (!game) {
    console.warn("No game registered for", sourceElement.dataset.gameId);
    return;
  }
  lastFocusElement = sourceElement;
  openGame(game);
});

grid.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const card = event.target.closest(".game-card");
  if (!card) {
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const game = gameLookup.get(card.dataset.gameId);
    if (!game) {
      console.warn("No game registered for", card.dataset.gameId);
      return;
    }
    lastFocusElement = card;
    openGame(game);
  }
});

closeButton.addEventListener("click", closeGame);
overlayBackdrop.addEventListener("click", closeGame);

fullscreenButton?.addEventListener("click", () => {
  toggleFullscreen();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && overlay.hidden === false) {
    if (isOverlayFullscreen()) {
      document.exitFullscreen().catch(() => {
        /* Ignore */
      });
      return;
    }
    closeGame();
  }
});

document.addEventListener("fullscreenchange", () => {
  setFullscreenButtonState(isOverlayFullscreen());
});

setFullscreenButtonState(false);

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
  grid.appendChild(createGameCard(game));
}
