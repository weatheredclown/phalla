import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const CASES = [
  {
    id: "rookie-run",
    label: "Case 19A · Rooftop Rendezvous",
    timeLimit: 7,
    victim: {
      name: "Lena Voss, 34",
      summary:
        "Boutique manager found on a Little Italy rooftop after arranging a midnight meet through the personals.",
      timestamp: "April 14, 1989 · 02:10",
      evidence:
        "Victim circled three classifieds in crimson lipstick; answering machine captured a whispered sonnet over vinyl hiss.",
    },
    clues: [
      {
        id: "clue-poet",
        label: "Open Mic Habit",
        text: "The killer performs weekly poetry sets under an alias.",
        detail: "Bowery slam host recognized the caller's cadence from Thursday nights.",
        tags: ["poet"],
      },
      {
        id: "clue-red",
        label: "Crimson Obsession",
        text: "They fixate on the color red in their messages.",
        detail: "Victim's neighbor overheard 'paint the town crimson' on the hallway payphone.",
        tags: ["red"],
      },
      {
        id: "clue-downtown",
        label: "Downtown Loft",
        text: "Suspect keeps an apartment south of Houston.",
        detail: "MetroCard pull shows repeated late-night swipes at Grand Street.",
        tags: ["downtown"],
      },
      {
        id: "clue-vinyl",
        label: "Blue Room Vinyl",
        text: "Static on the tape matches the Viceroy lounge's Blue Room pressing.",
        detail: "Only vendors on Delancey stock that bootleg pressing.",
        tags: ["vinyl"],
      },
    ],
    ads: [
      {
        id: "ad-crimsonsonnet",
        alias: "Crimson Sonnet",
        headline: "Midnight bard seeks rooftop co-conspirator",
        body:
          "Ink-stained poet craving a partner to paint the town crimson. Lives over Grand Street, scribbling verses until the Blue Room quartet packs up.",
        traits: ["Lower East Side loft", "Viceroy lounge regular", "Thursday open mic"],
        intel:
          "Landlord says he drags a typewriter onto the fire escape after the Blue Room's closing number.",
        tags: ["poet", "red", "downtown", "vinyl"],
      },
      {
        id: "ad-rosequill",
        alias: "RoseQuill",
        headline: "Soft-spoken romantic pens dawn sonnets",
        body:
          "Gentle poet seeks company for sunrise walks through Riverside Park. Roses, cappuccinos, and handwritten verse left on brownstone stoops.",
        traits: ["Upper West Side studio", "Sunrise jogger"],
        intel: "Florist confirms weekly standing order of long-stemmed roses delivered uptown.",
        tags: ["poet", "red"],
      },
      {
        id: "ad-skylinechef",
        alias: "Skyline Chef",
        headline: "Rooftop chef plating midnight tastings",
        body:
          "Downtown private chef curates tasting menus above Canal Street. Loves torching crème brûlée beneath neon glow.",
        traits: ["SoHo commercial kitchen", "Culinary school grad"],
        intel: "Supplier invoices show midnight produce deliveries but no poetry gigs on file.",
        tags: ["downtown", "night"],
      },
      {
        id: "ad-riverpilot",
        alias: "EastRiverPilot",
        headline: "Harbor guide seeks co-captain for twilight cruises",
        body:
          "Licensed pilot charts dusk loops past Governors Island. Looking for someone who isn't afraid of the tide or the dark.",
        traits: ["Harbor slip B", "Night shift"],
        intel: "Harbor records show no residential address below Houston; sleeps aboard the tug.",
        tags: ["night", "sea"],
      },
    ],
    killer: "ad-crimsonsonnet",
    solution:
      "Crimson Sonnet is the only ad weaving together crimson imagery, a downtown loft, and the Blue Room vinyl hiss that leaked into the recording.",
  },
  {
    id: "midnight-tides",
    label: "Case 19B · Midnight Tides",
    timeLimit: 7,
    victim: {
      name: "Marco Delaney, 42",
      summary:
        "Former NYPD detective found at a waterfront motel with a staged sea-glass spiral beside the bed.",
      timestamp: "June 02, 1989 · 02:41",
      evidence:
        "Room service chit signed 'TG' with a hand-drawn wave; Harbor Haven ledger shows a $200 donation matched by the victim two nights prior.",
    },
    clues: [
      {
        id: "clue-maritime",
        label: "Saltwater Alias",
        text: "The killer hides behind constant nautical metaphors.",
        detail: "Phone transcripts repeat 'tides', 'currents', and 'undertow' in every sentence.",
        tags: ["sea"],
      },
      {
        id: "clue-lateshift",
        label: "2AM Room Service",
        text: "Suspect ordered room service for two at 2:07 AM.",
        detail: "Bellhop saw a gloved hand flash a ring engraved with a tidepool swirl.",
        tags: ["late-night"],
      },
      {
        id: "clue-charity",
        label: "Shelter Donor",
        text: "They quietly donate to Harbor Haven women's shelter.",
        detail: "Shelter ledger shows matching cashier's checks signed with a looping 'TG'.",
        tags: ["charity"],
      },
      {
        id: "clue-seaglass",
        label: "Sea Glass Spiral",
        text: "Green sea glass from Coney Island arranged in a spiral was left at the scene.",
        detail: "Only one ad brags about collecting sea glass by color.",
        tags: ["glass"],
      },
    ],
    ads: [
      {
        id: "ad-tideglass",
        alias: "TideGlass",
        headline: "Night tide confidant seeks duet",
        body:
          "Late-shift romantic combing the harbor for sea glass trophies. After hours spent delivering Harbor Haven donations, I need someone to watch the tide change with me.",
        traits: ["Battery Park loft", "Sea glass collector", "Harbor Haven patron"],
        intel:
          "Maintenance crew confirms a feline named Brine prowls the hallway whenever 2AM deliveries arrive.",
        tags: ["sea", "late-night", "charity", "glass"],
      },
      {
        id: "ad-moonlodge",
        alias: "Moon Lodge",
        headline: "Insomniac bartender pouring until dawn",
        body:
          "Running a Midtown lounge means I serve the city until the sun shows. Looking for someone to split the staff meal and last call stories.",
        traits: ["Midtown walk-up", "Night bartender"],
        intel: "Bar manager says she donates tips to a Queens youth center, not Harbor Haven.",
        tags: ["late-night"],
      },
      {
        id: "ad-harborheart",
        alias: "Harbor Heart",
        headline: "Volunteer sailor seeks someone steady",
        body:
          "Weekends on Staten Island ferries, weekdays running supply drives for Harbor Haven. No time for games, only honest currents.",
        traits: ["Staten Island bungalow", "Harbor Haven volunteer"],
        intel: "Lives near St. George terminal; no record of sea glass collecting or 2AM outings.",
        tags: ["sea", "charity"],
      },
      {
        id: "ad-orbitwriter",
        alias: "Orbit Writer",
        headline: "Night-desk columnist chasing comet trails",
        body:
          "City desk deadlines keep me up past midnight. I sip seltzer from a cut crystal glass while I file.",
        traits: ["Chelsea loft", "Daily Ledger columnist"],
        intel: "Co-workers confirm she hates the water after a childhood ferry incident.",
        tags: ["late-night", "glass"],
      },
      {
        id: "ad-bellweather",
        alias: "Bellweather",
        headline: "Community organizer ringing morning alarms",
        body:
          "Sunrise rallies, school breakfast programs, marches. Nights are for rest, not tides.",
        traits: ["Harlem apartment", "Advocacy leader"],
        intel: "Strict early-to-bed schedule; can't stomach 2AM calls.",
        tags: ["charity"],
      },
      {
        id: "ad-surfside",
        alias: "Surfside",
        headline: "Boardwalk dreamer seeks duet",
        body:
          "Coney Island surf instructor offering dawn lessons and bonfire sing-alongs. Sand between my toes, salt in my curls.",
        traits: ["Coney Island studio", "Surf instructor"],
        intel: "Teaches 6AM classes, collapses by 9PM most nights.",
        tags: ["sea"],
      },
    ],
    killer: "ad-tideglass",
    solution:
      "TideGlass is the only suspect who hits all four notes: nautical language, Harbor Haven donations, a 2AM lifestyle, and a fetish for color-sorted sea glass.",
  },
  {
    id: "echo-chamber",
    label: "Case 19C · Echo Chamber",
    timeLimit: 7,
    victim: {
      name: "Elise Mercer, 29",
      summary:
        "Nightlife columnist strangled inside a vinyl listening booth; killer wiped prints but left a looping tape of backwards vows.",
      timestamp: "August 19, 1989 · 01:54",
      evidence:
        "Autopsy notes a trace of lighthouse sand, a Polaroid of the killer's gloved hand, and a scribbled acrostic spelling SOLO.",
    },
    clues: [
      {
        id: "clue-lighthouse",
        label: "Lighthouse Sand",
        text: "Grains on the victim's cuffs match Pelham Lighthouse.",
        detail: "Only one suspect name-drops a lighthouse without ever sailing there.",
        tags: ["lighthouse"],
      },
      {
        id: "clue-acrostic",
        label: "Acrostic Solo",
        text: "Stacked first letters from the ad spell S-O-L-O.",
        detail: "Victim wrote 'S.O.L.O.' beside the clipped ad.",
        matches: ["ad-inkwake"],
      },
      {
        id: "clue-district",
        label: "Rutgers Tokens",
        text: "Transit tokens traced back to Rutgers Street station.",
        detail: "Suspect must live within walking distance of that stop.",
        tags: ["downtown"],
      },
      {
        id: "clue-palindrome",
        label: "Palindrome Code",
        text: "Caller signed off with the palindrome 'level'.",
        detail: "Only one ad hides palindromes in its copy.",
        tags: ["palindrome"],
      },
      {
        id: "clue-ink",
        label: "Ink Stained Gloves",
        text: "Gloves reeked of printing ink mixed with salt air.",
        detail: "Matches a zine press that vents toward the East River.",
        tags: ["ink", "sea"],
      },
    ],
    ads: [
      {
        id: "ad-inkwake",
        alias: "Ink Wake",
        headline: "Siren of the spillway seeks fellow insomniac",
        body:
          "Sable nights. Ocean breeze. Level with me as we listen backwards for love. Only the lighthouse keeps score while we orbit lower Orchard.",
        traits: ["Lower Orchard Street loft", "Zine press operator", "Pelham lighthouse fixation"],
        intel:
          "Building superintendent reports salt-streaked gloves and weekly press runs that vent toward the East River.",
        tags: ["lighthouse", "downtown", "palindrome", "ink", "sea"],
      },
      {
        id: "ad-galapagirl",
        alias: "GalapaGirl",
        headline: "Aquarium docent craving adventure",
        body:
          "Guiding crowds past sea lions by day, finishing my marine biology thesis by night. Let's swap field notes over kelp tea.",
        traits: ["Astoria apartment", "New York Aquarium docent"],
        intel: "Night classes keep her in Brooklyn; no known ties to Rutgers Street.",
        tags: ["sea"],
      },
      {
        id: "ad-penumbra",
        alias: "Penumbra",
        headline: "Shadowbox photographer seeks darkroom confidant",
        body:
          "Snapshots, silver nitrate, a loft in Tribeca. I chase lighthouses only when the job pays, never for romance.",
        traits: ["Tribeca loft", "Freelance photographer"],
        intel: "Darkroom lacks the ink splatter detectives found.",
        tags: ["lighthouse", "ink"],
      },
      {
        id: "ad-looper",
        alias: "Looper",
        headline: "Mixtape sculptor looking for a listener",
        body:
          "Cassette loops, backmasking experiments, civic center apartment. Palindromes fascinate me, but my world ends at 14th Street.",
        traits: ["Civic Center apartment", "Audio engineer"],
        intel: "Lives uptown from Rutgers stop; keeps gloves pristine.",
        tags: ["palindrome", "ink"],
      },
      {
        id: "ad-harborlight",
        alias: "Harbor Light",
        headline: "Beacon keeper on sabbatical seeks steady glow",
        body:
          "Pelham lighthouse caretaker chasing warmth ashore. Early mornings only; nights belong to the beacon.",
        traits: ["Pelham Bay quarters", "Retired caretaker"],
        intel: "Sleeps at dawn, hates city grit; zero subway rides logged.",
        tags: ["lighthouse", "sea"],
      },
      {
        id: "ad-rutgersrow",
        alias: "Rutgers Row",
        headline: "Rowing instructor posted near Rutgers",
        body:
          "Launch at Rutgers Slip, finish with dumplings on East Broadway. Call if you can keep pace with a six-minute mile.",
        traits: ["Rutgers Street studio", "Crew coach"],
        intel: "Hands rough from oars, not ink.",
        tags: ["downtown", "sea"],
      },
      {
        id: "ad-paperlantern",
        alias: "Paper Lantern",
        headline: "Letterpress poet lighting the East Village",
        body:
          "Hand-set type, midnight tea, wordplay that reads the same both ways. Looking for someone to match my mirrored whispers.",
        traits: ["East Village tenement", "Letterpress artist"],
        intel: "Print studio is odorless thanks to soy ink; no salt residue.",
        tags: ["palindrome", "ink", "downtown"],
      },
      {
        id: "ad-sleeplessny",
        alias: "Sleepless NY",
        headline: "Citywide courier on endless loop",
        body:
          "From Battery Park to Inwood nightly. No time for sand or tape loops—just packages and payphones.",
        traits: ["Bronx crash pad", "Courier"],
        intel: "Routes rarely cross the East River piers after midnight.",
        tags: ["night"],
      },
    ],
    killer: "ad-inkwake",
    solution:
      "Ink Wake folds every clue together: lighthouse fixation, palindrome wordplay, Rutgers Street loft, and ink-stained gloves blasted by river air.",
  },
];

