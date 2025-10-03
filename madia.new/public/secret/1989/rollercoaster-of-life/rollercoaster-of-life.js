import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const GAME_ID = "rollercoaster-of-life";
const INITIAL_HARMONY = 520;
const PATIENCE_FLOOR_PERCENT = 0;
const HARMONY_DECAY_ON_TIMEOUT = -140;

const panelIcons = {
  rocket: `
    <g transform="translate(150 80)">
      <path d="M10 110 Q58 28 110 110" fill="rgba(255,255,255,0.9)" stroke="rgba(15,23,42,0.35)" stroke-width="6" stroke-linejoin="round" />
      <rect x="52" y="38" width="16" height="40" rx="6" fill="rgba(249,168,212,0.95)" stroke="rgba(14,165,233,0.65)" stroke-width="4" />
      <circle cx="60" cy="60" r="10" fill="rgba(14,165,233,0.85)" stroke="rgba(15,23,42,0.25)" stroke-width="3" />
      <path d="M60 110 L40 150 L80 150 Z" fill="rgba(248,113,113,0.8)" stroke="rgba(15,23,42,0.4)" stroke-width="4" />
    </g>
  `,
  cake: `
    <g transform="translate(95 90)">
      <rect x="20" y="60" width="170" height="60" rx="14" fill="rgba(253,224,71,0.92)" stroke="rgba(120,53,15,0.45)" stroke-width="5" />
      <rect x="40" y="28" width="130" height="44" rx="12" fill="rgba(249,168,212,0.9)" stroke="rgba(14,116,144,0.4)" stroke-width="5" />
      <path d="M40 54 C70 76 110 76 140 54" fill="none" stroke="rgba(236,72,153,0.6)" stroke-width="6" stroke-linecap="round" />
      ${[0, 1, 2].map((i) => `
        <rect x="${58 + i * 36}" y="8" width="6" height="28" rx="3" fill="rgba(253,230,138,0.8)" />
        <path d="M${61 + i * 36} 4 Q${58 + i * 36} 0 ${61 + i * 36} -6 Q${64 + i * 36} 0 ${61 + i * 36} 4" fill="rgba(249,115,22,0.9)" />
      `).join("")}
    </g>
  `,
  clipboard: `
    <g transform="translate(120 70)">
      <rect x="0" y="0" width="160" height="200" rx="18" fill="rgba(248,250,252,0.9)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <rect x="54" y="-24" width="52" height="40" rx="10" fill="rgba(96,165,250,0.92)" stroke="rgba(15,23,42,0.25)" stroke-width="6" />
      <path d="M34 48 L126 48" stroke="rgba(15,23,42,0.35)" stroke-width="6" stroke-linecap="round" />
      <path d="M34 80 L126 80" stroke="rgba(14,165,233,0.55)" stroke-width="6" stroke-linecap="round" />
      <path d="M34 112 L126 112" stroke="rgba(239,68,68,0.55)" stroke-width="6" stroke-linecap="round" />
      <path d="M34 150 L126 150" stroke="rgba(59,130,246,0.55)" stroke-width="6" stroke-linecap="round" />
    </g>
  `,
  whistle: `
    <g transform="translate(110 110)">
      <path d="M20 40 Q20 4 60 4 L130 4 Q150 4 160 18 Q160 42 132 46 L132 74 L92 74" fill="rgba(148,163,184,0.9)" stroke="rgba(15,23,42,0.4)" stroke-width="6" stroke-linejoin="round" />
      <circle cx="78" cy="48" r="18" fill="rgba(14,165,233,0.85)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <rect x="132" y="50" width="28" height="18" rx="6" fill="rgba(249,115,22,0.85)" />
    </g>
  `,
  phone: `
    <g transform="translate(140 80)">
      <rect x="-40" y="0" width="80" height="140" rx="22" fill="rgba(30,64,175,0.85)" stroke="rgba(255,255,255,0.35)" stroke-width="6" />
      <circle cx="0" cy="112" r="14" fill="rgba(148,163,184,0.9)" />
      <rect x="-24" y="18" width="48" height="68" rx="10" fill="rgba(248,250,252,0.92)" />
      <path d="M68 20 Q112 70 68 120" stroke="rgba(248,113,113,0.85)" stroke-width="12" stroke-linecap="round" />
      <path d="M92 8 Q132 70 92 132" stroke="rgba(249,115,22,0.65)" stroke-width="8" stroke-dasharray="16 18" stroke-linecap="round" />
    </g>
  `,
  microphone: `
    <g transform="translate(160 90)">
      <ellipse cx="0" cy="36" rx="40" ry="52" fill="rgba(248,250,252,0.9)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <rect x="-12" y="80" width="24" height="70" rx="10" fill="rgba(59,130,246,0.9)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <path d="M0 150 L0 190" stroke="rgba(148,163,184,0.6)" stroke-width="10" stroke-linecap="round" />
      <path d="M-30 196 L30 196" stroke="rgba(148,163,184,0.6)" stroke-width="12" stroke-linecap="round" />
    </g>
  `,
  marquee: `
    <g transform="translate(60 80)">
      <rect x="10" y="10" width="240" height="120" rx="24" fill="rgba(248,250,252,0.9)" stroke="rgba(15,23,42,0.45)" stroke-width="8" />
      <rect x="38" y="36" width="184" height="68" rx="18" fill="rgba(14,165,233,0.85)" stroke="rgba(15,23,42,0.25)" stroke-width="6" />
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${26 + i * 20}" cy="24" r="6" fill="rgba(251,191,36,0.85)" />`).join("")}
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${26 + i * 20}" cy="116" r="6" fill="rgba(251,191,36,0.85)" />`).join("")}
      <text x="130" y="76" text-anchor="middle" font-size="28" font-family="'Press Start 2P', monospace" fill="#fde68a">LIVE</text>
    </g>
  `,
  car: `
    <g transform="translate(60 120)">
      <rect x="20" y="28" width="220" height="68" rx="26" fill="rgba(59,130,246,0.85)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <path d="M66 28 Q118 -6 178 28" fill="rgba(96,165,250,0.92)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <rect x="80" y="6" width="98" height="44" rx="12" fill="rgba(226,232,240,0.9)" />
      <circle cx="86" cy="104" r="20" fill="rgba(15,23,42,0.85)" stroke="rgba(226,232,240,0.9)" stroke-width="6" />
      <circle cx="194" cy="104" r="20" fill="rgba(15,23,42,0.85)" stroke="rgba(226,232,240,0.9)" stroke-width="6" />
      <rect x="204" y="64" width="22" height="20" rx="6" fill="rgba(249,115,22,0.9)" />
    </g>
  `,
  handshake: `
    <g transform="translate(120 120)">
      <path d="M10 40 Q10 12 48 8 L110 4 Q130 2 138 18 Q142 34 132 46 L94 94 Q82 108 62 96 L30 72" fill="rgba(255,255,255,0.9)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <path d="M154 54 Q168 32 196 38 Q210 42 212 54 Q214 70 198 74 L162 82" fill="rgba(251,191,36,0.9)" stroke="rgba(15,23,42,0.45)" stroke-width="6" />
      <path d="M66 74 L126 42" stroke="rgba(59,130,246,0.6)" stroke-width="8" stroke-linecap="round" />
    </g>
  `,
  briefcase: `
    <g transform="translate(110 110)">
      <rect x="0" y="30" width="180" height="110" rx="18" fill="rgba(124,58,237,0.88)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <rect x="38" y="0" width="104" height="44" rx="14" fill="rgba(251,191,36,0.92)" stroke="rgba(15,23,42,0.4)" stroke-width="6" />
      <rect x="68" y="74" width="44" height="18" rx="8" fill="rgba(15,23,42,0.85)" />
      <path d="M0 76 L180 76" stroke="rgba(15,23,42,0.45)" stroke-width="6" />
    </g>
  `,
  moon: `
    <g transform="translate(160 110)">
      <path d="M0 -40 A70 70 0 1 0 0 100 A50 50 0 1 1 0 -40" fill="rgba(191,219,254,0.9)" stroke="rgba(59,130,246,0.45)" stroke-width="6" />
      <circle cx="-20" cy="30" r="10" fill="rgba(147,197,253,0.9)" />
      <circle cx="10" cy="10" r="7" fill="rgba(147,197,253,0.9)" />
      <path d="M-56 70 Q-36 50 -10 60" stroke="rgba(248,250,252,0.6)" stroke-width="6" stroke-linecap="round" stroke-dasharray="12 12" />
    </g>
  `,
  piggybank: `
    <g transform="translate(100 110)">
      <ellipse cx="90" cy="70" rx="86" ry="60" fill="rgba(248,113,113,0.85)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <circle cx="38" cy="54" r="8" fill="rgba(15,23,42,0.65)" />
      <path d="M30 92 L10 110" stroke="rgba(15,23,42,0.4)" stroke-width="8" stroke-linecap="round" />
      <path d="M150 98 L168 118" stroke="rgba(15,23,42,0.4)" stroke-width="8" stroke-linecap="round" />
      <rect x="60" y="20" width="60" height="16" rx="6" fill="rgba(15,23,42,0.6)" />
      <circle cx="116" cy="66" r="12" fill="rgba(248,250,252,0.9)" stroke="rgba(15,23,42,0.35)" stroke-width="4" />
    </g>
  `,
  champagne: `
    <g transform="translate(140 70)">
      <path d="M20 60 L60 60 L54 150 L26 150 Z" fill="rgba(248,250,252,0.85)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <path d="M-10 60 L30 60 L24 156 L-4 156 Z" fill="rgba(59,130,246,0.8)" stroke="rgba(15,23,42,0.35)" stroke-width="6" />
      <path d="M12 30 Q24 0 54 0 Q62 0 68 12" stroke="rgba(248,250,252,0.8)" stroke-width="6" stroke-linecap="round" />
      <circle cx="44" cy="-10" r="6" fill="rgba(251,191,36,0.9)" />
      <circle cx="58" cy="-22" r="5" fill="rgba(248,250,252,0.9)" />
      <circle cx="34" cy="-28" r="4" fill="rgba(251,191,36,0.9)" />
    </g>
  `,
};

const scenarioLibrary = {
  scienceFair: {
    id: "scienceFair",
    eyebrow: "Kickoff · Level 25",
    title: "Science Fair Faceplant",
    prompt:
      "Your kid's science project is literally a shoe box of rocks. The fair is tomorrow morning, the class newsletter already hyped a Buckman volcano.",
    patience: 9000,
    palette: { sky: "#fde68a", mid: "#fbcfe8", ground: "#f97316", accent: "#38bdf8" },
    icon: "rocket",
    timeout: {
      delta: -140,
      message: "You freeze up. The fair judge writes \"uninspired\" while your kid watches.",
    },
    choices: [
      {
        id: "overnight-build",
        label: "Build It Together Tonight",
        detail: "You pull a caffeine sprint and engineer a volcano side-by-side.",
        variant: "safe",
        outcome: {
          delta: 50,
          tone: "success",
          message: "The volcano wheezes foam, but your kid beams at the teamwork.",
        },
      },
      {
        id: "coach-and-trust",
        label: "Coach Him To Own It",
        detail: "Guide him through a redesign, but he presents solo tomorrow.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 240,
          tone: "success",
          message:
            "He improvises a geology lesson, wins best experiment, and the principal invites him to a district showcase!",
          unlock: { id: "districtShowcase", delay: 2 },
        },
        failure: {
          delta: -170,
          tone: "danger",
          message: "Stage fright melts the pitch. He crumples, and you end up consoling him all night.",
        },
      },
    ],
  },
  birthdayBonfire: {
    id: "birthdayBonfire",
    eyebrow: "Level 24",
    title: "Birthday Bonfire",
    prompt:
      "The eight-layer unicorn cake just collapsed. Guests arrive in an hour. Your daughter is teary-eyed and counting on the reveal.",
    patience: 8500,
    palette: { sky: "#fbcfe8", mid: "#fde68a", ground: "#fb7185", accent: "#60a5fa" },
    icon: "cake",
    timeout: {
      delta: -150,
      message: "You stall too long. The candles sit on store-bought cupcakes and the party buzz deflates.",
    },
    choices: [
      {
        id: "bakery-rescue",
        label: "Speed Dial A Bakery",
        detail: "Grab a dependable cake, even if it's generic.",
        variant: "safe",
        outcome: {
          delta: 45,
          tone: "success",
          message: "The sheet cake isn't unicorn-tier, but her grin returns and the guests cheer.",
        },
      },
      {
        id: "midnight-frosting",
        label: "Rebuild Overnight",
        detail: "Stack waffles, mousse, and glitter in a heroic kitchen sprint.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 190,
          tone: "success",
          message: "The Franken-cake towers higher than planned and becomes the party legend.",
        },
        failure: {
          delta: -130,
          tone: "danger",
          message: "The sugar sculpture slides apart mid-song, and frosting tears ensue.",
        },
      },
    ],
  },
  sickDayShuffle: {
    id: "sickDayShuffle",
    eyebrow: "Level 23",
    title: "Sick Day Shuffle",
    prompt:
      "Your toddler spikes a fever, but you have a career-defining client presentation in ninety minutes.",
    patience: 8200,
    palette: { sky: "#bae6fd", mid: "#fcd34d", ground: "#38bdf8", accent: "#f97316" },
    icon: "clipboard",
    timeout: {
      delta: -160,
      message: "Paralysis hits. Both the client and daycare wonder where you vanished.",
    },
    choices: [
      {
        id: "call-in",
        label: "Call In Back-Up",
        detail: "Reschedule with the client and focus on the sick day.",
        variant: "safe",
        outcome: {
          delta: 60,
          tone: "success",
          message: "You earn respect for prioritizing family, and the client happily moves the meeting.",
        },
      },
      {
        id: "remote-juggle",
        label: "Juggle The Meeting From Home",
        detail: "Stream the pitch while rocking the feverish toddler.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 210,
          tone: "success",
          message: "You nail the proposal with a toddler cameo that wins hearts and the contract.",
        },
        failure: {
          delta: -170,
          tone: "danger",
          message: "The call drops mid-slide. Toddler wails, client loses confidence, and stress lingers.",
        },
      },
    ],
  },
  sidelineSpat: {
    id: "sidelineSpat",
    eyebrow: "Level 22",
    title: "Sideline Spat",
    prompt:
      "Two soccer parents are screaming at each other—your kid is in the crossfire and the ref is looking your way for help.",
    patience: 7800,
    palette: { sky: "#bbf7d0", mid: "#fde68a", ground: "#4ade80", accent: "#fb7185" },
    icon: "whistle",
    timeout: {
      delta: -170,
      message: "The ref calls the game. Kids go home upset and the car ride is icy.",
    },
    choices: [
      {
        id: "bench-and-breathe",
        label: "Bench For Breathing Room",
        detail: "Pull both teams aside and let the ref reset the field.",
        variant: "safe",
        outcome: {
          delta: 55,
          tone: "success",
          message: "The game resumes quietly. No one is thrilled, but the tension cools.",
        },
      },
      {
        id: "circle-up",
        label: "Lead A Circle Talk",
        detail: "Drag parents midfield for a truth-and-trust huddle.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 210,
          tone: "success",
          message: "They apologize publicly, the team cheers, and the league asks you to train captains.",
        },
        failure: {
          delta: -170,
          tone: "danger",
          message: "Voices spike higher. Your kid leaves the pitch in tears and the ref issues suspensions.",
        },
      },
    ],
  },
  babysitterBailout: {
    id: "babysitterBailout",
    eyebrow: "Level 21",
    title: "Babysitter Bailout",
    prompt:
      "Your sitter cancels ten minutes before your first date night in months. Dinner is prepaid and nonrefundable.",
    patience: 7500,
    palette: { sky: "#fee2e2", mid: "#fda4af", ground: "#fb7185", accent: "#fef08a" },
    icon: "phone",
    timeout: {
      delta: -170,
      message: "Silence stretches too long. The restaurant releases the table and resentment simmers.",
    },
    choices: [
      {
        id: "reschedule",
        label: "Rain Check The Night",
        detail: "You pivot to family movie night and protect the harmony.",
        variant: "safe",
        outcome: {
          delta: 50,
          tone: "success",
          message: "Popcorn, pajamas, and zero drama. Not glamorous, but everyone laughs together.",
        },
      },
      {
        id: "neighbor-call",
        label: "Draft The Neighbor Teen",
        detail: "Offer double pay for a last-second save.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 190,
          tone: "success",
          message: "She nails bedtime, you savor dinner, and promise to book her again.",
        },
        failure: {
          delta: -160,
          tone: "danger",
          message: "The teen panics when the toddler pukes. You return early to chaos and guilt.",
        },
      },
    ],
  },
  teenShowcase: {
    id: "teenShowcase",
    eyebrow: "Level 20",
    title: "Garage Showcase",
    prompt:
      "Kevin wants to livestream a garage open mic—lyrics unvetted, neighbors on edge, little sister in the audience.",
    patience: 7200,
    palette: { sky: "#dbeafe", mid: "#f9a8d4", ground: "#7c3aed", accent: "#facc15" },
    icon: "microphone",
    timeout: {
      delta: -180,
      message: "Indecision frustrates him. He sneaks a midnight stream and the comments explode.",
    },
    choices: [
      {
        id: "set-guardrails",
        label: "Keep It Family-Only",
        detail: "Require a curated set list and limit the stream to close friends.",
        variant: "safe",
        outcome: {
          delta: 60,
          tone: "success",
          message: "The stream stays sweet. Kevin grumbles about censorship but feels supported.",
        },
      },
      {
        id: "full-send",
        label: "Greenlight The Stream",
        detail: "Let him host a public showcase and promise to manage fallout together.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 240,
          tone: "success",
          message:
            "His original ballad trends. A local arts council emails about a live district showcase slot!",
          unlock: { id: "districtShowcase", delay: 2 },
        },
        failure: {
          delta: -190,
          tone: "danger",
          message: "A lyric misfire goes viral for the wrong reasons and the PTA storms the inbox.",
        },
      },
    ],
  },
  districtShowcase: {
    id: "districtShowcase",
    eyebrow: "Bonus Stage",
    title: "District Spotlight",
    prompt:
      "The superintendent offers Kevin a district stage slot with live TV coverage. Accepting means rewriting schedules and inviting every relative.",
    patience: 6600,
    palette: { sky: "#ede9fe", mid: "#fcd34d", ground: "#a855f7", accent: "#f97316" },
    icon: "marquee",
    timeout: {
      delta: -220,
      message: "The invite expires. Kevin feels you squandered his shot and the house goes quiet.",
    },
    choices: [
      {
        id: "decline-pressure",
        label: "Keep It Local",
        detail: "Pass on the broadcast and nurture confidence at the community center.",
        variant: "safe",
        outcome: {
          delta: 85,
          tone: "success",
          message: "He nods, relieved to grow at his own pace. Harmony steadies for the next hurdle.",
        },
      },
      {
        id: "embrace-spotlight",
        label: "Take The Stage",
        detail: "Commit the family to rehearsals, PR, and grandparents in the front row.",
        variant: "gamble",
        odds: 0.45,
        success: {
          delta: 320,
          tone: "success",
          message: "The broadcast shines. Donations flood the arts program and Kevin hugs you on-camera.",
        },
        failure: {
          delta: -260,
          tone: "danger",
          message: "Equipment fails mid-song, tabloids mock the meltdown, and Thanksgiving group chats ignite.",
        },
      },
    ],
  },
  grandmaRoadtrip: {
    id: "grandmaRoadtrip",
    eyebrow: "Level 19",
    title: "Grandma's Night Drive",
    prompt:
      "Grandma wants to drive overnight to surprise the cousins. The car is due for service and the kids beg to go.",
    patience: 6800,
    palette: { sky: "#e0f2fe", mid: "#fde68a", ground: "#38bdf8", accent: "#fb7185" },
    icon: "car",
    timeout: {
      delta: -190,
      message: "She leaves without you. A flat tire at 3 a.m. sends the family into panic mode.",
    },
    choices: [
      {
        id: "chauffeur",
        label: "Volunteer To Drive",
        detail: "Turn it into a daytime caravan with you at the wheel.",
        variant: "safe",
        outcome: {
          delta: 70,
          tone: "success",
          message: "The surprise lands perfectly and everyone naps safely on the way home.",
        },
      },
      {
        id: "greenlight",
        label: "Let Her Lead The Trip",
        detail: "Trust her instincts, after a quick parking-lot refresher.",
        variant: "gamble",
        odds: 0.4,
        success: {
          delta: 260,
          tone: "success",
          message: "She pulls it off flawlessly, earning hero status and bonding stories for weeks.",
        },
        failure: {
          delta: -200,
          tone: "danger",
          message: "She nods off near Amarillo. You reroute everyone and mend shaken nerves.",
        },
      },
    ],
  },
  inlawSummit: {
    id: "inlawSummit",
    eyebrow: "Level 18",
    title: "In-Law Summit",
    prompt:
      "Dinner explodes into a political crossfire. Plates clang, kids stare, and your phone keeps buzzing with texts from both sides.",
    patience: 6200,
    palette: { sky: "#fee2e2", mid: "#fbbf24", ground: "#fb7185", accent: "#0ea5e9" },
    icon: "handshake",
    timeout: {
      delta: -200,
      message: "Silence equals surrender. Both sides leave furious and the group thread combusts.",
    },
    choices: [
      {
        id: "cooldown",
        label: "Reschedule Individually",
        detail: "Split visits to keep the peace.",
        variant: "safe",
        outcome: {
          delta: 75,
          tone: "success",
          message: "Everyone cools down and agrees to separate dinners for a while.",
        },
      },
      {
        id: "honesty-circle",
        label: "Host A Truth Circle",
        detail: "Lay ground rules and facilitate a structured share right now.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 260,
          tone: "success",
          message: "They cry, laugh, and hug it out. The kids witness a masterclass in repair.",
        },
        failure: {
          delta: -210,
          tone: "danger",
          message: "Old grudges resurface. Someone storms out and threatens to skip future holidays.",
        },
      },
    ],
  },
  jobOffer: {
    id: "jobOffer",
    eyebrow: "Level 17",
    title: "Dream Job Curveball",
    prompt:
      "A studio job doubles your salary but requires constant travel. The family calendar is already bursting.",
    patience: 6000,
    palette: { sky: "#ede9fe", mid: "#fbbf24", ground: "#7c3aed", accent: "#22d3ee" },
    icon: "briefcase",
    timeout: {
      delta: -210,
      message: "The offer expires. You feel stuck and the family wonders if you sabotaged momentum.",
    },
    choices: [
      {
        id: "pass",
        label: "Decline For Stability",
        detail: "Send a gracious no and celebrate with the family tonight.",
        variant: "safe",
        outcome: {
          delta: 80,
          tone: "success",
          message: "You toast to priorities. The studio keeps you on their radar for remote work.",
        },
      },
      {
        id: "renegotiate",
        label: "Accept And Rebuild The Schedule",
        detail: "Take the leap and promise a family ops summit weekly.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 280,
          tone: "success",
          message: "You design a travel rotation that thrills the kids and pays for a dream vacation.",
        },
        failure: {
          delta: -220,
          tone: "danger",
          message: "Schedules crumble. Missed recitals stack up and resentment spikes.",
        },
      },
    ],
  },
  midnightCall: {
    id: "midnightCall",
    eyebrow: "Level 16",
    title: "Midnight Call",
    prompt:
      "Your teen calls sobbing from a party. Cops might arrive. They beg you not to tell the other parents.",
    patience: 5600,
    palette: { sky: "#c7d2fe", mid: "#f472b6", ground: "#3730a3", accent: "#facc15" },
    icon: "moon",
    timeout: {
      delta: -220,
      message: "You hesitate. The cops call you instead and everyone loses trust.",
    },
    choices: [
      {
        id: "silent-rescue",
        label: "Pick Them Up Quietly",
        detail: "No big lecture, just extraction and a morning talk.",
        variant: "safe",
        outcome: {
          delta: 75,
          tone: "success",
          message: "They collapse into your arms and agree to a restorative check-in tomorrow.",
        },
      },
      {
        id: "speaker-consequences",
        label: "Loop Everyone In Now",
        detail: "Conference the host parents while you drive over.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 260,
          tone: "success",
          message: "You coordinate rides, calm the cops, and the teens form a safety pact.",
        },
        failure: {
          delta: -220,
          tone: "danger",
          message: "The call explodes. Secrets spill and your teen shuts down for weeks.",
        },
      },
    ],
  },
  collegeFund: {
    id: "collegeFund",
    eyebrow: "Level 15",
    title: "College Fund Gambit",
    prompt:
      "A storm ripped shingles off the roof. Repairs will drain the college fund unless you find an inventive alternative.",
    patience: 5200,
    palette: { sky: "#fef3c7", mid: "#f472b6", ground: "#f97316", accent: "#38bdf8" },
    icon: "piggybank",
    timeout: {
      delta: -230,
      message: "Delay stacks interest. The fund evaporates and stress lingers for months.",
    },
    choices: [
      {
        id: "bridge-loan",
        label: "Take A Small Loan",
        detail: "Lock in repairs now, rebuild savings steadily.",
        variant: "safe",
        outcome: {
          delta: 90,
          tone: "success",
          message: "The roof gleams and the repayment plan slots neatly into the budget.",
        },
      },
      {
        id: "family-startup",
        label: "Launch A Family Side Hustle",
        detail: "Use the crisis as fuel for a Buckman backyard startup.",
        variant: "gamble",
        odds: 0.45,
        success: {
          delta: 310,
          tone: "success",
          message: "The family pop-up raises triple the goal and sparks a new tradition.",
        },
        failure: {
          delta: -240,
          tone: "danger",
          message: "Orders collapse, inventory spoils, and the fund still drains away.",
        },
      },
    ],
  },
  weddingToast: {
    id: "weddingToast",
    eyebrow: "Finale",
    title: "Wedding Toast Tightrope",
    prompt:
      "Your sister begs you to spice up your toast with the infamous Buckman story. Half the reception doesn't know the secret.",
    patience: 4800,
    palette: { sky: "#fde68a", mid: "#f8fafc", ground: "#fb7185", accent: "#7c3aed" },
    icon: "champagne",
    timeout: {
      delta: -240,
      message: "You stall at the mic. Someone else spills the story with none of your grace.",
    },
    choices: [
      {
        id: "scripted",
        label: "Stick To The Script",
        detail: "Deliver a polished, heartfelt toast with zero landmines.",
        variant: "safe",
        outcome: {
          delta: 100,
          tone: "success",
          message: "The room applauds and the night ends with gentle happy tears.",
        },
      },
      {
        id: "riff",
        label: "Improvise The Legend",
        detail: "Spin the family secret into a cathartic comedy bit.",
        variant: "gamble",
        odds: 0.5,
        success: {
          delta: 320,
          tone: "success",
          message: "You land every beat. The dance floor erupts and the family crowns you MVP.",
        },
        failure: {
          delta: -260,
          tone: "danger",
          message: "The joke backfires. Aunt Julie storms out and the DJ cuts the music.",
        },
      },
    ],
  },
};

const baseTimeline = [
  "scienceFair",
  "birthdayBonfire",
  "sickDayShuffle",
  "sidelineSpat",
  "babysitterBailout",
  "teenShowcase",
  "grandmaRoadtrip",
  "inlawSummit",
  "jobOffer",
  "midnightCall",
  "collegeFund",
  "weddingToast",
];

const statusBar = document.getElementById("status-bar");
const eventLog = document.getElementById("event-log");
const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const harmonyDisplay = document.getElementById("harmony-display");
const harmonyValue = document.getElementById("harmony-value");
const progressReadout = document.getElementById("progress-readout");
const patienceBar = document.getElementById("patience-bar");
const patienceContainer = patienceBar?.parentElement;
const scenarioArticle = document.getElementById("scenario");
const scenarioLevel = document.getElementById("scenario-level");
const scenarioTitle = document.getElementById("scenario-title");
const scenarioDescription = document.getElementById("scenario-description");
const panelArt = document.getElementById("panel-art");
const choiceAButton = document.getElementById("choice-a");
const choiceBButton = document.getElementById("choice-b");
const nextButton = document.getElementById("next-button");
const wrapUpSection = document.getElementById("wrap-up");
const wrapSummary = document.getElementById("wrap-summary");
const wrapScore = document.getElementById("wrap-score");
const decisionTree = document.getElementById("decision-tree");
const replayButton = document.getElementById("replay-button");

const scoreConfig = getScoreConfig(GAME_ID);
const highScore = initHighScoreBanner({
  gameId: GAME_ID,
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const particleField = mountParticleField({
  effects: {
    palette: ["#facc15", "#f97316", "#fb7185", "#38bdf8"],
    ambientDensity: 0.45,
  },
});

const state = {
  running: false,
  harmony: INITIAL_HARMONY,
  history: [],
  remaining: [],
  unlockQueue: [],
  current: null,
  timerHandle: null,
  timerStart: 0,
  timerDuration: 0,
  awaitingContinue: false,
  audioContext: null,
};

startButton?.addEventListener("click", () => {
  ensureAudioContext();
  startRun();
});

resetButton?.addEventListener("click", () => {
  ensureAudioContext();
  resetRun();
});

choiceAButton?.addEventListener("click", () => handleChoice("a"));
choiceBButton?.addEventListener("click", () => handleChoice("b"));
nextButton?.addEventListener("click", () => {
  if (!state.awaitingContinue) {
    return;
  }
  state.awaitingContinue = false;
  nextButton.disabled = true;
  bodyTone("neutral");
  advanceScenario();
});

replayButton?.addEventListener("click", () => {
  ensureAudioContext();
  startRun();
});

autoEnhanceFeedback({
  statusSelectors: ["#status-bar"],
  logSelectors: ["#event-log"],
});

updateHarmonyDisplay(0, "neutral", { immediate: true });
setStatus("Start the session to begin juggling crises.");
updateProgress();

function startRun() {
  state.running = true;
  state.harmony = INITIAL_HARMONY;
  state.history = [];
  state.remaining = [...baseTimeline];
  state.unlockQueue = [];
  state.current = null;
  state.awaitingContinue = false;
  scenarioArticle.hidden = false;
  wrapUpSection.hidden = true;
  resetButton.disabled = false;
  startButton.disabled = true;
  nextButton.disabled = true;
  enableChoices(true);
  updateHarmonyDisplay(0, "neutral", { immediate: true });
  updatePatience(1);
  setStatus("Patience is green. Buckman control booth online.");
  progressReadout.textContent = "Preparing first dilemma...";
  advanceScenario();
}

function resetRun() {
  stopTimer();
  state.running = false;
  state.history = [];
  state.remaining = [];
  state.unlockQueue = [];
  state.current = null;
  state.awaitingContinue = false;
  startButton.disabled = false;
  resetButton.disabled = true;
  nextButton.disabled = true;
  enableChoices(false);
  scenarioArticle.hidden = true;
  wrapUpSection.hidden = true;
  progressReadout.textContent = "No dilemmas active.";
  setStatus("Session reset. Harmony recentered.", "info");
  updateHarmonyDisplay(0, "neutral", { immediate: true });
  updatePatience(1);
  clearLog();
  bodyTone("neutral");
}

function advanceScenario() {
  stopTimer();
  if (!state.running) {
    return;
  }
  const nextId = state.remaining.shift();
  if (!nextId) {
    concludeRun();
    return;
  }
  const scenario = scenarioLibrary[nextId];
  state.current = scenario;
  const totalSteps = getTotalProjectedSteps();
  const currentStep = state.history.length + 1;
  scenarioLevel.textContent = scenario.eyebrow ?? `Scenario ${currentStep}`;
  scenarioTitle.textContent = scenario.title;
  scenarioDescription.textContent = scenario.prompt;
  renderPanelArt(scenario);
  renderChoices(scenario);
  updateProgress(`Scene ${currentStep} of ${totalSteps}`);
  bodyTone("neutral");
  state.timerStart = performance.now();
  state.timerDuration = scenario.patience;
  updatePatience(1);
  startTimer();
  enableChoices(true);
  nextButton.disabled = true;
  setStatus("Choose quickly—Patience is ticking.");
}

function renderChoices(scenario) {
  const [choiceA, choiceB] = scenario.choices;
  applyChoiceToButton(choiceAButton, choiceA, "a");
  applyChoiceToButton(choiceBButton, choiceB, "b");
}

function applyChoiceToButton(button, choice, slot) {
  if (!button || !choice) {
    return;
  }
  button.disabled = false;
  button.dataset.variant = choice.variant;
  button.dataset.choiceId = choice.id;
  button.dataset.slot = slot;
  button.dataset.tone = "";
  button.querySelector(".choice-label").textContent = choice.label;
  button.querySelector(".choice-detail").textContent = choice.detail;
  button.querySelector(".choice-risk").textContent = formatRiskText(choice);
}

function formatRiskText(choice) {
  if (choice.variant === "safe") {
    const delta = choice.outcome?.delta ?? 0;
    const label = delta >= 0 ? `+${delta}` : `${delta}`;
    return `Guaranteed ${label} Harmony`;
  }
  const oddsPercent = Math.round((choice.odds ?? 0) * 100);
  const successDelta = choice.success?.delta ?? 0;
  const failureDelta = choice.failure?.delta ?? 0;
  return `${oddsPercent}%: ${formatDelta(successDelta)} · ${100 - oddsPercent}%: ${formatDelta(failureDelta)}`;
}

function formatDelta(delta) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}`;
}

