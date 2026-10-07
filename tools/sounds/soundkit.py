"""Shared kit for Nomos's original chiptune sounds: every sound is plain data, rendered by code.

A definition is a JSON-ready dict, so the game's own synth can later play the very bank the
previews come from:
- an effect is a list of layers, each one oscillator with a pitch sweep and an envelope;
- a loop (ambience) holds layers for its whole length, scatters seeded events over it and folds
  everything that runs past the end back onto the start, so it repeats without a seam;
- a music track is a step sequencer over named instruments.

Noise and event times come from a 32-bit integer hash rather than a library generator, so a
TypeScript synth can reproduce every sample.

Build one category: python tools/sounds/<category>.py writes assets/sounds/<category>.json and WAV
previews in dist/sounds/<category>/.
"""
import json
import math
import re
import wave
import zlib
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

RATE = 22050
PEAK = 0.89                       # -1 dBFS, headroom for the game's mixer
FOLD = 0.25                       # seconds crossfaded where a held loop layer meets its own start
ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets' / 'sounds'
PREVIEWS = ROOT / 'dist' / 'sounds'
NAME = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*(?:_[a-z0-9]+(?:-[a-z0-9]+)*)*$')
KINDS = ('effect', 'loop', 'music')
MASK = 0xFFFFFFFF


def note_hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def db(value):
    return 10 ** (value / 20)


def hash32(seed, index):
    """lowbias32 over (seed, index), vectorised: the same values a port computes with Math.imul."""
    x = (np.asarray(index, dtype=np.uint64) ^ np.uint64(seed & MASK)) & np.uint64(MASK)
    x ^= x >> np.uint64(16)
    x = (x * np.uint64(0x7FEB352D)) & np.uint64(MASK)
    x ^= x >> np.uint64(15)
    x = (x * np.uint64(0x846CA68B)) & np.uint64(MASK)
    return x ^ (x >> np.uint64(16))


def unit(seed, index):
    """Hash values mapped to [0, 1)."""
    return hash32(seed, index).astype(np.float64) / 2 ** 32


def _pitch(layer, t):
    f0, f1 = layer['freq'] if 'freq' in layer else (note_hz(layer['note']),) * 2
    f = f0 * (f1 / f0) ** np.clip(t / max(layer['length'], 1e-9), 0, 1)
    f = f * 2 ** (layer.get('detune', 0) / 12)
    if 'vibrato' in layer:
        rate, depth = layer['vibrato']
        f = f * 2 ** (depth / 12 * np.sin(2 * math.pi * rate * t))
    if 'arp' in layer:
        steps = np.asarray(layer['arp'], dtype=float)
        f = f * 2 ** (steps[(t * layer.get('arp_rate', 30)).astype(int) % len(steps)] / 12)
    return f


def _wave(layer, f, seed):
    kind = layer['wave']
    if kind == 'noise':
        # A new random level every 1/f seconds, like a chip's noise channel: lower f, darker noise.
        held = np.floor(np.cumsum(f / RATE)).astype(np.int64)
        return unit(seed, held) * 2 - 1
    phase = np.cumsum(f / RATE) % 1.0
    if kind == 'pulse':
        return np.where(phase < layer.get('duty', 0.5), 1.0, -1.0)
    if kind == 'triangle':
        return 4 * np.abs(phase - 0.5) - 1
    if kind == 'saw':
        return 2 * phase - 1
    if kind == 'sine':
        return np.sin(2 * math.pi * phase)
    raise ValueError(f'unknown wave {kind!r}')


def _envelope(layer, t):
    a, d = layer.get('attack', 0.005), layer.get('decay', 0.0)
    s, r = layer.get('sustain', 1.0), layer.get('release', 0.02)
    gate = layer['length']
    x = np.minimum(t, gate)
    rise = np.minimum(x / a, 1.0) if a > 0 else np.ones_like(x)
    fall = 1 - (1 - s) * np.clip((x - a) / d, 0, 1) if d > 0 else np.full_like(x, s)
    level = np.where(x < a, rise, fall)
    tail = np.clip(1 - (t - gate) / r, 0, 1) if r > 0 else (t <= gate).astype(float)
    return level * np.where(t > gate, tail, 1.0)


def _onepole(x, cutoff):
    a = 1 - math.exp(-2 * math.pi * cutoff / RATE)
    return lfilter([a], [1, a - 1], x)


def render_layer(layer, seed=0):
    n = max(1, int(round((layer['length'] + layer.get('release', 0.02)) * RATE)))
    t = np.arange(n) / RATE
    x = _wave(layer, _pitch(layer, t), seed) * _envelope(layer, t) * layer.get('volume', 1.0)
    if 'lowpass' in layer:
        x = _onepole(x, layer['lowpass'])
    if 'highpass' in layer:
        x = x - _onepole(x, layer['highpass'])
    return x


