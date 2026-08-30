/**
 * Self-Evolve Real-Time Tactile Sound Synthesizer,
 * Multi-Character Natural Speech Synthesis (TTS),
 * and Multi-Lingual/Tanglish Voice Recognition Engine.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ttsEnabled = true;
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.selectedVoice = null;
    this.initVoices();
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext init warning:", e);
    }
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      this.voices = this.synth.getVoices() || [];
      if (this.voices.length > 0) {
        // Prefer natural English voices (Google, Microsoft, Apple)
        this.selectedVoice = this.voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neural")))
          || this.voices.find(v => v.lang.startsWith("en"))
          || this.voices[0];
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Tactile Mechanical Push Button Snap
  click() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.035);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Mechanical Relay Switch
  relay() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.setValueAtTime(800, t + 0.02);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Success Harmonic Dual-Chime
  success() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.07);

      gain.gain.setValueAtTime(0.25, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.32);
    });
  }

  // Error Low Resonance Thud
  error() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Real-Time Multi-Character Text-to-Speech (TTS)
  speak(text, persona = "system") {
    if (!this.ttsEnabled || !this.synth) return;
    
    // Cancel prior speech to prevent backlog queue
    try {
      this.synth.cancel();
    } catch (e) {}

    const cleanText = text.replace(/<[^>]*>?/gm, "").replace(/[`*#_~]/g, "").slice(0, 300);
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Assign character voice & pitch
    if (persona === "proposer" || persona === "cto") {
      utterance.pitch = 1.2;
      utterance.rate = 1.05;
    } else if (persona === "adversary" || persona === "ciso") {
      utterance.pitch = 0.75;
      utterance.rate = 0.95;
    } else if (persona === "judge" || persona === "ceo") {
      utterance.pitch = 0.9;
      utterance.rate = 0.9;
    } else if (persona === "cfo" || persona === "qa") {
      utterance.pitch = 1.05;
      utterance.rate = 1.0;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn("TTS Speech error", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Real-Time Speech Recognition (Voice Commander)
// ---------------------------------------------------------------------------
class VoiceCommander {
  constructor(onResultCallback, onStatusChangeCallback) {
    this.onResult = onResultCallback;
    this.onStatus = onStatusChangeCallback;
    this.recognition = null;
    this.isListening = false;
    this.supported = false;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      this.supported = false;
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";
      this.supported = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStatus) this.onStatus(true);
      };

      this.recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          if (this.onResult) this.onResult(transcript);
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("Speech recognition notice:", e.error);
        this.isListening = false;
        if (this.onStatus) this.onStatus(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStatus) this.onStatus(false);
      };
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition", e);
      this.supported = false;
    }
  }

  toggle() {
    if (!this.supported || !this.recognition) {
      alert("Microphone voice recognition is supported on Chrome, Edge, and Chromium browsers. Please ensure microphone permission is allowed.");
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
      if (this.onStatus) this.onStatus(false);
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("Speech recognition restart catch:", e);
      }
    }
  }
}

window.sound = new AudioEngine();
