import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f472b6", "#facc15", "#fb7185"],
    ambientDensity: 0.5,
  },
});

const scoreConfig = getScoreConfig("captains-echo");
const highScore = initHighScoreBanner({
  gameId: "captains-echo",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const students = [
  {
    id: "neil",
    name: "Neil Perry",
    short: "Neil",
    base: 4,
    statline: "+4 base · +2 if he opens",
    description: "Ignites the salute when he opens the first beat. If someone else starts, the spark dims.",
  },
  {
    id: "pitts",
    name: "Pitts",
    short: "Pitts",
    base: 1,
    statline: "+1 base · +2 in slot 2",
    description: "Steadies the crowd when he slots second. Needs Meeks right after him to stay brave.",
  },
  {
    id: "meeks",
    name: "Meeks",
    short: "Meeks",
    base: 2,
    statline: "+2 base · +3 in slot 3",
    description: "Runs the projector and keeps the cadence locked, especially when he lands on beat three.",
  },
  {
    id: "todd",
    name: "Todd Anderson",
    short: "Todd",
    base: 2,
    statline: "+2 base · +3 if after Neil · +1 if he closes",
    description: "Won't rise until Neil cues him. Thrives as the closer; falters if he leaps too early.",
  },
  {
    id: "charlie",
    name: "Charlie Dalton",
    short: "Charlie",
    base: 3,
    statline: "+3 base · +3 if right before Todd",
    description: "Wild card with a sax solo. Primes Todd when he plays directly before the finale but sputters if forced to anchor.",
  },
  {
    id: "knox",
    name: "Knox Overstreet",
    short: "Knox",
    base: 2,
    statline: "+2 base · +3 if Charlie hands him the mic",
    description: "Romantic optimist who only speaks confidently if Charlie lines the moment up for him.",
  },
];

const REQUIRED_STUDENTS = ["neil", "todd", "meeks"];
const DISTRACTION_POOL = new Set(["charlie", "knox", "pitts"]);
const TARGET_SCORE = 21;
const METER_MAX = 24;

const timelineList = document.getElementById("timeline-list");
const rosterList = document.getElementById("roster-list");
const meter = document.getElementById("meter");
const meterFill = document.getElementById("meter-fill");
const meterValue = document.getElementById("meter-value");
const targetCallout = document.getElementById("target-callout");
const reportList = document.getElementById("report-list");
const eventLog = document.getElementById("event-log");
const runButton = document.getElementById("run-plan");
const resetButton = document.getElementById("reset-plan");
const loadButton = document.getElementById("load-example");

const studentMap = new Map(students.map((student) => [student.id, student]));
const plan = new Array(4).fill(null);
const slotButtons = [];
let activeSlotIndex = 0;
let evaluationCount = 0;

function renderTimeline() {
  for (let i = 0; i < plan.length; i += 1) {
    const slotItem = document.createElement("li");
    slotItem.className = "timeline-slot";

    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = `Beat ${i + 1}`;

    const actions = document.createElement("div");
    actions.className = "slot-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot-button";
    button.dataset.slotIndex = String(i);
    button.textContent = "Select a student";
    button.addEventListener("click", () => {
      setActiveSlot(i);
    });

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "clear-button";
    clearButton.dataset.slotIndex = String(i);
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", () => {
      clearSlot(i);
    });

    actions.append(button, clearButton);
    slotItem.append(label, actions);
    timelineList.append(slotItem);
    slotButtons.push(button);
  }

  setActiveSlot(0);
}

function renderRoster() {
  students.forEach((student) => {
    const card = document.createElement("li");
    card.className = "roster-card";
    card.dataset.studentId = student.id;

    const name = document.createElement("h4");
    name.textContent = student.name;

    const statline = document.createElement("p");
    statline.className = "statline";
    statline.textContent = student.statline;

    const description = document.createElement("p");
    description.textContent = student.description;

    const assignButton = document.createElement("button");
    assignButton.type = "button";
    assignButton.className = "assign-button";
    assignButton.textContent = "Assign to beat";
    assignButton.addEventListener("click", () => {
      if (activeSlotIndex == null) {
        setActiveSlot(0);
      }
      assignStudent(activeSlotIndex, student.id);
    });

    card.append(name, statline, description, assignButton);
    rosterList.append(card);
  });
}

