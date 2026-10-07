"""Ambience loops for Nomos: biome beds by time of day, town bustle at three levels, and the
country map.

Every loop is soundkit data: held noise beds for its whole length, plus seeded events scattered
over it, so it repeats without a seam. The recipes are the usual ones for synthesised nature:
filtered noise for wind, water and surf, sine chirps for birds, gated tone pulses for crickets
and frogs, and noise surges for waves. Every call is a generic, original shape, never a recording
or another game's cue. The town is murmuring noise and soft blips, with no words, voices or real
language in it.

Each loop is levelled to its own loudness inside the README's range (RMS -36 to -24 dBFS, peak at
most -6 dBFS). wonders.py builds on these pieces.

Build: python tools/sounds/ambience.py
"""
import math
import zlib

import numpy as np

import soundkit as sk

WHITE = sk.RATE        # a noise hold rate of one new level per sample: white noise
MUTE = -240            # an arp step 20 octaves down stalls a tone into DC, which the layer's
                       # highpass removes, so the step is silent: a gate for pulsed calls
PEAK_DB = -6


def noise(volume, lowpass=None, highpass=None, hold=WHITE, **shape):
    layer = {'wave': 'noise', 'freq': [hold, hold], 'volume': volume, **shape}
    if lowpass:
        layer['lowpass'] = lowpass
    if highpass:
        layer['highpass'] = highpass
    return layer


def burst(volume, lowpass, highpass, attack, decay, start=0.0, hold=WHITE):
    """Noise that swells over `attack` seconds and dies away over `decay`."""
    return noise(volume, lowpass, highpass, hold, start=start, length=attack + decay,
                 attack=attack, decay=decay, sustain=0, release=0)


def chirp(f0, f1, length, start=0.0, volume=1.0, wave='sine', attack=0.004, **extra):
    """A tone gliding from f0 to f1 Hz that fades to nothing over `length`."""
    return {'wave': wave, 'freq': [f0, f1], 'length': length, 'attack': attack, 'decay': length,
            'sustain': 0, 'release': 0.01, 'volume': volume, 'start': start, **extra}


def gated(f0, f1, length, rate, beat, start=0.0, volume=1.0, highpass=300, **extra):
    """A tone switched on and off by `beat` (0 sounds, MUTE rests) at `rate` steps a second."""
    return {'wave': 'triangle', 'freq': [f0, f1], 'length': length, 'attack': 0.01,
            'decay': length, 'sustain': 0.2, 'release': 0.03, 'arp': beat, 'arp_rate': rate,
            'highpass': highpass, 'volume': volume, 'start': start, **extra}


def event(count, layers, pitch=None, volume=None):
    """`count` copies of a sound at seeded times, each shifted within `pitch` semitones and
    scaled within `volume`."""
    e = {'count': count, 'sound': {'layers': layers}}
    if pitch:
        e['pitch'] = pitch
    if volume:
        e['volume'] = volume
    return e


def add(bank, name, rms, length, layers=(), events=()):
    """Adds a loop with its gain set so it plays at `rms` dBFS. It renders with the seed the bank
    will give it, so the level is exact."""
    defn = {'length': length, 'layers': list(layers), 'events': list(events)}
    x = sk.render_loop(defn, zlib.crc32(f'{bank.name}/{name}'.encode()))
    defn['gain'] = round(rms - 20 * math.log10(float(np.sqrt(np.mean(x * x)))), 1)
    bank.add(name, 'loop', defn)
    peak = bank.sounds[name]['peak_db']
    if peak > PEAK_DB:
        raise ValueError(f'{name}: peak {peak} dBFS is over {PEAK_DB}')


# --------------------------------------------------------------------------- air
def wind(volume, lowpass=450, bright=1000, gusts=0.1):
    """A steady low rush, and a brighter band that swells with the gusts."""
    return [noise(volume, lowpass, 60, swell=[gusts / 2, 0.4]),
            noise(volume * 0.6, bright, 250, swell=[gusts, 0.8])]


def rustle(volume, gusts=0.1):
    """Grass or leaves stirring: a high hiss swelling with the same gusts as the wind."""
    return noise(volume, 7000, 2500, swell=[gusts, 0.8])


