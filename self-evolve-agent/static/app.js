/**
 * Self-Evolve v1.0 Dashboard SPA
 * Advanced Agentic AI with 3D Galaxy, Multi-Modal Vision, Tree of Thoughts,
 * Adversarial Debate, Curiosity Self-Play, Tool Forge, and Multi-Character TTS Voice.
 */

const API = "";
let currentMode = "single";
let ws = null;
let charts = {};
let cachedStats = {};
let cachedLessons = [];
let autopilotTimer = null;
let galaxyInstance = null;

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
  ttsToggleBtn: document.getElementById("ttsToggleBtn"),
  ttsToggleLabel: document.getElementById("ttsToggleLabel"),
  voiceBtn: document.getElementById("voiceBtn"),
  voiceLabel: document.getElementById("voiceLabel"),
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

  // Tree of Thoughts
  totTaskType: document.getElementById("totTaskType"),
  totRunBtn: document.getElementById("totRunBtn"),
  totStatus: document.getElementById("totStatus"),
  totTreeContainer: document.getElementById("totTreeContainer"),

  // Debate Arena
  debateTaskType: document.getElementById("debateTaskType"),
  debateRunBtn: document.getElementById("debateRunBtn"),
  debateStatus: document.getElementById("debateStatus"),
  debateTranscriptContainer: document.getElementById("debateTranscriptContainer"),

  // Vision Agent
  visionHintInput: document.getElementById("visionHintInput"),
  visionSolveBtn: document.getElementById("visionSolveBtn"),
  visionStatus: document.getElementById("visionStatus"),
  visionResultContainer: document.getElementById("visionResultContainer"),

  // Self Patcher
  patcherTarget: document.getElementById("patcherTarget"),
  runPatcherBenchmarkBtn: document.getElementById("runPatcherBenchmarkBtn"),
  patcherStatus: document.getElementById("patcherStatus"),
  patcherResultContainer: document.getElementById("patcherResultContainer"),

  // Tool Forge
  newToolModalBtn: document.getElementById("newToolModalBtn"),
  toolFormCard: document.getElementById("toolFormCard"),
  toolFormCancelBtn: document.getElementById("toolFormCancelBtn"),
  toolNameInput: document.getElementById("toolNameInput"),
  toolDescInput: document.getElementById("toolDescInput"),
  toolCodeInput: document.getElementById("toolCodeInput"),
  toolSaveBtn: document.getElementById("toolSaveBtn"),
  toolsGrid: document.getElementById("toolsGrid"),

  // Self Play
  selfPlayStepBtn: document.getElementById("selfPlayStepBtn"),
  selfPlayAutoToggleBtn: document.getElementById("selfPlayAutoToggleBtn"),
  autopilotStatus: document.getElementById("autopilotStatus"),
  selfPlayHistoryContainer: document.getElementById("selfPlayHistoryContainer"),

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
  settingsToolsCount: document.getElementById("settingsToolsCount"),
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
// Voice Recognition & TTS Engine
// ---------------------------------------------------------------------------
let voiceCommander = null;
if (window.VoiceCommander) {
  voiceCommander = new VoiceCommander(
    (spokenText) => {
      showToast(`Voice Command: "${spokenText}"`, "info");
      window.sound.relay();
      handleVoiceCommand(spokenText);
    },
    (isListening) => {
      if (isListening) {
        elements.voiceBtn.classList.add("listening");
        elements.voiceLabel.textContent = "Listening…";
      } else {
        elements.voiceBtn.classList.remove("listening");
        elements.voiceLabel.textContent = "Voice Mic";
      }
    }
  );
}

if (elements.ttsToggleBtn) {
  elements.ttsToggleBtn.addEventListener("click", () => {
    window.sound.click();
    window.sound.ttsEnabled = !window.sound.ttsEnabled;
    elements.ttsToggleLabel.textContent = window.sound.ttsEnabled ? "Voice: ON" : "Voice: OFF";
    showToast(window.sound.ttsEnabled ? "Voice Audio Synthesizer Enabled" : "Voice Audio Muted", "info");
  });
}

