// Leonida Legend: offline GTA 6 trophy guide and tracker.
// Loads app/data/trophies.json (the official 55-trophy list with our own
// guides), renders the checklist, roadmap and missable pages, and saves
// progress in this browser only (localStorage). No network at run time.

const DATA_URL = "data/trophies.json";
const STORAGE_KEY = "leonida-legend-progress-v1";

const KIND_LABELS = {
  all: "All trophies",
  story: "Story",
  missable: "Missable",
  collectibles: "Collectibles",
  activities: "Activities",
  side: "Side missions",
  combat: "Combat & heists",
  world: "World & money",
  completion: "100% completion",
  platinum: "Platinum",
  online: "Online",
};
const KIND_ORDER = ["all", "story", "missable", "collectibles", "activities", "side", "combat", "world", "completion", "online"];

const state = {
  trophies: [],
  roadmap: [],
  sources: {},
  earned: new Set(),
  counts: {},
  selectedId: null,
  filters: { kind: "all", grade: "all", status: "all", search: "", spoiler: false },
};

const $ = (id) => document.getElementById(id);

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.earned = new Set(Array.isArray(saved.earned) ? saved.earned : []);
    state.counts = saved.counts && typeof saved.counts === "object" ? saved.counts : {};
    if (typeof saved.spoiler === "boolean") state.filters.spoiler = saved.spoiler;
  } catch (err) {
    state.earned = new Set();
    state.counts = {};
  }
}