def gust(count, lowpass=1200, highpass=200, volume=(0.4, 1.0)):
    return event(count, [burst(1.0, lowpass, highpass, 1.1, 1.6)], volume=volume)


def whistle(count, freq, volume=(0.4, 1.0)):
    """Wind singing over an edge: a pure tone that rises and fades with a gust."""
    return event(count, [{'wave': 'sine', 'freq': [freq, freq * 1.12], 'vibrato': [0.7, 0.5],
                          'length': 3.0, 'attack': 1.4, 'decay': 1.6, 'sustain': 0,
                          'release': 0.1}], pitch=[-2, 2], volume=volume)


# --------------------------------------------------------------------------- water
def surf(waves, foam=0.45, boom=0.0):
    """Breakers at fixed (seconds, size) offsets, held in one event so they keep their spacing
    however the seed places it: a swell rising, the crash, then foam hissing back. A boom is the
    crash thudding into rock."""
    layers = []
    for at, size in waves:
        layers += [burst(size, 700, 80, 1.8, 2.5, at),
                   burst(size * 0.8, 2500, 250, 0.35, 1.6, at + 1.5),
                   burst(size * foam, 4000, 2000, 0.6, 2.5, at + 1.9)]
        if boom:
            layers.append(burst(size * boom, 200, 40, 0.08, 1.4, at + 1.55, hold=900))
    return event(1, layers)


SEA = noise(0.5, 300, 40)
LAP = [burst(1.0, 500, 100, 0.06, 0.3), chirp(170, 260, 0.08, 0.03, 0.5)]


def babble(count, volume=(0.15, 1.0), lowpass=None):
    bubble = chirp(600, 1300, 0.035)          # a bubble's ring rises as it nears the surface
    if lowpass:
        bubble['lowpass'] = lowpass
    return event(count, [bubble], pitch=[-10, 10], volume=volume)


def lapping(count, volume=(0.3, 1.0)):
    return event(count, LAP, pitch=[-3, 3], volume=volume)


# --------------------------------------------------------------------------- creatures
CHIPS = [chirp(4300, 3300, 0.05, s) for s in (0, 0.12, 0.24)]
SONG = [chirp(2500, 3100, 0.16, 0, attack=0.02), chirp(3300, 2700, 0.2, 0.22, attack=0.02),
        {'wave': 'sine', 'freq': [3600, 3500], 'length': 0.45, 'attack': 0.02, 'decay': 0.45,
         'sustain': 0, 'release': 0.05, 'arp': [0, 3], 'arp_rate': 26, 'start': 0.5,
         'volume': 0.7}]
WARBLE = [{'wave': 'sine', 'freq': [2700, 3500], 'vibrato': [21, 1.4], 'length': 0.4,
           'attack': 0.02, 'decay': 0.4, 'sustain': 0, 'release': 0.05}]
TWITTER = [chirp(5000 * 2 ** (-k / 12), 4000 * 2 ** (-k / 12), 0.04, 0.07 * k) for k in range(6)]
LARK = [{'wave': 'sine', 'freq': [3300, 3300], 'arp': [0, 5, 2, 8, 3, 10, 1, 7, 4, 9],
         'arp_rate': 17, 'vibrato': [19, 0.8], 'length': 2.4, 'attack': 0.4, 'decay': 0,
         'release': 0.6, 'volume': 0.4}]
DRUM = [gated(1100, 1000, 0.75, 72, [0, MUTE, MUTE, MUTE], volume=1.8, highpass=400,
              sustain=0)]   # a woodpecker
HOOTS = [chirp(360, 385, 0.45, 0, attack=0.06, release=0.2),
         chirp(375, 390, 0.15, 0.95, 0.8, attack=0.03, release=0.08),
         chirp(375, 390, 0.15, 1.2, 0.8, attack=0.03, release=0.08),
         chirp(385, 350, 0.65, 1.5, 0.9, attack=0.06, release=0.3)]
RIBBIT = [gated(620, 520, 0.2, 150, [0, MUTE], lowpass=2500),
          gated(600, 500, 0.16, 150, [0, MUTE], 0.27, lowpass=2500)]
