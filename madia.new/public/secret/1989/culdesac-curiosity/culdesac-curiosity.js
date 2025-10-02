import { mountParticleField } from "../particles.js";

mountParticleField();

const boardElement = document.getElementById("gossip-grid");
const statusBar = document.getElementById("status-bar");
const logList = document.getElementById("log-entries");
const paranoiaFill = document.getElementById("paranoia-fill");
const paranoiaReading = document.getElementById("paranoia-reading");
const tokenFill = document.getElementById("token-fill");
const tokenReading = document.getElementById("token-reading");
const curiosityFill = document.getElementById("curiosity-fill");
const curiosityReading = document.getElementById("curiosity-reading");
const digGrid = document.getElementById("dig-grid");
const snoopButton = document.getElementById("snoop-button");
const resetButton = document.getElementById("reset-button");
const snoopOverlay = document.getElementById("snoop-overlay");
const snoopList = document.getElementById("snoop-list");
const closeSnoopButton = document.getElementById("close-snoop");
const failureOverlay = document.getElementById("failure-overlay");
const failureResetButton = document.getElementById("failure-reset");

const BOARD_SIZE = 7;
const TOKEN_TYPES = ["binoculars", "walkie", "mail", "shovel", "crow"];
const TOKEN_ICONS = {
  binoculars: "🔭",
  walkie: "📻",
  mail: "✉️",
  shovel: "⛏️",
  crow: "🐦",
};

const DIG_VISIBLE_ROWS = 4;
const DIG_COLUMNS = 3;
const DIG_COST = {
  bone: 3,
  mystery: 2,
  dirt: 1,
};
const DIG_PARANOIA = {
  bone: 6,
  mystery: 5,
  dirt: 4,
};
const DIG_PARANOIA_REASON = {
  bone: "Bone clearing rattles the block",
  mystery: "Prying mystery box lids",
  dirt: "Dirt scoop echoes",
};
const PARANOIA_DRIFT_INTERVAL = 4000;
const PARANOIA_DRIFT_AMOUNT = 1;
const MAX_TOKENS_DISPLAY = 24;
const CURIOSITY_GOAL = 3;

const DIG_BLUEPRINT = [
  {
    layers: [
      { type: "bone" },
      { type: "dirt" },
      { type: "bone" },
      { type: "mystery" },
      { type: "dirt" },
      { type: "mystery" },
    ],
  },
  {
    layers: [
      { type: "dirt" },
      { type: "bone" },
      { type: "bone" },
      { type: "mystery" },
      { type: "dirt" },
      { type: "bone" },
    ],
  },
  {
    layers: [
      { type: "bone" },
      { type: "dirt" },
      { type: "mystery" },
      { type: "bone" },
      { type: "mystery" },
      { type: "dirt" },
    ],
  },
];

let board = [];
let tileElements = [];
let selectedTile = null;
let resolvingBoard = false;
let paranoia = 0;
let tokens = 0;
let curiosity = 0;
let paranoiaTimer = null;
let gameActive = true;
let digColumns = [];

function randomType() {
  const index = Math.floor(Math.random() * TOKEN_TYPES.length);
  return TOKEN_TYPES[index];
}

function createToken(type) {
  return { type, icon: TOKEN_ICONS[type] };
}

function wouldCreateMatch(row, col, type) {
  // check horizontal
  let matchLeft = 0;
  for (let i = 1; i <= 2; i += 1) {
    if (col - i < 0) {
      break;
    }
    if (board[row][col - i]?.type === type) {
      matchLeft += 1;
    } else {
      break;
    }
  }
  let matchRight = 0;
  for (let i = 1; i <= 2; i += 1) {
    if (col + i >= BOARD_SIZE) {
      break;
    }
    if (board[row][col + i]?.type === type) {
      matchRight += 1;
    } else {
      break;
    }
  }
  if (matchLeft + matchRight >= 2) {
    return true;
  }
  let matchUp = 0;
  for (let i = 1; i <= 2; i += 1) {
    if (row - i < 0) {
      break;
    }
    if (board[row - i][col]?.type === type) {
      matchUp += 1;
    } else {
      break;
    }
  }
  let matchDown = 0;
  for (let i = 1; i <= 2; i += 1) {
    if (row + i >= BOARD_SIZE) {
      break;
    }
    if (board[row + i][col]?.type === type) {
      matchDown += 1;
    } else {
      break;
    }
  }
  return matchUp + matchDown >= 2;
}