function handleChoice(slot) {
  if (!state.running || state.awaitingContinue) {
    return;
  }
  const scenario = state.current;
  if (!scenario) {
    return;
  }
  const button = slot === "a" ? choiceAButton : choiceBButton;
  const choiceId = button?.dataset.choiceId;
  const choice = scenario.choices.find((option) => option.id === choiceId);
  if (!choice) {
    return;
  }
  resolveChoice(choice, { trigger: "manual" });
}

function resolveChoice(choice, { trigger }) {
  stopTimer();
  enableChoices(false);
  const scenario = state.current;
  if (!scenario) {
    return;
  }
  let outcome;
  let roll = null;
  let tone = "info";
  let variant = choice.variant;
  if (choice.variant === "safe") {
    outcome = choice.outcome;
  } else {
    const odds = Number(choice.odds ?? 0);
    roll = Math.random();
    const success = roll < odds;
    outcome = success ? choice.success : choice.failure;
    tone = outcome?.tone ?? (success ? "success" : "danger");
    variant = success ? "success" : "failure";
  }
  if (!outcome) {
    return;
  }
  const button = scenario.choices[0] === choice ? choiceAButton : choiceBButton;
  const otherButton = scenario.choices[0] === choice ? choiceBButton : choiceAButton;
  if (button) {
    button.dataset.tone = outcome.tone ?? tone;
  }
  if (otherButton) {
    otherButton.dataset.tone = "";
  }
  const historyEntry = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    choiceId: choice.id,
    choiceLabel: choice.label,
    variant,
    trigger,
    roll,
    delta: outcome.delta ?? 0,
    tone: outcome.tone ?? tone,
    message: outcome.message,
  };
  state.history.push(historyEntry);
  setStatus(outcome.message, outcome.tone ?? tone);
  logEvent(`${scenario.title}: ${choice.label} → ${formatDelta(outcome.delta ?? 0)} Harmony`, outcome.tone ?? tone);
  applyHarmony(outcome.delta ?? 0, outcome.tone ?? tone);
  if (outcome.unlock) {
    scheduleUnlock(outcome.unlock);
    logEvent(`Unlocked: ${scenarioLibrary[outcome.unlock.id]?.title ?? outcome.unlock.id}`, "info");
  }
  state.awaitingContinue = true;
  nextButton.disabled = false;
  bodyTone(outcome.tone ?? tone);
  tickUnlockQueue();
}
function scheduleUnlock(unlock) {
  const { id, delay = 1 } = unlock ?? {};
  if (!id || !scenarioLibrary[id]) {
    return;
  }
  if (state.remaining.includes(id) || state.history.some((entry) => entry.scenarioId === id) ||
    state.unlockQueue.some((item) => item.id === id)) {
    return;
  }
  state.unlockQueue.push({ id, delay: Math.max(0, delay) });
  updateProgress();
}