function handleVoiceCommand(text) {
  const cmd = text.toLowerCase();
  if (cmd.includes("run") || cmd.includes("start")) {
    switchTab("run");
    elements.runBtn.click();
  } else if (cmd.includes("tree") || cmd.includes("thought")) {
    switchTab("tot");
    elements.totRunBtn.click();
  } else if (cmd.includes("debate") || cmd.includes("council")) {
    switchTab("debate");
    elements.debateRunBtn.click();
  } else if (cmd.includes("vision") || cmd.includes("diagram")) {
    switchTab("vision");
    elements.visionSolveBtn.click();
  } else if (cmd.includes("patch") || cmd.includes("benchmark")) {
    switchTab("patcher");
    elements.runPatcherBenchmarkBtn.click();
  } else if (cmd.includes("galaxy") || cmd.includes("3d")) {
    switchTab("galaxy");
  } else if (cmd.includes("tool") || cmd.includes("forge")) {
    switchTab("tools");
  } else if (cmd.includes("autopilot") || cmd.includes("self play")) {
    switchTab("selfplay");
    elements.selfPlayStepBtn.click();
  } else if (cmd.includes("memory") || cmd.includes("lesson")) {
    switchTab("memory");
  } else if (cmd.includes("dashboard")) {
    switchTab("dashboard");
  } else if (cmd.includes("analytics")) {
    switchTab("analytics");
  }
}

