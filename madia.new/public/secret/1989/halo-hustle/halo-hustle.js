import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";

const scoreConfig = getScoreConfig("halo-hustle");
const highScore = initHighScoreBanner({
  gameId: "halo-hustle",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const MAX_TIME = 80;
const STARTING_TIME = 60;
const CHIP_TIME_VALUE = 4;
const HIGH_STAKES_PENALTY = 5;
const LOG_LIMIT = 8;

const timeBar = document.getElementById("time-remaining");
const timeFill = document.getElementById("time-fill");
const timeLabel = document.getElementById("time-remaining-label");
const lifeChipTotal = document.getElementById("life-chip-total");
const currentStreakLabel = document.getElementById("current-streak");
const pendingChipsLabel = document.getElementById("pending-chips");
const statusBanner = document.getElementById("status-banner");
const startButton = document.getElementById("start-run");
const stopButton = document.getElementById("stop-run");
const depositButton = document.getElementById("deposit-chips");
const puzzleStage = document.getElementById("puzzle-stage");
const puzzleInstructions = document.getElementById("puzzle-instructions");
const eventList = document.getElementById("event-list");
const tableButtons = Array.from(document.querySelectorAll(".table-button"));

let runActive = false;
let timerId = null;
let timeSand = STARTING_TIME;
let lifeChips = 0;
let pendingChips = 0;
let streak = 1;
let activeCleanup = null;

startButton.addEventListener("click", () => {
  if (runActive) {
    return;
  }
  beginRun();
});

stopButton.addEventListener("click", () => {
  if (!runActive) {
    return;
  }
  endRun("Run aborted. The house resets the deck.", "warning");
});

depositButton.addEventListener("click", () => {
  if (!runActive || pendingChips === 0) {
    return;
  }
  depositChips();
});

tableButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!runActive) {
      updateStatus("Start a run to unlock the tables.", "warning");
      return;
    }
    launchTable(button.dataset.table);
  });
});

function beginRun() {
  runActive = true;
  timeSand = STARTING_TIME;
  lifeChips = 0;
  pendingChips = 0;
  streak = 1;
  updateTime();
  updateChipDisplays();
  updateStatus("Run started. Keep the hourglass breathing.", "success");
  puzzleInstructions.textContent = "Pick a table to cue up its betting puzzle.";
  puzzleStage.innerHTML = "";
  eventList.innerHTML = "";
  tableButtons.forEach((button) => {
    button.disabled = false;
  });
  startButton.disabled = true;
  stopButton.disabled = false;
  depositButton.disabled = true;
  if (timerId) {
    window.clearInterval(timerId);
  }
  timerId = window.setInterval(() => {
    tick();
  }, 1000);
}

function endRun(message, tone) {
  runActive = false;
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  tableButtons.forEach((button) => {
    button.disabled = true;
  });
  stopButton.disabled = true;
  startButton.disabled = false;
  depositButton.disabled = pendingChips === 0;
  setActivePuzzle(null);
  updateStatus(message, tone);
  logEvent(message);
}

function tick() {
  if (!runActive) {
    return;
  }
  timeSand = Math.max(0, timeSand - 1);
  updateTime();
  if (timeSand === 0) {
    endRun("The Time-Sand ran dry. Charlie snaps back upstairs.", "danger");
  }
}