function fillBoard() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      let type = randomType();
      while (wouldCreateMatch(row, col, type)) {
        type = randomType();
      }
      board[row][col] = createToken(type);
    }
  }
}

function buildBoardElement() {
  boardElement.innerHTML = "";
  tileElements = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("tile-button");
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("aria-label", "Rumor tile");
      boardElement.appendChild(button);
      tileElements[row][col] = button;
    }
  }
}

function renderTile(row, col) {
  const token = board[row][col];
  const button = tileElements[row][col];
  button.className = "tile-button";
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.innerHTML = "";
  if (token) {
    button.classList.add(token.type);
    const span = document.createElement("span");
    span.classList.add("tile-sigil");
    span.textContent = token.icon;
    button.appendChild(span);
    button.setAttribute("aria-label", `${token.type} rumor tile`);
    button.disabled = !gameActive;
  } else {
    button.classList.add("clearing");
    button.disabled = true;
  }
}

function renderBoard() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      renderTile(row, col);
    }
  }
}

function findMatches() {
  const matched = new Set();
  // rows
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    let runType = null;
    let runStart = 0;
    let runLength = 0;
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const token = board[row][col];
      if (!token) {
        runType = null;
        runLength = 0;
        runStart = col + 1;
        continue;
      }
      if (token.type === runType) {
        runLength += 1;
      } else {
        if (runLength >= 3) {
          for (let i = 0; i < runLength; i += 1) {
            matched.add(`${row},${runStart + i}`);
          }
        }
        runType = token.type;
        runStart = col;
        runLength = 1;
      }
    }
    if (runLength >= 3) {
      for (let i = 0; i < runLength; i += 1) {
        matched.add(`${row},${runStart + i}`);
      }
    }
  }
  // columns
  for (let col = 0; col < BOARD_SIZE; col += 1) {
    let runType = null;
    let runStart = 0;
    let runLength = 0;
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const token = board[row][col];
      if (!token) {
        runType = null;
        runLength = 0;
        runStart = row + 1;
        continue;
      }
      if (token.type === runType) {
        runLength += 1;
      } else {
        if (runLength >= 3) {
          for (let i = 0; i < runLength; i += 1) {
            matched.add(`${runStart + i},${col}`);
          }
        }
        runType = token.type;
        runStart = row;
        runLength = 1;
      }
    }
    if (runLength >= 3) {
      for (let i = 0; i < runLength; i += 1) {
        matched.add(`${runStart + i},${col}`);
      }
    }
  }
  return matched;
}

function collapseBoard() {
  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const stack = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        stack.push(board[row][col]);
      }
    }
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const token = stack.shift();
      board[row][col] = token ?? null;
    }
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (!board[row][col]) {
        let type = randomType();
        while (wouldCreateMatch(row, col, type)) {
          type = randomType();
        }
        board[row][col] = createToken(type);
      }
    }
  }
}

function clearSelection() {
  if (selectedTile) {
    const { row, col } = selectedTile;
    tileElements[row][col].classList.remove("selected");
  }
  selectedTile = null;
}

function setStatus(message) {
  statusBar.textContent = message;
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = message;
  logList.prepend(item);
  while (logList.children.length > 12) {
    logList.removeChild(logList.lastElementChild);
  }
}

function updateParanoiaUI() {
  paranoiaFill.style.width = `${Math.min(paranoia, 100)}%`;
  paranoiaReading.textContent = `${Math.round(paranoia)}%`;
}

function adjustParanoia(amount, reason) {
  if (!gameActive && amount >= 0) {
    return;
  }
  const previous = paranoia;
  paranoia = Math.max(0, Math.min(100, paranoia + amount));
  updateParanoiaUI();
  if (amount > 0 && reason) {
    logEvent(`${reason} (+${amount}% paranoia)`);
  }
  if (paranoia >= 100) {
    triggerFailure();
  } else if (amount < 0 && paranoia !== previous) {
    logEvent(`Neighborhood calms (-${previous - paranoia}% paranoia)`);
  }
}

function updateTokensUI() {
  tokenReading.textContent = String(tokens);
  const ratio = Math.min(tokens / MAX_TOKENS_DISPLAY, 1);
  tokenFill.style.width = `${ratio * 100}%`;
}

function updateCuriosityUI() {
  curiosityReading.textContent = `${curiosity} / ${CURIOSITY_GOAL}`;
  const ratio = Math.min(curiosity / CURIOSITY_GOAL, 1);
  curiosityFill.style.width = `${ratio * 100}%`;
}

