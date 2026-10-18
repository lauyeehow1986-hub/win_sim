/**
 * sounds.js - Web Audio API Synthesizer for Authentic Windows 11 Soundscapes.
 */
class WindowsAudio {
    constructor() {
        this.ctx = null;
    }

    _init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    playErrorChime() {
        try {
            this._init();
            const now = this.ctx.currentTime;
            
            // Windows error chime: double damped harmonic tone
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = "sine";
            osc1.frequency.setValueAtTime(540, now);
            osc1.frequency.exponentialRampToValueAtTime(320, now + 0.28);

            osc2.type = "triangle";
            osc2.frequency.setValueAtTime(270, now);
            osc2.frequency.exponentialRampToValueAtTime(160, now + 0.28);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
        } catch (e) {
            // Audio policy might mute if no user gesture yet
        }
    }

    playSuccessChime() {
        try {
            this._init();
            const now = this.ctx.currentTime;

            // Windows logon ascending chord: C5 - E5 - G5 - C6
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0.0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.7);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.75);
            });
        } catch (e) {
            // ignore
        }
    }
}

window.winAudio = new WindowsAudio();