if (elements.voiceBtn) {
  elements.voiceBtn.addEventListener("click", () => {
    window.sound.click();
    if (voiceCommander) voiceCommander.toggle();
  });
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
    case "attempt_complete":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Attempted answer: <code>${data.answer}</code>`;
      break;
    case "critique_ready":
      item.classList.add(data.is_correct ? "success" : "fail");
      content = `<strong>${time}</strong> Self-critique: ${data.is_correct ? "✓ Validated correct" : "✗ Incorrect answer"}`;
      break;
    case "tot_start":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Tree of Thoughts: Parallel exploration on <code>${data.task_type}</code>`;
      break;
    case "debate_start":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Debate Arena: 3-Agent Council convening on <code>${data.task_type}</code>`;
      break;
    case "vision_analysis_start":
      item.classList.add("solver");
      content = `<strong>${time}</strong> Vision Agent: Segmenting geometric & diagram entities…`;
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
// TAB ROUTING & SWITCHING
// ---------------------------------------------------------------------------
function switchTab(tabId) {
  if (window.sound) window.sound.click();

  const coreMoreContainer = document.getElementById("coreMoreContainer");
  const coreMoreToggleText = document.getElementById("coreMoreToggleText");
  const coreMoreToggleIcon = document.getElementById("coreMoreToggleIcon");
  const hiddenTabs = ["vision", "tools", "selfplay", "galaxy", "patcher"];

  if (hiddenTabs.includes(tabId) && coreMoreContainer && coreMoreContainer.style.display === "none") {
    coreMoreContainer.style.display = "flex";
    if (coreMoreToggleText) coreMoreToggleText.textContent = "− Show Less";
    if (coreMoreToggleIcon) coreMoreToggleIcon.style.transform = "rotate(180deg)";
  }

  elements.navItems.forEach((btn) => {
    const btnTab = btn.getAttribute("data-tab");
    if (btnTab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  elements.tabContents.forEach((tab) => {
    if (tab.id === `tab-${tabId}`) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeBtn) {
    elements.pageTitle.textContent = activeBtn.innerText.trim();
  }

  if (tabId === "analytics") {
    loadStats();
    loadMeta();
  } else if (tabId === "memory") {
    loadMemory();
  } else if (tabId === "dashboard") {
    loadStats();
  } else if (tabId === "tools") {
    loadCustomTools();
  } else if (tabId === "selfplay") {
    loadSelfPlayHistory();
  } else if (tabId === "galaxy") {
    if (!galaxyInstance && window.Galaxy3D) {
      galaxyInstance = new Galaxy3D("galaxyCanvasContainer");
      galaxyInstance.init();
    }
  }

  setTimeout(() => {
    Object.values(charts).forEach((c) => {
      if (c && typeof c.resize === "function") c.resize();
    });
  }, 100);
}

// Core Systems More / Less Collapsible Toggle
const coreMoreToggleBtn = document.getElementById("coreMoreToggleBtn");
const coreMoreContainer = document.getElementById("coreMoreContainer");
const coreMoreToggleText = document.getElementById("coreMoreToggleText");
const coreMoreToggleIcon = document.getElementById("coreMoreToggleIcon");

if (coreMoreToggleBtn && coreMoreContainer) {
  coreMoreToggleBtn.addEventListener("click", () => {
    if (window.sound) window.sound.click();
    const isHidden = coreMoreContainer.style.display === "none";
    if (isHidden) {
      coreMoreContainer.style.display = "flex";
      coreMoreToggleText.textContent = "− Show Less";
      coreMoreToggleIcon.style.transform = "rotate(180deg)";
    } else {
      coreMoreContainer.style.display = "none";
      coreMoreToggleText.textContent = "+ More Systems (5)";
      coreMoreToggleIcon.style.transform = "rotate(0deg)";
    }
  });
}

elements.navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");
    if (target) switchTab(target);
  });
});

elements.modeSingle.addEventListener("click", () => {
  if (window.sound) window.sound.click();
  currentMode = "single";
  elements.modeSingle.classList.add("active");
  elements.modeMulti.classList.remove("active");
  elements.agentModeBadge.textContent = "single";
  elements.pipelineSingle.classList.remove("hidden");
  elements.pipelineMulti.classList.add("hidden");
});

elements.modeMulti.addEventListener("click", () => {
  if (window.sound) window.sound.click();
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
// Multi-Modal Vision Agent
// ---------------------------------------------------------------------------
if (elements.visionSolveBtn) {
  elements.visionSolveBtn.addEventListener("click", async () => {
    window.sound.click();
    elements.visionSolveBtn.disabled = true;
    elements.visionSolveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Parsing Diagram…`;
    elements.visionResultContainer.innerHTML = `<p class="empty-state">Segmenting geometry, mapping parameters & running verifiable solver…</p>`;

    try {
      const res = await fetch(`${API}/api/vision/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_hint: elements.visionHintInput.value }),
      });
      const data = await res.json();
      renderVisionResult(data);
      if (data.is_correct) window.sound.success(); else window.sound.error();
      window.sound.speak(`Vision analysis completed. Final answer is ${data.final_answer}`, "system");
      showToast(data.is_correct ? "Diagram solved with mathematical verification! 👁️" : "Diagram parsed.", "success");
    } catch (err) {
      elements.visionResultContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
    } finally {
      elements.visionSolveBtn.disabled = false;
      elements.visionSolveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg> Analyze Diagram & Solve`;
    }
  });
}