function saveProgress() {
  const payload = {
    app: "leonida-legend",
    version: 1,
    earned: [...state.earned].sort((a, b) => a - b),
    counts: state.counts,
    spoiler: state.filters.spoiler,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function loadTrophyData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("Could not load " + DATA_URL);
  const data = await response.json();
  state.trophies = data.trophies;
  state.roadmap = data.roadmap || [];
  state.sources = data.sources || {};
}

function trophyById(id) {
  return state.trophies.find((t) => t.id === id);
}

function isEarned(trophy) {
  return state.earned.has(trophy.id);
}

function isHiddenBySpoiler(trophy) {
  return state.filters.spoiler && trophy.kind === "story" && !isEarned(trophy);
}

function visibleName(trophy) {
  return isHiddenBySpoiler(trophy) ? "Hidden story trophy" : trophy.name;
}

function visibleDescription(trophy) {
  return isHiddenBySpoiler(trophy)
    ? "Hidden until earned. Turn the spoiler setting off, or earn this trophy, to see its name and description."
    : trophy.description;
}

function matchesFilters(trophy) {
  const f = state.filters;
  if (f.kind === "missable" && !trophy.missable) return false;
  if (f.kind === "online") return false;
  if (f.kind !== "all" && f.kind !== "missable" && trophy.kind !== f.kind) return false;
  if (f.grade !== "all" && trophy.grade !== f.grade) return false;
  if (f.status === "earned" && !isEarned(trophy)) return false;
  if (f.status === "todo" && isEarned(trophy)) return false;
  if (f.search) {
    const needle = f.search.toLowerCase();
    const hay = (trophy.name + " " + trophy.description + " " + trophy.guide).toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

function renderKindChips() {
  const row = $("kindChips");
  row.textContent = "";
  for (const kind of KIND_ORDER) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (state.filters.kind === kind ? " active" : "");
    button.textContent = KIND_LABELS[kind];
    button.setAttribute("aria-pressed", String(state.filters.kind === kind));
    button.addEventListener("click", () => {
      state.filters.kind = kind;
      renderAll();
    });
    row.appendChild(button);
  }
}

function gradeMedal(trophy) {
  const span = document.createElement("span");
  span.className = "medal " + trophy.grade;
  span.textContent = trophy.grade;
  return span;
}

function kindTag(trophy) {
  const span = document.createElement("span");
  span.className = "tag";
  span.textContent = KIND_LABELS[trophy.kind] || trophy.kind;
  return span;
}

function renderCounter(trophy, parent) {
  if (!trophy.target) return;
  const wrap = document.createElement("div");
  wrap.className = "counter";
  const minus = document.createElement("button");
  minus.type = "button";
  minus.textContent = "−";
  minus.setAttribute("aria-label", "Decrease count for " + trophy.name);
  const value = document.createElement("strong");
  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.setAttribute("aria-label", "Increase count for " + trophy.name);
  const note = document.createElement("span");
  note.textContent = (trophy.targetNote || "PSN tracks the count.") + " ";
  const refresh = () => {
    const current = state.counts[trophy.id] || 0;
    value.textContent = current + " / " + trophy.target;
  };
  minus.addEventListener("click", (event) => {
    event.stopPropagation();
    state.counts[trophy.id] = Math.max(0, (state.counts[trophy.id] || 0) - 1);
    if (state.counts[trophy.id] === 0) delete state.counts[trophy.id];
    saveProgress();
    refresh();
    updateProgress();
  });
  plus.addEventListener("click", (event) => {
    event.stopPropagation();
    const next = Math.min(trophy.target, (state.counts[trophy.id] || 0) + 1);
    state.counts[trophy.id] = next;
    if (next >= trophy.target) state.earned.add(trophy.id);
    saveProgress();
    refresh();
    updateProgress();
    renderDetail();
  });
  wrap.append(note, minus, value, plus);
  refresh();
  parent.appendChild(wrap);
}

function renderTrophyList() {
  const list = $("trophyList");
  list.textContent = "";
  const shown = state.trophies.filter(matchesFilters);
  for (const trophy of shown) {
    const item = document.createElement("li");
    item.className = "trophy" + (isEarned(trophy) ? " earned" : "") + (state.selectedId === trophy.id ? " selected" : "");
    item.dataset.id = String(trophy.id);

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "trophy-check";
    check.checked = isEarned(trophy);
    check.setAttribute("aria-label", "Mark " + trophy.name + " as earned");
    check.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleEarned(trophy);
    });

    const body = document.createElement("div");
    body.className = "trophy-body";
    const top = document.createElement("div");
    top.className = "trophy-top";
    const name = document.createElement("h3");
    name.className = "trophy-name";
    name.textContent = visibleName(trophy);
    top.append(name, gradeMedal(trophy));
    const desc = document.createElement("p");
    desc.className = "trophy-desc";
    desc.textContent = visibleDescription(trophy);
    const meta = document.createElement("div");
    meta.className = "trophy-meta";
    meta.appendChild(kindTag(trophy));
    if (trophy.missable) {
      const flag = document.createElement("span");
      flag.className = "tag missable";
      flag.textContent = "Missable";
      meta.appendChild(flag);
    }
    if (isHiddenBySpoiler(trophy)) {
      const hidden = document.createElement("span");
      hidden.className = "tag hidden-name";
      hidden.textContent = "Spoiler hidden";
      meta.appendChild(hidden);
    }
    body.append(top, desc, meta);
    renderCounter(trophy, body);

    item.append(check, body);
    item.addEventListener("click", () => {
      state.selectedId = trophy.id;
      renderTrophyList();
      renderDetail();
    });
    list.appendChild(item);
  }
  $("emptyMsg").hidden = shown.length > 0;
  const earned = state.trophies.filter(isEarned).length;
  $("resultCount").textContent =
    shown.length + " of 55 trophies shown · " + earned + " earned" +
    (state.filters.kind === "online" ? " · the official list has no online trophies" : "");
}

function toggleEarned(trophy) {
  if (isEarned(trophy)) state.earned.delete(trophy.id);
  else state.earned.add(trophy.id);
  saveProgress();
  renderTrophyList();
  updateProgress();
  renderDetail();
  renderRoadmap();
  renderMissable();
}