function tickUnlockQueue() {
  if (!state.unlockQueue.length) {
    return;
  }
  const ready = [];
  state.unlockQueue.forEach((item) => {
    // eslint-disable-next-line no-param-reassign
    item.delay -= 1;
    if (item.delay <= 0) {
      ready.push(item.id);
    }
  });
  state.unlockQueue = state.unlockQueue.filter((item) => item.delay > 0);
  ready.forEach((id) => {
    if (!state.remaining.includes(id)) {
      state.remaining.unshift(id);
    }
  });
  if (ready.length) {
    updateProgress();
  }
}

function enableChoices(enabled) {
  [choiceAButton, choiceBButton].forEach((button) => {
    if (!button) {
      return;
    }
    button.disabled = !enabled;
  });
}

function startTimer() {
  stopTimer();
  if (!state.timerDuration) {
    return;
  }
  const tick = () => {
    const elapsed = performance.now() - state.timerStart;
    const remaining = Math.max(0, state.timerDuration - elapsed);
    const ratio = state.timerDuration ? remaining / state.timerDuration : 0;
    updatePatience(ratio);
    if (remaining <= 0) {
      stopTimer();
      handleTimeout();
      return;
    }
    state.timerHandle = requestAnimationFrame(tick);
  };
  state.timerHandle = requestAnimationFrame(tick);
}