function renderVisionResult(data) {
  elements.visionStatus.className = `badge ${data.is_correct ? "success" : "fail"}`;
  elements.visionStatus.textContent = data.is_correct ? "SOLVED" : "INCORRECT";

  const entitiesHtml = data.detected_visual_elements.map(e => `<span class="score-badge high">${e}</span>`).join(" ");
  const stepsHtml = data.solution_steps.map(s => `<div style="padding:6px 0; border-bottom:1px solid #e2e8f0;">${s}</div>`).join("");

  elements.visionResultContainer.innerHTML = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>Parsed Statement:</strong> ${data.extracted_problem_statement}</div>
      <div class="badge ${data.is_correct ? 'success' : 'fail'}">Answer: ${data.final_answer} | Confidence: ${Math.round(data.confidence * 100)}%</div>
    </div>
    <div class="step-card">
      <div class="step-header">Visual Entities Grounded</div>
      <div class="step-body">${entitiesHtml}</div>
    </div>
    <div class="step-card">
      <div class="step-header">Reasoning & Solution Steps</div>
      <div class="step-body">${stepsHtml}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Self-Modifying Code Patcher & Benchmarking
// ---------------------------------------------------------------------------
if (elements.runPatcherBenchmarkBtn) {
  elements.runPatcherBenchmarkBtn.addEventListener("click", async () => {
    window.sound.click();
    elements.runPatcherBenchmarkBtn.disabled = true;
    elements.runPatcherBenchmarkBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Synthesizing Patch…`;

    try {
      const res = await fetch(`${API}/api/patcher/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_area: elements.patcherTarget.value }),
      });
      const data = await res.json();
      renderPatcherResult(data);
      window.sound.success();
      window.sound.speak(`Patch validated. Accuracy improved by ${data.benchmark_results.accuracy_gain}`, "system");
      showToast(`Patch ${data.patch_id} validated successfully! 🧬`, "success");
    } catch (err) {
      elements.patcherResultContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
    } finally {
      elements.runPatcherBenchmarkBtn.disabled = false;
      elements.runPatcherBenchmarkBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Synthesize & Benchmark Patch`;
    }
  });
}

function renderPatcherResult(data) {
  elements.patcherStatus.className = "badge success";
  elements.patcherStatus.textContent = data.benchmark_results.status;

  elements.patcherResultContainer.innerHTML = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>${data.title}</strong> — ${data.description}</div>
      <div class="score-badge high">${data.benchmark_results.accuracy_gain} Gain</div>
    </div>
    <div class="stat-grid" style="margin-top:14px;">
      <div class="stat-card"><div class="stat-body"><div class="stat-value">${data.benchmark_results.accuracy_before}</div><div class="stat-label">Accuracy Before</div></div></div>
      <div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:var(--emerald);">${data.benchmark_results.accuracy_after}</div><div class="stat-label">Accuracy After</div></div></div>
      <div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:var(--electric-blue);">${data.benchmark_results.latency_reduction}</div><div class="stat-label">Latency Saved</div></div></div>
      <div class="stat-card"><div class="stat-body"><div class="stat-value">0 Flags</div><div class="stat-label">AST Security</div></div></div>
    </div>
    <div class="step-card">
      <div class="step-header">Synthesized Diff</div>
      <pre style="background:#0f172a; color:#38bdf8; padding:14px; border-radius:8px; font-family:var(--font-mono); font-size:11px; overflow-x:auto;">${data.code_diff}</pre>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Tree of Thoughts (ToT)
// ---------------------------------------------------------------------------
if (elements.totRunBtn) {
  elements.totRunBtn.addEventListener("click", async () => {
    window.sound.click();
    elements.totRunBtn.disabled = true;
    elements.totRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Exploring Tree…`;
    elements.totTreeContainer.innerHTML = `<p class="empty-state">Exploring parallel reasoning paths & evaluating state heuristics…</p>`;

    try {
      const res = await fetch(`${API}/api/tot/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: elements.totTaskType.value }),
      });
      const data = await res.json();
      renderToTTree(data);
      if (data.is_correct) window.sound.success(); else window.sound.error();
      window.sound.speak(`Tree of Thoughts evaluated. Optimal answer is ${data.final_answer}`, "system");
      showToast(data.is_correct ? "Optimal path converged! 🎯" : "Branch evaluated.", data.is_correct ? "success" : "error");
    } catch (err) {
      elements.totTreeContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
    } finally {
      elements.totRunBtn.disabled = false;
      elements.totRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4M7 17l3-5M17 17l-3-5"/></svg> Explore Thought Tree`;
    }
  });
}

