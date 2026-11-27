"use strict";

class MidiPlayer {
  constructor(onEnd) {
    this.onEnd = onEnd;
    this.context = null;
    this.notes = [];
    this.position = 0;
    this.active = [];
    this.interval = null;
    this.running = false;
  }

  async load(buffer) {
    this.stop();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const text = i => String.fromCharCode(...bytes.slice(i, i + 4));
    if (text(0) !== "MThd" || view.getUint16(12) & 0x8000) throw new Error("不支持此 MIDI 格式");
    const division = view.getUint16(12), tracks = view.getUint16(10), events = [];
    let at = 8 + view.getUint32(4);
    const variable = state => {
      let n = 0, c;
      do { if (state.i >= state.end) throw new Error("MIDI 数据不完整"); c = bytes[state.i++]; n = n * 128 + (c & 127); } while (c & 128);
      return n;
    };
    for (let t = 0; t < tracks; t++) {
      if (text(at) !== "MTrk") throw new Error("MIDI 音轨无效");
      const state = {i: at + 8, end: at + 8 + view.getUint32(at + 4)};
      if (state.end > bytes.length) throw new Error("MIDI 音轨不完整");
      let tick = 0, running = 0;
      while (state.i < state.end) {
        tick += variable(state);
        let status = bytes[state.i];
        if (status & 128) { state.i++; if (status < 240) running = status; }
        else { if (!running) throw new Error("MIDI 事件无效"); status = running; }
        if (status === 255) {
          const type = bytes[state.i++], length = variable(state);
          if (type === 81 && length === 3) events.push({tick, tempo: bytes[state.i] * 65536 + bytes[state.i + 1] * 256 + bytes[state.i + 2]});
          state.i += length;
        } else if (status === 240 || status === 247) {
          const length = variable(state);
          state.i += length;
        } else if (status < 240) {
          const type = status >> 4, channel = status & 15, key = bytes[state.i++];
          const value = type === 12 || type === 13 ? 0 : bytes[state.i++];
          if ((type === 8 || type === 9) && channel !== 9) events.push({tick, channel, key, on: type === 9 && value > 0, velocity: value});
        } else throw new Error("不支持的 MIDI 事件");
        if (state.i > state.end) throw new Error("MIDI 事件不完整");
      }
      at = state.end;
    }
    events.sort((a, b) => a.tick - b.tick);
    let tempo = 500000, prev = 0, seconds = 0;
    const active = new Map(), notes = [];
    for (const event of events) {
      seconds += (event.tick - prev) * tempo / division / 1000000; prev = event.tick;
      if (event.tempo) { tempo = event.tempo; continue; }
      const id = event.channel + ":" + event.key;
      if (event.on) {
        if (!active.has(id)) active.set(id, []);
        active.get(id).push({start: seconds, key: event.key, velocity: event.velocity});
      } else {
        const queue = active.get(id);
        if (queue && queue.length) {
          const note = queue.shift(); note.end = seconds;
          if (note.end > note.start) notes.push(note);
        }
      }
    }
    if (!notes.length) throw new Error("MIDI 中没有可播放的音符");
    this.notes = notes.sort((a, b) => a.start - b.start);
    this.length = Math.max(...notes.map(n => n.end));
  }

  async play() {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
    this.running = true;
    this.started = this.context.currentTime - this.position;
    this.index = this.notes.findIndex(n => n.start >= this.position);
    if (this.index < 0) this.index = this.notes.length;
    this.pump();
    this.interval = setInterval(() => this.pump(), 100);
  }

  pump() {
    if (!this.running) return;
    const now = this.context.currentTime, position = now - this.started;
    while (this.index < this.notes.length && this.notes[this.index].start < position + 0.3) {
      const note = this.notes[this.index++], start = Math.max(now, this.started + note.start), end = this.started + note.end;
      if (end <= start) continue;
      const oscillator = this.context.createOscillator(), gain = this.context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = 440 * Math.pow(2, (note.key - 69) / 12);
      const level = Math.min(.035, note.velocity / 127 * .035);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + Math.min(.02, (end - start) / 2));
      gain.gain.setValueAtTime(level, end);
      gain.gain.linearRampToValueAtTime(0, end + .06);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(start); oscillator.stop(end + .07);
      this.active.push(oscillator);
      oscillator.onended = () => { this.active = this.active.filter(item => item !== oscillator); };
    }
    if (position >= this.length + .1) { this.stop(); this.onEnd(); }
  }

  pause() {
    if (!this.running) return;
    this.position = Math.min(this.length, this.context.currentTime - this.started);
    this.running = false; clearInterval(this.interval);
    for (const oscillator of this.active) { try { oscillator.stop(); } catch (error) { console.error(error); } }
    this.active = [];
  }

  stop() { this.pause(); this.position = 0; }
}
