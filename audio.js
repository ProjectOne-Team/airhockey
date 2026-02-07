export class AudioManager {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffer = null;
        this.sourceNode = null;
        this.musicStarted = false;
    }

    async init(path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            this.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) { console.error("Audio Load Error", e); }
    }

    playMusic() {
        if (!this.buffer || this.musicStarted) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.sourceNode = this.audioCtx.createBufferSource();
        this.sourceNode.buffer = this.buffer;
        this.sourceNode.loop = true;
        this.sourceNode.connect(this.audioCtx.destination);
        this.sourceNode.start();
        this.musicStarted = true;
    }

    updatePitch(timeScale) {
        if (this.sourceNode) {
            this.sourceNode.detune.setTargetAtTime((timeScale - 1.0) * 1200, this.audioCtx.currentTime, 0.1);
        }
    }

    playSound(freq, duration, timeScale, vol = 0.1) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(freq * timeScale, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(); osc.stop(this.audioCtx.currentTime + duration);
    }
}