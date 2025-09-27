export const ROLE_DEFINITIONS = [
  {
    id: "baner",
    name: "Baner",
    alignment: "Village",
    summary: "Protects one player from the first kill attempt on them each night.",
    tags: [
      "village",
      "protective",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Protect",
          actionName: "Protect",
          description: "Guard a player at night, stopping the first kill that would affect them.",
          phase: "night",
          target: "player",
          notes: "Traditional rules prevent targeting the same player on consecutive nights.",
          tags: [
            "protective"
          ]
        }
      ],
      actionRules: [
        {
          name: "Protect",
          actionName: "Protect",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Stops the first kill attempt on the protected player during the night."
        }
      ]
    },
    passiveAbilities: [
      {
        name: "Rotating Guard",
        description: "May not choose the same target on back-to-back nights."
      }
    ]
  },
  {
    id: "bodyguard",
    name: "Bodyguard",
    alignment: "Village",
    summary: "Shields another player, dying in their place if that target is attacked.",
    tags: [
      "village",
      "protective",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Guard",
          actionName: "Guard",
          description: "Stand in front of a player; if they are attacked you die instead.",
          phase: "night",
          target: "player",
          notes: "Absorbs the first kill aimed at the protected player each night.",
          tags: [
            "protective"
          ]
        }
      ],
      actionRules: [
        {
          name: "Guard",
          actionName: "Guard",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "If the protected player would die, the bodyguard is eliminated instead."
        }
      ]
    }
  },
  {
    id: "bus-driver",
    name: "Bus Driver",
    alignment: "Village",
    summary: "Redirects night actions by swapping two passengers on the route.",
    tags: [
      "village",
      "control",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Swap",
          actionName: "Swap",
          description: "Exchange the targets of two players' night actions.",
          phase: "night",
          target: "player",
          notes: "Select one passenger and note the second swap partner in the action notes.",
          tags: [
            "control"
          ]
        }
      ],
      actionRules: [
        {
          name: "Swap",
          actionName: "Swap",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Redirects night actions between the two chosen passengers."
        }
      ]
    }
  },
  {
    id: "cultist",
    name: "Cultist",
    alignment: "Cult",
    summary: "Attempts to recruit new believers at night to grow the cult's numbers.",
    tags: [
      "cult",
      "conversion",
      "night"
    ],
    winCondition: "Ensure the cult controls the vote by matching or exceeding all rivals.",
    rules: {
      privateActions: [
        {
          name: "Convert",
          actionName: "Convert",
          description: "Invite a player to join the cult during the night.",
          phase: "night",
          target: "player",
          notes: "Fails on players who are immune or already aligned with another faction.",
          tags: [
            "conversion"
          ]
        }
      ],
      actionRules: [
        {
          name: "Convert",
          actionName: "Convert",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Successful conversions flip the target to the cult's alignment."
        }
      ]
    }
  },
  {
    id: "doctor",
    name: "Doctor",
    alignment: "Village",
    summary: "Prevents a single kill on the chosen patient each night.",
    tags: [
      "village",
      "protective",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Heal",
          actionName: "Heal",
          description: "Treat a player and stop the first kill aimed at them tonight.",
          phase: "night",
          target: "player",
          notes: "Many setups forbid healing the same patient on consecutive nights.",
          tags: [
            "protective"
          ]
        }
      ],
      actionRules: [
        {
          name: "Heal",
          actionName: "Heal",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Cancels the first lethal action that would resolve on the healed player."
        }
      ]
    }
  },
  {
    id: "guardian-angel",
    name: "Guardian Angel",
    alignment: "Village",
    summary: "Provides a one-shot blessing that renders a target immune to kills for a night.",
    tags: [
      "village",
      "protective",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Sanctify",
          actionName: "Sanctify",
          description: "Shield a player with a divine ward for the night.",
          phase: "night",
          target: "player",
          notes: "One-shot ability; once used the blessing is exhausted.",
          tags: [
            "protective"
          ]
        }
      ],
      actionRules: [
        {
          name: "Sanctify",
          actionName: "Sanctify",
          timesPerGame: 1,
          phase: "night",
          targeted: true,
          notes: "Prevents all kill attempts on the sanctified player for the night."
        }
      ]
    }
  },
  {
    id: "inspector",
    name: "Inspector",
    alignment: "Village",
    summary: "Investigates a target to learn their precise role name overnight.",
    tags: [
      "village",
      "investigative",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Inspect",
          actionName: "Inspect",
          description: "Research a player and discover the role label assigned by the GM.",
          phase: "night",
          target: "player",
          notes: "Returns the current role name, though disguises may interfere in some setups.",
          tags: [
            "investigative"
          ]
        }
      ],
      actionRules: [
        {
          name: "Inspect",
          actionName: "Inspect",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Yields the role identity or its closest public-facing cover."
        }
      ]
    }
  },
  {
    id: "mafia",
    name: "Mafia",
    alignment: "Mafia",
    summary: "Member of the mafia faction who participates in the nightly faction kill.",
    tags: [
      "mafia",
      "offense",
      "night"
    ],
    winCondition: "Achieve parity or majority over the village and other threats.",
    rules: {
      privateActions: [
        {
          name: "Night Kill",
          actionName: "Night Kill",
          description: "Coordinate with fellow mafia to eliminate a target.",
          phase: "night",
          target: "player",
          notes: "Only one faction kill resolves per night regardless of how many members submit it.",
          tags: [
            "offense"
          ]
        }
      ],
      actionRules: [
        {
          name: "Night Kill",
          actionName: "Night Kill",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Represents the shared faction kill; duplicate submissions are merged by the GM."
        }
      ]
    },
    passiveAbilities: [
      {
        name: "Faction Chat",
        description: "Shares a private discussion channel with other mafia members."
      }
    ]
  },
  {
    id: "mason",
    name: "Mason",
    alignment: "Village",
    summary: "Village-aligned player with trusted masonry partners and shared chat.",
    tags: [
      "village",
      "social"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    passiveAbilities: [
      {
        name: "Masonic Chat",
        description: "Has private communication with other masons from the start of the game."
      }
    ],
    rules: {
      privateActions: [],
      actionRules: [],
      notes: "Masons do not submit night actions; their strength is the guaranteed private masonry chat."
    }
  },
  {
    id: "mayor",
    name: "Mayor",
    alignment: "Village",
    summary: "Civic leader whose vote becomes publicly empowered after revealing.",
    tags: [
      "village",
      "day"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Reveal",
          actionName: "Reveal",
          description: "Announce your office to activate a double vote.",
          phase: "day",
          notes: "One-shot reveal that permanently upgrades the mayor's vote weight.",
          tags: [
            "vote"
          ]
        }
      ],
      actionRules: [
        {
          name: "Reveal",
          actionName: "Reveal",
          timesPerGame: 1,
          phase: "day",
          notes: "Logs the mayoral reveal; the GM applies the double-vote effect."
        }
      ]
    },
    passiveAbilities: [
      {
        name: "Double Vote",
        description: "Once revealed, daytime votes count twice for the mayor."
      }
    ]
  },
  {
    id: "miller",
    name: "Miller",
    alignment: "Village",
    summary: "Appears guilty to alignment scans despite serving the village.",
    tags: [
      "village",
      "passive"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    passiveAbilities: [
      {
        name: "Suspicious Aura",
        description: "Alignment investigations return an evil result for the miller."
      }
    ],
    rules: {
      privateActions: [],
      actionRules: [],
      notes: "Millers have no active abilities. Hosts should remember they return hostile results to alignment investigations."
    }
  },
  {
    id: "necromancer",
    name: "Necromancer",
    alignment: "Neutral Support",
    summary: "Can revive a fallen player for one last shot at influencing the game.",
    tags: [
      "neutral",
      "support",
      "night"
    ],
    winCondition: "Fulfil your own agenda while keeping at least one revived ally alive.",
    rules: {
      privateActions: [
        {
          name: "Raise",
          actionName: "Raise",
          description: "Return an eliminated player to play under GM-defined conditions.",
          phase: "night",
          target: "player",
          notes: "One-shot ability; revived players may return with altered powers.",
          tags: [
            "support"
          ]
        }
      ],
      actionRules: [
        {
          name: "Raise",
          actionName: "Raise",
          timesPerGame: 1,
          phase: "night",
          targeted: true,
          notes: "Resurrects the chosen target subject to moderator discretion."
        }
      ]
    }
  },
  {
    id: "roleblocker",
    name: "Roleblocker",
    alignment: "Village",
    summary: "Prevents a player from using their active abilities for one night.",
    tags: [
      "village",
      "control",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Block",
          actionName: "Block",
          description: "Detain a player overnight and stop their actions.",
          phase: "night",
          target: "player",
          notes: "Also stops the target from performing the faction kill if they are mafia.",
          tags: [
            "control"
          ]
        }
      ],
      actionRules: [
        {
          name: "Block",
          actionName: "Block",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Cancels the target's active abilities for that night."
        }
      ]
    }
  },
  {
    id: "seer",
    name: "Seer",
    alignment: "Village",
    summary: "Divines a target's alignment overnight, learning whether they are friendly or hostile.",
    tags: [
      "village",
      "investigative",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Divine",
          actionName: "Divine",
          description: "Seek mystical insight into a player's true alignment.",
          phase: "night",
          target: "player",
          notes: "Returns an innocent/guilty style alignment read.",
          tags: [
            "investigative"
          ]
        }
      ],
      actionRules: [
        {
          name: "Divine",
          actionName: "Divine",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Provides an alignment result for the chosen target."
        }
      ]
    }
  },
  {
    id: "serial-killer",
    name: "Serial Killer",
    alignment: "Neutral",
    summary: "Lone murderer who eliminates a player each night and wins by being the last threat standing.",
    tags: [
      "neutral",
      "offense",
      "night"
    ],
    winCondition: "Be the final remaining player or reach parity with all other factions.",
    rules: {
      privateActions: [
        {
          name: "Kill",
          actionName: "Kill",
          description: "Personally eliminate a target under cover of darkness.",
          phase: "night",
          target: "player",
          notes: "Ignores factional kills; this is a solo strike.",
          tags: [
            "offense"
          ]
        }
      ],
      actionRules: [
        {
          name: "Kill",
          actionName: "Kill",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "A personal kill that resolves independently of faction actions."
        }
      ]
    }
  },
  {
    id: "spy",
    name: "Spy",
    alignment: "Village",
    summary: "Eavesdrops on targets to learn which factions visited them overnight.",
    tags: [
      "village",
      "informational",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Wiretap",
          actionName: "Wiretap",
          description: "Monitor a player and learn which factions interacted with them.",
          phase: "night",
          target: "player",
          notes: "Typically reports whether mafia, village, or neutral abilities targeted the player.",
          tags: [
            "informational"
          ]
        }
      ],
      actionRules: [
        {
          name: "Wiretap",
          actionName: "Wiretap",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Reveals factional visitors or kill sources that interacted with the target."
        }
      ]
    }
  },
  {
    id: "tracker",
    name: "Tracker",
    alignment: "Village",
    summary: "Follows a player to see whom they targeted with their night action.",
    tags: [
      "village",
      "investigative",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Track",
          actionName: "Track",
          description: "Shadow a player overnight and learn whom they visited.",
          phase: "night",
          target: "player",
          notes: "Reports the target of the followed player's action, if any.",
          tags: [
            "investigative"
          ]
        }
      ],
      actionRules: [
        {
          name: "Track",
          actionName: "Track",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Yields the identity of the player your target visited."
        }
      ]
    }
  },
  {
    id: "vanillager",
    name: "Vanillager",
    alignment: "Village",
    summary: "Standard villager with no powers beyond vote and voice.",
    tags: [
      "village",
      "vanilla"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    aliases: [
      "Vanilla Villager"
    ],
    rules: {
      privateActions: [],
      actionRules: [],
      notes: "Vanillagers submit no special actions—they contribute through daytime discussion and voting."
    }
  },
  {
    id: "villager",
    name: "Villager",
    alignment: "Village",
    summary: "Baseline townsperson with no special abilities.",
    tags: [
      "village",
      "vanilla"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    aliases: [
      "Townie"
    ],
    rules: {
      privateActions: [],
      actionRules: [],
      notes: "Villagers have no power submissions beyond the daily vote unless the GM grants temporary abilities."
    }
  },
  {
    id: "vigilante",
    name: "Vigilante",
    alignment: "Village",
    summary: "Takes justice into their own hands with limited-use night kills.",
    tags: [
      "village",
      "offense",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Shoot",
          actionName: "Shoot",
          description: "Choose a target to eliminate during the night.",
          phase: "night",
          target: "player",
          notes: "Typically limited to a small number of uses across the game.",
          tags: [
            "offense"
          ]
        }
      ],
      actionRules: [
        {
          name: "Shoot",
          actionName: "Shoot",
          timesPerGame: 2,
          phase: "night",
          targeted: true,
          notes: "Two-shot ability that resolves as a vigilante kill."
        }
      ]
    }
  },
  {
    id: "vote-manipulator",
    name: "Vote Manipulator",
    alignment: "Village",
    summary: "Subtly shifts the weight of votes to aid the village during the day.",
    tags: [
      "village",
      "day",
      "control"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Nudge Vote",
          actionName: "Nudge Vote",
          description: "Redirect or alter a single vote during the day.",
          phase: "day",
          target: "player",
          notes: "Coordinate with the GM to document which ballot is affected.",
          tags: [
            "control",
            "vote"
          ]
        }
      ],
      actionRules: [
        {
          name: "Nudge Vote",
          actionName: "Nudge Vote",
          timesPerDay: 1,
          phase: "day",
          targeted: true,
          notes: "Records a single daily manipulation; GM applies the exact adjustment."
        }
      ]
    }
  },
  {
    id: "watcher",
    name: "Watcher",
    alignment: "Village",
    summary: "Observes a player at night to learn who visited them.",
    tags: [
      "village",
      "investigative",
      "night"
    ],
    winCondition: "Eliminate all hostile factions from the game.",
    rules: {
      privateActions: [
        {
          name: "Watch",
          actionName: "Watch",
          description: "Stake out a player and see everyone who targeted them overnight.",
          phase: "night",
          target: "player",
          notes: "Reports the list of visitors but not the actions they used.",
          tags: [
            "investigative"
          ]
        }
      ],
      actionRules: [
        {
          name: "Watch",
          actionName: "Watch",
          timesPerDay: 1,
          phase: "night",
          targeted: true,
          notes: "Identifies all players who visited the watched target during the night."
        }
      ]
    }
  }
];

export const ROLE_NAMES = ROLE_DEFINITIONS.map((role) => role.name);

export function normalizeRoleName(name) {
  if (typeof name !== 'string') {
    return ''; 
  }
  return name.trim().toLowerCase();
}

const CANONICAL_ROLE_MAP = new Map();
ROLE_DEFINITIONS.forEach((role) => {
  const normalized = normalizeRoleName(role.name);
  if (normalized) {
    CANONICAL_ROLE_MAP.set(normalized, role);
  }
  (role.aliases || []).forEach((alias) => {
    const normalizedAlias = normalizeRoleName(alias);
    if (normalizedAlias) {
      CANONICAL_ROLE_MAP.set(normalizedAlias, role);
    }
  });
});

export function getCanonicalRoleDefinition(name) {
  const normalized = normalizeRoleName(name);
  if (!normalized) {
    return null;
  }
  return CANONICAL_ROLE_MAP.get(normalized) || null;
}
