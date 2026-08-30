/**
 * Web Audio API Tactile Sound Synthesizer, Multi-Character Speech Synthesis (TTS),
 * and Voice Recognition Engine.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ttsEnabled = true;
    this.synth = window.speechSynthesis || null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Tactile Mechanical Push Button Snap
  click() {
    if (this.muted) return;
    this.init();
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

  // Multi-Character Text-to-Speech (TTS)
  speak(text, persona = "system") {
    if (!this.ttsEnabled || !this.synth) return;
    
    // Stop prior ongoing utterance
    this.synth.cancel();

    const cleanText = text.replace(/<[^>]*>?/gm, "").slice(0, 200);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Persona-specific vocal profiles
    if (persona === "proposer") {
      utterance.pitch = 1.2;
      utterance.rate = 1.05;
    } else if (persona === "adversary") {
      utterance.pitch = 0.75;
      utterance.rate = 0.95;
    } else if (persona === "judge") {
      utterance.pitch = 0.9;
      utterance.rate = 0.88;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    this.synth.speak(utterance);
  }
}

// ---------------------------------------------------------------------------
// Speech Recognition (Voice Commander)
// ---------------------------------------------------------------------------
class VoiceCommander {
  constructor(onResultCallback, onStatusChangeCallback) {
    this.onResult = onResultCallback;
    this.onStatus = onStatusChangeCallback;
    this.recognition = null;
    this.isListening = false;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatus) this.onStatus(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.onResult) this.onResult(transcript);
    };

    this.recognition.onerror = (e) => {
      console.error("Speech error", e);
      this.isListening = false;
      if (this.onStatus) this.onStatus(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStatus) this.onStatus(false);
    };
  }

  toggle() {
    if (!this.recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge.");
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
}

window.sound = new AudioEngine();