function stopTimer() {
  if (state.timerHandle) {
    cancelAnimationFrame(state.timerHandle);
    state.timerHandle = null;
  }
}

function handleTimeout() {
  if (!state.running || state.awaitingContinue) {
    return;
  }
  const scenario = state.current;
  if (!scenario) {
    return;
  }
  enableChoices(false);
  const timeoutOutcome = scenario.timeout ?? {
    delta: HARMONY_DECAY_ON_TIMEOUT,
    message: "Patience snapped. The family feels ignored.",
    tone: "danger",
  };
  const historyEntry = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    choiceId: "timeout",
    choiceLabel: "Timed Out",
    variant: "timeout",
    trigger: "timeout",
    roll: null,
    delta: timeoutOutcome.delta ?? HARMONY_DECAY_ON_TIMEOUT,
    tone: timeoutOutcome.tone ?? "danger",
    message: timeoutOutcome.message,
  };
  state.history.push(historyEntry);
  setStatus(timeoutOutcome.message, timeoutOutcome.tone ?? "danger");
  logEvent(`${scenario.title}: Timed out → ${formatDelta(timeoutOutcome.delta ?? 0)} Harmony`, timeoutOutcome.tone ?? "danger");
  applyHarmony(timeoutOutcome.delta ?? 0, timeoutOutcome.tone ?? "danger");
  bodyTone(timeoutOutcome.tone ?? "danger");
  state.awaitingContinue = true;
  nextButton.disabled = false;
  tickUnlockQueue();
}

