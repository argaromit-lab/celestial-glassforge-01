export class FoundryAudio {
  constructor() { this.muted = false; this.volume = .36; this.ctx = null; this.tick = 0; this.clock = 0; }
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let n = 9127;
      for (let i = 0; i < length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; d[i] = n / 2147483648 - 1; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  setMute(value) { this.muted = value; if (this.master) this.master.gain.setTargetAtTime(value ? 0 : this.volume, this.ctx.currentTime, .05); }
  tone(freq, duration, type = 'sine', volume = .1, slide = 1, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), a = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + duration);
    a.gain.setValueAtTime(.0001, t); a.gain.exponentialRampToValueAtTime(volume, t + .008); a.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(a); a.connect(this.master); o.start(t); o.stop(t + duration + .02);
  }
  hiss(duration = .22, volume = .13, frequency = 2700) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), a = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = frequency; f.Q.value = .9;
    a.gain.setValueAtTime(volume, t); a.gain.exponentialRampToValueAtTime(.0001, t + duration);
    s.connect(f); f.connect(a); a.connect(this.master); s.start(t); s.stop(t + duration);
  }
  event(name, strength = 1) {
    if (name === 'blow') { this.hiss(.18, .045, 1200); this.tone(220, .24, 'sine', .035, 1.5); }
    if (name === 'trap') { [880, 1320, 1760].forEach((f, i) => this.tone(f, .32, 'sine', .07, 1, i * .045)); }
    if (name === 'shatter') {
      this.hiss(.35, .18, 4200); this.tone(110, .3, 'triangle', .22, .25);
      [1175, 1568, 2349, 3136].forEach((f, i) => this.tone(f, .35 + i * .03, 'sine', .07, .85, i * .018));
    }
    if (name === 'dash') { this.hiss(.16, .12, 1700); this.tone(180, .13, 'triangle', .08, 3); }
    if (name === 'hit') { this.tone(135, .18, 'sawtooth', .12, .32); this.hiss(.15, .12, 320); }
    if (name === 'pickup') this.tone(1046 + strength * 70, .12, 'sine', .045, 1.5);
    if (name === 'click') this.tone(660, .08, 'triangle', .06, 1.25);
    if (name === 'forge') [262, 330, 392, 523].forEach((f, i) => this.tone(f, .75, 'sine', .1, 1, i * .1));
    if (name === 'boss') { this.tone(55, 1.8, 'sawtooth', .14, .75); this.hiss(1.2, .14, 180); }
    if (name === 'victory') [293.66, 369.99, 440, 587.33, 739.99].forEach((f, i) => this.tone(f, 1.5, 'triangle', .1, 1, i * .15));
    if (name === 'defeat') [220, 196, 164.81, 110].forEach((f, i) => this.tone(f, .8, 'triangle', .1, .95, i * .2));
  }
  update(dt, playing, realm) {
    if (!playing || !this.ctx || this.muted) return;
    this.clock -= dt;
    if (this.clock > 0) return;
    this.clock = .39;
    const notes = [146.83, 220, 293.66, 329.63, 440, 329.63, 293.66, 220];
    const i = this.tick++;
    this.tone(notes[(i + realm * 2) % notes.length], .7, 'sine', .022);
    if (i % 4 === 0) this.tone(73.42, 1.5, 'triangle', .028);
    if (i % 8 === 6) this.hiss(.2, .018, 6500);
  }
}
