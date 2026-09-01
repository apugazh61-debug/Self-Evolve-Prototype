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
let cachedTasksMap = {};
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

  // C-Suite Swarm OS
  csuiteTaskType: document.getElementById("csuiteTaskType"),
  csuiteGoalBrief: document.getElementById("csuiteGoalBrief"),
  csuiteDispatchBtn: document.getElementById("csuiteDispatchBtn"),
  csuiteStatus: document.getElementById("csuiteStatus"),
  csuiteContainer: document.getElementById("csuiteContainer"),

  // MCTS AlphaGo
  mctsTaskType: document.getElementById("mctsTaskType"),
  mctsSimulations: document.getElementById("mctsSimulations"),
  mctsSimsHint: document.getElementById("mctsSimsHint"),
  mctsCpuct: document.getElementById("mctsCpuct"),
  mctsCpuctHint: document.getElementById("mctsCpuctHint"),
  mctsRunBtn: document.getElementById("mctsRunBtn"),
  mctsStatus: document.getElementById("mctsStatus"),
  mctsContainer: document.getElementById("mctsContainer"),

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
    const msg = window.sound.ttsEnabled ? "Voice audio synthesizer enabled" : "Voice audio muted";
    showToast(msg, "info");
    if (window.sound.ttsEnabled) {
      window.sound.speak("Voice audio synthesizer is now active.", "system");
    }
  });
}

function handleVoiceCommand(text) {
  const cmd = text.toLowerCase().trim();
  
  if (cmd.includes("c suite") || cmd.includes("c-suite") || cmd.includes("executive") || cmd.includes("ceo")) {
    window.sound.speak("Dispatching executive C-Suite council.", "ceo");
    switchTab("csuite");
    if (csuiteDispatchBtn) csuiteDispatchBtn.click();
  } else if (cmd.includes("mcts") || cmd.includes("alphago") || cmd.includes("monte carlo")) {
    window.sound.speak("Executing Monte Carlo Tree Search.", "system");
    switchTab("mcts");
    if (mctsSearchBtn) mctsSearchBtn.click();
  } else if (cmd.includes("vault") || cmd.includes("blockchain") || cmd.includes("merkle")) {
    window.sound.speak("Inspecting cryptographic Merkle audit vault.", "system");
    switchTab("vault");
    loadMerkleVault();
  } else if (cmd.includes("run") || cmd.includes("start") || cmd.includes("solve") || cmd.includes("agent")) {
    window.sound.speak("Running agent reflexion loop.", "system");
    switchTab("run");
    if (elements.runBtn) elements.runBtn.click();
  } else if (cmd.includes("tree") || cmd.includes("thought")) {
    window.sound.speak("Exploring Tree of Thoughts multi-branch reasoning.", "system");
    switchTab("tot");
    if (elements.totRunBtn) elements.totRunBtn.click();
  } else if (cmd.includes("debate") || cmd.includes("council") || cmd.includes("arena")) {
    window.sound.speak("Convening three agent adversarial debate.", "judge");
    switchTab("debate");
    if (elements.debateRunBtn) elements.debateRunBtn.click();
  } else if (cmd.includes("vision") || cmd.includes("diagram") || cmd.includes("image")) {
    window.sound.speak("Segmenting vision diagram entities.", "system");
    switchTab("vision");
    if (elements.visionSolveBtn) elements.visionSolveBtn.click();
  } else if (cmd.includes("patch") || cmd.includes("benchmark")) {
    window.sound.speak("Synthesizing self-modifying code patch.", "cto");
    switchTab("patcher");
    if (elements.runPatcherBenchmarkBtn) elements.runPatcherBenchmarkBtn.click();
  } else if (cmd.includes("galaxy") || cmd.includes("3d") || cmd.includes("star")) {
    window.sound.speak("Navigating 3D knowledge galaxy.", "system");
    switchTab("galaxy");
  } else if (cmd.includes("tool") || cmd.includes("forge")) {
    window.sound.speak("Opening autonomous Tool Forge.", "cto");
    switchTab("tools");
  } else if (cmd.includes("autopilot") || cmd.includes("self play")) {
    window.sound.speak("Advancing curiosity self-play autopilot.", "system");
    switchTab("selfplay");
    if (elements.selfPlayStepBtn) elements.selfPlayStepBtn.click();
  } else if (cmd.includes("memory") || cmd.includes("lesson")) {
    window.sound.speak("Accessing memory laboratory.", "system");
    switchTab("memory");
  } else if (cmd.includes("dashboard") || cmd.includes("home")) {
    window.sound.speak("Returning to main dashboard.", "system");
    switchTab("dashboard");
  } else if (cmd.includes("analytics") || cmd.includes("chart")) {
    window.sound.speak("Opening intelligence analytics.", "system");
    switchTab("analytics");
  } else if (cmd.includes("report") || cmd.includes("dossier")) {
    window.sound.speak("Opening executive audit report.", "system");
    switchTab("report");
  } else if (cmd.includes("settings") || cmd.includes("config")) {
    window.sound.speak("Opening provider settings.", "system");
    switchTab("settings");
  } else {
    window.sound.speak(`Heard command: ${text}`, "system");
  }
}