function updatePatience(ratio) {
  if (!patienceBar || !patienceContainer) {
    return;
  }
  const percent = Math.max(PATIENCE_FLOOR_PERCENT, Math.min(1, ratio));
  patienceBar.style.transform = `scaleX(${percent})`;
  const value = Math.round(percent * 100);
  patienceContainer.setAttribute("aria-valuenow", String(value));
  patienceContainer.classList.remove("is-warning", "is-danger");
  if (percent <= 0.33) {
    patienceContainer.classList.add("is-danger");
  } else if (percent <= 0.66) {
    patienceContainer.classList.add("is-warning");
  }
}

function applyHarmony(delta, tone = "info") {
  state.harmony += delta;
  updateHarmonyDisplay(delta, tone);
  if (delta > 0) {
    particleField?.burst?.({
      count: 18,
      scatter: 240,
      palette: ["#facc15", "#fb7185", "#38bdf8"],
    });
    playTone({
      frequencies: [523.25, 659.25, 783.99],
      duration: 0.35,
    });
  } else if (delta < 0) {
    particleField?.burst?.({
      count: 14,
      scatter: 180,
      palette: ["#64748b", "#94a3b8"],
    });
    playTone({
      frequencies: [196.0, 233.08, 311.13],
      duration: 0.45,
      type: "sawtooth",
    });
  }
}

