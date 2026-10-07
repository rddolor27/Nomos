"""Town event sounds near the camera: purchases, emotes, doors, footsteps, work, town fixtures and animals.

One purchase sound plays whatever the amount or buyer. Each emote has one blip, shared by everyone,
in one neutral voice (a triangle with a faint pulse edge); the game adds a small pitch wobble per
event. Animals are stylised chiptune calls, not recordings. Two pulses a fraction of a semitone
apart beat against each other, which gives the sheep, goat and horse their tremble.

Each sound gives its loudness as RMS in dBFS, and soundkit.add_effect() sets the gain that reaches it.

Build: python tools/sounds/events.py
"""
import soundkit as sk
from soundkit import add_effect, bell, hiss, pitched, pluck

G4, A6 = 67, 93


def voice(at, pitch, length, volume, release=0.03, **extra):
    """The emote voice, the same for everyone: a triangle with a faint pulse edge."""
    tone = {'start': at, **pitched(pitch), 'length': length, 'attack': 0.01, 'release': release, **extra}
    return [{**tone, 'wave': 'triangle', 'volume': volume},
            {**tone, 'wave': 'pulse', 'volume': volume / 4, 'lowpass': 2500}]


def call(at, wave, freq, length, volume, beat=0.0, **extra):
    """An animal call: a held tone with a soft attack, doubled `beat` semitones up when it should tremble."""
    tone = {'start': at, 'wave': wave, 'freq': freq, 'length': length, 'attack': 0.03, 'decay': length,
            'sustain': 0.5, 'release': 0.1, 'volume': volume, **extra}
    return [tone, {**tone, 'detune': beat}] if beat else [tone]


def ping(at, hz, ring, volume):
    """A small metal ping: three inharmonic partials, which read as metal rather than a note."""
    return [pluck(at, [hz, hz], ring, volume),
            pluck(at, [hz * 1.46, hz * 1.46], ring * 0.75, volume * 0.55, 'sine'),
            pluck(at, [hz * 2.18, hz * 2.18], ring * 0.5, volume * 0.25, 'sine')]


def flutter(at, flaps, gap, rate, volume):
    """Wing beats that fade as the bird climbs away."""
    return [hiss(at + gap * k + 0.006 * (k % 3), rate, 0.03, volume * (1 - k / (flaps + 2)), attack=0.008,
                 highpass=600, lowpass=3500) for k in range(flaps)]