const particleSystem = mountParticleField({
  effects: {
    palette: ["#f87171", "#f472b6", "#38bdf8", "#34d399"],
    ambientDensity: 0.45,
  },
});

const scoreConfig = getScoreConfig("personal-ad-trap");
const highScore = initHighScoreBanner({
  gameId: "personal-ad-trap",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const statusChannel = createStatusChannel(document.getElementById("status-readout"));
const logChannel = createLogChannel(document.getElementById("event-log"), { limit: 28 });

const stringLayer = document.getElementById("string-layer");
const clueListElement = document.getElementById("clue-list");
const adGridElement = document.getElementById("ad-grid");
const investigationField = document.getElementById("investigation-field");
const timeMeter = document.getElementById("time-meter");
const timeFill = document.getElementById("time-meter-fill");
const timeValue = document.getElementById("time-remaining");
const moveCountElement = document.getElementById("move-count");
const scoreValueElement = document.getElementById("score-value");
const wrongCountElement = document.getElementById("wrong-count");

const victimNameElement = document.getElementById("victim-name");
const victimSummaryElement = document.getElementById("victim-summary");
const victimTimestampElement = document.getElementById("victim-timestamp");
const victimEvidenceElement = document.getElementById("victim-evidence");

const accusationPanel = document.getElementById("accusation-panel");
const accusationOptionsElement = document.getElementById("accusation-options");
const accusationForm = document.getElementById("accusation-form");
const cancelAccusationButton = document.getElementById("cancel-accusation");

const caseReport = document.getElementById("case-report");
const reportSummaryElement = document.getElementById("report-summary");
const reportScoreElement = document.getElementById("report-score");
const reportDaysElement = document.getElementById("report-days");
const reportMovesElement = document.getElementById("report-moves");
const reportWrongsElement = document.getElementById("report-wrongs");
const flowchartList = document.getElementById("flowchart-list");
const replayCaseButton = document.getElementById("replay-case");
const nextCaseButton = document.getElementById("next-case");

const resetCaseButton = document.getElementById("reset-case");
const makeAccusationButton = document.getElementById("make-accusation");

const caseClosedBanner = document.getElementById("case-closed-banner");
const wrongFlash = document.getElementById("wrong-flash");

let audioContext = null;

const state = {
  caseIndex: 0,
  currentCase: null,
  daysRemaining: 0,
  moves: 0,
  wrongAccusations: 0,
  selectedClueId: null,
  links: [],
  flaggedAds: new Set(),
  dismissedAds: new Set(),
  infoRequested: new Set(),
  caseResolved: false,
  lastScore: 0,
};

function ensureAudioContext() {
  if (audioContext) {
    return audioContext;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioCtx !== "function") {
    return null;
  }
  audioContext = new AudioCtx();
  return audioContext;
}

function resumeAudio() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

document.addEventListener("pointerdown", resumeAudio, { once: true });

function playStamp() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

function playVictory() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(640, now + 0.28);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

function playBuzzer() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(90, now + 0.35);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.45, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function loadCase(index = 0, { announce = true } = {}) {
  const caseIndex = Math.max(0, Math.min(index, CASES.length - 1));
  const selectedCase = CASES[caseIndex];
  state.caseIndex = caseIndex;
  state.currentCase = selectedCase;
  state.daysRemaining = selectedCase.timeLimit;
  state.moves = 0;
  state.wrongAccusations = 0;
  state.selectedClueId = null;
  state.links = [];
  state.flaggedAds = new Set();
  state.dismissedAds = new Set();
  state.infoRequested = new Set();
  state.caseResolved = false;
  state.lastScore = 0;
  stringLayer.innerHTML = "";

  updateVictimFile(selectedCase);
  renderClues();
  renderAds();
  updateStatus();
  updateStrings();
  closeAccusationPanel();
  hideCaseReport();

  if (announce) {
    statusChannel(
      `${selectedCase.label} loaded. Use your seven days wisely—every link, flag, or intel request costs time.`,
      "info",
    );
    logChannel.push(`${selectedCase.label} opened. Clues pinned to the left.`, "info");
  }
}

function updateVictimFile(caseData) {
  victimNameElement.textContent = caseData.victim.name;
  victimSummaryElement.textContent = caseData.victim.summary;
  victimTimestampElement.textContent = caseData.victim.timestamp;
  victimEvidenceElement.textContent = caseData.victim.evidence;
}

function renderClues() {
  clueListElement.innerHTML = "";
  const { currentCase } = state;
  if (!currentCase) {
    return;
  }
  currentCase.clues.forEach((clue, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "clue-card";
    button.dataset.clueId = clue.id;
    button.draggable = true;
    button.innerHTML = `
      <span class="clue-meta">${String(index + 1).padStart(2, "0")} · ${clue.label}</span>
      <span class="clue-text">${clue.text}</span>
      <span class="clue-detail">${clue.detail}</span>
    `;
    button.addEventListener("click", () => {
      if (state.selectedClueId === clue.id) {
        state.selectedClueId = null;
      } else {
        state.selectedClueId = clue.id;
      }
      updateClueSelection();
    });
    button.addEventListener("dragstart", (event) => {
      state.selectedClueId = clue.id;
      updateClueSelection();
      event.dataTransfer.effectAllowed = "link";
      event.dataTransfer.setData("text/plain", clue.id);
    });
    button.addEventListener("dragend", () => {
      updateClueSelection();
    });
    clueListElement.append(button);
  });
  updateClueSelection();
}

function updateClueSelection() {
  const { currentCase } = state;
  const clueButtons = clueListElement.querySelectorAll(".clue-card");
  clueButtons.forEach((button) => {
    const { clueId } = button.dataset;
    const linkSolved = state.links.some(
      (link) => link.clueId === clueId && link.correct && link.adId === currentCase.killer,
    );
    button.classList.toggle("is-selected", clueId === state.selectedClueId);
    button.dataset.status = linkSolved ? "solved" : "";
    button.setAttribute("aria-pressed", clueId === state.selectedClueId ? "true" : "false");
  });
}

function renderAds() {
  adGridElement.innerHTML = "";
  const { currentCase } = state;
  if (!currentCase) {
    return;
  }
  currentCase.ads.forEach((ad) => {
    const article = document.createElement("article");
    article.className = "ad-card";
    article.dataset.adId = ad.id;
    article.setAttribute("role", "listitem");
    article.innerHTML = `
      <div class="ad-alias">${ad.alias}</div>
      <h4>${ad.headline}</h4>
      <p class="ad-body">${ad.body}</p>
      <div class="ad-traits">${ad.traits.map((trait) => `<span>${trait}</span>`).join("")}</div>
      <div class="ad-actions">
        <button type="button" class="action-button" data-action="link">Link Selected Clue</button>
        <button type="button" class="action-button" data-action="intel">Request Background</button>
        <button type="button" class="action-button" data-action="flag">Flag Suspect</button>
        <button type="button" class="action-button" data-action="dismiss">Dismiss Lead</button>
      </div>
      <div class="ad-intel" data-role="intel" hidden>${ad.intel}</div>
      <ul class="ad-links" data-role="links"></ul>
    `;

    article.addEventListener("dragover", (event) => {
      event.preventDefault();
      article.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "link";
    });
    article.addEventListener("dragleave", () => {
      article.classList.remove("is-drop-target");
    });
    article.addEventListener("drop", (event) => {
      event.preventDefault();
      article.classList.remove("is-drop-target");
      const clueId = event.dataTransfer.getData("text/plain") || state.selectedClueId;
      if (clueId) {
        linkClueToAd(clueId, ad.id, { viaDrag: true });
      }
    });

    article.querySelectorAll(".ad-actions button").forEach((button) => {
      button.addEventListener("click", () => handleAdAction(ad.id, button.dataset.action));
    });

    adGridElement.append(article);
  });
  updateAdStates();
}

function updateAdStates() {
  const { currentCase } = state;
  if (!currentCase) {
    return;
  }
  currentCase.ads.forEach((ad) => {
    const article = adGridElement.querySelector(`[data-ad-id="${ad.id}"]`);
    if (!article) {
      return;
    }
    article.classList.toggle("is-flagged", state.flaggedAds.has(ad.id));
    article.classList.toggle("is-dismissed", state.dismissedAds.has(ad.id));
    const intelElement = article.querySelector('[data-role="intel"]');
    if (intelElement) {
      intelElement.hidden = !state.infoRequested.has(ad.id);
    }
    const linksList = article.querySelector('[data-role="links"]');
    if (linksList) {
      linksList.innerHTML = "";
      const links = state.links.filter((link) => link.adId === ad.id);
      links.forEach((link) => {
        const clue = currentCase.clues.find((entry) => entry.id === link.clueId);
        const item = document.createElement("li");
        const tone = link.correct ? "success" : "warning";
        item.dataset.tone = tone;
        item.innerHTML = `
          <span>${clue ? clue.label : link.clueId}</span>
          <button type="button" class="remove-link" aria-label="Remove link">✕</button>
        `;
        item.querySelector(".remove-link").addEventListener("click", () => {
          removeLink(link.clueId, link.adId);
        });
        linksList.append(item);
      });
    }
  });
}

function handleAdAction(adId, action) {
  switch (action) {
    case "link":
      if (state.selectedClueId) {
        linkClueToAd(state.selectedClueId, adId, { viaButton: true });
      } else {
        statusChannel("Select a clue before linking it to an ad.", "warning");
      }
      break;
    case "intel":
      requestIntel(adId);
      break;
    case "flag":
      toggleFlag(adId);
      break;
    case "dismiss":
      toggleDismiss(adId);
      break;
    default:
      break;
  }
}

function requestIntel(adId) {
  if (state.caseResolved) {
    return;
  }
  if (state.infoRequested.has(adId)) {
    statusChannel("Background already pulled. Focus on the strings.", "warning");
    return;
  }
  state.infoRequested.add(adId);
  spendDays(1, "Background requested.");
  const ad = getAdById(adId);
  logChannel.push(`Requested background on ${ad.alias}.`, "info");
  statusChannel(`Intel on ${ad.alias} added to the board.`, "success");
  particleSystem.emitSparkle(0.6);
  updateAdStates();
}

function toggleFlag(adId) {
  if (state.caseResolved) {
    return;
  }
  if (state.flaggedAds.has(adId)) {
    state.flaggedAds.delete(adId);
    logChannel.push(`Removed flag from ${getAdById(adId).alias}.`, "info");
    statusChannel("Flag removed.", "info");
  } else {
    state.flaggedAds.add(adId);
    spendDays(1, "Flagged a suspect.");
    logChannel.push(`Flagged ${getAdById(adId).alias} as suspicious.`, "warning");
    statusChannel("Suspect flagged. Keep pressure on the timeline.", "warning");
    particleSystem.emitSparkle(0.7);
  }
  updateAdStates();
}

function toggleDismiss(adId) {
  if (state.caseResolved) {
    return;
  }
  if (state.dismissedAds.has(adId)) {
    state.dismissedAds.delete(adId);
    logChannel.push(`Reopened ${getAdById(adId).alias} for review.`, "info");
    statusChannel("Lead reopened.", "info");
  } else {
    state.dismissedAds.add(adId);
    spendDays(1, "Dismissed a lead.");
    logChannel.push(`Dismissed ${getAdById(adId).alias} as a dead end.`, "warning");
    statusChannel("Lead dismissed. Make sure you're not tossing the real killer.", "warning");
  }
  updateAdStates();
}

function linkClueToAd(clueId, adId, { viaDrag = false, viaButton = false } = {}) {
  if (state.caseResolved) {
    return;
  }
  const { currentCase } = state;
  const clue = currentCase?.clues.find((entry) => entry.id === clueId);
  const ad = currentCase?.ads.find((entry) => entry.id === adId);
  if (!clue || !ad) {
    statusChannel("That link can't be made—check the case file again.", "danger");
    return;
  }

  const existing = state.links.find((link) => link.clueId === clueId && link.adId === adId);
  if (existing) {
    statusChannel("You've already strung that clue to this ad.", "info");
    return;
  }

  const correct = evaluateLink(clue, ad);
  state.links.push({
    clueId,
    adId,
    correct,
    key: `${clueId}__${adId}`,
  });
  spendDays(1, "String connected.");
  updateClueSelection();
  updateAdStates();
  updateStrings();
  updateStatus();
  playStamp();
  particleSystem.emitBurst(correct ? 1 : 0.6);

  if (correct) {
    statusChannel(`Solid link: ${clue.label} fits ${ad.alias}.`, "success");
    logChannel.push(`Confirmed ${clue.label} on ${ad.alias}.`, "success");
  } else {
    statusChannel(`Link created, but ${ad.alias} may not satisfy ${clue.label}. Double-check the wording.`, "warning");
    logChannel.push(`Tentative string from ${clue.label} to ${ad.alias}.`, "warning");
  }

  if (viaButton) {
    const article = adGridElement.querySelector(`[data-ad-id="${adId}"]`);
    if (article) {
      article.classList.add("is-drop-target");
      window.setTimeout(() => {
        article.classList.remove("is-drop-target");
      }, 280);
    }
  }
}

function evaluateLink(clue, ad) {
  if (Array.isArray(clue.matches) && clue.matches.length > 0) {
    return clue.matches.includes(ad.id);
  }
  if (Array.isArray(clue.tags) && clue.tags.length > 0) {
    return clue.tags.every((tag) => ad.tags.includes(tag));
  }
  return false;
}

function removeLink(clueId, adId) {
  const index = state.links.findIndex((link) => link.clueId === clueId && link.adId === adId);
  if (index === -1) {
    return;
  }
  state.links.splice(index, 1);
  logChannel.push(`Removed string between ${getClueById(clueId)?.label ?? clueId} and ${getAdById(adId)?.alias ?? adId}.`, "info");
  updateClueSelection();
  updateAdStates();
  updateStrings();
  updateStatus();
}

function getClueById(clueId) {
  return state.currentCase?.clues.find((clue) => clue.id === clueId) ?? null;
}

function getAdById(adId) {
  return state.currentCase?.ads.find((ad) => ad.id === adId) ?? null;
}

function spendDays(amount, logMessage) {
  if (state.caseResolved) {
    return;
  }
  const normalized = Math.max(0, Math.floor(amount));
  if (normalized <= 0) {
    return;
  }
  state.daysRemaining = Math.max(0, state.daysRemaining - normalized);
  state.moves += normalized;
  if (logMessage) {
    logChannel.push(logMessage, "info");
  }
  updateStatus();
  if (state.daysRemaining <= 0) {
    failCase("Investigation time expired. The suspect slipped away.");
  }
}

function updateStatus() {
  const projected = calculateProjectedScore();
  scoreValueElement.textContent = projected.toLocaleString();
  moveCountElement.textContent = String(state.moves);
  wrongCountElement.textContent = String(state.wrongAccusations);
  timeMeter.setAttribute("aria-valuemax", String(state.currentCase?.timeLimit ?? 7));
  timeMeter.setAttribute("aria-valuenow", String(state.daysRemaining));
  const ratio = state.currentCase ? state.daysRemaining / state.currentCase.timeLimit : 1;
  timeFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  const plural = state.daysRemaining === 1 ? "day" : "days";
  timeValue.textContent = `${state.daysRemaining} ${plural} left`;
}

function calculateProjectedScore() {
  const base = 900;
  const timeBonus = Math.max(0, state.daysRemaining) * 140;
  const efficiencyPenalty = state.moves * 32;
  const wrongPenalty = state.wrongAccusations * 220;
  const score = base + timeBonus - efficiencyPenalty - wrongPenalty;
  return Math.max(0, Math.round(score));
}

function updateStrings() {
  const { currentCase } = state;
  if (!currentCase) {
    return;
  }
  stringLayer.innerHTML = "";
  const rect = investigationField.getBoundingClientRect();

  state.links.forEach((link) => {
    const clueElement = clueListElement.querySelector(`[data-clue-id="${link.clueId}"]`);
    const adElement = adGridElement.querySelector(`[data-ad-id="${link.adId}"]`);
    if (!clueElement || !adElement) {
      return;
    }
    const clueRect = clueElement.getBoundingClientRect();
    const adRect = adElement.getBoundingClientRect();
    const x1 = clueRect.right - rect.left + 8;
    const y1 = clueRect.top + clueRect.height / 2 - rect.top;
    const x2 = adRect.left - rect.left - 8;
    const y2 = adRect.top + adRect.height / 2 - rect.top;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const controlX = (x1 + x2) / 2;
    const pathData = `M ${x1} ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, ${x2} ${y2}`;
    path.setAttribute("d", pathData);
    path.classList.add("string-line");
    if (link.correct) {
      path.classList.add("is-correct");
    } else if (state.currentCase.killer === link.adId) {
      path.classList.add("is-danger");
    } else {
      path.classList.add("is-questionable");
    }
    stringLayer.append(path);
  });
}

function openAccusationPanel() {
  if (state.caseResolved) {
    return;
  }
  accusationPanel.classList.add("is-open");
  accusationPanel.removeAttribute("aria-hidden");
  accusationOptionsElement.innerHTML = "";
  state.currentCase.ads.forEach((ad) => {
    const label = document.createElement("label");
    label.className = "accusation-option";
    label.innerHTML = `
      <input type="radio" name="suspect" value="${ad.id}" />
      <div>
        <div class="ad-alias">${ad.alias}</div>
        <div>${ad.headline}</div>
      </div>
    `;
    accusationOptionsElement.append(label);
  });
  const firstRadio = accusationOptionsElement.querySelector("input[type='radio']");
  if (firstRadio) {
    firstRadio.focus();
  }
}

function closeAccusationPanel() {
  accusationPanel.classList.remove("is-open");
  accusationPanel.setAttribute("aria-hidden", "true");
  accusationOptionsElement.innerHTML = "";
}

function resolveAccusation(adId) {
  if (!state.currentCase || state.caseResolved) {
    return;
  }
  const suspect = getAdById(adId);
  if (!suspect) {
    statusChannel("That suspect isn't on the board.", "danger");
    return;
  }
  if (adId === state.currentCase.killer) {
    const finalScore = calculateProjectedScore();
    state.lastScore = finalScore;
    state.caseResolved = true;
    statusChannel(`You nailed ${suspect.alias}. Case closed.`, "success");
    logChannel.push(`Accused ${suspect.alias}—correct.`, "success");
    particleSystem.emitBurst(1.6);
    showCaseClosed();
    playVictory();
    highScore.submit(finalScore, {
      caseId: state.currentCase.id,
      daysRemaining: state.daysRemaining,
      moves: state.moves,
      wrongAccusations: state.wrongAccusations,
    });
    showCaseReport(true);
  } else {
    state.wrongAccusations += 1;
    playBuzzer();
    particleSystem.emitSparkle(1.4);
    showWrongAccusation();
    logChannel.push(`Accused ${suspect.alias}—wrong call. Lost three days.`, "danger");
    statusChannel(`Wrong suspect. ${suspect.alias} walks while you lose three days.`, "danger");
    spendDays(3, "Accusation penalty applied.");
    if (!state.caseResolved && state.daysRemaining > 0) {
      updateStatus();
    }
  }
}

function showCaseClosed() {
  caseClosedBanner.classList.add("is-active");
  window.setTimeout(() => {
    caseClosedBanner.classList.remove("is-active");
  }, 1400);
}

function showWrongAccusation() {
  wrongFlash.classList.add("is-active");
  window.setTimeout(() => {
    wrongFlash.classList.remove("is-active");
  }, 720);
}

function failCase(reason) {
  if (state.caseResolved) {
    return;
  }
  state.caseResolved = true;
  statusChannel(reason, "danger");
  logChannel.push(reason, "danger");
  showCaseReport(false, reason);
}

function showCaseReport(success, failureReason) {
  reportSummaryElement.textContent = success
    ? `${state.currentCase.label} closed. ${state.currentCase.solution}`
    : failureReason || `Case collapsed before you could close ${state.currentCase.label}.`;
  reportScoreElement.textContent = success ? state.lastScore.toLocaleString() : "0";
  reportDaysElement.textContent = `${state.daysRemaining}`;
  reportMovesElement.textContent = `${state.moves}`;
  reportWrongsElement.textContent = `${state.wrongAccusations}`;

  flowchartList.innerHTML = "";
  state.currentCase.clues.forEach((clue) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${clue.label}</strong><div>${clue.text}</div>`;
    const connections = document.createElement("ul");
    connections.className = "flowchart-connections";
    const matchingLinks = state.links.filter((link) => link.clueId === clue.id);
    if (matchingLinks.length === 0) {
      const none = document.createElement("li");
      none.textContent = "No string recorded.";
      connections.append(none);
    } else {
      matchingLinks.forEach((link) => {
        const ad = getAdById(link.adId);
        const connection = document.createElement("li");
        connection.dataset.tone = link.correct ? "success" : link.adId === state.currentCase.killer ? "danger" : "warning";
        connection.textContent = `${ad ? ad.alias : link.adId} · ${link.correct ? "Confirmed" : "Unproven"}`;
        connections.append(connection);
      });
    }
    item.append(connections);
    flowchartList.append(item);
  });

  nextCaseButton.textContent = state.caseIndex >= CASES.length - 1 ? "Restart Ladder" : "Next Case";

  caseReport.classList.add("is-open");
  caseReport.removeAttribute("aria-hidden");
  nextCaseButton.focus();
}

function hideCaseReport() {
  caseReport.classList.remove("is-open");
  caseReport.setAttribute("aria-hidden", "true");
}

function resetCurrentCase() {
  loadCase(state.caseIndex, { announce: false });
  statusChannel("Case reset. Strings cleared but the clock rewinds to seven days.", "info");
  logChannel.push("Reset case. Fresh slate.", "info");
}

resetCaseButton.addEventListener("click", resetCurrentCase);
makeAccusationButton.addEventListener("click", () => {
  openAccusationPanel();
});

accusationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(accusationForm);
  const suspectId = data.get("suspect");
  if (!suspectId) {
    statusChannel("Select someone before pulling the trigger.", "warning");
    return;
  }
  closeAccusationPanel();
  resolveAccusation(String(suspectId));
});

cancelAccusationButton.addEventListener("click", () => {
  closeAccusationPanel();
});

replayCaseButton.addEventListener("click", () => {
  hideCaseReport();
  resetCurrentCase();
});

nextCaseButton.addEventListener("click", () => {
  hideCaseReport();
  const nextIndex = (state.caseIndex + 1) % CASES.length;
  loadCase(nextIndex, { announce: true });
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(updateStrings);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accusationPanel.classList.contains("is-open")) {
    closeAccusationPanel();
  }
  if ((event.key === "r" || event.key === "R") && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    resetCurrentCase();
  }
});

loadCase(0, { announce: true });