function updateHarmonyDisplay(delta, tone = "neutral", { immediate = false } = {}) {
  const formatted = Math.max(0, Math.round(state.harmony));
  harmonyValue.textContent = String(formatted);
  harmonyDisplay.dataset.tone = tone;
  if (!immediate) {
    harmonyDisplay.classList.remove("is-update");
    // eslint-disable-next-line no-unused-expressions
    harmonyDisplay.offsetWidth;
    harmonyDisplay.classList.add("is-update");
  }
}

function updateProgress(text) {
  const remaining = state.remaining.length;
  const projected = getTotalProjectedSteps();
  const current = state.history.length + (state.current ? 1 : 0);
  const message = text ?? (state.running ? `Scene ${current} of ${projected}` : "No dilemmas active.");
  progressReadout.textContent = message;
}

function getTotalProjectedSteps() {
  return state.history.length + state.remaining.length + (state.current ? 1 : 0) + state.unlockQueue.length;
}

function setStatus(message, tone = "info") {
  if (!statusBar) {
    return;
  }
  statusBar.textContent = message;
  statusBar.dataset.statusTone = tone;
}

function logEvent(message, tone = "info") {
  if (!eventLog) {
    return;
  }
  const entry = document.createElement("li");
  entry.textContent = message;
  entry.dataset.statusTone = tone;
  eventLog.append(entry);
  eventLog.scrollTop = eventLog.scrollHeight;
}