function triggerFailure() {
  gameActive = false;
  clearInterval(paranoiaTimer);
  paranoiaTimer = null;
  setStatus("Outburst! The neighbors call the cops. Reset to try again.");
  snoopOverlay.hidden = true;
  failureOverlay.hidden = false;
}

function checkVictory() {
  if (curiosity >= CURIOSITY_GOAL) {
    gameActive = false;
    clearInterval(paranoiaTimer);
    paranoiaTimer = null;
    setStatus("Mystery solved. Deliver the evidence before the Klopeks notice.");
    logEvent("Curiosity meter filled—victory!");
  }
}

function resolveMatchesLoop(initialMatches) {
  return new Promise((resolve) => {
    let totalCleared = 0;
    let chain = 0;
    function step(matches) {
      if (!matches || matches.size === 0) {
        resolve(totalCleared);
        return;
      }
      chain += 1;
      const clearedPositions = Array.from(matches).map((key) => {
        const [row, col] = key.split(",").map(Number);
        return { row, col };
      });
      clearedPositions.forEach(({ row, col }) => {
        board[row][col] = null;
      });
      totalCleared += clearedPositions.length;
      setStatus(`Rumor cascade x${chain}! ${clearedPositions.length} neighbors convinced.`);
      logEvent(`Cleared ${clearedPositions.length} tiles in chain ${chain}.`);
      collapseBoard();
      renderBoard();
      setTimeout(() => {
        const nextMatches = findMatches();
        step(nextMatches);
      }, 220);
    }
    step(initialMatches);
  });
}

function areAdjacent(a, b) {
  return (Math.abs(a.row - b.row) === 1 && a.col === b.col) || (Math.abs(a.col - b.col) === 1 && a.row === b.row);
}

async function attemptSwap(first, second) {
  if (resolvingBoard || !gameActive) {
    return;
  }
  resolvingBoard = true;
  const firstToken = board[first.row][first.col];
  const secondToken = board[second.row][second.col];
  board[first.row][first.col] = secondToken;
  board[second.row][second.col] = firstToken;
  renderTile(first.row, first.col);
  renderTile(second.row, second.col);
  const matches = findMatches();
  if (matches.size === 0) {
    board[first.row][first.col] = firstToken;
    board[second.row][second.col] = secondToken;
    renderTile(first.row, first.col);
    renderTile(second.row, second.col);
    setStatus("No match. The neighborhood side-eyes your theory.");
    adjustParanoia(4, "Failed swap");
    resolvingBoard = false;
    return;
  }
  adjustParanoia(3, "Rumor swap agitates the block");
  const cleared = await resolveMatchesLoop(matches);
  tokens += cleared;
  updateTokensUI();
  if (cleared > 0) {
    logEvent(`Stockpiled ${cleared} dig tokens from gossip.`);
  }
  resolvingBoard = false;
}

function cloneDigBlueprint() {
  return DIG_BLUEPRINT.map((column) => ({
    layers: column.layers.map((layer) => ({ ...layer })),
    cursor: 0,
  }));
}

function layerAt(columnIndex, depthOffset) {
  const column = digColumns[columnIndex];
  if (!column) {
    return null;
  }
  const index = column.cursor + depthOffset;
  return column.layers[index] ?? null;
}

function renderDigSite() {
  digGrid.innerHTML = "";
  for (let row = 0; row < DIG_VISIBLE_ROWS; row += 1) {
    for (let col = 0; col < DIG_COLUMNS; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("dig-cell");
      button.dataset.column = String(col);
      const layer = layerAt(col, row);
      if (!layer) {
        button.classList.add("cleared");
        button.disabled = true;
        const span = document.createElement("span");
        span.classList.add("cell-content");
        span.textContent = "Cleared";
        button.appendChild(span);
      } else if (row === 0) {
        button.classList.add(layer.type);
        const span = document.createElement("span");
        span.classList.add("cell-content");
        span.innerHTML = formatLayerLabel(layer.type);
        button.appendChild(span);
        button.disabled = !gameActive;
        button.setAttribute("aria-label", `${layer.type} tile, costs ${DIG_COST[layer.type]} tokens`);
        if (gameActive) {
          button.addEventListener("click", () => {
            handleDig(col);
          });
        }
      } else {
        button.classList.add("hidden");
        button.disabled = true;
        const span = document.createElement("span");
        span.classList.add("cell-content");
        span.textContent = "???";
        button.appendChild(span);
      }
      digGrid.appendChild(button);
    }
  }
}