DEEP_CROAK = [gated(240, 200, 0.5, 80, [0, MUTE], highpass=120, lowpass=900)]
PEEP = [chirp(2700, 3150, 0.12, attack=0.01)]


def birds(level, chips=0, song=0, warble=0, twitter=0, lark=0, drum=0):
    """Birds near and far: each call type at its own count, shifted a little in pitch."""
    calls = [(chips, CHIPS), (song, SONG), (warble, WARBLE), (twitter, TWITTER), (lark, LARK),
             (drum, DRUM)]
    return [event(n, [{**layer, 'volume': layer.get('volume', 1.0) * level} for layer in call],
                  pitch=[-2, 2], volume=[0.3, 1.0]) for n, call in calls if n]


def gulls(count, level):
    """A gull's falling cry, three times: a soft triangle with a reedy saw under it."""
    layers = []
    for k in range(3):
        cry = {'freq': [1350, 950], 'vibrato': [2, 4], 'length': 0.24, 'attack': 0.015,
               'decay': 0.2, 'sustain': 0.3, 'release': 0.06, 'start': 0.32 * k}
        layers += [{'wave': 'triangle', 'volume': level, **cry},
                   {'wave': 'saw', 'volume': level * 0.35, 'lowpass': 2500, **cry}]
    return event(count, layers, pitch=[-2, 2], volume=[0.4, 1.0])


def crickets(count, freq, level, rate=66, pulses=3):
    """Crickets chirping for a few seconds each: `pulses` sine pulses per chirp, 24 steps per
    chirp, so `rate` sets how fast they chirp."""
    beat = [0, MUTE] * pulses + [MUTE] * (24 - 2 * pulses)
    return event(count, [{'wave': 'sine', 'freq': [freq, freq], 'length': 2.4, 'attack': 0.3,
                          'release': 0.6, 'arp': beat, 'arp_rate': rate, 'highpass': 2000,
                          'volume': level}], pitch=[-1, 1], volume=[0.3, 1.0])


def owl(count, level):
    return event(count, [{**layer, 'volume': layer['volume'] * level} for layer in HOOTS],
                 pitch=[-1.5, 1.5], volume=[0.4, 1.0])


# --------------------------------------------------------------------------- town
BLIP = [{'wave': 'sine', 'freq': [560, 620], 'length': 0.06, 'attack': 0.015, 'decay': 0.05,
         'sustain': 0.2, 'release': 0.03}]
STEP = [burst(1.0, 2500, 400, 0.003, 0.05)]
KNOCK = [chirp(220, 150, 0.05, wave='triangle'), burst(0.5, 3000, 800, 0.001, 0.015)]
CART = [noise(0.5, 300, 60, hold=160, length=2.5, attack=0.8, decay=1.7, sustain=0, release=0)]
VOICE_BANDS = [(600, 250, 1.0), (1000, 400, 1.0), (1800, 700, 0.6)]   # lowpass, highpass, volume
SYLLABLE = [burst(1.0, 900, 300, 0.04, 0.14)]


def murmur(volume, rates, depth):
    """A crowd too far off to make out: noise in three speech-like bands, each layer pulsing at
    its own syllable-like rate, so the sound shifts like many voices and never settles into one
    beat. It holds no pitch or formant pattern of any language."""
    return [noise(volume * v, lp, hp, swell=[r, depth])
            for r, (lp, hp, v) in zip(rates, VOICE_BANDS * 2)]


def bustle(level, syllables, blips, steps, knocks=0, carts=0):
    """Town life over the murmur: soft noise syllables at seeded times, so the chatter never
    falls into a pattern, chatter blips, footsteps, crates set down and passing carts."""
    sounds = [(syllables, SYLLABLE, None, 0.2, 1.0), (blips, BLIP, [-5, 5], 0.3, 0.8),
              (steps, STEP, [-2, 2], 0.3, 1.0), (knocks, KNOCK, [-3, 3], 0.5, 1.0),
              (carts, CART, None, 0.6, 1.0)]
    return [event(n, layers, pitch, [lo * level, hi * level])
            for n, layers, pitch, lo, hi in sounds if n]