def _mix(parts, n=None, wrap=False):
    """Sum (start sample, samples) parts; a wrapped mix folds overruns back onto the start."""
    n = n or max(k + len(x) for k, x in parts)
    out = np.zeros(n)
    for k, x in parts:
        if wrap:
            np.add.at(out, (k + np.arange(len(x))) % n, x)
        else:
            out[k:k + len(x)] += x[:max(0, n - k)]
    return out


def render_effect(defn, seed=0):
    parts = [(int(round(layer.get('start', 0.0) * RATE)), render_layer(layer, seed + i))
             for i, layer in enumerate(defn['layers'])]
    return _mix(parts) * db(defn.get('gain', 0))


def render_loop(defn, seed=0):
    length = defn['length']
    n = int(round(length * RATE))
    fold = int(FOLD * RATE)
    held = []
    for i, layer in enumerate(defn.get('layers', [])):
        x = render_layer({'attack': 0, 'release': 0, **layer, 'length': length + FOLD + 0.01}, seed + i)
        # Constant-power ramps: held layers are mostly noise, which a linear crossfade dips by 3 dB.
        y = x[:n].copy()
        y[:fold] = x[:fold] * np.sqrt(np.linspace(0, 1, fold)) + x[n:n + fold] * np.sqrt(np.linspace(1, 0, fold))
        if 'swell' in layer:
            rate, depth = layer['swell']
            cycles = max(1, round(rate * length))
            y *= 1 - depth / 2 + depth / 2 * np.sin(2 * math.pi * cycles * np.arange(n) / n)
        held.append((0, y))
    events = []
    for e, event in enumerate(defn.get('events', [])):
        key = seed * 1000 + e
        for k in range(event['count']):
            at = int(unit(key, 4 * k) * n)
            lo, hi = event.get('pitch', (0, 0))
            shift = lo + (hi - lo) * unit(key, 4 * k + 1)
            v0, v1 = event.get('volume', (1, 1))
            loud = v0 + (v1 - v0) * unit(key, 4 * k + 2)
            sound = {'layers': [{**layer, 'detune': layer.get('detune', 0) + float(shift),
                                 'volume': layer.get('volume', 1.0) * float(loud)}
                                for layer in event['sound']['layers']]}
            events.append((at, render_effect(sound, int(hash32(key, 4 * k + 3)))))
    return _mix(held + events, n, wrap=True) * db(defn.get('gain', 0))


def render_music(defn, seed=0):
    step = 60 / defn['tempo'] * defn.get('step_beats', 0.25)
    n = int(round(defn['steps'] * step * RATE))
    parts = []
    for i, track in enumerate(defn['tracks']):
        inst = defn['instruments'][track['instrument']]
        for j, (at, note, steps, velocity) in enumerate(track['notes']):
            layer = {**inst, 'length': steps * step * inst.get('gate', 0.9),
                     'volume': inst.get('volume', 1.0) * velocity}
            if 'freq' not in inst:
                layer['note'] = note
            parts.append((int(round(at * step * RATE)), render_layer(layer, seed + 7919 * i + j)))
    return _mix(parts, n, wrap=defn.get('loop', True)) * db(defn.get('gain', 0))


RENDER = {'effect': render_effect, 'loop': render_loop, 'music': render_music}


def render(kind, defn, seed=0):
    return RENDER[kind](defn, seed)


def write_wav(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


class Bank:
    """Collects named sound definitions, renders each to check it, and saves the bank as JSON
    plus WAV previews. The JSON holds only data, exactly what the game's synth will read."""

    def __init__(self, name):
        self.name = name
        self.sounds = {}
        self.audio = {}

    def add(self, name, kind, defn, **meta):
        if not NAME.match(name):
            raise ValueError(f'{name}: name breaks the naming convention')
        if name in self.sounds:
            raise ValueError(f'duplicate sound name {name!r}')
        if kind not in KINDS:
            raise ValueError(f'{name}: unknown kind {kind!r}')
        defn = json.loads(json.dumps(defn))
        seed = zlib.crc32(f'{self.name}/{name}'.encode())
        x = render(kind, defn, seed)
        peak = float(np.max(np.abs(x)))
        if not np.isfinite(x).all() or peak > PEAK or peak == 0:
            raise ValueError(f'{name}: peak {peak:.3f} outside (0, {PEAK}]')
        rms = float(np.sqrt(np.mean(x * x)))
        self.sounds[name] = {'kind': kind, 'seed': seed, 'seconds': round(len(x) / RATE, 3),
                             'peak_db': round(20 * math.log10(peak), 1), 'rms_db': round(20 * math.log10(rms), 1),
                             **meta, 'def': defn}
        self.audio[name] = x

    def save(self):
        ASSETS.mkdir(parents=True, exist_ok=True)
        out = ASSETS / f'{self.name}.json'
        bank = {'rate': RATE, 'sounds': self.sounds}
        out.write_text(json.dumps(bank, indent=1) + '\n', encoding='utf-8')
        for name, x in self.audio.items():
            write_wav(PREVIEWS / self.name / f'{name}.wav', x)
        return out
