/**
 * Self-Evolve v2.0 Dashboard SPA
 * Tab routing, WebSocket streaming, Chart.js multi-graph analytics,
 * real-time trace visualizer, semantic memory search, and meta-learner.
 */

const API = "";
let currentMode = "single";
let ws = null;
let charts = {};
let cachedStats = {};
let cachedLessons = [];

// ---------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------
const elements = {
  // Navigation
  navItems: document.querySelectorAll(".nav-item"),
  tabContents: document.querySelectorAll(".tab-content"),
  pageTitle: document.getElementById("pageTitle"),
  refreshBtn: document.getElementById("refreshBtn"),
  
  // Header / Status
  providerLabel: document.getElementById("providerLabel"),
  providerBadge: document.getElementById("providerBadge"),
  wsDot: document.getElementById("wsDot"),
  wsLabel: document.getElementById("wsLabel"),

  // Dashboard stats
  statRunsVal: document.getElementById("statRunsVal"),
  statLessonsVal: document.getElementById("statLessonsVal"),
  statSuccessVal: document.getElementById("statSuccessVal"),
  statProviderVal: document.getElementById("statProviderVal"),
  liveFeed: document.getElementById("liveFeed"),

  // Run controls
  taskType: document.getElementById("taskType"),
  modeSingle: document.getElementById("modeSingle"),
  modeMulti: document.getElementById("modeMulti"),
  maxIter: document.getElementById("maxIter"),
  iterHint: document.getElementById("iterHint"),
  runBtn: document.getElementById("runBtn"),
  resetBtn: document.getElementById("resetBtn"),

  // Pipeline
  agentModeBadge: document.getElementById("agentModeBadge"),
  pipelineSingle: document.getElementById("pipelineSingle"),
  pipelineMulti: document.getElementById("pipelineMulti"),
  traceStatus: document.getElementById("traceStatus"),
  traceContainer: document.getElementById("traceContainer"),

  // Memory Lab
  memSearchInput: document.getElementById("memSearchInput"),
  searchMode: document.getElementById("searchMode"),
  memoryGrid: document.getElementById("memoryGrid"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  pruneBtn: document.getElementById("pruneBtn"),

  // Meta Analysis
  metaPanel: document.getElementById("metaPanel"),
  metaRefreshBtn: document.getElementById("metaRefreshBtn"),

  // Settings
  settingsProvider: document.getElementById("settingsProvider"),
  settingsVector: document.getElementById("settingsVector"),
  settingsTaskCount: document.getElementById("settingsTaskCount"),
  settingsWsCount: document.getElementById("settingsWsCount"),
  settingsResetBtn: document.getElementById("settingsResetBtn"),

  // Toasts
  toastContainer: document.getElementById("toastContainer"),
};

// ---------------------------------------------------------------------------
// Toast Notifications
// ---------------------------------------------------------------------------
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------------------------------------------------------------------------
// WebSocket Connection
// ---------------------------------------------------------------------------
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      elements.wsDot.classList.add("connected");
      elements.wsLabel.textContent = "Live Feed Active";
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWsEvent(payload);
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onclose = () => {
      elements.wsDot.classList.remove("connected");
      elements.wsLabel.textContent = "Offline (Reconnecting...)";
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = () => {
      elements.wsDot.classList.remove("connected");
    };
  } catch (e) {
    console.warn("WebSocket initialization skipped", e);
  }
}

function handleWsEvent(msg) {
  const { type, data } = msg;

  if (type === "connected") {
    elements.settingsWsCount.textContent = "1 (Current)";
    return;
  }

  appendLiveFeed(type, data);

  // Update pipeline visualizer nodes
  if (type === "agent_start") {
    resetPipelineNodes();
    setPipelineNodeState("pn-retrieve", "active");
    setPipelineNodeState("pm-memory", "active");
  } else if (type === "lessons_retrieved") {
    setPipelineNodeState("pn-retrieve", "done");
    setPipelineNodeState("pn-attempt", "active");
    setPipelineNodeState("pm-memory", "done");
    setPipelineNodeState("pm-solver", "active");
  } else if (type === "attempt_complete") {
    setPipelineNodeState("pn-attempt", "done");
    setPipelineNodeState("pn-critique", "active");
    setPipelineNodeState("pm-solver", "done");
    setPipelineNodeState("pm-critic", "active");
  } else if (type === "critique_ready") {
    setPipelineNodeState("pn-critique", "done");
    if (!data.is_correct) {
      setPipelineNodeState("pn-reflect", "active");
      setPipelineNodeState("pm-critic", "done");
      setPipelineNodeState("pm-store", "active");
    }
  } else if (type === "lesson_stored") {
    setPipelineNodeState("pn-reflect", "done");
    setPipelineNodeState("pm-store", "done");
    loadMemory();
  } else if (type === "run_complete") {
    refreshAll();
  } else if (type === "memory_reset") {
    refreshAll();
    showToast("Memory reset across all sessions", "info");
  }
}

