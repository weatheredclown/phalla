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
  "dream-team-breakout": {
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
  "halo-hustle": {
    label: "Life Chips Banked",
    empty: "No life chips deposited yet.",
    format: ({ value }) =>
      value === 1 ? "1 chip" : `${value ?? 0} chips`,
  },
  "heatwave-block-party": {
    label: "Grievances Cooled",
    empty: "No grievances cooled yet.",
    format: ({ value }) =>
      value === 1 ? "1 cooled" : `${value ?? 0} cooled`,
  },
  "kodiak-covenant": {
    label: "Traps Cleared",
    empty: "No traps cleared yet.",
    format: ({ value }) =>
      value === 1 ? "1 trap" : `${value ?? 0} traps`,
  },
  "nose-for-trouble": {
    label: "Intercept Streak",
    empty: "No intercepts logged yet.",
    format: ({ value }) =>
      value === 1 ? "1 intercept" : `${value ?? 0} intercepts`,
  },
  "say-anything": {
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