def build():
    bank = sk.Bank('ambience')

    add(bank, 'amb_grassland_day', -31, 20,
        wind(1.0, bright=800) + [rustle(0.05)],
        birds(0.5, chips=3, warble=2, twitter=2, lark=2))
    add(bank, 'amb_grassland_night', -32, 12,
        wind(0.35, 350, 700),
        [crickets(8, 4500, 0.2), crickets(5, 3900, 0.15, rate=50, pulses=4)])

    add(bank, 'amb_forest_day', -30, 20,
        wind(0.7, 500, 900, 0.12) + [rustle(0.08, 0.12)],
        birds(0.5, chips=4, song=3, warble=3, twitter=2, drum=1)
        + [event(3, [burst(1.0, 7000, 2500, 0.4, 1.0)], volume=[0.1, 0.2])])
    add(bank, 'amb_forest_night', -32, 20,
        wind(0.4, 400, 800, 0.08) + [rustle(0.05, 0.08)],
        [owl(2, 0.3), crickets(8, 4800, 0.12), crickets(3, 4100, 0.1, rate=50, pulses=4)])

    add(bank, 'amb_coast_day', -28, 20,
        [SEA] + wind(0.4, 500, 1100, 0.12),
        [surf([(0, 1.0), (7.2, 0.75), (13.4, 0.9)]), gulls(3, 0.4)])
    add(bank, 'amb_coast_night', -29, 20,
        [SEA],
        [surf([(0, 0.9), (6.6, 0.7), (13.6, 0.8)], foam=0.25)])

    add(bank, 'amb_river', -28, 12,
        [noise(0.5, 1400, 200, swell=[0.4, 0.3]), noise(0.35, 1000, 150, swell=[0.65, 0.3]),
         noise(0.08, 8000, 3000, swell=[0.9, 0.5])],
        [babble(250, (0.1, 0.6)), event(25, [chirp(250, 500, 0.06)], pitch=[-5, 5],
                                          volume=[0.2, 0.5])])
    add(bank, 'amb_marsh', -30, 16,
        [noise(0.5, 500, 80, swell=[0.1, 0.4])],
        [event(10, RIBBIT, pitch=[-3, 3], volume=[0.15, 0.45]),
         event(20, PEEP, pitch=[-2, 2], volume=[0.04, 0.12]),
         event(2, DEEP_CROAK, pitch=[-2, 2], volume=[0.1, 0.2]),
         lapping(6, (0.2, 0.5))])

    add(bank, 'amb_desert', -31, 20,
        [noise(1.0, 1200, 300, swell=[0.05, 0.6]), noise(0.2, 9000, 4000, swell=[0.1, 0.9])],
        [gust(3, 1500, 300)])
    add(bank, 'amb_mountain', -29, 20,
        wind(0.6, 700, 1600, 0.15),
        [gust(5, 1100, 200, (0.6, 1.4)), whistle(2, 700, (0.08, 0.2))])
    add(bank, 'amb_snow', -33, 20,
        [noise(1.0, 500, 80, swell=[0.05, 0.4]), noise(0.1, 5000, 2000, swell=[0.1, 0.7])],
        [whistle(1, 1100, (0.06, 0.1))])

    add(bank, 'amb_town_quiet', -32, 16,
        murmur(0.12, [3.1, 4.7, 3.9], 0.6), bustle(0.25, 40, 5, 10))
    add(bank, 'amb_town_busy', -29, 16,
        murmur(0.25, [2.9, 3.7, 4.6, 5.3], 0.7) + [noise(0.15, 700, 200)],
        bustle(0.6, 80, 16, 30, 3))
    add(bank, 'amb_town_market', -26, 16,
        murmur(0.3, [2.7, 3.3, 4.1, 4.9, 5.6, 3.9], 0.6) + [noise(0.25, 700, 200)],
        bustle(1.0, 120, 32, 45, 8, 2))

    add(bank, 'amb_country', -31, 24,
        wind(0.8, 600, 900, 0.08)
        + [noise(0.08, 6000, 2500, swell=[0.07, 0.6]),
           noise(0.7, 250, 40, swell=[0.083, 0.7]), noise(0.5, 350, 60, swell=[0.125, 0.5])])
    return bank


if __name__ == '__main__':
    build().save()
