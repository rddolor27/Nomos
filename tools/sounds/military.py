"""Military sounds near garrisons, forts and road patrols: drill, change of watch, marching, gates, kit at rest.

Storybook and neutral by rule: no battle, no drawn or clashing weapons, no menace and no fanfare.
The horn call steps D4-E4-D4 in plain even notes, so it stays clear of bugle calls, which leap
through arpeggios with dotted rhythms. The drill cadence is written as a step grid, one character
per sixteenth: X an accent, x a soft hit, . a rest. Marching comes as a short run of steps and as
one squad footfall, which the game can time to the walk cycle and keep softer.

Each sound gives its loudness as RMS in dBFS, and soundkit.add_effect() sets the gain that reaches it.

Build: python tools/sounds/military.py
"""
import soundkit as sk
from soundkit import add_effect, hiss, pluck

D4, E4 = 62, 64
STEP = 0.15
CADENCE = {
    'bass':  'X...x...X...x...X',
    'snare': '....X..x....X.xx.',
}


def bass(at, loud):
    """A soft felt-mallet boom with a muffled click."""
    return [pluck(at, [130, 75], 0.25, 0.6 * loud, 'sine'), hiss(at, 2000, 0.01, 0.15 * loud, lowpass=1500)]


def snare(at, loud):
    """A field-drum snap: a burst of snare noise over a short tone from the drum head."""
    return [hiss(at, 10000, 0.12, 0.35 * loud, highpass=300, lowpass=6000),
            pluck(at, [200, 160], 0.04, 0.3 * loud)]


DRUMS = {'bass': bass, 'snare': snare}


def cadence(grid):
    return [layer for drum, row in grid.items() for i, mark in enumerate(row) if mark != '.'
            for layer in DRUMS[drum](i * STEP, 1.0 if mark == 'X' else 0.45)]


def horn(at, note, length, volume):
    """A plain horn note: a filtered saw over a triangle with a slow swell, warm rather than brassy."""
    tone = {'start': at, 'note': note, 'length': length, 'attack': 0.06, 'decay': length, 'sustain': 0.7,
            'release': 0.12, 'vibrato': [5, 0.08]}
    return [{**tone, 'wave': 'saw', 'volume': volume, 'lowpass': 1000},
            {**tone, 'wave': 'triangle', 'volume': volume * 0.8}]


def footfall(at, volume):
    """One step taken together: a few boots a hair apart, which reads as a squad in step."""
    return [hiss(at + lag, [2200, 1400], 0.06, volume, attack=0.01, highpass=200, lowpass=1500)
            for lag in (0, 0.011, 0.023)] + [pluck(at, [100, 60], 0.05, volume * 0.8)]


SOUNDS = {
    'military_drill-drum': (-27.5, cadence(CADENCE)),
    'military_watch-horn': (-24, [*horn(0, D4, 0.35, 0.3), *horn(0.42, E4, 0.35, 0.3), *horn(0.84, D4, 0.6, 0.3)]),
    'military_march': (-27.5, [layer for k in range(4) for layer in footfall(0.5 * k, 0.3 if k % 2 else 0.35)]),
    'military_march-step': (-27.5, footfall(0, 0.35)),
    'military_gate-creak': (-27, [
        {'wave': 'pulse', 'duty': 0.2, 'freq': [55, 85], 'length': 0.8, 'attack': 0.15, 'decay': 0.65,
         'sustain': 0.5, 'release': 0.15, 'vibrato': [4, 1.5], 'highpass': 400, 'lowpass': 1600, 'volume': 0.4},
        {'start': 0.2, 'wave': 'pulse', 'duty': 0.15, 'freq': [190, 240], 'length': 0.45, 'attack': 0.1,
         'decay': 0.35, 'sustain': 0.4, 'release': 0.12, 'vibrato': [7, 0.8], 'highpass': 600, 'lowpass': 2000,
         'volume': 0.15},
        pluck(1.0, [120, 60], 0.15, 0.3),
        hiss(1.0, 1500, 0.05, 0.18, lowpass=900),
    ]),
    'military_spear-tap': (-23.5, [
        hiss(0, 14000, 0.006, 0.25, highpass=2500),
        pluck(0, [1100, 800], 0.03, 0.35),
        pluck(0.002, [220, 160], 0.05, 0.35),
        pluck(0, [2900, 2900], 0.06, 0.06, 'sine'),
    ]),
    'military_helmet-clink': (-27, [
        hiss(0, 12000, 0.004, 0.1, highpass=3000),
        *[pluck(0, [1150 * ratio] * 2, ring, volume, 'triangle' if ratio == 1 else 'sine')
          for ratio, ring, volume in ((1, 0.18, 0.4), (1.46, 0.13, 0.22), (2.18, 0.09, 0.1))],
    ]),
}


def build():
    bank = sk.Bank('military')
    for name, (rms_db, layers) in SOUNDS.items():
        add_effect(bank, name, rms_db, layers)
    return bank


if __name__ == '__main__':
    build().save()