function appendLiveFeed(type, data) {
  if (!elements.liveFeed) return;
  const item = document.createElement("div");
  item.className = "feed-item";

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  let content = "";

  switch (type) {
    case "agent_start":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Started run on <code>${data.task_type}</code> (${data.agent_mode} mode)`;
      break;
    case "solver_thinking":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Solver Agent is computing solution…`;
      break;
    case "attempt_complete":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Attempted answer: <code>${data.answer}</code> (confidence: ${(data.confidence * 100).toFixed(0)}%)`;
      break;
    case "critique_ready":
      item.classList.add(data.is_correct ? "success" : "fail");
      content = `<strong>${time}</strong> Self-critique: ${data.is_correct ? "✓ Validated correct" : "✗ Incorrect answer"}`;
      break;
    case "lesson_stored":
      item.classList.add("memory");
      content = `<strong>${time}</strong> Memory stored new lesson: "${data.lesson}"`;
      break;
    case "run_complete":
      item.classList.add(data.success ? "success" : "fail");
      content = `<strong>${time}</strong> Run finished — ${data.success ? "SOLVED" : "FAILED"} in ${data.iterations} iteration(s)`;
      break;
    default:
      content = `<strong>${time}</strong> Event: ${type}`;
  }

  item.innerHTML = content;
  elements.liveFeed.insertBefore(item, elements.liveFeed.firstChild);

  while (elements.liveFeed.children.length > 15) {
    elements.liveFeed.removeChild(elements.liveFeed.lastChild);
  }
}

// ---------------------------------------------------------------------------
// Pipeline Visualizer
// ---------------------------------------------------------------------------
function resetPipelineNodes() {
  document.querySelectorAll(".pipe-node").forEach(node => {
    node.className = "pipe-node";
  });
}

function setPipelineNodeState(id, state) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("active", "done");
    if (state) el.classList.add(state);
  }
}

// ---------------------------------------------------------------------------
// TAB ROUTING & SWITCHING (FIXED & GUARANTEED)
// ---------------------------------------------------------------------------
function switchTab(tabId) {
  // Update sidebar buttons
  elements.navItems.forEach((btn) => {
    const btnTab = btn.getAttribute("data-tab");
    if (btnTab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Switch visible tab panel
  elements.tabContents.forEach((tab) => {
    if (tab.id === `tab-${tabId}`) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update topbar title
  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeBtn) {
    elements.pageTitle.textContent = activeBtn.innerText.trim();
  }

  // Handle specific tab actions & chart resizing
  if (tabId === "analytics") {
    loadStats();
    loadMeta();
  } else if (tabId === "memory") {
    loadMemory();
  } else if (tabId === "dashboard") {
    loadStats();
  }

  // Force Chart.js to recalculate dimensions
  setTimeout(() => {
    Object.values(charts).forEach((c) => {
      if (c && typeof c.resize === "function") {
        c.resize();
      }
    });
  }, 100);
}

elements.navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");
    switchTab(target);
  });
});

// Mode switch buttons
elements.modeSingle.addEventListener("click", () => {
  currentMode = "single";
  elements.modeSingle.classList.add("active");
  elements.modeMulti.classList.remove("active");
  elements.agentModeBadge.textContent = "single";
  elements.pipelineSingle.classList.remove("hidden");
  elements.pipelineMulti.classList.add("hidden");
});

elements.modeMulti.addEventListener("click", () => {
  currentMode = "multi";
  elements.modeMulti.classList.add("active");
  elements.modeSingle.classList.remove("active");
  elements.agentModeBadge.textContent = "multi-agent";
  elements.pipelineSingle.classList.add("hidden");
  elements.pipelineMulti.classList.remove("hidden");
});

elements.maxIter.addEventListener("input", (e) => {
  elements.iterHint.textContent = e.target.value;
});

// ---------------------------------------------------------------------------
// API Calls & Data Loading
// ---------------------------------------------------------------------------
async function loadHealth() {
  try {
    const res = await fetch(`${API}/api/health`);
    const data = await res.json();

    elements.providerLabel.textContent = data.llm_provider;
    elements.statProviderVal.textContent = data.llm_provider.toUpperCase();
    elements.settingsProvider.textContent = data.llm_provider;
    elements.settingsVector.textContent = data.vector_memory ? "Active (ChromaDB)" : "Keyword Fallback";
    elements.searchMode.textContent = data.vector_memory ? "vector" : "keyword";
  } catch (err) {
    elements.providerLabel.textContent = "Offline";
  }
}

async function loadTasks() {
  try {
    const res = await fetch(`${API}/api/tasks`);
    const tasks = await res.json();
    elements.taskType.innerHTML = tasks
      .map((t) => `<option value="${t.id}">${t.description}</option>`)
      .join("");
    elements.settingsTaskCount.textContent = tasks.length;
  } catch (err) {
    console.error("Failed to load tasks", err);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const data = await res.json();
    cachedStats = data.by_task_type || {};
    const summary = data.summary || {};

    elements.statRunsVal.textContent = summary.total_runs ?? 0;
    elements.statLessonsVal.textContent = summary.total_lessons ?? 0;
    const rate = Math.round((summary.first_attempt_success_rate ?? 0) * 100);
    elements.statSuccessVal.textContent = `${rate}%`;

    renderCharts(cachedStats);
  } catch (err) {
    console.error("Failed to load stats", err);
  }
}

async function loadMemory(searchQuery = "") {
  try {
    let url = `${API}/api/memory`;
    if (searchQuery.trim()) {
      url = `${API}/api/memory/semantic-search?q=${encodeURIComponent(searchQuery)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    const lessons = searchQuery.trim() ? data.results : data;
    cachedLessons = lessons || [];

    if (!lessons || !lessons.length) {
      elements.memoryGrid.innerHTML = `<p class="empty-state">No lessons found.</p>`;
      return;
    }

    elements.memoryGrid.innerHTML = lessons
      .map((l) => {
        const eff = l.effectiveness !== undefined ? Math.round(l.effectiveness * 100) : null;
        let badgeClass = "mid";
        if (eff !== null) {
          if (eff >= 70) badgeClass = "high";
          else if (eff < 40) badgeClass = "low";
        }

        const scoreText = l.similarity_score !== undefined
          ? `Match: ${Math.round(l.similarity_score * 100)}%`
          : (eff !== null ? `${eff}% Effective (${l.times_used || 0} uses)` : "New");

        return `
          <div class="memory-card">
            <div class="memory-card-header">
              <span class="memory-tag">${l.task_type} · ${l.error_tag}</span>
              ${l.id ? `<button class="delete-lesson-btn" data-id="${l.id}" title="Delete lesson">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>` : ""}
            </div>
            <div class="memory-text">${l.lesson_text}</div>
            <div class="memory-footer">
              <span>${l.created_at ? new Date(l.created_at).toLocaleDateString() : ""}</span>
              <span class="score-badge ${badgeClass}">${scoreText}</span>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach delete handlers
    document.querySelectorAll(".delete-lesson-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Delete this lesson from memory?")) {
          await fetch(`${API}/api/lessons/${id}`, { method: "DELETE" });
          showToast("Lesson deleted", "info");
          loadMemory(elements.memSearchInput.value);
        }
      });
    });

    // Re-render effectiveness chart if analytics is active
    renderEffectivenessChart(cachedLessons);
  } catch (err) {
    console.error("Failed to load memory", err);
  }
}

async function loadMeta() {
  try {
    const res = await fetch(`${API}/api/meta`);
    const data = await res.json();

    const recs = (data.recommendations || [])
      .map((r) => `<div class="meta-rec-item">💡 ${r}</div>`)
      .join("");

    elements.metaPanel.innerHTML = `
      <div class="meta-summary">
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
          Overall Success Rate: <strong style="color:var(--electric-blue);">${Math.round(data.overall_success_rate * 100)}%</strong> 
          across <strong>${data.total_runs}</strong> runs and <strong>${data.total_lessons}</strong> lessons.
        </p>
      </div>
      <div class="meta-recommendations">${recs || '<p class="empty-state">No recommendations yet.</p>'}</div>
    `;
  } catch (err) {
    console.error("Failed to load meta", err);
  }
}

async function refreshAll() {
  await Promise.all([loadHealth(), loadStats(), loadMemory(), loadMeta()]);
}

// ---------------------------------------------------------------------------
// Chart.js Visualizations (All 4 Charts Configured Properly)
// ---------------------------------------------------------------------------
function renderCharts(byType) {
  const ctxSuccess = document.getElementById("successChart");
  const ctxDonut = document.getElementById("donutChart");
  const ctxMini = document.getElementById("miniChart");

  const taskKeys = Object.keys(byType);

  // 1. Success Rate Line Chart (Analytics)
  if (ctxSuccess) {
    if (charts.success) charts.success.destroy();

    const colors = ["#0284c7", "#7c3aed", "#10b981", "#ea580c", "#e11d48", "#ca8a04", "#06b6d4", "#ec4899", "#84cc16", "#6366f1"];
    const datasets = taskKeys.map((key, i) => {
      const runs = byType[key] || [];
      return {
        label: key,
        data: runs.map((r) => (r.success ? 1 : 0)),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + "22",
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
      };
    });

    charts.success = new Chart(ctxSuccess, {
      type: "line",
      data: {
        labels: Array.from({ length: 10 }, (_, i) => `Run ${i + 1}`),
        datasets: datasets.length ? datasets : [{ label: "No runs yet", data: [0], borderColor: "#cbd5e1" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#334155", font: { family: "Inter", size: 11, weight: "bold" } } },
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              stepSize: 1,
              callback: (val) => (val === 1 ? "✓ Solved" : "✗ Failed"),
              color: "#475569",
              font: { weight: "bold" },
            },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { color: "#475569", font: { weight: "bold" } },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
        },
      },
    });
  }

  // 2. Task Distribution Donut (Analytics)
  if (ctxDonut) {
    if (charts.donut) charts.donut.destroy();
    const counts = taskKeys.map((k) => (byType[k] || []).length);

    charts.donut = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        labels: taskKeys.length ? taskKeys : ["No data"],
        datasets: [{
          data: counts.length ? counts : [1],
          backgroundColor: ["#0284c7", "#7c3aed", "#10b981", "#ea580c", "#e11d48", "#ca8a04", "#06b6d4", "#ec4899", "#84cc16", "#6366f1"],
          borderWidth: 2,
          borderColor: "#ffffff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: "#334155", font: { size: 10, weight: "bold" } } },
        },
      },
    });
  }

  // 3. Mini Dashboard Chart
  if (ctxMini) {
    if (charts.mini) charts.mini.destroy();
    const totalRunsPerType = taskKeys.map((k) => (byType[k] || []).length);

    charts.mini = new Chart(ctxMini, {
      type: "bar",
      data: {
        labels: taskKeys.map((k) => k.replace(/_/g, " ").slice(0, 10)),
        datasets: [{
          label: "Runs",
          data: totalRunsPerType.length ? totalRunsPerType : [0],
          backgroundColor: "#0284c7cc",
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { color: "#475569", stepSize: 1 }, grid: { color: "rgba(0,0,0,0.04)" } },
          x: { ticks: { color: "#475569", font: { size: 9, weight: "bold" } }, grid: { display: false } },
        },
      },
    });
  }

  renderEffectivenessChart(cachedLessons);
}

// 4. Lesson Effectiveness Bar Chart (Analytics)
function renderEffectivenessChart(lessons) {
  const ctxEffectiveness = document.getElementById("effectivenessChart");
  if (!ctxEffectiveness) return;
  if (charts.effectiveness) charts.effectiveness.destroy();

  const labels = (lessons || []).map((l) => `${l.task_type.slice(0, 8)}..`);
  const dataScores = (lessons || []).map((l) => Math.round((l.effectiveness || 0) * 100));

  charts.effectiveness = new Chart(ctxEffectiveness, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No lessons"],
      datasets: [{
        label: "Effectiveness %",
        data: dataScores.length ? dataScores : [0],
        backgroundColor: "#10b981cc",
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#475569", callback: (v) => `${v}%` },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
        x: { ticks: { color: "#475569", font: { size: 9, weight: "bold" } }, grid: { display: false } },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Trace Rendering
// ---------------------------------------------------------------------------
function fmtNum(n) {
  const num = Number(n);
  return Number.isInteger(num) ? num : num.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function renderTrace(result) {
  elements.traceStatus.className = `badge ${result.success ? "success" : "fail"}`;
  elements.traceStatus.textContent = result.success ? "SOLVED" : "FAILED";

  const summary = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>Task:</strong> ${result.task_prompt}</div>
      <div class="badge ${result.success ? "success" : "fail"}">
        ${result.success ? "Solved" : "Not Solved"} in ${result.iterations_used} iteration(s)
      </div>
    </div>
  `;

  const steps = result.trace
    .map((s) => {
      const confPct = Math.round((s.confidence || 0.5) * 100);
      const lessonsBlock = (s.lessons_available && s.lessons_available.length)
        ? `<div class="trace-row"><span class="trace-label">Lessons Active</span><span class="trace-content">${s.lessons_available.join("<br/>")}</span></div>`
        : `<div class="trace-row"><span class="trace-label">Lessons Active</span><span class="trace-content" style="color:var(--text-dim);">None</span></div>`;

      const critiqueBlock = s.critique
        ? `<div class="critique-box"><strong>Critic / Verifier:</strong> ${s.critique}</div>`
        : "";

      const lessonStoredBlock = s.lesson_stored
        ? `<div class="lesson-box"><strong>💡 Reflected &amp; Saved Lesson:</strong> ${s.lesson_stored}</div>`
        : "";

      return `
        <div class="step-card">
          <div class="step-header">
            <span>Iteration ${s.iteration} ${s.agent_mode === "multi" ? "(Multi-Agent)" : ""}</span>
            <div style="display:flex; align-items:center; gap:12px;">
              <div>
                <span class="trace-label" style="display:inline; width:auto;">Confidence:</span>
                <span class="confidence-bar"><span class="confidence-fill" style="width:${confPct}%"></span></span>
                <span style="font-family:var(--font-mono); font-size:11px;">${confPct}%</span>
              </div>
              <span class="badge ${s.success ? "success" : "fail"}">${s.success ? "Correct" : "Incorrect"}</span>
            </div>
          </div>
          <div class="step-body">
            <div class="trace-row"><span class="trace-label">Reasoning</span><span class="trace-content">${s.reasoning || "Computed solution from principles."}</span></div>
            <div class="trace-row"><span class="trace-label">Output</span><span class="trace-content">Answer: <strong>${fmtNum(s.answer)}</strong> | Correct: <strong>${fmtNum(s.correct_answer)}</strong></span></div>
            ${lessonsBlock}
            ${critiqueBlock}
            ${lessonStoredBlock}
          </div>
        </div>
      `;
    })
    .join("");

  elements.traceContainer.innerHTML = summary + steps;
}

// ---------------------------------------------------------------------------
// Run Agent Action
// ---------------------------------------------------------------------------
elements.runBtn.addEventListener("click", async () => {
  elements.runBtn.disabled = true;
  elements.runBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Running…`;
  elements.traceContainer.innerHTML = `<p class="empty-state">Agent executing in ${currentMode} mode…</p>`;

  try {
    const res = await fetch(`${API}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: elements.taskType.value,
        max_iterations: Number(elements.maxIter.value) || 3,
        agent_mode: currentMode,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    renderTrace(result);
    showToast(result.success ? "Task solved successfully! 🚀" : "Task failed after max iterations.", result.success ? "success" : "error");
    await refreshAll();
  } catch (err) {
    elements.traceContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
    showToast(`Error: ${err.message}`, "error");
  } finally {
    elements.runBtn.disabled = false;
    elements.runBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Agent`;
  }
});

// Reset Memory Action
async function handleReset() {
  if (!confirm("Are you sure you want to reset all stored lessons and attempts?")) return;
  try {
    const res = await fetch(`${API}/api/memory/reset`, { method: "POST" });
    if (res.ok) {
      elements.traceContainer.innerHTML = `<p class="empty-state">Memory wiped. Run the agent to start fresh!</p>`;
      resetPipelineNodes();
      showToast("Memory wiped cleanly", "info");
      await refreshAll();
    } else {
      showToast("Failed to reset memory", "error");
    }
  } catch (err) {
    console.error("Reset error", err);
    showToast("Error resetting memory", "error");
  }
}

if (elements.resetBtn) elements.resetBtn.addEventListener("click", handleReset);
if (elements.settingsResetBtn) elements.settingsResetBtn.addEventListener("click", handleReset);
elements.refreshBtn.addEventListener("click", refreshAll);
elements.metaRefreshBtn.addEventListener("click", loadMeta);

// Memory search with debounce
let searchDebounce;
elements.memSearchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadMemory(e.target.value);
  }, 250);
});

// Export memory
elements.exportBtn.addEventListener("click", async () => {
  const res = await fetch(`${API}/api/memory/export`);
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `self-evolve-memory-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Memory exported as JSON", "success");
});

// Import memory
elements.importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const res = await fetch(`${API}/api/memory/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    const result = await res.json();
    showToast(`Imported ${result.count} lessons successfully!`, "success");
    loadMemory();
  } catch (err) {
    showToast("Failed to import memory JSON", "error");
  }
});

// Auto-Prune
elements.pruneBtn.addEventListener("click", async () => {
  const res = await fetch(`${API}/api/meta/auto-prune`, { method: "POST" });
  const data = await res.json();
  showToast(`Pruned ${data.count} ineffective lessons`, "info");
  loadMemory();
  loadMeta();
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function init() {
  initWebSocket();
  await loadHealth();
  await loadTasks();
  await refreshAll();
  switchTab("dashboard");
})();