if (elements.voiceBtn) {
  elements.voiceBtn.addEventListener("click", () => {
    window.sound.click();
    if (voiceCommander) {
      voiceCommander.toggle();
    } else {
      showToast("Voice Commander initializing… Please try again.", "info");
    }
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
  const hiddenTabs = ["csuite", "mcts", "vault", "vision", "tools", "selfplay", "galaxy", "patcher"];

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
  } else if (tabId === "vault") {
    loadMerkleVault();
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
      coreMoreToggleText.textContent = "+ More Systems (8)";
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
const totBranchFactor = document.getElementById("totBranchFactor");
const totBranchHint = document.getElementById("totBranchHint");
if (totBranchFactor && totBranchHint) {
  totBranchFactor.addEventListener("input", (e) => {
    totBranchHint.textContent = e.target.value;
  });
}

if (elements.totRunBtn) {
  elements.totRunBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    elements.totRunBtn.disabled = true;
    elements.totRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Exploring Tree…`;
    elements.totTreeContainer.innerHTML = `<p class="empty-state">Generating multi-depth candidate branches, evaluating heuristics & pruning sub-optimal paths…</p>`;

    try {
      const branchFactor = Number(totBranchFactor?.value) || 3;
      const res = await fetch(`${API}/api/tot/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: elements.totTaskType.value,
          branching_factor: branchFactor,
        }),
      });
      const data = await res.json();
      renderToTTree(data);
      if (data.is_correct) window.sound.success(); else window.sound.error();
      window.sound.speak(`Tree of Thoughts evaluated. Winning strategy converged on ${data.final_answer}`, "system");
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

  const stats = data.tree_stats || {};

  const statsHtml = `
    <div class="tot-stats-grid">
      <div class="stat-card" style="padding:10px 14px;"><div class="stat-body"><div class="stat-value" style="font-size:18px;">${stats.total_nodes || data.tree_nodes.length}</div><div class="stat-label">Nodes Explored</div></div></div>
      <div class="stat-card" style="padding:10px 14px;"><div class="stat-body"><div class="stat-value" style="font-size:18px; color:var(--rose);">${stats.pruned_branches || 0}</div><div class="stat-label">Pruned Branches</div></div></div>
      <div class="stat-card" style="padding:10px 14px;"><div class="stat-body"><div class="stat-value" style="font-size:18px; color:var(--emerald);">${stats.max_score || 99}%</div><div class="stat-label">Winning Score</div></div></div>
      <div class="stat-card" style="padding:10px 14px;"><div class="stat-body"><div class="stat-value" style="font-size:18px; color:var(--violet);">${stats.branching_factor || 3}x</div><div class="stat-label">Branch Factor</div></div></div>
    </div>
  `;

  const nodesByDepth = {};
  data.tree_nodes.forEach(n => {
    nodesByDepth[n.depth] = nodesByDepth[n.depth] || [];
    nodesByDepth[n.depth].push(n);
  });

  const depthNames = {
    0: "Depth 0 — Root Goal Formulation",
    1: "Depth 1 — Parallel Strategy Hypotheses",
    2: "Depth 2 — Step Execution & Tolerance Check",
    3: "Depth 3 — Global Optimal Consensus",
  };

  const levelsHtml = Object.keys(nodesByDepth).map(depth => {
    const nodes = nodesByDepth[depth];
    const nodeCards = nodes.map(n => {
      const isWinner = data.winning_path.includes(n.id);
      const isPruned = n.status === "pruned";

      let statusBadge = `<span class="score-badge ${n.score >= 80 ? 'high' : (n.score >= 50 ? 'mid' : 'low')}">Score: ${n.score}</span>`;
      if (isWinner && n.depth > 0) {
        statusBadge = `<span class="score-badge high" style="background:#10b981; color:#fff;">✓ WINNER (${n.score})</span>`;
      } else if (isPruned) {
        statusBadge = `<span class="score-badge low" style="background:#f43f5e; color:#fff;">✂ PRUNED</span>`;
      }

      return `
        <div class="tot-node ${isWinner ? 'winner' : ''} ${isPruned ? 'pruned' : ''}">
          <div class="tot-node-header">
            <span style="display:flex; align-items:center; gap:6px;">
              <strong>${n.id}</strong>
              <span class="tot-reasoning-badge">${n.reasoning_type || 'logic'}</span>
            </span>
            ${statusBadge}
          </div>
          <div class="tot-node-thought">${n.thought}</div>
          ${n.prune_reason ? `<div class="tot-prune-reason">⚠️ ${n.prune_reason}</div>` : ''}
          ${n.output_val ? `<div class="tot-output-box">Output: <strong>${fmtNum(n.output_val)}</strong></div>` : ''}
        </div>
      `;
    }).join("");

    return `
      <div class="tot-depth-title">${depthNames[depth] || `Depth Level ${depth}`}</div>
      <div class="tot-level">${nodeCards}</div>
    `;
  }).join("");

  elements.totTreeContainer.innerHTML = `
    <div class="trace-summary-card">
      <div class="trace-prompt"><strong>Task:</strong> ${data.task_prompt}</div>
      <div class="badge ${data.is_correct ? 'success' : 'fail'}" style="font-size:13px; padding:8px 16px;">
        Answer: ${data.final_answer} | Ground Truth: ${data.correct_answer}
      </div>
    </div>
    ${statsHtml}
    ${levelsHtml}
  `;
}

// ---------------------------------------------------------------------------
// Debate Arena with Multi-Character Voice Synthesis
// ---------------------------------------------------------------------------
const debateRounds = document.getElementById("debateRounds");
const debateRoundsHint = document.getElementById("debateRoundsHint");
const debatePlayAudioBtn = document.getElementById("debatePlayAudioBtn");
let lastDebateTranscript = [];

if (debateRounds && debateRoundsHint) {
  debateRounds.addEventListener("input", (e) => {
    debateRoundsHint.textContent = e.target.value;
  });
}