function renderToTTree(data) {
  elements.totStatus.className = `badge ${data.is_correct ? "success" : "fail"}`;
  elements.totStatus.textContent = data.is_correct ? "CONVERGED OPTIMAL" : "REASONING FLAW";

  const nodesByDepth = {};
  data.tree_nodes.forEach(n => {
    nodesByDepth[n.depth] = nodesByDepth[n.depth] || [];
    nodesByDepth[n.depth].push(n);
  });

  const levelsHtml = Object.keys(nodesByDepth).map(depth => {
    const nodes = nodesByDepth[depth];
    const nodeCards = nodes.map(n => {
      const isWinner = data.winning_path.includes(n.id);
      return `
        <div class="tot-node ${isWinner ? 'winner' : ''} ${n.status === 'pruned' ? 'pruned' : ''}">
          <div class="tot-node-header">
            <span>${n.id} (${n.reasoning_type})</span>
            <span class="score-badge ${n.score >= 80 ? 'high' : (n.score >= 50 ? 'mid' : 'low')}">Score: ${n.score}</span>
          </div>
          <div class="tot-node-thought">${n.thought}</div>
          ${n.output_val ? `<div style="font-family:var(--font-mono); font-size:11px; color:var(--electric-blue); font-weight:700;">Output: ${n.output_val}</div>` : ''}
        </div>
      `;
    }).join("");

    return `
      <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-dim); margin-top:8px;">Depth Level ${depth}</div>
      <div class="tot-level">${nodeCards}</div>
    `;
  }).join("");

  elements.totTreeContainer.innerHTML = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>Task:</strong> ${data.task_prompt}</div>
      <div class="badge ${data.is_correct ? 'success' : 'fail'}">Answer: ${data.final_answer} | Ground Truth: ${data.correct_answer}</div>
    </div>
    ${levelsHtml}
  `;
}

// ---------------------------------------------------------------------------
// Debate Arena with Multi-Character Voice Synthesis
// ---------------------------------------------------------------------------
if (elements.debateRunBtn) {
  elements.debateRunBtn.addEventListener("click", async () => {
    window.sound.click();
    elements.debateRunBtn.disabled = true;
    elements.debateRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Convening Council…`;
    elements.debateTranscriptContainer.innerHTML = `<p class="empty-state">Proposer, Red-Team Adversary, and Supreme Judge are debating…</p>`;

    try {
      const res = await fetch(`${API}/api/debate/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: elements.debateTaskType.value }),
      });
      const data = await res.json();
      renderDebateTranscript(data);
      if (data.is_correct) window.sound.success(); else window.sound.error();
      
      // Multi-character speech: speak judge's final verdict
      const judgeMsg = data.transcript.find(m => m.role === "judge");
      if (judgeMsg) {
        window.sound.speak(`Supreme Judge verdict: ${judgeMsg.message}`, "judge");
      }

      showToast(data.is_correct ? "Council reached verified consensus! ⚖️" : "Debate completed.", "success");
    } catch (err) {
      elements.debateTranscriptContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
    } finally {
      elements.debateRunBtn.disabled = false;
      elements.debateRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Start Council Debate`;
    }
  });
}