function updateTime() {
  timeLabel.textContent = `${timeSand}s`;
  timeBar.setAttribute("aria-valuenow", String(timeSand));
  const pct = (timeSand / MAX_TIME) * 100;
  timeFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function updateChipDisplays() {
  lifeChipTotal.textContent = String(lifeChips);
  currentStreakLabel.textContent = String(streak);
  pendingChipsLabel.textContent = String(pendingChips);
  depositButton.disabled = !runActive || pendingChips === 0;
}

function updateStatus(message, tone = "neutral") {
  statusBanner.textContent = message;
  statusBanner.classList.remove("is-success", "is-warning", "is-danger");
  if (tone === "success") {
    statusBanner.classList.add("is-success");
  } else if (tone === "warning") {
    statusBanner.classList.add("is-warning");
  } else if (tone === "danger") {
    statusBanner.classList.add("is-danger");
  }
}

function depositChips() {
  if (pendingChips === 0) {
    return;
  }
  const restored = pendingChips * CHIP_TIME_VALUE;
  timeSand = Math.min(MAX_TIME, timeSand + restored);
  lifeChips += pendingChips;
  highScore.submit(lifeChips);
  logEvent(`Deposited ${pendingChips} Life Chip${pendingChips === 1 ? "" : "s"}. Restored ${restored} seconds.`);
  pendingChips = 0;
  updateTime();
  updateChipDisplays();
  updateStatus("Clock topped off. Line up the next wager.", "success");
}

function launchTable(tableId) {
  switch (tableId) {
    case "halo-cups":
      runHaloCups();
      break;
    case "lucky-sum":
      runLuckySum();
      break;
    case "seraph-sequence":
      runSeraphSequence();
      break;
    default:
      break;
  }
}

function runHaloCups() {
  setActivePuzzle(() => {});
  puzzleStage.innerHTML = "";
  const intro = document.createElement("p");
  intro.textContent = "Watch the cups glow. When they dim, pick the one hiding the chip.";
  puzzleStage.append(intro);
  updateStatus("Halos primed. Eyes on the glow.");

  const cupGrid = document.createElement("div");
  cupGrid.className = "cup-grid";
  puzzleStage.append(cupGrid);

  const cups = ["A", "B", "C"];
  const correctIndex = Math.floor(Math.random() * cups.length);
  const timeouts = [];

  cups.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cup-button";
    button.disabled = true;
    button.innerHTML = `<span>${label}</span>`;
    if (index === correctIndex) {
      button.classList.add("is-highlighted");
    }
    cupGrid.append(button);
    button.addEventListener("click", () => {
      if (!runActive) {
        return;
      }
      const success = index === correctIndex;
      finishPuzzle(success, {
        table: "Halo Cups",
        penalty: success ? 0 : 1,
        message: success ? "Halo Cups hit!" : "Missed the halo.",
      });
    });
  });

  timeouts.push(
    window.setTimeout(() => {
      cupGrid.querySelectorAll(".cup-button").forEach((element) => {
        element.classList.remove("is-highlighted");
        element.disabled = false;
      });
      updateStatus("Cups set. Pick the hiding spot.");
    }, 1300)
  );

  setActivePuzzle(() => {
    timeouts.forEach((id) => window.clearTimeout(id));
    cupGrid.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  });
}

function runLuckySum() {
  setActivePuzzle(() => {});
  puzzleStage.innerHTML = "";
  const target = Math.floor(Math.random() * 6) + 6;
  const numbers = generateLuckyNumbers(target);
  const intro = document.createElement("p");
  intro.textContent = `Select the two dice that add to ${target}.`;
  puzzleStage.append(intro);
  updateStatus(`Lucky Sum is calling ${target}. Tag the pair.`);

  const grid = document.createElement("div");
  grid.className = "lucky-grid";
  puzzleStage.append(grid);

  let firstPick = null;
  const correctPair = numbers.solution;

  numbers.values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "die-button";
    button.textContent = String(value);
    button.disabled = false;
    grid.append(button);

    button.addEventListener("click", () => {
      if (!runActive || button.disabled) {
        return;
      }
      if (firstPick === null) {
        firstPick = index;
        button.classList.add("is-selected");
      } else if (firstPick === index) {
        firstPick = null;
        button.classList.remove("is-selected");
      } else {
        const success =
          (firstPick === correctPair[0] && index === correctPair[1]) ||
          (firstPick === correctPair[1] && index === correctPair[0]);
        grid.querySelectorAll("button").forEach((die) => {
          die.disabled = true;
        });
        finishPuzzle(success, {
          table: "Lucky Sum",
          penalty: success ? 0 : 2,
          message: success ? `Lucky Sum cleared for ${target}.` : "Bust on the felt.",
        });
      }
    });
  });

  setActivePuzzle(() => {
    grid.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  });
}

function generateLuckyNumbers(target) {
  const dice = [];
  let firstValue = Math.floor(Math.random() * 5) + 2;
  let secondValue = target - firstValue;
  if (secondValue < 1 || secondValue > 9) {
    secondValue = Math.max(1, Math.min(9, target - 3));
    firstValue = target - secondValue;
  }
  dice.push({ value: firstValue, key: "solution-0" });
  dice.push({ value: secondValue, key: "solution-1" });
  while (dice.length < 4) {
    dice.push({ value: Math.floor(Math.random() * 9) + 1, key: `filler-${dice.length}` });
  }
  dice.sort(() => Math.random() - 0.5);
  const values = dice.map((die) => die.value);
  const solution = dice.reduce((acc, die, index) => {
    if (die.key.startsWith("solution")) {
      acc.push(index);
    }
    return acc;
  }, []);
  return {
    values,
    solution,
  };
}