function clearLog() {
  if (!eventLog) {
    return;
  }
  eventLog.innerHTML = "";
}

function concludeRun() {
  stopTimer();
  state.running = false;
  enableChoices(false);
  startButton.disabled = false;
  resetButton.disabled = true;
  nextButton.disabled = true;
  bodyTone("neutral");
  setStatus("Session complete. Review the decision tree.", "success");
  renderWrapUp();
}
function renderWrapUp() {
  wrapUpSection.hidden = false;
  const finalScore = Math.max(0, Math.round(state.harmony));
  const bestSwing = state.history.reduce((max, entry) => (Math.abs(entry.delta) > Math.abs(max) ? entry.delta : max), 0);
  wrapSummary.textContent = `You navigated ${state.history.length} dilemmas and finished with Harmony ${finalScore}.`;
  wrapScore.innerHTML = `
    <p><strong>Final Family Harmony:</strong> ${finalScore}</p>
    <p>Largest swing: ${formatDelta(bestSwing)} Harmony</p>
  `;
  renderDecisionTree();
  const meta = {
    scenes: state.history.length,
    largestSwing: bestSwing,
  };
  highScore.submit(finalScore, meta);
}

function renderDecisionTree() {
  decisionTree.innerHTML = "";
  const pivots = new Set(
    state.history
      .slice()
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map((entry) => entry.scenarioId),
  );
  state.history.forEach((entry, index) => {
    const item = document.createElement("li");
    const node = document.createElement("div");
    node.className = "decision-node";
    node.dataset.step = index + 1;
    node.dataset.tone = entry.tone ?? "info";
    if (pivots.has(entry.scenarioId) && entry.delta !== 0) {
      node.classList.add("is-pivot");
    }
    const deltaLabel = formatDelta(entry.delta);
    node.innerHTML = `
      <p><strong>${entry.scenarioTitle}</strong></p>
      <p>Choice: ${entry.choiceLabel}</p>
      <p>Outcome: ${entry.message}</p>
      <p>Harmony Shift: ${deltaLabel}</p>
    `;
    item.append(node);
    decisionTree.append(item);
  });
}