SOUNDS = {
    'trade_purchase': (-27.5, [
        hiss(0, 12000, 0.005, 0.1, highpass=3000),
        *ping(0, 2000, 0.1, 0.35),
        hiss(0.06, 12000, 0.005, 0.08, highpass=3000),
        *ping(0.06, 2250, 0.16, 0.35),
    ]),
    'emote_heart': (-25, voice(0, [523, 784], 0.1, 0.4, release=0.2, vibrato=[6, 0.25])),
    'emote_question': (-24, [*voice(0, G4, 0.06, 0.35), *voice(0.1, [415, 660], 0.1, 0.35, release=0.04)]),
    'emote_exclaim': (-25.5, [*voice(0, [880, 1760], 0.035, 0.35, release=0.01),
                              *voice(0.05, A6, 0.04, 0.3, release=0.06)]),
    'emote_food': (-22, [
        layer for at in (0, 0.11) for layer in (
            *voice(at, [330, 247], 0.05, 0.35),
            hiss(at + 0.01, 3000, 0.03, 0.12, highpass=500, lowpass=2500),
        )
    ]),
    'emote_sleep': (-26, [
        *voice(0, [620, 330], 0.35, 0.3, release=0.12, attack=0.06, decay=0.29, sustain=0.4, vibrato=[5, 0.3]),
        hiss(0, 1500, 0.4, 0.05, attack=0.1, lowpass=1200),
    ]),
    'emote_sweat': (-23.5, [
        pluck(0, [800, 1900], 0.04, 0.45, 'sine'),
        pluck(0.08, [900, 2100], 0.035, 0.25, 'sine'),
    ]),
    'emote_coin': (-27.5, [hiss(0, 12000, 0.004, 0.08, highpass=3000), *ping(0, 1800, 0.2, 0.4)]),
    'door_open': (-26.5, [
        hiss(0, 9000, 0.008, 0.15, highpass=1500),
        pluck(0, [1300, 900], 0.012, 0.15),
        {'start': 0.03, 'wave': 'pulse', 'duty': 0.15, 'freq': [160, 260], 'length': 0.22, 'attack': 0.04,
         'decay': 0.18, 'sustain': 0.4, 'release': 0.06, 'vibrato': [12, 0.6], 'highpass': 500, 'lowpass': 2200,
         'volume': 0.3},
    ]),
    'door_close': (-22.5, [
        pluck(0, [150, 70], 0.09, 0.5),
        hiss(0, 1200, 0.03, 0.25, lowpass=800),
        hiss(0.03, 9000, 0.006, 0.18, highpass=2000),
        pluck(0.03, [1200, 900], 0.01, 0.2),
    ]),
    'step_grass': (-27.5, [hiss(0, [3500, 2200], 0.06, 0.5, attack=0.01, highpass=500, lowpass=2500)]),
    'step_path': (-27, [
        hiss(0, [2500, 1500], 0.05, 0.5, attack=0.003, highpass=150, lowpass=1800),
        pluck(0, [120, 80], 0.03, 0.2),
    ]),
    'step_paving': (-24.5, [
        hiss(0, 12000, 0.015, 0.3, highpass=2000, lowpass=6000),
        pluck(0, [500, 350], 0.025, 0.35),
    ]),
    'step_sand': (-27.5, [hiss(0, [4500, 2800], 0.06, 0.4, attack=0.015, highpass=800, lowpass=3000)]),
    'work_harvest': (-24.5, [
        hiss(0, 5000, 0.15, 0.25, attack=0.03, highpass=800, lowpass=4000),
        pluck(0.1, [300, 900], 0.04, 0.35, 'sine'),
        pluck(0.2, [180, 110], 0.06, 0.4),
    ]),
    'work_hammer': (-24.5, [
        layer for i, at in enumerate((0, 0.26, 0.52)) for layer in (
            hiss(at, 15000, 0.008, 0.2, highpass=2500),
            pluck(at, [950 - 40 * i, 700 - 30 * i], 0.05, 0.35),
            pluck(at + 0.004, [180, 120], 0.07, 0.45),
            pluck(at, [2600, 2600], 0.03, 0.08, 'sine'),
        )
    ]),
    'town_clock-chime': (-27.5, [
        hiss(0, 8000, 0.006, 0.15, highpass=1000),
        bell(0, [220, 220], 1.8, 0.35),
        *[bell(0, [220 * ratio] * 2, ring, volume, 'sine') for ratio, ring, volume in (
            (0.5, 2.0, 0.15), (1.2, 1.2, 0.12), (1.5, 0.9, 0.08), (2, 1.4, 0.25), (2.5, 0.6, 0.08),
            (3, 0.5, 0.06), (4.2, 0.3, 0.05))],
    ]),
    'town_windmill': (-27.5, [
        hiss(0, [800, 1500], 0.5, 0.06, attack=0.25, lowpass=1500),
        {'wave': 'pulse', 'duty': 0.2, 'freq': [45, 75], 'length': 0.45, 'attack': 0.12, 'decay': 0.33,
         'sustain': 0.3, 'release': 0.12, 'vibrato': [6, 1.2], 'highpass': 500, 'lowpass': 1500, 'volume': 0.4},
        pluck(0.5, [140, 100], 0.08, 0.3),
        {'start': 0.6, 'wave': 'pulse', 'duty': 0.2, 'freq': [70, 50], 'length': 0.35, 'attack': 0.1,
         'decay': 0.25, 'sustain': 0.3, 'release': 0.1, 'vibrato': [5, 1.0], 'highpass': 500, 'lowpass': 1500,
         'volume': 0.3},
    ]),
    'animal_cow': (-22, call(0, 'pulse', [118, 100], 0.75, 0.5, duty=0.4, attack=0.12, sustain=1, release=0.25,
                             vibrato=[0.8, 1.5], lowpass=650, highpass=70)),
    'animal_sheep': (-24.5, call(0, 'pulse', [340, 300], 0.45, 0.3, beat=0.4, duty=0.25, decay=0.4, sustain=0.6,
                                 release=0.15, vibrato=[7.5, 0.5], lowpass=2400, highpass=200)),
    'animal_goat': (-25.5, call(0, 'pulse', [500, 430], 0.38, 0.3, beat=0.6, duty=0.125, attack=0.02, decay=0.3,
                                sustain=0.6, vibrato=[11, 0.9], lowpass=3000, highpass=300)),
    'animal_chicken': (-27, [
        *[pluck(at, freq, 0.05, 0.4, 'pulse', duty=0.25, highpass=400, lowpass=3500)
          for at, freq in ((0, [700, 520]), (0.12, [680, 500]), (0.27, [600, 540]))],
        *call(0.33, 'pulse', [880, 620], 0.12, 0.45, duty=0.25, attack=0.008, decay=0.1, sustain=0.4,
              release=0.04, vibrato=[22, 0.5], highpass=400, lowpass=3500),
    ]),
    'animal_dog': (-23, [
        layer for at, f in ((0, 1.0), (0.2, 0.92)) for layer in (
            hiss(at, 6000, 0.015, 0.2, lowpass=2500),
            pluck(at, [480 * f, 300 * f], 0.1, 0.45, 'pulse', attack=0.005, duty=0.4, lowpass=1600, highpass=150),
            pluck(at, [240 * f, 150 * f], 0.1, 0.3, attack=0.005),
        )
    ]),
    'animal_duck': (-24, [
        layer for at in (0, 0.18) for layer in call(
            at, 'pulse', [420, 340], 0.1, 0.4, duty=0.125, attack=0.005, decay=0.09, sustain=0.4, release=0.04,
            vibrato=[30, 0.6], highpass=400, lowpass=2600)
    ]),
    'animal_horse': (-27.5, [
        *call(0, 'pulse', [1000, 450], 0.6, 0.3, beat=0.3, duty=0.25, attack=0.04, decay=0.5, sustain=0.4,
              release=0.15, vibrato=[14, 1.2], highpass=300, lowpass=3000),
        hiss(0.8, [2500, 1200], 0.15, 0.3, attack=0.01, highpass=200, lowpass=1500),
    ]),
    'animal_cat': (-24, [
        *call(0, 'pulse', [520, 470], 0.4, 0.35, duty=0.25, attack=0.06, decay=0.3, sustain=0.6, release=0.12,
              vibrato=[1.2, 3.5], highpass=250, lowpass=1800),
        *call(0, 'triangle', [520, 470], 0.4, 0.3, attack=0.06, decay=0.3, sustain=0.6, release=0.12,
              vibrato=[1.2, 3.5]),
    ]),
    'animal_pig': (-22, [
        layer for at in (0, 0.16) for layer in (
            pluck(at, [180, 140], 0.09, 0.4, 'pulse', attack=0.008, duty=0.125, lowpass=1000, highpass=100),
            hiss(at, 900, 0.07, 0.15, lowpass=800),
        )
    ]),
    'animal_birds-takeoff': (-27.5, [
        *flutter(0, 12, 0.045, 4000, 0.35),
        *flutter(0.025, 10, 0.05, 5000, 0.25),
        pluck(0.02, [2800, 3600], 0.04, 0.2, 'sine'),
        pluck(0.2, [3200, 2600], 0.05, 0.15, 'sine'),
        pluck(0.33, [3000, 3800], 0.035, 0.12, 'sine'),
    ]),
}


def build():
    bank = sk.Bank('events')
    for name, (rms_db, layers) in SOUNDS.items():
        add_effect(bank, name, rms_db, layers)
    return bank


if __name__ == '__main__':
    build().save()