function runSeraphSequence() {
  setActivePuzzle(() => {});
  puzzleStage.innerHTML = "";
  applyTimeCost(HIGH_STAKES_PENALTY);

  const intro = document.createElement("p");
  intro.textContent = "Memorize the suit order. When the glow fades, replay it exactly.";
  puzzleStage.append(intro);
  updateStatus("Seraph Sequence is flashing. Burn the pattern into memory.");

  const symbols = ["♠", "♡", "♢", "♣"];
  const length = 5;
  const sequence = Array.from({ length }, () => symbols[Math.floor(Math.random() * symbols.length)]);

  const display = document.createElement("div");
  display.className = "sequence-display";
  sequence.forEach((symbol) => {
    const span = document.createElement("span");
    span.textContent = symbol;
    display.append(span);
  });
  puzzleStage.append(display);

  const progress = document.createElement("p");
  progress.className = "sequence-progress";
  progress.textContent = "Watch closely...";
  puzzleStage.append(progress);

  const controls = document.createElement("div");
  controls.className = "sequence-controls";
  puzzleStage.append(controls);

  const buttons = symbols.map((symbol) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sequence-button";
    button.textContent = symbol;
    button.disabled = true;
    controls.append(button);
    return button;
  });

  let revealTimeout = null;
  let allowInput = false;
  let pointer = 0;

  const beginInput = () => {
    display.querySelectorAll("span").forEach((span) => {
      span.textContent = "?";
    });
    buttons.forEach((button) => {
      button.disabled = false;
    });
    allowInput = true;
    progress.textContent = "Replay the sequence.";
  };

  revealTimeout = window.setTimeout(beginInput, 3000);

  const handleInput = (symbol) => {
    if (!allowInput) {
      return;
    }
    const span = display.children[pointer];
    span.textContent = symbol;
    if (sequence[pointer] === symbol) {
      pointer += 1;
      if (pointer >= sequence.length) {
        buttons.forEach((button) => {
          button.disabled = true;
        });
        finishPuzzle(true, {
          table: "Seraph Sequence",
          chips: streak + 2,
          message: "Seraph Sequence slammed a jackpot!",
        });
      }
    } else {
      buttons.forEach((button) => {
        button.disabled = true;
      });
      finishPuzzle(false, {
        table: "Seraph Sequence",
        penalty: 3,
        message: "Sequence collapsed. The house cackles.",
      });
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      handleInput(button.textContent ?? "");
    });
  });

  setActivePuzzle(() => {
    if (revealTimeout) {
      window.clearTimeout(revealTimeout);
    }
    buttons.forEach((button) => {
      button.disabled = true;
    });
  });
}

function applyTimeCost(amount) {
  if (!runActive || amount <= 0) {
    return;
  }
  timeSand = Math.max(0, timeSand - amount);
  updateTime();
  logEvent(`High-stakes wager burned ${amount} seconds.`);
  if (timeSand === 0) {
    endRun("The Time-Sand ran dry. Charlie snaps back upstairs.", "danger");
  }
}

function finishPuzzle(success, { table, penalty = 0, chips, message }) {
  if (!runActive) {
    return;
  }
  if (success) {
    const payout = typeof chips === "number" ? chips : streak;
    pendingChips += payout;
    streak += 1;
    updateChipDisplays();
    logEvent(`${table} paid out ${payout} Life Chip${payout === 1 ? "" : "s"}. Streak is ${streak - 1}.`);
    updateStatus(message ?? "Puzzle cleared. Drop those chips soon!", "success");
  } else {
    streak = 1;
    updateChipDisplays();
    if (penalty > 0) {
      timeSand = Math.max(0, timeSand - penalty);
      updateTime();
      logEvent(`${table} bust cost ${penalty} seconds.`);
    } else {
      logEvent(`${table} bust.`);
    }
    updateStatus(message ?? "Bust. The streak resets.", penalty > 0 ? "danger" : "warning");
    if (timeSand === 0) {
      endRun("The Time-Sand ran dry. Charlie snaps back upstairs.", "danger");
    }
  }
  depositButton.disabled = !runActive || pendingChips === 0;
  setActivePuzzle(() => {});
}

function setActivePuzzle(cleanup) {
  if (activeCleanup) {
    activeCleanup();
  }
  activeCleanup = cleanup;
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = message;
  eventList.prepend(item);
  while (eventList.children.length > LOG_LIMIT) {
    eventList.removeChild(eventList.lastElementChild);
  }
}
