export const scoreConfigs = {
  "amore-express": {
    label: "Deliveries",
    empty: "No deliveries logged yet.",
    format: ({ value }) =>
      value === 1 ? "1 delivery" : `${value ?? 0} deliveries`,
  },
  blaze: {
    label: "Bills Signed",
    empty: "No bills signed yet.",
    format: ({ value }) =>
      value === 1 ? "1 bill signed" : `${value ?? 0} bills signed`,
  },
  "cable-clash": {
    label: "Turns to Lock Circuit",
    empty: "No circuits closed yet.",
    format: ({ value }) =>
      value === 1 ? "1 turn" : `${value ?? 0} turns`,
  },
  "captains-echo": {
    label: "Salute Score",
    empty: "No salute scored yet.",
    format: ({ value }) => `Score ${value ?? 0}`,
  },
  "cooler-chaos": {
    label: "Rowdies Ejected",
    empty: "No ejections logged yet.",
    format: ({ value }) =>
      value === 1 ? "1 ejection" : `${value ?? 0} ejections`,
  },
  "culdesac-curiosity": {
    label: "Peak Dig Tokens",
    empty: "No tokens earned yet.",
    format: ({ value }) =>
      value === 1 ? "1 token" : `${value ?? 0} tokens`,
  },
  "dialtone-honor-roll": {
    label: "Study Points",
    empty: "No study points recorded yet.",
    format: ({ value, meta }) => {
      const contexts = Number(meta?.contexts ?? 0);
      const contextLabel = contexts === 1 ? "context" : "contexts";
      return `${value ?? 0} pts · ${contexts} ${contextLabel}`;
    },
  },
  "diner-debate": {
    label: "Conviction Score",
    empty: "No performances recorded yet.",
    format: ({ value, meta }) => {
      const accuracy = Number.isFinite(meta?.accuracy) ? Math.round(meta.accuracy) : null;
      const combo = Number(meta?.combo ?? 0);
      const accuracyText = accuracy !== null ? `${accuracy}% accuracy` : "0% accuracy";
      return `${value ?? 0} pts · ${accuracyText} · combo ${combo}`;
    },
  },
  "wardline-breakout": {
    label: "Final Sanity",
    empty: "No breakout simulated yet.",
    format: ({ value }) => `Sanity ${value ?? 0} / 3`,
  },
  "dojo-duality": {
    label: "Focus Score",
    empty: "No focus logged yet.",
    format: ({ value }) => `Focus ${value ?? 0}`,
  },
  "gates-of-eastside": {
    label: "Test Score",
    empty: "No study sessions yet.",
    format: ({ value }) => `${value ?? 0} / 120`,
  },
  "gilded-partition": {
    label: "Estate Claim",
    empty: "No estate claim recorded yet.",
    format: ({ value, meta }) => {
      const ruins = Number(meta?.destruction ?? 0);
      const ruinLabel = ruins === 1 ? "ruin" : "ruins";
      return `${value ?? 0}% estate · ${ruins} ${ruinLabel}`;
    },
  },
  "halo-hustle": {
    label: "Life Chips Banked",
    empty: "No life chips deposited yet.",
    format: ({ value }) =>
      value === 1 ? "1 chip" : `${value ?? 0} chips`,
  },
  "half-inch-heroes": {
    label: "Distance Secured",
    empty: "No backyard runs logged yet.",
    format: ({ value }) => `${value ?? 0} span`,
  },
  "heatwave-block-party": {
    label: "Grievances Cooled",
    empty: "No grievances cooled yet.",
    format: ({ value }) =>
      value === 1 ? "1 cooled" : `${value ?? 0} cooled`,
  },
  "hoverboard-pursuit": {
    label: "Best Time",
    empty: "No runs recorded yet.",
    format: ({ value, meta }) => {
      if (meta?.display) {
        return meta.display;
      }
      const timeMs = Number.isFinite(meta?.finalTimeMs)
        ? Number(meta.finalTimeMs)
        : 1000000 - Number(value ?? 0);
      const safeTime = Math.max(0, Math.round(timeMs));
      const minutes = Math.floor(safeTime / 60000);
      const seconds = Math.floor((safeTime % 60000) / 1000);
      const millis = safeTime % 1000;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
    },
  },
  "k-mart-countdown": {
    label: "Accuracy Score",
    empty: "No counts recorded yet.",
    format: ({ value, meta }) => {
      const bestMultiplier = Number(meta?.bestMultiplier ?? meta?.multiplier);
      if (Number.isFinite(bestMultiplier) && bestMultiplier > 0) {
        return `${value ?? 0} pts · ×${bestMultiplier.toFixed(1)} best`;
      }
      return `${value ?? 0} pts`;
    },
  },
  "flapjack-flip-out": {
    label: "Stack Height",
    empty: "No stacks flipped yet.",
    format: ({ value }) => `${value ?? 0} cm`,
  },
  "kodiak-covenant": {
    label: "Traps Cleared",
    empty: "No traps cleared yet.",
    format: ({ value }) =>
      value === 1 ? "1 trap" : `${value ?? 0} traps`,
  },
  "personal-ad-trap": {
    label: "Case Score",
    empty: "No case solved yet.",
    format: ({ value, meta }) => {
      const days = Number(meta?.daysRemaining);
      const wrong = Number(meta?.wrongAccusations ?? 0);
      const daysLabel = Number.isFinite(days) ? `${days}d left` : "time unknown";
      const wrongLabel = wrong > 0 ? `${wrong} miss${wrong === 1 ? "" : "es"}` : "clean run";
      return `Score ${value ?? 0} · ${daysLabel} · ${wrongLabel}`;
    },
  },
  "nose-for-trouble": {
    label: "Intercept Streak",
    empty: "No intercepts logged yet.",
    format: ({ value }) =>
      value === 1 ? "1 intercept" : `${value ?? 0} intercepts`,
  },
  "river-of-slime-escape": {
    label: "Meters Climbed",
    empty: "No climbs logged yet.",
    format: ({ value }) => `${value ?? 0} m`,
  },
  // Level 22
  "deepcore-descent": {
    label: "Max Depth",
    empty: "No dives logged yet.",
    format: ({ value, meta }) => {
      const bursts = Number(meta?.powerBursts ?? 0);
      const hull = Number(meta?.hull);
      const burstLabel = bursts === 1 ? "1 burst" : `${bursts} bursts`;
      const hullLabel = Number.isFinite(hull) ? `${hull}% hull` : "hull unknown";
      return `${value ?? 0} m · ${burstLabel} · ${hullLabel}`;
    },
  }, // Level 22
  "rollercoaster-of-life": {
    label: "Family Harmony",
    empty: "No harmony runs logged yet.",
    format: ({ value }) => `Harmony ${value ?? 0}`,
  },
  "tailing-the-trash": {
    label: "Evidence Logged",
    empty: "No stakeouts logged yet.",
    format: ({ value, meta }) => {
      const suspicion = Number(meta?.suspicion);
      if (Number.isFinite(suspicion)) {
        return `${value ?? 0} logs · ${suspicion}% peak`;
      }
      return `${value ?? 0} logs`;
    },
  },
  "restless-acre-rise": {
    label: "Altitude",
    empty: "No ascents logged yet.",
    format: ({ value, meta }) => {
      const effigies = Number(meta?.effigies ?? 0);
      const effigyLabel = effigies === 1 ? "effigy" : "effigies";
      return `${value ?? 0} ft · ${effigies} ${effigyLabel}`;
    },
  },
  "boombox-serenade": {
    label: "Peak Flow",
    empty: "No sync sessions yet.",
    format: ({ value }) => `${value ?? 0}% flow`,
  },
  "second-star-flight": {
    label: "Flight Meter",
    empty: "No flight logged yet.",
    format: ({ value }) => `${value ?? 0} / 100`,
  },
  "speed-zone": {
    label: "Checkpoints Cleared",
    empty: "No checkpoints cleared yet.",
    format: ({ value }) => `${value ?? 0} / 4`,
  },
  "three-fugitives": {
    label: "Tempo Buffer",
    empty: "No rescues logged yet.",
    format: ({ value, meta }) => {
      const turns = Number(meta?.turns);
      if (Number.isFinite(turns)) {
        return `${value ?? 0} tempo · ${turns} turn${turns === 1 ? "" : "s"}`;
      }
      return `${value ?? 0} tempo`;
    },
  },
  "twenty-five-thousand-bulbs": {
    label: "Total Wattage",
    empty: "No wattage recorded yet.",
    format: ({ value, meta }) => {
      const status = meta?.success ? "Full glow" : "Brownout";
      return `${value ?? 0} watts · ${status}`;
    },
  },
  "velvet-syncopation": {
    label: "Harmony Peak",
    empty: "No harmony recorded yet.",
    format: ({ value }) => `${value ?? 0}% harmony`,
  },
  "vendetta-convoy": {
    label: "Evidence Secured",
    empty: "No evidence recovered yet.",
    format: ({ value, meta }) => {
      const total = Number(meta?.total) || 8;
      return `${value ?? 0} / ${total}`;
    },
  },
  "voice-box-swap": {
    label: "Sync Score",
    empty: "No sync logged yet.",
    format: ({ value, meta }) => {
      const combo = Number(meta?.longestCombo ?? 0);
      const risky = Number(meta?.bestRisky ?? 0);
      const comboLabel = combo === 1 ? "1 combo" : `${combo} combo streak`;
      const riskyLabel = risky > 0 ? ` · Risky +${risky}` : "";
      return `${value ?? 0} pts · ${comboLabel}${riskyLabel}`;
    },
  },
  // Level 16
  "wind-beneath-my-wings": {
    label: "Applause Score",
    empty: "No applause recorded yet.",
    format: ({ value, meta }) => {
      const accuracy = Number.isFinite(meta?.accuracy) ? `${meta.accuracy}% accuracy` : "0% accuracy";
      const crescendos = Number(meta?.crescendos ?? 0);
      const crescLabel = crescendos === 1 ? "1 crescendo" : `${crescendos} crescendos`;
      return `${value ?? 0} applause · ${accuracy} · ${crescLabel}`;
    },
  }, // Level 16
  "whispers-garden": {
    label: "Field Completion",
    empty: "No whispers answered yet.",
    format: ({ value, meta }) => {
      const focus = Number(meta?.focusBursts ?? 0);
      const bonus = Number(meta?.bonuses ?? 0);
      const focusLabel = focus === 1 ? "focus" : "focuses";
      const bonusLabel = bonus === 1 ? "bonus" : "bonuses";
      return `${value ?? 0}% · ${focus} ${focusLabel} · ${bonus} ${bonusLabel}`;
    },
  },
};

export function getScoreConfig(gameId) {
  return (
    scoreConfigs[gameId] ?? {
      label: "High Score",
      empty: "No score recorded yet.",
      format: ({ value }) => String(value ?? 0),
    }
  );
}