function sourceLine(key) {
  const source = state.sources[key];
  if (!source) return null;
  const item = document.createElement("li");
  const label = document.createElement("strong");
  label.textContent = source.label + ": ";
  item.appendChild(label);
  item.appendChild(document.createTextNode(source.detail));
  if (source.url) {
    item.appendChild(document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = source.url;
    link.textContent = source.url;
    link.rel = "noopener";
    item.appendChild(link);
  }
  return item;
}

function renderDetail() {
  const pane = $("detailPane");
  pane.textContent = "";
  const trophy = state.selectedId ? trophyById(state.selectedId) : null;
  if (!trophy) {
    const empty = document.createElement("p");
    empty.className = "detail-empty";
    empty.textContent = "Select a trophy to read its guide, sources and missable notes.";
    pane.appendChild(empty);
    return;
  }
  const title = document.createElement("h2");
  title.textContent = visibleName(trophy);
  const official = document.createElement("p");
  official.className = "official";
  official.textContent = "Official: “" + visibleDescription(trophy) + "”";
  pane.append(title, official);
  const meta = document.createElement("div");
  meta.className = "trophy-meta";
  meta.append(gradeMedal(trophy), kindTag(trophy));
  if (trophy.missable) {
    const flag = document.createElement("span");
    flag.className = "tag missable";
    flag.textContent = "Missable";
    meta.appendChild(flag);
  }
  pane.appendChild(meta);

  const guideHeading = document.createElement("h3");
  guideHeading.textContent = "Guide";
  const guide = document.createElement("p");
  guide.className = "guide-text";
  guide.textContent = isHiddenBySpoiler(trophy)
    ? "This story trophy is hidden by the spoiler setting. Earn it, or turn the setting off, to read its guide."
    : trophy.guide;
  pane.append(guideHeading, guide);

  if (trophy.target) {
    const countHeading = document.createElement("h3");
    countHeading.textContent = "Progress";
    const countText = document.createElement("p");
    countText.textContent = (state.counts[trophy.id] || 0) + " of " + trophy.target + " — " + (trophy.targetNote || "");
    pane.append(countHeading, countText);
  }

  if (trophy.missable && trophy.missableNote) {
    const noteHeading = document.createElement("h3");
    noteHeading.textContent = "Why it is missable";
    const note = document.createElement("p");
    note.className = "missable-note";
    const strong = document.createElement("strong");
    strong.textContent = "Missable. ";
    note.append(strong, document.createTextNode(trophy.missableNote));
    pane.append(noteHeading, note);
  }

  const sourcesHeading = document.createElement("h3");
  sourcesHeading.textContent = "Sources";
  const sourceList = document.createElement("ul");
  sourceList.className = "source-list";
  for (const key of trophy.sources || []) {
    const line = sourceLine(key);
    if (line) sourceList.appendChild(line);
  }
  pane.append(sourcesHeading, sourceList);

  const stateBox = document.createElement("div");
  stateBox.className = "earned-state";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = isEarned(trophy) ? "✓ Earned — click to unmark" : "Mark as earned";
  if (isEarned(trophy)) button.className = "earned";
  button.addEventListener("click", () => toggleEarned(trophy));
  stateBox.appendChild(button);
  pane.appendChild(stateBox);
}

function renderRoadmap() {
  const list = $("roadmapList");
  list.textContent = "";
  for (const stage of state.roadmap) {
    const item = document.createElement("li");
    item.className = "stage";
    const num = document.createElement("div");
    num.className = "stage-num";
    num.textContent = String(stage.stage);
    const body = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "Stage " + stage.stage + ": " + stage.title;
    const text = document.createElement("p");
    text.textContent = stage.text;
    const chips = document.createElement("div");
    chips.className = "stage-trophies";
    const stageTrophies = state.trophies.filter((t) => t.stage === stage.stage);
    for (const trophy of stageTrophies) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = trophy.name + " (" + trophy.grade + ")";
      if (isEarned(trophy)) chip.className = "done";
      chip.addEventListener("click", () => {
        state.selectedId = trophy.id;
        state.filters.kind = "all";
        state.filters.search = "";
        $("searchInput").value = "";
        renderAll();
        document.getElementById("checklist").scrollIntoView({ behavior: "smooth" });
      });
      chips.appendChild(chip);
    }
    body.append(heading, text, chips);
    item.append(num, body);
    list.appendChild(item);
  }
}

