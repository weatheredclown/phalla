import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const sessions = [
  {
    id: "stun",
    name: "Satellite Uplink Crew",
    mapping: "preserving",
    keepalive: "stun",
    baseScore: 120,
    penalty: 25,
    log: "Port 3478 pinned. STUN reflectors report clean round trips.",
  },
  {
    id: "ftp",
    name: "Graphics Vendor FTP",
    mapping: "restricted",
    keepalive: "alg",
    baseScore: 110,
    penalty: 20,
    log: "ALG opened passive data slots. Vendor upload underway.",
  },
  {
    id: "tunnel",
    name: "Investigations VPN Tunnel",
    mapping: "static",
    keepalive: "udp",
    baseScore: 140,
    penalty: 30,
    log: "DPD timers satisfied. Tunnel renegotiation succeeded.",
  },
];

const form = document.getElementById("nat-form");
const statusBoard = document.getElementById("nat-status");
const timeline = document.getElementById("timeline");
const scoreOutput = document.getElementById("nat-score");
const stabilityDisplay = document.getElementById("stability-display");
const stabilityFill = document.getElementById("stability-fill");
const progressOutput = document.getElementById("session-progress");
const sessionCards = new Map(
  Array.from(document.querySelectorAll(".session-card")).map((card) => [card.dataset.session, card])
);
const visualCards = new Map(
  Array.from(document.querySelectorAll(".visual-card")).map((card) => [
    card.dataset.session,
    {
      card,
      status: card.querySelector(".visual-status"),
      message: card.querySelector(".visual-message"),
    },
  ])
);

let stability = 100;
let score = 0;
const locked = new Set();
const attempts = new Map(sessions.map((session) => [session.id, 0]));

const clampStability = () => {
  stability = Math.max(0, Math.min(stability, 100));
};

const updateHud = () => {
  scoreOutput.textContent = `${score}`;
  stabilityDisplay.textContent = `${Math.round(stability)}%`;
  stabilityFill.style.width = `${stability}%`;
  progressOutput.textContent = `${locked.size} / ${sessions.length}`;
};

const setStatus = (message, state = "idle") => {
  statusBoard.textContent = message;
  statusBoard.dataset.state = state;
};

const setVisualState = (sessionId, state, statusText, messageText) => {
  const visual = visualCards.get(sessionId);
  if (!visual) {
    return;
  }
  visual.card.dataset.visualState = state;
  if (visual.status) {
    visual.status.textContent = statusText;
  }
  if (visual.message) {
    visual.message.textContent = messageText;
  }
};

const describeMismatch = (session, mappingValue, keepaliveValue) => {
  if (!mappingValue || !keepaliveValue) {
    return "Awaiting translation policy.";
  }
  const mappingMismatch = mappingValue !== session.mapping;
  const keepaliveMismatch = keepaliveValue !== session.keepalive;
  if (mappingMismatch && keepaliveMismatch) {
    return "Translation and keepalive both drift. Expect immediate teardown.";
  }
  if (mappingMismatch) {
    return "Mapping choice bends ports the wrong way. Flow will be blocked.";
  }
  return "Keepalive cadence mismatched. Binding will expire mid-flight.";
};

const updateVisualizer = () => {
  const formData = form ? new FormData(form) : null;
  sessions.forEach((session) => {
    if (locked.has(session.id)) {
      setVisualState(session.id, "locked", "Locked", `${session.log} Translation pinned.`);
      return;
    }
    const mappingValue = formData?.get(`mapping-${session.id}`) || "";
    const keepaliveValue = formData?.get(`keepalive-${session.id}`) || "";
    if (!mappingValue && !keepaliveValue) {
      setVisualState(session.id, "idle", "Idle", "Awaiting translation policy.");
      return;
    }
    if (!mappingValue || !keepaliveValue) {
      setVisualState(session.id, "partial", "Incomplete", "Stage both mapping and keepalive to preview stability.");
      return;
    }
    if (mappingValue === session.mapping && keepaliveValue === session.keepalive) {
      setVisualState(session.id, "preview", "Aligned", "Forecast: stable traversal once committed.");
    } else {
      setVisualState(session.id, "mismatch", "At risk", describeMismatch(session, mappingValue, keepaliveValue));
    }
  });
};

