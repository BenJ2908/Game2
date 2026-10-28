// Entirely original synthesized sounds. One cached noise buffer, limited voices,
// master compressor and a user-controlled volume; no downloads or autoplay.
export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.lastStep = -1;
  }
  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        this.master.connect(compressor);
        compressor.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(
          1,
          this.ctx.sampleRate,
          this.ctx.sampleRate,
        );
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume().catch(() => {});
      this.setVolume();
    } catch {
      /* Optional audio must never block gameplay. */
    }
  }
  setVolume() {
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.settings.muted ? 0 : this.settings.volume,
        this.ctx.currentTime,
        0.02,
      );
  }
  voice(volume, duration, pan = 0, delay = 0) {
    const time = this.ctx.currentTime + delay;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.001),
      time + 0.003,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.connect(panner);
    panner.connect(this.master);
    setTimeout(
      () => {
        gain.disconnect();
        panner.disconnect();
      },
      (duration + delay + 0.1) * 1000,
    );
    return { gain, time };
  }
  tone(
    frequency,
    end,
    duration,
    volume = 0.1,
    type = "sine",
    pan = 0,
    delay = 0,
  ) {
    if (!this.ctx) return;
    const { gain, time } = this.voice(volume, duration, pan, delay),
      o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(frequency, time);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(end, 10),
      time + duration,
    );
    o.connect(gain);
    o.start(time);
    o.stop(time + duration);
    o.onended = () => o.disconnect();
  }
  hiss(
    frequency,
    duration,
    volume = 0.1,
    pan = 0,
    delay = 0,
    highpass = false,
  ) {
    if (!this.ctx) return;
    const { gain, time } = this.voice(volume, duration, pan, delay),
      s = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter();
    s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = highpass ? "highpass" : "lowpass";
    f.frequency.value = frequency;
    f.Q.value = 0.5;
    s.connect(f);
    f.connect(gain);
    s.start(time, Math.random() * 0.3);
    s.stop(time + duration);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
    };
  }
  play(kind, pan = 0) {
    if (
      !this.ctx ||
      this.ctx.state !== "running" ||
      this.settings.muted ||
      this.settings.volume <= 0
    )
      return;
    switch (kind) {
      case "rifle":
        this.hiss(4200, 0.12, 0.24);
        this.tone(155, 42, 0.16, 0.29);
        this.hiss(1300, 0.24, 0.055, 0, 0.03);
        this.tone(1800, 600, 0.025, 0.035, "triangle", 0, 0.045);
        break;
      case "smg":
        this.hiss(5800, 0.075, 0.17);
        this.tone(200, 75, 0.09, 0.16);
        this.hiss(1800, 0.12, 0.04, 0, 0.02);
        break;
      case "shotgun":
        this.hiss(5500, 0.24, 0.38);
        this.tone(110, 26, 0.32, 0.4);
        this.hiss(1200, 0.45, 0.1, 0, 0.035);
        this.tone(650, 230, 0.09, 0.065, "triangle", 0, 0.32);
        break;
      case "hit":
        this.tone(1550, 1000, 0.055, 0.075, "triangle");
        this.hiss(6500, 0.035, 0.05);
        break;
      case "head":
        this.tone(2300, 1400, 0.07, 0.1, "triangle");
        this.tone(3200, 2700, 0.035, 0.04, "sine", 0, 0.025);
        break;
      case "kill":
        this.tone(900, 1400, 0.08, 0.12, "triangle");
        this.tone(1700, 2200, 0.1, 0.09, "sine", 0, 0.045);
        break;
      case "reload":
        this.hiss(2200, 0.12, 0.09);
        this.tone(260, 130, 0.07, 0.08, "triangle");
        break;
      case "rack":
        this.hiss(4500, 0.09, 0.11);
        this.tone(900, 280, 0.06, 0.06, "square");
        break;
      case "empty":
        this.tone(220, 110, 0.035, 0.07, "square");
        break;
      case "step":
        this.hiss(480, 0.09, 0.095, pan);
        this.tone(75, 35, 0.075, 0.045, "sine", pan);
        break;
      case "land":
        this.hiss(650, 0.16, 0.14);
        this.tone(90, 27, 0.12, 0.1);
        break;
      case "dash":
        this.hiss(3200, 0.28, 0.12);
        this.tone(160, 450, 0.18, 0.05);
        break;
      case "slide":
        this.hiss(1800, 0.5, 0.12);
        break;
      case "hurt":
        this.hiss(1000, 0.17, 0.13, pan);
        this.tone(100, 38, 0.18, 0.12, "triangle", pan);
        break;
      case "enemy":
        this.tone(320, 90, 0.12, 0.055, "sawtooth", pan);
        this.hiss(1900, 0.09, 0.05, pan);
        break;
      case "warn":
        this.tone(500, 900, 0.12, 0.06, "sine", pan);
        break;
      case "near":
        this.hiss(6800, 0.14, 0.06, pan, 0, true);
        break;
      case "pickup":
        this.tone(600, 950, 0.08, 0.09);
        this.tone(1100, 1500, 0.12, 0.07, "sine", 0, 0.07);
        break;
      case "grenade":
        this.hiss(2600, 0.1, 0.1);
        this.tone(380, 160, 0.1, 0.06);
        break;
      case "explosion":
        this.hiss(1800, 0.55, 0.3, pan);
        this.tone(80, 23, 0.5, 0.35, "sine", pan);
        break;
      case "melee":
        this.hiss(1700, 0.14, 0.11);
        this.tone(180, 55, 0.13, 0.15);
        break;
      case "wave":
        for (let i = 0; i < 3; i++)
          this.tone(
            [440, 550, 660][i],
            [440, 550, 660][i],
            0.16,
            0.07,
            "triangle",
            0,
            i * 0.11,
          );
        break;
      case "upgrade":
        for (let i = 0; i < 4; i++)
          this.tone(
            440 * 2 ** (i / 3),
            440 * 2 ** (i / 3),
            0.2,
            0.08,
            "sine",
            0,
            i * 0.07,
          );
        break;
      case "death":
        this.tone(260, 30, 0.8, 0.2, "triangle");
        this.hiss(800, 0.6, 0.15);
        break;
      case "win":
        for (let i = 0; i < 5; i++)
          this.tone(
            [440, 550, 660, 880, 1100][i],
            [440, 550, 660, 880, 1100][i],
            0.4,
            0.09,
            "triangle",
            0,
            i * 0.14,
          );
        break;
    }
  }
}