function renderMissable() {
  const grid = $("missableList");
  grid.textContent = "";
  const flagged = state.trophies.filter((t) => t.missable);
  for (const trophy of flagged) {
    const card = document.createElement("article");
    card.className = "missable-card";
    const title = document.createElement("h3");
    title.textContent = trophy.name;
    const why = document.createElement("p");
    why.className = "why";
    why.textContent = trophy.missableNote || "A one-off moment.";
    const desc = document.createElement("p");
    desc.textContent = trophy.description;
    const stateLine = document.createElement("p");
    stateLine.className = "missable-state" + (isEarned(trophy) ? " done" : "");
    stateLine.textContent = isEarned(trophy) ? "✓ Earned" : "Not earned yet — do it in stage " + trophy.stage;
    card.append(title, why, desc, stateLine);
    card.addEventListener("click", () => {
      state.selectedId = trophy.id;
      renderAll();
      document.getElementById("checklist").scrollIntoView({ behavior: "smooth" });
    });
    grid.appendChild(card);
  }
}

function updateProgress() {
  const earned = state.trophies.filter(isEarned).length;
  $("earnedCount").textContent = String(earned);
  const fill = $("progressFill");
  fill.style.width = (earned / 55) * 100 + "%";
  const bar = $("progressBar");
  bar.setAttribute("aria-valuenow", String(earned));
  const byGrade = {};
  for (const trophy of state.trophies) {
    if (isEarned(trophy)) byGrade[trophy.grade] = (byGrade[trophy.grade] || 0) + 1;
  }
  $("progressSub").textContent =
    "Platinum " + (byGrade.platinum || 0) + "/1 · Gold " + (byGrade.gold || 0) + "/2 · Silver " +
    (byGrade.silver || 0) + "/6 · Bronze " + (byGrade.bronze || 0) + "/46";
}

function exportProgress() {
  const payload = {
    app: "leonida-legend",
    version: 1,
    exportedAt: new Date().toISOString().slice(0, 10),
    earned: [...state.earned].sort((a, b) => a - b),
    counts: state.counts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leonida-legend-progress.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const saved = JSON.parse(String(reader.result));
      if (!saved || !Array.isArray(saved.earned)) throw new Error("bad file");
      state.earned = new Set(saved.earned.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55));
      state.counts = saved.counts && typeof saved.counts === "object" ? saved.counts : {};
      saveProgress();
      renderAll();
    } catch (err) {
      window.alert("That file is not a Leonida Legend progress export.");
    }
  };
  reader.readAsText(file);
}

function renderAll() {
  renderKindChips();
  renderTrophyList();
  renderDetail();
  renderRoadmap();
  renderMissable();
  updateProgress();
}

function bindControls() {
  $("searchInput").addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    renderTrophyList();
  });
  $("gradeFilter").addEventListener("change", (event) => {
    state.filters.grade = event.target.value;
    renderTrophyList();
  });
  $("statusFilter").addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderTrophyList();
  });
  $("spoilerToggle").addEventListener("change", (event) => {
    state.filters.spoiler = event.target.checked;
    saveProgress();
    renderTrophyList();
    renderDetail();
  });
  $("exportBtn").addEventListener("click", exportProgress);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = "";
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("Clear all earned trophies and counters?")) return;
    state.earned = new Set();
    state.counts = {};
    saveProgress();
    renderAll();
  });
}

async function boot() {
  loadProgress();
  $("spoilerToggle").checked = state.filters.spoiler;
  bindControls();
  try {
    await loadTrophyData();
  } catch (err) {
    $("trophyList").innerHTML = "<li class=\"empty\">Could not load the trophy list. Check that data/trophies.json is beside this page.</li>";
    return;
  }
  renderAll();
}

boot();