function renderDebateTranscript(data) {
  elements.debateStatus.className = `badge ${data.is_correct ? "success" : "fail"}`;
  elements.debateStatus.textContent = `CONSENSUS: ${Math.round(data.consensus_score * 100)}%`;

  const cards = data.transcript.map(m => {
    return `
      <div class="debate-card ${m.role}">
        <div class="debate-speaker">
          <span>${m.speaker}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="icon-btn" style="width:24px; height:24px;" onclick="window.sound.speak('${m.message.replace(/'/g, "\\'")}', '${m.role}')" title="Play Voice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <span style="font-family:var(--font-mono); font-size:11px; opacity:0.8;">${m.stage} · ${(m.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div class="debate-message">${m.message}</div>
      </div>
    `;
  }).join("");

  elements.debateTranscriptContainer.innerHTML = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>Task:</strong> ${data.task_prompt}</div>
      <div class="badge ${data.is_correct ? 'success' : 'fail'}">Verdict: ${data.final_answer} (Ground Truth: ${data.correct_answer})</div>
    </div>
    ${cards}
  `;
}

// ---------------------------------------------------------------------------
// Tool Forge
// ---------------------------------------------------------------------------
async function loadCustomTools() {
  try {
    const res = await fetch(`${API}/api/tools/custom`);
    const tools = await res.json();
    if (!tools.length) {
      elements.toolsGrid.innerHTML = `<p class="empty-state">No custom synthesized tools yet.</p>`;
      return;
    }
    elements.toolsGrid.innerHTML = tools.map(t => `
      <div class="memory-card">
        <div class="memory-card-header">
          <span class="memory-tag" style="color:var(--electric-blue); font-weight:800;">⚙️ ${t.name}</span>
          <span class="score-badge high">${t.times_executed} runs</span>
        </div>
        <div class="memory-text">${t.description}</div>
        <pre style="background:#f1f5f9; padding:10px; border-radius:8px; font-family:var(--font-mono); font-size:11px; overflow-x:auto; max-height:120px; border:1px solid #cbd5e1;">${t.code}</pre>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load tools", err);
  }
}

if (elements.newToolModalBtn) {
  elements.newToolModalBtn.addEventListener("click", () => {
    window.sound.click();
    elements.toolFormCard.style.display = elements.toolFormCard.style.display === "none" ? "block" : "none";
  });
}

if (elements.toolFormCancelBtn) {
  elements.toolFormCancelBtn.addEventListener("click", () => {
    window.sound.click();
    elements.toolFormCard.style.display = "none";
  });
}

if (elements.toolSaveBtn) {
  elements.toolSaveBtn.addEventListener("click", async () => {
    window.sound.click();
    const name = elements.toolNameInput.value.trim();
    const desc = elements.toolDescInput.value.trim();
    const code = elements.toolCodeInput.value.trim();

    if (!name || !code) {
      showToast("Tool name and Python code are required", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/api/tools/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc || name, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Validation failed");
      window.sound.success();
      showToast(`Tool '${name}' successfully synthesized!`, "success");
      elements.toolFormCard.style.display = "none";
      loadCustomTools();
    } catch (err) {
      window.sound.error();
      showToast(`Error: ${err.message}`, "error");
    }
  });
}

// ---------------------------------------------------------------------------
// Self-Play Autopilot
// ---------------------------------------------------------------------------
async function loadSelfPlayHistory() {
  try {
    const res = await fetch(`${API}/api/self-play/history`);
    const history = await res.json();
    if (!history.length) {
      elements.selfPlayHistoryContainer.innerHTML = `<p class="empty-state">No autonomous sessions recorded yet.</p>`;
      return;
    }
    elements.selfPlayHistoryContainer.innerHTML = history.map(s => `
      <div class="trace-summary-card">
        <div class="trace-prompt">
          <span style="color:var(--violet); font-weight:800;">[${s.difficulty}]</span> ${s.prompt}
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="score-badge ${s.lessons_learned > 0 ? 'mid' : 'high'}">${s.lessons_learned > 0 ? `+${s.lessons_learned} Lesson Learned` : 'Retained'}</span>
          <span class="badge ${s.solved ? 'success' : 'fail'}">${s.solved ? 'SOLVED' : 'FAILED'}</span>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load self-play history", err);
  }
}

if (elements.selfPlayStepBtn) {
  elements.selfPlayStepBtn.addEventListener("click", async () => {
    window.sound.click();
    elements.selfPlayStepBtn.disabled = true;
    try {
      const res = await fetch(`${API}/api/self-play/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.solved) window.sound.success(); else window.sound.relay();
      showToast(`Autopilot step completed on '${data.task_type}' (${data.difficulty})`, "success");
      loadSelfPlayHistory();
      refreshAll();
    } catch (err) {
      showToast(`Self-play error: ${err.message}`, "error");
    } finally {
      elements.selfPlayStepBtn.disabled = false;
    }
  });
}