function setActiveSlot(index) {
  activeSlotIndex = index;
  slotButtons.forEach((button, slot) => {
    if (slot === index) {
      button.classList.add("is-active");
      button.focus({ preventScroll: true });
    } else {
      button.classList.remove("is-active");
    }
  });
}

function assignStudent(slotIndex, studentId) {
  for (let i = 0; i < plan.length; i += 1) {
    if (i !== slotIndex && plan[i] === studentId) {
      plan[i] = null;
    }
  }
  plan[slotIndex] = studentId;
  setActiveSlot(slotIndex);
  updateInterface();
}

function clearSlot(slotIndex) {
  plan[slotIndex] = null;
  updateInterface();
}

function updateInterface() {
  const usedStudents = new Set(plan.filter(Boolean));
  plan.forEach((studentId, index) => {
    const button = slotButtons[index];
    if (!studentId) {
      button.textContent = "Select a student";
      button.classList.remove("is-filled");
      return;
    }
    const student = studentMap.get(studentId);
    button.textContent = `${student.name}`;
    button.classList.add("is-filled");
  });

  rosterList.querySelectorAll(".roster-card").forEach((card) => {
    const { studentId } = card.dataset;
    if (studentId && usedStudents.has(studentId)) {
      card.classList.add("is-used");
    } else {
      card.classList.remove("is-used");
    }
  });
}

function resetReport() {
  reportList.innerHTML = "";
}

function setMeter(score) {
  const bounded = Math.max(0, Math.min(METER_MAX, score));
  const percent = (bounded / METER_MAX) * 100;
  meterFill.style.width = `${percent}%`;
  meter.setAttribute("aria-valuenow", String(bounded));
  meterValue.textContent = `${Math.round(bounded)} / ${METER_MAX}`;
}

function renderIssues(issues) {
  resetReport();
  issues.forEach((issue) => {
    const item = document.createElement("li");
    item.className = "report-item negative";
    item.textContent = issue;
    reportList.append(item);
  });
}

function renderContributions(contributions) {
  resetReport();
  contributions.forEach((entry) => {
    const item = document.createElement("li");
    const classes = ["report-item"];
    if (entry.value > 0) {
      classes.push("positive");
    } else if (entry.value < 0) {
      classes.push("negative");
    }
    item.className = classes.join(" ");

    const label = document.createElement("span");
    label.textContent = entry.label;

    const value = document.createElement("span");
    value.textContent = entry.value > 0 ? `+${entry.value}` : String(entry.value);

    item.append(label, value);
    reportList.append(item);
  });
}

function logEvent(message) {
  evaluationCount += 1;
  const item = document.createElement("li");
  item.textContent = `Attempt ${evaluationCount}: ${message}`;
  eventLog.append(item);
  while (eventLog.children.length > 8) {
    eventLog.removeChild(eventLog.firstElementChild);
  }
}