const appendLog = (session, sessionScore, attemptsUsed) => {
  const entry = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = session.name;
  entry.appendChild(title);

  const detail = document.createElement("span");
  detail.textContent = session.log;
  entry.appendChild(detail);

  const attemptLine = document.createElement("span");
  attemptLine.textContent = `Locked after ${attemptsUsed} ${attemptsUsed === 1 ? "pass" : "passes"}.`;
  entry.appendChild(attemptLine);

  const scoreLine = document.createElement("span");
  scoreLine.textContent = `Score earned: ${sessionScore}`;
  entry.appendChild(scoreLine);

  timeline?.prepend(entry);
};

const lockSession = (session, sessionScore, attemptsUsed) => {
  locked.add(session.id);
  const card = sessionCards.get(session.id);
  if (card) {
    card.dataset.state = "locked";
  }
  setVisualState(session.id, "locked", "Locked", `${session.log} Stability bonus locked in.`);
  appendLog(session, sessionScore, attemptsUsed);
  updateHud();
  if (locked.size === sessions.length) {
    const finalScore = score + Math.round(stability);
    setStatus("All traversals pinned. Gateway humming.", "success");
    window.parent?.postMessage(
      {
        type: "net:level-complete",
        game: "nat-handshake-lab",
        payload: {
          status: "Negotiation complete",
          score: finalScore,
        },
      },
      "*"
    );
  }
};

const markError = (session) => {
  const card = sessionCards.get(session.id);
  if (card && card.dataset.state !== "locked") {
    card.dataset.state = "error";
  }
  if (!locked.has(session.id)) {
    setVisualState(session.id, "failed", "Failed", "Gateway rejected the current policy. Recalibrate your picks.");
  }
};

const clearTransientStates = () => {
  sessionCards.forEach((card, id) => {
    if (!locked.has(id) && card.dataset.state === "error") {
      delete card.dataset.state;
    }
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form) {
    return;
  }
  const formData = new FormData(form);
  const missing = sessions.filter((session) => {
    if (locked.has(session.id)) {
      return false;
    }
    const mappingValue = formData.get(`mapping-${session.id}`) || "";
    const keepaliveValue = formData.get(`keepalive-${session.id}`) || "";
    return !mappingValue || !keepaliveValue;
  });
  if (missing.length) {
    missing.forEach((session) => markError(session));
    setStatus("Policies incomplete. Fill every mapping and keepalive.", "error");
    return;
  }

  let anyError = false;
  sessions.forEach((session) => {
    const mappingValue = formData.get(`mapping-${session.id}`) || "";
    const keepaliveValue = formData.get(`keepalive-${session.id}`) || "";
    if (locked.has(session.id)) {
      return;
    }
    const attemptCount = (attempts.get(session.id) || 0) + 1;
    attempts.set(session.id, attemptCount);
    if (mappingValue !== session.mapping || keepaliveValue !== session.keepalive) {
      anyError = true;
      markError(session);
    } else {
      const penalty = Math.max(0, (attemptCount - 1) * session.penalty);
      const sessionScore = Math.max(session.baseScore - penalty, Math.floor(session.penalty / 2));
      score += sessionScore;
      const card = sessionCards.get(session.id);
      if (card) {
        card.dataset.state = "locked";
      }
      lockSession(session, sessionScore, attemptCount);
    }
  });

  if (anyError) {
    stability -= 14;
    clampStability();
    updateHud();
    const problematic = sessions
      .filter((session) => !locked.has(session.id))
      .map((session) => session.name);
    if (problematic.length) {
      setStatus(`Mappings rejected: ${problematic.join(", ")}.`, "error");
    } else {
      setStatus("At least one policy bounced. Re-evaluate choices.", "error");
    }
  } else if (locked.size < sessions.length) {
    setStatus("Partial success. Remaining sessions still negotiating.", "idle");
  }

  updateHud();
});

form?.addEventListener("input", () => {
  if (!form) {
    return;
  }
  clearTransientStates();
  if (statusBoard.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const outstanding = sessions.filter((session) => !locked.has(session.id));
  const ready = outstanding.every((session) => {
    const mappingValue = formData.get(`mapping-${session.id}`) || "";
    const keepaliveValue = formData.get(`keepalive-${session.id}`) || "";
    return Boolean(mappingValue && keepaliveValue);
  });
  if (ready) {
    setStatus("Policies staged. Commit to push them live.");
  } else {
    setStatus("Drafting translation rules…");
  }
  updateVisualizer();
});

updateHud();
updateVisualizer();