function renderPanelArt(scenario) {
  if (!panelArt) {
    return;
  }
  const { palette, icon, id } = scenario;
  const gradientId = `panelGradient-${id}`;
  const midId = `panelMid-${id}`;
  const accentId = `panelAccent-${id}`;
  const svg = `
    <svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette?.sky ?? "#fde68a"}" />
          <stop offset="100%" stop-color="${palette?.mid ?? "#fbcfe8"}" />
        </linearGradient>
        <radialGradient id="${midId}" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="${palette?.accent ?? "#38bdf8"}" stop-opacity="0.45" />
          <stop offset="100%" stop-color="${palette?.ground ?? "#7c3aed"}" stop-opacity="0.15" />
        </radialGradient>
        <linearGradient id="${accentId}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette?.ground ?? "#f97316"}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${palette?.accent ?? "#38bdf8"}" stop-opacity="0.3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="240" fill="url(#${gradientId})" />
      <path d="M-40 210 C60 150 180 150 340 210 V260 H-40 Z" fill="url(#${accentId})" opacity="0.75" />
      <path d="M-60 220 C40 180 220 180 360 220 V260 H-60 Z" fill="url(#${midId})" opacity="0.65" />
      ${panelIcons[icon] ?? ""}
    </svg>
  `;
  panelArt.innerHTML = svg;
}

function bodyTone(tone) {
  document.body.dataset.tone = tone ?? "neutral";
}

function ensureAudioContext() {
  if (state.audioContext) {
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume().catch(() => {});
    }
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = AudioContextClass ? new AudioContextClass() : null;
  } catch (error) {
    state.audioContext = null;
  }
}

function playTone({ frequencies = [440], duration = 0.3, type = "sine" } = {}) {
  const ctx = state.audioContext;
  if (!ctx || typeof ctx.createOscillator !== "function") {
    return;
  }
  const now = ctx.currentTime;
  frequencies.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    const gain = Math.max(0.05, 0.18 / frequencies.length);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02 + index * 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  });
}