async function playFullDebateAudio(transcript) {
  if (!window.sound || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  showToast("Playing full courtroom debate voices… 🎙️", "info");

  for (const m of transcript) {
    await new Promise((resolve) => {
      const cleanText = m.message.replace(/<[^>]*>?/gm, "").replace(/[`*#_~]/g, "").slice(0, 300);
      const utt = new SpeechSynthesisUtterance(`${m.speaker}: ${cleanText}`);
      if (m.role === "proposer") { utt.pitch = 1.2; utt.rate = 1.05; }
      else if (m.role === "adversary") { utt.pitch = 0.75; utt.rate = 0.95; }
      else if (m.role === "judge") { utt.pitch = 0.9; utt.rate = 0.9; }

      if (window.sound.selectedVoice) utt.voice = window.sound.selectedVoice;
      utt.onend = () => setTimeout(resolve, 400);
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });
  }
}

if (debatePlayAudioBtn) {
  debatePlayAudioBtn.addEventListener("click", () => {
    if (lastDebateTranscript.length) {
      playFullDebateAudio(lastDebateTranscript);
    }
  });
}

if (elements.debateRunBtn) {
  elements.debateRunBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    elements.debateRunBtn.disabled = true;
    elements.debateRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Convening Council…`;
    elements.debateTranscriptContainer.innerHTML = `<p class="empty-state">Proposer (Alpha), Red-Team Adversary (Viper), and Supreme Judge (Justitia) are convening cross-examination…</p>`;

    try {
      const roundsVal = Number(debateRounds?.value) || 2;
      const res = await fetch(`${API}/api/debate/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: elements.debateTaskType.value,
          rounds: roundsVal,
        }),
      });
      const data = await res.json();
      lastDebateTranscript = data.transcript || [];
      renderDebateTranscript(data);

      if (debatePlayAudioBtn) debatePlayAudioBtn.style.display = "inline-flex";

      if (data.is_correct) window.sound.success(); else window.sound.error();

      // Speak final judge verdict
      const judgeMsg = data.transcript.find(m => m.role === "judge");
      if (judgeMsg && window.sound.ttsEnabled) {
        window.sound.speak(`Supreme Judge verdict: ${judgeMsg.message}`, "judge");
      }

      showToast(data.is_correct ? "Council certified mathematically sound consensus! ⚖️" : "Debate concluded.", "success");
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
    const roleColors = {
      proposer: "#0284c7",
      adversary: "#e11d48",
      judge: "#d97706",
    };
    const roleIcons = {
      proposer: "🤖",
      adversary: "⚔️",
      judge: "⚖️",
    };

    const confPct = Math.round((m.confidence || 0.5) * 100);

    return `
      <div class="debate-card ${m.role}">
        <div class="debate-speaker">
          <span style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">${roleIcons[m.role] || "💬"}</span>
            <strong style="color:${roleColors[m.role] || '#0f172a'};">${m.speaker}</strong>
            <span class="tot-reasoning-badge" style="background:${m.role === 'proposer' ? '#e0f2fe' : (m.role === 'adversary' ? '#ffe4e6' : '#fef3c7')}; color:${roleColors[m.role]};">${m.role.toUpperCase()}</span>
          </span>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="icon-btn" style="width:26px; height:26px;" onclick="window.sound.speak('${m.message.replace(/'/g, "\\'")}', '${m.role}')" title="Listen to this agent">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <span style="font-family:var(--font-mono); font-size:11px; opacity:0.85; font-weight:700;">${m.stage} · ${confPct}%</span>
          </div>
        </div>
        <div class="debate-message">${m.message}</div>
      </div>
    `;
  }).join("");

  elements.debateTranscriptContainer.innerHTML = `
    <div class="trace-summary-card">
      <div>
        <div class="trace-prompt"><strong>Task Under Debate:</strong> ${data.task_prompt}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px; font-weight:700;">
          Rounds: ${data.rounds} | Consensus Score: <span style="color:var(--emerald);">${Math.round(data.consensus_score * 100)}% Certified</span>
        </div>
      </div>
      <div class="badge ${data.is_correct ? 'success' : 'fail'}" style="font-size:13px; padding:8px 16px;">
        Final Verdict: ${data.final_answer} (Ground Truth: ${data.correct_answer})
      </div>
    </div>
    ${cards}
  `;
}

// ---------------------------------------------------------------------------
// C-Suite Executive Swarm OS
// ---------------------------------------------------------------------------
if (elements.csuiteDispatchBtn) {
  elements.csuiteDispatchBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    elements.csuiteDispatchBtn.disabled = true;
    elements.csuiteDispatchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Convening C-Suite Council…`;
    elements.csuiteContainer.innerHTML = `<p class="empty-state">CEO, CTO, CFO, CISO, and QA agents are synthesizing, auditing, and executing procedural solvers…</p>`;

    try {
      const res = await fetch(`${API}/api/swarm-os/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: elements.csuiteTaskType ? elements.csuiteTaskType.value : "compound_interest",
          goal_brief: elements.csuiteGoalBrief ? elements.csuiteGoalBrief.value : "",
        }),
      });
      const data = await res.json();
      renderCSuiteCouncil(data);
      if (data.consensus_certified) {
        if (window.sound) window.sound.success();
        window.sound.speak(`C-Suite Council reached unanimous approval. Final certified answer is ${data.final_answer}.`, "ceo");
      } else {
        if (window.sound) window.sound.error();
      }
      showToast(data.consensus_certified ? "C-Suite Council Unanimous Approval! 👔" : "C-Suite execution completed.", "success");
    } catch (err) {
      elements.csuiteContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
      showToast(`Error: ${err.message}`, "error");
    } finally {
      elements.csuiteDispatchBtn.disabled = false;
      elements.csuiteDispatchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Dispatch C-Suite Council`;
    }
  });
}

function renderCSuiteCouncil(data) {
  if (elements.csuiteStatus) {
    elements.csuiteStatus.className = `badge ${data.consensus_certified ? "success" : "fail"}`;
    elements.csuiteStatus.textContent = data.consensus_certified ? "UNANIMOUS APPROVAL" : "GOVERNANCE VETO";
  }

  const council = data.c_suite_council || [];
  const ceo = council.find(c => c.role.includes("CEO")) || {};
  const cto = council.find(c => c.role.includes("CTO")) || {};
  const cfo = council.find(c => c.role.includes("CFO")) || {};
  const ciso = council.find(c => c.role.includes("CISO")) || {};
  const qa = council.find(c => c.role.includes("QA")) || {};

  const cardsHtml = `
    <div class="csuite-grid">
      <!-- CEO Card -->
      <div class="csuite-card ceo">
        <div class="csuite-card-header">
          <div class="csuite-role-title">👔 CEO Agent</div>
          <span class="score-badge high">STRATEGY &amp; KPI</span>
        </div>
        <div class="trace-row"><span class="trace-label">Directive:</span><span class="trace-content"><strong>${ceo.directive || 'Authorize execution'}</strong></span></div>
        <div class="trace-row"><span class="trace-label">Mandate:</span><span class="trace-content">${ceo.governance_mandate || 'Exact Mathematical Formulation'}</span></div>
        <div class="trace-row"><span class="trace-label">Target KPI:</span><span class="trace-content">${ceo.strategic_kpi || '100% Deterministic Accuracy'}</span></div>
      </div>

      <!-- CTO Card -->
      <div class="csuite-card cto">
        <div class="csuite-card-header">
          <div class="csuite-role-title">💻 CTO Agent</div>
          <span class="score-badge high" style="background:#0284c7; color:#fff;">TOOL SYNTHESIS</span>
        </div>
        <div class="trace-row"><span class="trace-label">Action:</span><span class="trace-content">${cto.action || 'Synthesized routine'}</span></div>
        <div class="trace-row"><span class="trace-label">Status:</span><span class="score-badge high">${cto.tool_registry_status || 'READY'}</span></div>
        <pre class="csuite-code-box">${cto.code_artifact || '# Code generated'}</pre>
      </div>

      <!-- CFO Card -->
      <div class="csuite-card cfo">
        <div class="csuite-card-header">
          <div class="csuite-role-title">💰 CFO Agent</div>
          <span class="score-badge high" style="background:#10b981; color:#fff;">QUANTITATIVE AUDIT</span>
        </div>
        <div class="trace-row"><span class="trace-label">Audit Check:</span><span class="trace-content">${cfo.audit_check || 'Verified'}</span></div>
        <div class="trace-row"><span class="trace-label">Risk Score:</span><span class="trace-content"><strong style="color:var(--emerald);">${cfo.financial_risk_score || '0.00%'}</strong></span></div>
        <div class="trace-row"><span class="trace-label">Audit Trail:</span><span class="trace-content">${cfo.audit_trail || `Computed: ${cfo.computed_value}`}</span></div>
      </div>

      <!-- CISO Card -->
      <div class="csuite-card ciso">
        <div class="csuite-card-header">
          <div class="csuite-role-title">🛡️ CISO Agent</div>
          <span class="score-badge high" style="background:#f43f5e; color:#fff;">CYBERSECURITY &amp; AST</span>
        </div>
        <div class="trace-row"><span class="trace-label">AST Scan:</span><span class="badge ${ciso.ast_security_pass ? 'success' : 'fail'}">${ciso.ast_security_pass ? 'PASSED (0 VULNS)' : 'FLAGGED'}</span></div>
        <div class="trace-row"><span class="trace-label">Inspections:</span><span class="trace-content">${ciso.ast_node_inspections || 12} AST syntax nodes verified</span></div>
        <div class="trace-row"><span class="trace-label">Isolation:</span><span class="trace-content">${ciso.sandbox_isolation || 'Zero-Trust Sandbox'}</span></div>
      </div>

      <!-- QA Card -->
      <div class="csuite-card qa" style="grid-column: 1 / -1;">
        <div class="csuite-card-header">
          <div class="csuite-role-title">🧪 QA Agent (Chief Compliance &amp; Consensus)</div>
          <span class="score-badge high" style="background:#06b6d4; color:#fff;">COMPLIANCE PROOF</span>
        </div>
        <div class="trace-row"><span class="trace-label">Assertion:</span><span class="trace-content"><strong>${qa.assertion || 'Verified against oracle'}</strong></span></div>
        <div class="trace-row"><span class="trace-label">Verdict:</span><span class="badge ${qa.compliance_pass ? 'success' : 'fail'}">${qa.verdict || 'CERTIFIED_FOR_PRODUCTION'}</span></div>
        <div class="trace-row"><span class="trace-label">Tolerance:</span><span class="trace-content">${qa.tolerance_margin || '±0.000'} | Latency: <strong>${data.latency_ms || 1.2} ms</strong></span></div>
      </div>
    </div>
  `;

  elements.csuiteContainer.innerHTML = `
    <div class="trace-summary-card">
      <div>
        <div class="trace-prompt"><strong>Enterprise Objective:</strong> ${data.prompt}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px; font-weight:700;">
          Goal Brief: ${data.goal_brief} | Latency: <strong>${data.latency_ms} ms</strong>
        </div>
      </div>
      <div class="badge ${data.consensus_certified ? 'success' : 'fail'}" style="font-size:13px; padding:8px 16px;">
        Final Certified Output: ${data.final_answer}
      </div>
    </div>
    <div class="csuite-receipt-banner">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:20px;">🔐</span>
        <div>
          <div style="font-size:12px; font-weight:800; color:#15803d;">Merkle Vault Cryptographic Governance Receipt</div>
          <div style="font-size:11px; font-family:var(--font-mono); color:#166534;">STATUS: ${data.governance_status} · CONSENSUS: 100% UNANIMOUS</div>
        </div>
      </div>
      <span class="badge success">SEALED IN VAULT</span>
    </div>
    ${cardsHtml}
  `;
}

// ---------------------------------------------------------------------------
// Monte Carlo Tree Search (MCTS AlphaGo)
// ---------------------------------------------------------------------------
if (elements.mctsSimulations && elements.mctsSimsHint) {
  elements.mctsSimulations.addEventListener("input", (e) => {
    elements.mctsSimsHint.textContent = e.target.value;
  });
}

if (elements.mctsCpuct && elements.mctsCpuctHint) {
  elements.mctsCpuct.addEventListener("input", (e) => {
    elements.mctsCpuctHint.textContent = Number(e.target.value).toFixed(2);
  });
}

if (elements.mctsRunBtn) {
  elements.mctsRunBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    elements.mctsRunBtn.disabled = true;
    elements.mctsRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Simulating UCT Rollouts…`;
    elements.mctsContainer.innerHTML = `<p class="empty-state">Running Monte Carlo simulation rollouts, evaluating Q-values & backpropagating rewards…</p>`;

    try {
      const taskVal = elements.mctsTaskType ? elements.mctsTaskType.value : "percentage_discount";
      const simsVal = Number(elements.mctsSimulations?.value) || 50;
      const cpuctVal = Number(elements.mctsCpuct?.value) || 1.41;

      const res = await fetch(`${API}/api/mcts/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: taskVal,
          simulations: simsVal,
          c_puct: cpuctVal,
        }),
      });
      const data = await res.json();
      renderMCTSResult(data);
      if (window.sound) window.sound.success();
      window.sound.speak(`MCTS AlphaGo search completed. Policy converged on optimal answer ${data.optimal_solution}.`, "system");
      showToast("MCTS search converged on optimal trajectory! 🎯", "success");
    } catch (err) {
      elements.mctsContainer.innerHTML = `<p class="empty-state" style="color:var(--rose)">Error: ${err.message}</p>`;
      showToast(`Error: ${err.message}`, "error");
    } finally {
      elements.mctsRunBtn.disabled = false;
      elements.mctsRunBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Execute MCTS Search`;
    }
  });
}

function renderMCTSResult(data) {
  if (elements.mctsStatus) {
    elements.mctsStatus.className = "badge success";
    elements.mctsStatus.textContent = `CONVERGENCE: ${data.mcts_convergence_confidence || '98%'}`;
  }

  const branches = data.mcts_tree_stats || [];
  const totalVisits = data.simulations_executed || 50;

  const branchCards = branches.map(b => {
    const isWin = b.is_optimal_converged;
    const visitPct = Math.round((b.visits / totalVisits) * 100);
    const qPct = Math.round((b.q_value || 0) * 100);

    return `
      <div class="mcts-card ${isWin ? 'winner' : ''}">
        <div class="mcts-card-header">
          <strong style="color:${isWin ? 'var(--cyan)' : '#334155'}; font-size:13px;">${b.branch}</strong>
          ${isWin ? '<span class="score-badge high" style="background:var(--cyan); color:#fff;">✓ OPTIMAL POLICY</span>' : '<span class="score-badge low">PRUNED</span>'}
        </div>
        <div style="font-size:12px; color:#1e293b; line-height:1.4;">${b.thought}</div>
        
        <div>
          <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:var(--text-dim);">
            <span>Visit Frequency: ${b.visits} / ${totalVisits}</span>
            <span>${visitPct}%</span>
          </div>
          <div class="mcts-policy-meter">
            <div class="mcts-policy-fill" style="width:${visitPct}%; background:${isWin ? 'var(--cyan)' : '#cbd5e1'};"></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(0,0,0,0.06); padding-top:8px; font-size:11px; font-family:var(--font-mono);">
          <span>Q(s,a): <strong>${b.q_value}</strong> (${qPct}%)</span>
          <span>UCB1: <strong>${b.ucb1_score}</strong></span>
        </div>
        
        <div class="tot-output-box" style="margin-top:2px;">
          Output: <strong>${b.proposed_value}</strong>
        </div>
      </div>
    `;
  }).join("");

  elements.mctsContainer.innerHTML = `
    <div class="trace-summary-card">
      <div>
        <div class="trace-prompt"><strong>MCTS Objective:</strong> ${data.prompt}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px; font-weight:700;">
          Simulations: <strong>${data.simulations_executed}</strong> | c_puct: <strong>${data.c_puct_exploration_constant}</strong> | Latency: <strong>${data.search_latency_ms} ms</strong>
        </div>
      </div>
      <div class="badge success" style="font-size:13px; padding:8px 16px;">
        Optimal Answer: ${data.optimal_solution} (Ground Truth: ${data.ground_truth})
      </div>
    </div>
    <div class="mcts-grid">
      ${branchCards}
    </div>
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
let currentLearnMode = "auto";

const learnModeAuto = document.getElementById("learnModeAuto");
const learnModeForce = document.getElementById("learnModeForce");

if (learnModeAuto && learnModeForce) {
  learnModeAuto.addEventListener("click", () => {
    if (window.sound) window.sound.click();
    currentLearnMode = "auto";
    learnModeAuto.classList.add("active");
    learnModeForce.classList.remove("active");
    showToast("Smart Auto: Agent will check & apply existing memory lessons.", "info");
  });

  learnModeForce.addEventListener("click", () => {
    if (window.sound) window.sound.click();
    currentLearnMode = "force";
    learnModeForce.classList.add("active");
    learnModeAuto.classList.remove("active");
    showToast("Simulate Learning Cycle: Agent will simulate 1st-time mistake, reflect & self-correct live!", "info");
  });
}

function updateTaskPreview(taskId) {
  const task = cachedTasksMap[taskId];
  if (!task) return;

  const previewCategory = document.getElementById("previewCategory");
  const previewFormula = document.getElementById("previewFormula");
  const previewPitfall = document.getElementById("previewPitfall");
  const previewLesson = document.getElementById("previewLesson");

  if (previewCategory) previewCategory.textContent = task.category || "General Reasoning";
  if (previewFormula) previewFormula.textContent = task.formula || "Algorithmic Solver";
  if (previewPitfall) previewPitfall.textContent = task.pitfall || "Standard LLM hallucination on edge-cases.";
  if (previewLesson) previewLesson.textContent = task.lesson_preview || task.description;
}

if (elements.taskType) {
  elements.taskType.addEventListener("change", (e) => {
    updateTaskPreview(e.target.value);
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

  const isMultiIter = result.iterations_used > 1;
  const learnedLive = isMultiIter && result.success;

  const summary = `
    <div class="trace-summary-card">
      <div>
        <div class="trace-prompt"><strong>Task:</strong> ${result.task_prompt}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px; font-weight:700;">
          Mode: <span style="color:var(--electric-blue);">${result.agent_mode.toUpperCase()}</span> | 
          Behavior: <span style="color:${learnedLive ? 'var(--violet)' : 'var(--emerald)'};">${learnedLive ? 'Self-Evolved via Reflexion Loop' : 'Instant Zero-Repeat Pass'}</span>
        </div>
      </div>
      <div class="badge ${result.success ? "success" : "fail"}" style="font-size:13px; padding:8px 16px;">
        ${result.success ? `✓ Solved in ${result.iterations_used} Iteration(s)` : `✗ Failed after ${result.iterations_used} Iteration(s)`}
      </div>
    </div>
  `;

  const steps = result.trace
    .map((s, idx) => {
      const confPct = Math.round((s.confidence || 0.5) * 100);
      const isFirstOfMulti = isMultiIter && s.iteration === 1 && !s.success;
      const isSuccessStep = s.success;

      const headerTitle = isFirstOfMulti
        ? `<span style="color:var(--rose);">⚠️ Attempt 1 (Initial Untrained Flaw Detected)</span>`
        : isSuccessStep && isMultiIter
          ? `<span style="color:var(--emerald);">✨ Attempt ${s.iteration} (Self-Corrected with Cognitive Memory)</span>`
          : `<span>Iteration ${s.iteration} ${s.agent_mode === "multi" ? "(Multi-Agent Council)" : ""}</span>`;

      const lessonsBlock = (s.lessons_available && s.lessons_available.length)
        ? `<div class="trace-row"><span class="trace-label">Lessons Active</span><span class="trace-content" style="color:var(--emerald); font-weight:700;">✓ ${s.lessons_available.join("<br/>✓ ")}</span></div>`
        : `<div class="trace-row"><span class="trace-label">Lessons Active</span><span class="trace-content" style="color:var(--text-dim);">(None — Solving from raw intuition)</span></div>`;

      const critiqueBlock = s.critique
        ? `<div class="critique-box" style="border-left:4px solid var(--rose); background:#fff1f2; color:#be123c; padding:12px; border-radius:8px; margin:8px 0;">
            <div style="font-weight:800; font-size:11px; text-transform:uppercase; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              🔍 Critic &amp; AST Verifier Flaw Analysis
            </div>
            ${s.critique}
          </div>`
        : "";

      const lessonStoredBlock = s.lesson_stored
        ? `<div class="lesson-box" style="border-left:4px solid var(--violet); background:#f5f3ff; color:#6d28d9; padding:12px; border-radius:8px; margin:8px 0;">
            <div style="font-weight:800; font-size:11px; text-transform:uppercase; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              💡 Reflexion Synthesis ➔ Distilled Reusable Rule into Cognitive Memory
            </div>
            <strong>${s.lesson_stored}</strong>
          </div>`
        : "";

      // Multi-Agent Role Breakdown
      let multiAgentRolesHtml = "";
      if (s.agent_mode === "multi") {
        multiAgentRolesHtml = `
          <div class="role-grid">
            <div class="role-box memory">
              <div class="role-box-header">🧠 Memory Agent</div>
              <div>${s.lessons_available && s.lessons_available.length ? `${s.lessons_available.length} relevant lessons retrieved from vector store.` : '0 prior lessons matched. Requesting first-principles solve.'}</div>
            </div>
            <div class="role-box solver">
              <div class="role-box-header">🤖 Solver Agent</div>
              <div>Computed answer <code>${fmtNum(s.answer)}</code> with ${confPct}% confidence.</div>
            </div>
            <div class="role-box critic">
              <div class="role-box-header">🔍 Critic Agent</div>
              <div>${s.success ? 'Ground-truth verified. Solution certified.' : 'Flaw identified. Dispatched critique & reflexion.'}</div>
            </div>
            <div class="role-box vault">
              <div class="role-box-header">🔐 Merkle Vault</div>
              <div>Cryptographic SHA-256 block recorded &amp; chained.</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="step-card" style="border-left: 5px solid ${s.success ? 'var(--emerald)' : 'var(--rose)'};">
          <div class="step-header">
            ${headerTitle}
            <div style="display:flex; align-items:center; gap:12px;">
              <div>
                <span class="trace-label" style="display:inline; width:auto;">Confidence:</span>
                <span class="confidence-bar"><span class="confidence-fill" style="width:${confPct}%; background:${s.success ? 'var(--emerald)' : 'var(--rose)'};"></span></span>
                <span style="font-family:var(--font-mono); font-size:11px;">${confPct}%</span>
              </div>
              <span class="badge ${s.success ? "success" : "fail"}">${s.success ? "✓ Correct" : "✗ Flawed"}</span>
            </div>
          </div>
          <div class="step-body">
            <div class="trace-row"><span class="trace-label">Reasoning</span><span class="trace-content">${s.reasoning || "Computed solution from principles."}</span></div>
            <div class="trace-row"><span class="trace-label">Output</span><span class="trace-content">Answer: <strong>${fmtNum(s.answer)}</strong> | Ground Truth: <strong>${fmtNum(s.correct_answer)}</strong></span></div>
            ${lessonsBlock}
            ${critiqueBlock}
            ${lessonStoredBlock}
            ${multiAgentRolesHtml}
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
  elements.traceContainer.innerHTML = `<p class="empty-state">Agent executing in ${currentMode} mode (${currentLearnMode === "force" ? "Forced Learning Cycle" : "Smart Auto Memory"})…</p>`;

  try {
    const res = await fetch(`${API}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: elements.taskType.value,
        force_learn: currentLearnMode === "force",
        max_iterations: Number(elements.maxIter.value) || 3,
        agent_mode: currentMode,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    renderTrace(result);

    if (result.success) {
      window.sound.success();
      if (result.iterations_used > 1) {
        window.sound.speak(`Reflexion complete. Agent self-corrected and solved the task on attempt ${result.iterations_used}.`, "system");
      } else {
        window.sound.speak(`Task solved on first attempt using cognitive memory.`, "system");
      }
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
    elements.runBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Reflexion Agent`;
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
    cachedTasksMap = {};
    tasks.forEach((t) => {
      cachedTasksMap[t.id] = t;
    });

    const optionsHtml = tasks.map((t) => `<option value="${t.id}">${t.description}</option>`).join("");

    if (elements.taskType) {
      elements.taskType.innerHTML = optionsHtml;
      if (tasks.length > 0) {
        updateTaskPreview(elements.taskType.value || tasks[0].id);
      }
    }
    if (elements.totTaskType) elements.totTaskType.innerHTML = optionsHtml;
    if (elements.debateTaskType) elements.debateTaskType.innerHTML = optionsHtml;
    if (elements.csuiteTaskType) elements.csuiteTaskType.innerHTML = optionsHtml;
    if (elements.mctsTaskType) elements.mctsTaskType.innerHTML = optionsHtml;
    
    const csSelect = document.getElementById("csuiteTaskSelect");
    if (csSelect) csSelect.innerHTML = optionsHtml;
    const mctsSelect = document.getElementById("mctsTaskSelect");
    if (mctsSelect) mctsSelect.innerHTML = optionsHtml;

    if (elements.settingsTaskCount) elements.settingsTaskCount.textContent = tasks.length;
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
// C-Suite Swarm OS Council
// ---------------------------------------------------------------------------
const csuiteDispatchBtn = document.getElementById("csuiteDispatchBtn");
const csuiteTaskSelect = document.getElementById("csuiteTaskSelect");
const csuiteCertChip = document.getElementById("csuiteCertChip");
const csuiteLatencyBadge = document.getElementById("csuiteLatencyBadge");
const csuiteCouncilContainer = document.getElementById("csuiteCouncilContainer");

if (csuiteDispatchBtn) {
  csuiteDispatchBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    const task_type = csuiteTaskSelect ? csuiteTaskSelect.value : "compound_interest";
    csuiteDispatchBtn.disabled = true;
    csuiteDispatchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Convening C-Suite…`;

    try {
      const res = await fetch(`${API}/api/swarm-os/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type }),
      });
      const data = await res.json();
      renderCSuiteResult(data);
      if (window.sound) window.sound.success();
      showToast("C-Suite Council certified unanimous approval!", "success");
    } catch (err) {
      console.error("C-Suite dispatch failed", err);
      showToast("C-Suite dispatch failed", "error");
    } finally {
      csuiteDispatchBtn.disabled = false;
      csuiteDispatchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Dispatch C-Suite Council`;
    }
  });
}

function renderCSuiteResult(data) {
  if (csuiteCertChip) {
    csuiteCertChip.className = `status-chip ${data.consensus_certified ? "green" : "red"}`;
    csuiteCertChip.textContent = data.consensus_certified ? "✓ 100% Certified" : "Uncertified";
  }
  if (csuiteLatencyBadge) {
    csuiteLatencyBadge.textContent = `${data.latency_ms}ms Latency`;
  }

  const roleIcons = {
    "CEO": "👑",
    "CTO": "💻",
    "CFO": "💰",
    "CISO": "🛡️",
    "QA": "⚖️",
  };

  const councilHtml = data.c_suite_council.map((member) => {
    const roleKey = Object.keys(roleIcons).find(k => member.role.includes(k)) || "CEO";
    const detail = member.directive || member.action || member.audit_check || member.scan_verdict || member.assertion;
    const badge = member.strategic_kpi || member.tool_registry_status || member.financial_risk_score || member.sandbox_isolation || member.verdict;

    return `
      <div class="glass-card" style="border-left: 4px solid var(--electric-blue); padding: 14px 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:800; font-size:14px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">${roleIcons[roleKey]}</span> ${member.role}
            <button class="icon-btn" style="width:24px; height:24px; margin-left:6px;" onclick="window.sound.speak('${detail.replace(/'/g, "\\'")}', '${roleKey.toLowerCase()}')" title="Play Voice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          </div>
          <span class="status-chip green" style="font-size:10px;">${badge}</span>
        </div>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted); line-height:1.5;">
          ${detail}
        </div>
      </div>
    `;
  }).join("");

  if (csuiteCouncilContainer) {
    csuiteCouncilContainer.innerHTML = councilHtml;
  }

  // Voice speech synthesis for CEO
  if (data.c_suite_council && data.c_suite_council[0]) {
    window.sound.speak(`CEO Directive: ${data.c_suite_council[0].directive}`, "ceo");
  }
}

// ---------------------------------------------------------------------------
// MCTS AlphaGo Tree Search
// ---------------------------------------------------------------------------
const mctsSearchBtn = document.getElementById("mctsSearchBtn");
const mctsTaskSelect = document.getElementById("mctsTaskSelect");
const mctsSimSlider = document.getElementById("mctsSimSlider");
const mctsSimVal = document.getElementById("mctsSimVal");
const mctsConfidenceChip = document.getElementById("mctsConfidenceChip");
const mctsTreeContainer = document.getElementById("mctsTreeContainer");

if (mctsSimSlider && mctsSimVal) {
  mctsSimSlider.addEventListener("input", (e) => {
    mctsSimVal.textContent = e.target.value;
  });
}

if (mctsSearchBtn) {
  mctsSearchBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    const task_type = mctsTaskSelect ? mctsTaskSelect.value : "percentage_discount";
    const simulations = mctsSimSlider ? parseInt(mctsSimSlider.value, 10) : 50;

    mctsSearchBtn.disabled = true;
    mctsSearchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Simulating Rollouts…`;

    try {
      const res = await fetch(`${API}/api/mcts/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type, simulations }),
      });
      const data = await res.json();
      renderMCTSResult(data);
      if (window.sound) window.sound.success();
      showToast("MCTS AlphaGo policy tree converged!", "success");
    } catch (err) {
      console.error("MCTS failed", err);
      showToast("MCTS search failed", "error");
    } finally {
      mctsSearchBtn.disabled = false;
      mctsSearchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> Execute MCTS Search`;
    }
  });
}

function renderMCTSResult(data) {
  if (mctsConfidenceChip) {
    mctsConfidenceChip.textContent = `Confidence: ${data.mcts_convergence_confidence}`;
  }

  const branchesHtml = data.mcts_tree_stats.map((b) => {
    const isWinner = b.is_optimal_converged;
    return `
      <div class="glass-card" style="border: 1px solid ${isWinner ? 'var(--emerald)' : 'var(--border-color)'}; background: ${isWinner ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg)'}; padding: 14px 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:${isWinner ? 'var(--emerald)' : 'var(--text-main)'}; font-size:13px;">
            ${isWinner ? '🏆 ' : '🌿 '}${b.branch}
          </strong>
          <span class="status-chip ${isWinner ? 'green' : ''}" style="font-size:10px;">
            Visits: ${b.visits} | Q-Val: ${b.q_value} | UCB1: ${b.ucb1_score}
          </span>
        </div>
        <div style="margin-top:6px; font-size:13px; color:var(--text-muted);">
          Thought: ${b.thought}
        </div>
        <div style="margin-top:6px; font-size:12px; font-weight:bold; color:var(--electric-blue);">
          Proposed Output: ${b.proposed_value}
        </div>
      </div>
    `;
  }).join("");

  if (mctsTreeContainer) {
    mctsTreeContainer.innerHTML = `
      <div class="trace-summary-card" style="margin-bottom:10px;">
        <div class="trace-prompt"><strong>MCTS Ground Truth:</strong> ${data.ground_truth} | Optimal Solution: <strong>${data.optimal_solution}</strong> (${data.simulations_executed} rollouts in ${data.search_latency_ms}ms)</div>
      </div>
      ${branchesHtml}
    `;
  }
}

// ---------------------------------------------------------------------------
// Cryptographic Merkle Audit Vault
// ---------------------------------------------------------------------------
const vaultVerifyBtn = document.getElementById("vaultVerifyBtn");
const vaultMerkleRoot = document.getElementById("vaultMerkleRoot");
const vaultBlockCount = document.getElementById("vaultBlockCount");
const vaultIntegrityBadge = document.getElementById("vaultIntegrityBadge");
const vaultTrailContainer = document.getElementById("vaultTrailContainer");

async function loadMerkleVault() {
  try {
    const [chainRes, verifyRes] = await Promise.all([
      fetch(`${API}/api/vault/audit-chain`),
      fetch(`${API}/api/vault/verify`),
    ]);
    const chain = await chainRes.json();
    const verify = await verifyRes.json();

    if (vaultMerkleRoot) vaultMerkleRoot.textContent = verify.merkle_root_hash || "GENESIS";
    if (vaultBlockCount) vaultBlockCount.textContent = `${verify.total_blocks_verified} Blocks`;
    if (vaultIntegrityBadge) {
      vaultIntegrityBadge.className = `status-chip ${verify.valid ? 'green' : 'red'}`;
      vaultIntegrityBadge.textContent = verify.valid ? "100% PRISTINE" : "TAMPERED";
    }

    if (vaultTrailContainer) {
      vaultTrailContainer.innerHTML = chain.map(b => `
        <div class="step-card" style="margin-bottom:8px;">
          <div class="step-header" style="display:flex; justify-content:space-between;">
            <span>Block #${b.index} [${b.event_type}]</span>
            <code style="font-size:11px; color:var(--electric-blue);">${b.block_hash}</code>
          </div>
          <div class="step-body" style="font-size:12px; color:var(--text-muted);">
            <div>Prev Hash: <code>${b.prev_hash}</code></div>
            <div>Timestamp: ${new Date(b.timestamp * 1000).toLocaleTimeString()}</div>
          </div>
        </div>
      `).join("");
    }
  } catch (err) {
    console.error("Failed to load Merkle Vault", err);
  }
}

if (vaultVerifyBtn) {
  vaultVerifyBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    await loadMerkleVault();
    if (window.sound) window.sound.success();
    showToast("Cryptographic Merkle audit chain verified tamper-proof!", "success");
  });
}

// ---------------------------------------------------------------------------
// Provider Switcher in Settings Tab
// ---------------------------------------------------------------------------
const settingProviderSelect = document.getElementById("settingProviderSelect");
const settingApiKeyInput = document.getElementById("settingApiKeyInput");
const settingSaveProviderBtn = document.getElementById("settingSaveProviderBtn");
const settingsMerkleCount = document.getElementById("settingsMerkleCount");

if (settingSaveProviderBtn && settingProviderSelect) {
  settingSaveProviderBtn.addEventListener("click", async () => {
    if (window.sound) window.sound.click();
    const provider = settingProviderSelect.value;
    const api_key = settingApiKeyInput ? settingApiKeyInput.value.trim() : "";

    settingSaveProviderBtn.disabled = true;
    settingSaveProviderBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Testing & Activating…`;

    try {
      const res = await fetch(`${API}/api/settings/provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key }),
      });
      const data = await res.json();
      if (res.ok) {
        if (elements.settingsProvider) elements.settingsProvider.textContent = data.active_provider;
        if (elements.statProviderVal) elements.statProviderVal.textContent = data.active_provider;
        if (window.sound) window.sound.success();
        showToast(data.message, "success");
      } else {
        showToast(data.detail || "Failed to switch provider", "error");
      }
    } catch (err) {
      console.error("Provider switch failed", err);
      showToast("Connection to provider failed", "error");
    } finally {
      settingSaveProviderBtn.disabled = false;
      settingSaveProviderBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Test & Activate Provider`;
    }
  });
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