function evaluatePlan() {
  const issues = [];
  const filled = plan.filter(Boolean);
  if (filled.length < plan.length) {
    issues.push("Assign four distinct students before running the recital.");
  }

  const duplicates = new Set();
  const seen = new Set();
  filled.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(studentMap.get(id).name);
    }
    seen.add(id);
  });
  if (duplicates.size > 0) {
    issues.push(`No double-stands: ${Array.from(duplicates).join(", ")} appeared twice.`);
  }

  REQUIRED_STUDENTS.forEach((requiredId) => {
    if (!filled.includes(requiredId)) {
      issues.push(`${studentMap.get(requiredId).name} is required for the salute.`);
    }
  });

  const hasDistractor = filled.some((id) => DISTRACTION_POOL.has(id));
  if (!hasDistractor) {
    issues.push("Bring at least one distractor (Charlie, Knox, or Pitts) to keep faculty eyes busy.");
  }

  const neilIndex = plan.indexOf("neil");
  const toddIndex = plan.indexOf("todd");
  if (toddIndex === 0) {
    issues.push("Todd can't lead the chant—he freezes on beat one.");
  }
  if (neilIndex !== -1 && toddIndex !== -1 && neilIndex > toddIndex) {
    issues.push("Neil must cue Todd before Todd stands.");
  }

  if (issues.length > 0) {
    targetCallout.textContent = issues[0];
    targetCallout.classList.remove("warning", "success");
    targetCallout.classList.add("warning");
    setMeter(0);
    renderIssues(issues);
    logEvent("Plan rejected—check the rumor board for issues.");
    return;
  }

  const contributions = [];
  let score = 0;
  const positions = new Map();
  plan.forEach((id, index) => {
    positions.set(id, index);
    const student = studentMap.get(id);
    contributions.push({ label: `${student.name} shows up`, value: student.base });
    score += student.base;
  });

  const add = (label, value) => {
    if (value === 0) {
      return;
    }
    contributions.push({ label, value });
    score += value;
  };

  if (positions.get("neil") === 0) {
    add("Neil lights the fuse from the front desk", 2);
  }

  if (positions.get("todd") > positions.get("neil")) {
    add("Todd draws courage from Neil's cue", 3);
  }
  if (positions.get("todd") === plan.length - 1) {
    add("Todd's closing vow", 1);
  }
  if (positions.get("todd") === 1) {
    add("Todd steps too soon and stumbles", -2);
  }

  if (positions.get("meeks") === 2) {
    add("Meeks keeps beat three humming", 3);
  }
  if (positions.get("meeks") === 1) {
    add("Meeks loses his notes without the projector delay", -1);
  }

  if (positions.has("pitts")) {
    const pittsPos = positions.get("pitts");
    if (pittsPos === 1) {
      add("Pitts steadies the second beat", 2);
    }
    if (pittsPos === plan.length - 1) {
      add("Pitts wilts when forced to close", -3);
    }
    if (positions.get("meeks") === 2 && pittsPos === 1) {
      add("Meeks catches the projector remote mid-beat", 3);
    }
  }

  if (positions.has("charlie")) {
    const charliePos = positions.get("charlie");
    if (charliePos === plan.length - 1) {
      add("Charlie is too impulsive to anchor", -2);
    }
    if (positions.get("todd") === charliePos + 1) {
      add("Charlie primes Todd with a sax riff", 3);
    }
  }

  if (positions.has("knox")) {
    const knoxPos = positions.get("knox");
    if (knoxPos === 0) {
      add("Knox panics when forced to open", -2);
    }
    if (positions.has("charlie") && knoxPos === positions.get("charlie") + 1) {
      add("Charlie hands Knox the mic", 3);
    }
  }

  renderContributions(contributions);
  setMeter(score);
  highScore.submit(score);

  targetCallout.classList.remove("warning", "success");
  if (score >= TARGET_SCORE) {
    targetCallout.textContent = `Success! Score ${score}—the hall erupts in applause.`;
    targetCallout.classList.add("success");
    logEvent(`Score ${score}. The salute holds.`);
    particleSystem.emitBurst(1.3);
  } else {
    const delta = TARGET_SCORE - score;
    targetCallout.textContent = `Score ${score}. Need ${delta} more to lock the salute.`;
    targetCallout.classList.add("warning");
    logEvent(`Score ${score}. Short by ${delta}.`);
  }
}

function resetPlan() {
  for (let i = 0; i < plan.length; i += 1) {
    plan[i] = null;
  }
  activeSlotIndex = 0;
  setActiveSlot(0);
  updateInterface();
  resetReport();
  setMeter(0);
  targetCallout.textContent = "Queue a full plan to begin.";
  targetCallout.classList.remove("warning", "success");
}

function loadFacultyPlan() {
  const sample = ["neil", "charlie", "meeks", "todd"];
  for (let i = 0; i < plan.length; i += 1) {
    plan[i] = sample[i] ?? null;
  }
  updateInterface();
  setActiveSlot(plan.length - 1);
  targetCallout.textContent = "Faculty-approved plan loaded. Run the recital to see why it falls short.";
  targetCallout.classList.remove("success");
  targetCallout.classList.add("warning");
  resetReport();
  setMeter(0);
}

renderTimeline();
renderRoster();
updateInterface();

runButton.addEventListener("click", evaluatePlan);
resetButton.addEventListener("click", () => {
  resetPlan();
  logEvent("Board cleared. Ready for a new attempt.");
});
loadButton.addEventListener("click", loadFacultyPlan);