if (elements.selfPlayAutoToggleBtn) {
  elements.selfPlayAutoToggleBtn.addEventListener("click", () => {
    window.sound.click();
    if (autopilotTimer) {
      clearInterval(autopilotTimer);
      autopilotTimer = null;
      elements.autopilotStatus.textContent = "IDLE";
      elements.autopilotStatus.className = "status-chip";
      elements.selfPlayAutoToggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Start Continuous Autopilot`;
      showToast("Autopilot paused", "info");
    } else {
      elements.autopilotStatus.textContent = "AUTOPILOT RUNNING";
      elements.autopilotStatus.className = "status-chip live";
      elements.selfPlayAutoToggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause Continuous Autopilot`;
      showToast("Continuous Autopilot Activated! 🚀", "success");
      autopilotTimer = setInterval(async () => {
        try {
          await fetch(`${API}/api/self-play/step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          loadSelfPlayHistory();
          refreshAll();
        } catch (e) {
          console.warn("Autopilot tick error", e);
        }
      }, 5000);
    }
  });
}

// ---------------------------------------------------------------------------
// Chart.js Visualizations
// ---------------------------------------------------------------------------
function renderCharts(byType) {
  const ctxSuccess = document.getElementById("successChart");
  const ctxDonut = document.getElementById("donutChart");
  const ctxMini = document.getElementById("miniChart");

  const taskKeys = Object.keys(byType);

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
// Trace Rendering & Run Action
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

elements.runBtn.addEventListener("click", async () => {
  if (window.sound) window.sound.click();
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
    if (result.success) {
      window.sound.success();
      window.sound.speak(`Task completed successfully in ${result.iterations_used} iterations.`, "system");
    } else {
      window.sound.error();
    }
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
      if (window.sound) window.sound.relay();
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

async function loadHealth() {
  try {
    const res = await fetch(`${API}/api/health`);
    const data = await res.json();

    elements.providerLabel.textContent = data.llm_provider;
    elements.statProviderVal.textContent = data.llm_provider.toUpperCase();
    elements.settingsProvider.textContent = data.llm_provider;
    elements.settingsVector.textContent = data.vector_memory ? "Active (ChromaDB)" : "Keyword Fallback";
    elements.searchMode.textContent = data.vector_memory ? "vector" : "keyword";
    if (elements.settingsToolsCount) elements.settingsToolsCount.textContent = `${data.custom_tools_count || 0} Registered`;
  } catch (err) {
    elements.providerLabel.textContent = "Offline";
  }
}

async function loadTasks() {
  try {
    const res = await fetch(`${API}/api/tasks`);
    const tasks = await res.json();
    const optionsHtml = tasks.map((t) => `<option value="${t.id}">${t.description}</option>`).join("");

    if (elements.taskType) elements.taskType.innerHTML = optionsHtml;
    if (elements.totTaskType) elements.totTaskType.innerHTML = optionsHtml;
    if (elements.debateTaskType) elements.debateTaskType.innerHTML = optionsHtml;
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

    document.querySelectorAll(".delete-lesson-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Delete this lesson from memory?")) {
          await fetch(`${API}/api/lessons/${id}`, { method: "DELETE" });
          if (window.sound) window.sound.relay();
          showToast("Lesson deleted", "info");
          loadMemory(elements.memSearchInput.value);
        }
      });
    });

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
// Init
// ---------------------------------------------------------------------------
(async function init() {
  initWebSocket();
  await loadHealth();
  await loadTasks();
  await refreshAll();
  switchTab("dashboard");
})();