function formatLayerLabel(type) {
  if (type === "bone") {
    return "🦴<br />Bone";
  }
  if (type === "mystery") {
    return "🎁<br />Mystery";
  }
  return "🪤<br />Dirt";
}

function handleDig(columnIndex) {
  if (!gameActive) {
    return;
  }
  const column = digColumns[columnIndex];
  const layer = layerAt(columnIndex, 0);
  if (!layer) {
    return;
  }
  const cost = DIG_COST[layer.type];
  if (tokens < cost) {
    setStatus("Not enough dig tokens. Stir more gossip first.");
    adjustParanoia(2, "Basement hesitation");
    return;
  }
  tokens -= cost;
  updateTokensUI();
  adjustParanoia(DIG_PARANOIA[layer.type], DIG_PARANOIA_REASON[layer.type]);
  column.cursor += 1;
  if (layer.type === "mystery") {
    curiosity += 1;
    updateCuriosityUI();
    adjustParanoia(-12, "Mystery box soothes the street");
    logEvent("Mystery box cracked—curiosity meter rises.");
  } else if (layer.type === "bone") {
    logEvent("Bone pile cleared from the dig site.");
  } else {
    logEvent("Cleared packed dirt from the trench.");
  }
  renderDigSite();
  checkVictory();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function handleTileClick(event) {
  const button = event.target.closest(".tile-button");
  if (!button || !gameActive || resolvingBoard) {
    return;
  }
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  if (Number.isNaN(row) || Number.isNaN(col)) {
    return;
  }
  if (!selectedTile) {
    selectedTile = { row, col };
    button.classList.add("selected");
    setStatus("Pick a neighbor to swap.");
    return;
  }
  if (selectedTile.row === row && selectedTile.col === col) {
    button.classList.remove("selected");
    selectedTile = null;
    setStatus("Swap cancelled.");
    return;
  }
  const secondTile = { row, col };
  if (!areAdjacent(selectedTile, secondTile)) {
    tileElements[selectedTile.row][selectedTile.col].classList.remove("selected");
    selectedTile = secondTile;
    button.classList.add("selected");
    setStatus("Choose an adjacent tile to swap.");
    return;
  }
  const firstTile = selectedTile;
  clearSelection();
  attemptSwap(firstTile, secondTile);
}

function startParanoiaDrift() {
  clearInterval(paranoiaTimer);
  paranoiaTimer = setInterval(() => {
    adjustParanoia(PARANOIA_DRIFT_AMOUNT, null);
  }, PARANOIA_DRIFT_INTERVAL);
}

function showSnoop() {
  if (!gameActive || snoopOverlay.hidden === false) {
    return;
  }
  snoopList.innerHTML = "";
  const labels = ["Column A", "Column B", "Column C"];
  digColumns.forEach((column, index) => {
    const upcoming = column.layers.slice(column.cursor + 1, column.cursor + 4);
    const item = document.createElement("li");
    if (upcoming.length === 0) {
      item.textContent = `${labels[index]}: No further finds.`;
    } else {
      const descriptors = upcoming.map((layer) => capitalize(layer.type));
      item.textContent = `${labels[index]}: ${descriptors.join(", ")}`;
    }
    snoopList.appendChild(item);
  });
  snoopOverlay.hidden = false;
  adjustParanoia(6, "Basement snooping raises suspicions");
  logEvent("Snooping reveal shows upcoming layers.");
}

function hideSnoop() {
  snoopOverlay.hidden = true;
}

function resetGame() {
  clearInterval(paranoiaTimer);
  paranoiaTimer = null;
  gameActive = true;
  resolvingBoard = false;
  paranoia = 0;
  tokens = 0;
  curiosity = 0;
  selectedTile = null;
  updateParanoiaUI();
  updateTokensUI();
  updateCuriosityUI();
  fillBoard();
  buildBoardElement();
  renderBoard();
  digColumns = cloneDigBlueprint();
  renderDigSite();
  logList.innerHTML = "";
  setStatus("Swap tiles to gather gossip and earn dig tokens.");
  logEvent("Investigation reset. Neighborhood watch reconvenes.");
  startParanoiaDrift();
  failureOverlay.hidden = true;
  snoopOverlay.hidden = true;
}

boardElement.addEventListener("click", handleTileClick);
snoopButton.addEventListener("click", showSnoop);
closeSnoopButton.addEventListener("click", hideSnoop);
failureResetButton.addEventListener("click", resetGame);
resetButton.addEventListener("click", resetGame);

resetGame();
