"""Natural-wonder soundscapes for Nomos: one loop for each wonder view, named after the wonder
sprites in tools/sprites/wonders.py.

These are the game's beautiful views, so every loop stays calm: soft onsets, no stingers, and the
geyser's one eruption a loop swells in rather than bursting. The shared pieces (wind, surf, birds,
bubbles) come from ambience.py; the ones here belong to a single wonder. Every wonder is fictional,
and so is its sound: nothing is recorded or copied from a real place or another game.

Build: python tools/sounds/wonders.py
"""
import soundkit as sk
from ambience import (MUTE, SEA, add, babble, birds, burst, chirp, event, gated, gulls, gust,
                      lapping, noise, rustle, surf, whistle, wind)


def echoed(layers, delay, repeats=2, fade=0.35, lowpass=1800):
    """A call and its echoes off far walls: each repeat later, softer and duller."""
    out = list(layers)
    for k in range(1, repeats + 1):
        out += [{**layer, 'start': layer.get('start', 0.0) + k * delay,
                 'volume': layer.get('volume', 1.0) * fade ** k, 'lowpass': lowpass / k}
                for layer in layers]
    return out


# A fall's churning foot: dull thumps of water striking the pool, and brighter splashes.
CHURN = [burst(1.0, 500, 80, 0.05, 0.4, hold=3000)]
SPLASH = [burst(1.0, 3000, 800, 0.02, 0.25)]

# Steam, water and sinter: big slow bubbles, and the plop as each one breaks.
BLUB = [chirp(140, 260, 0.09), burst(0.5, 600, 100, 0.005, 0.06)]
SIMMER = [chirp(280, 520, 0.05)]

# The geyser: the ground rumbling up, the jet, its hiss, then the spray pattering back.
ERUPTION = [noise(1.0, 200, 40, hold=600, length=3.0, attack=2.8, decay=0.2, sustain=0.5,
                  release=1.5),
            noise(0.9, 3000, 250, start=2.6, length=3.8, attack=0.9, decay=1.2, sustain=0.6,
                  release=2.0),
            noise(0.35, 9000, 2500, start=2.7, length=3.5, attack=1.1, decay=1.5, sustain=0.5,
                  release=2.5),
            noise(0.25, 5000, 1200, start=5.5, length=1.5, attack=0.8, decay=0, sustain=1,
                  release=3.0)]
GURGLE = [chirp(120, 220, 0.12, attack=0.02), chirp(160, 300, 0.08, 0.1, 0.6)]

# Cave water: a drop's ring rises as it strikes, and the walls answer it.
DRIP = echoed([chirp(1100, 2100, 0.03, attack=0.001)], 0.13, fade=0.35, lowpass=2400)
# A struck crystal: a long ring with a faint, inharmonic upper partial, like glass.
SPARKLE = [chirp(2900, 2900, 1.6, attack=0.01), chirp(8000, 8000, 0.5, attack=0.01, volume=0.15)]

# A bird of prey's falling cry, thrown back by the canyon walls.
CRY = echoed([{'wave': 'sine', 'freq': [2900, 2000], 'vibrato': [28, 0.3], 'length': 0.8,
               'attack': 0.05, 'decay': 0.8, 'sustain': 0, 'release': 0.05},
              {'wave': 'saw', 'freq': [2900, 2000], 'vibrato': [28, 0.3], 'length': 0.8,
               'attack': 0.05, 'decay': 0.8, 'sustain': 0, 'release': 0.05, 'volume': 0.2,
               'lowpass': 3500}], 0.6, fade=0.5, lowpass=2500)
CANYON_GUST = [burst(1.0, 1400, 250, 1.0, 1.4), burst(0.35, 900, 250, 1.0, 1.4, 0.6)]

# Ice under strain: a rough creak rising as it slips, and the falling ping of a crack.
CREAK = [gated(380, 620, 0.9, 90, [0, MUTE], lowpass=1600, attack=0.2, sustain=0)]
PING = [chirp(2600, 900, 0.3)]

# Wind through the arch: a hollow two-tone whistle, the second a fifth over the first.
HOLLOW = [{'wave': 'sine', 'freq': [f, f * 1.1], 'vibrato': [0.6, 0.4], 'length': 3.2,
           'attack': 1.5, 'decay': 1.7, 'sustain': 0, 'release': 0.1, 'volume': v}
          for f, v in ((520, 1.0), (780, 0.4))]

# Sand streaming off a crest, and the low hum a sliding dune can give.
SAND = [burst(1.0, 9000, 2500, 1.2, 2.0)]
HUM = [{'wave': 'triangle', 'freq': [105, 98], 'length': 4.0, 'attack': 2.0, 'decay': 2.0,
        'sustain': 0, 'release': 0.1, 'lowpass': 400}]


def build():
    bank = sk.Bank('wonders')

    add(bank, 'wonder_waterfall', -26, 10,
        [noise(0.5, 160, 30, hold=700), noise(1.0, 400, 60, swell=[0.3, 0.15]),
         noise(0.65, 1000, 150, swell=[0.2, 0.15]), noise(0.12, 7000, 2500)],
        [event(14, CHURN, volume=[0.2, 0.5]), event(10, SPLASH, volume=[0.2, 0.5])])

    add(bank, 'wonder_giant-tree', -30, 20,
        wind(0.5, 400, 800, 0.1) + [rustle(0.12, 0.1), noise(0.06, 9000, 3500, swell=[0.17, 0.7])],
        birds(0.3, chips=3, song=3, warble=2, twitter=2, drum=1)
        + [event(5, [burst(1.0, 7000, 2500, 0.5, 1.2)], volume=[0.15, 0.3])])

    add(bank, 'wonder_sea-arch', -27, 20,
        [SEA] + wind(0.3, 500, 1100, 0.12),
        [surf([(0, 1.0), (6.8, 0.8), (13.2, 0.9)], boom=0.9), gulls(3, 0.4)])

    add(bank, 'wonder_stone-arch', -30, 20,
        [noise(1.0, 1200, 200, swell=[0.05, 0.6]), noise(0.15, 9000, 3500, swell=[0.1, 0.8])],
        [event(3, HOLLOW, pitch=[-2, 2], volume=[0.1, 0.25]), gust(2, 1500, 300)])

    add(bank, 'wonder_hot-springs', -30, 12,
        [noise(0.15, 5000, 1500, swell=[0.5, 0.3]), noise(0.05, 9000, 4000, swell=[0.08, 0.6]),
         noise(0.3, 300, 60, hold=2000)],
        [event(60, SIMMER, pitch=[-7, 7], volume=[0.1, 0.5]),
         event(8, BLUB, pitch=[-4, 4], volume=[0.2, 0.5]),
         event(10, [chirp(1200, 2000, 0.03)], pitch=[-4, 4], volume=[0.05, 0.15])])

    add(bank, 'wonder_geyser', -28, 24,
        [noise(0.35, 140, 30, hold=500, swell=[0.1, 0.3]),
         noise(0.15, 500, 150, hold=1500, swell=[0.25, 0.5]), noise(0.03, 8000, 3000)],
        [event(1, ERUPTION), event(12, GURGLE, pitch=[-3, 3], volume=[0.1, 0.3])])

    add(bank, 'wonder_crystal-cave', -33, 16,
        [noise(0.3, 250, 40, swell=[0.0625, 0.4])],
        [event(7, DRIP, pitch=[-5, 7], volume=[0.15, 0.5]),
         event(6, SPARKLE, pitch=[-5, 5], volume=[0.02, 0.05])])

    add(bank, 'wonder_caldera-lake', -32, 20,
        wind(0.35, 450, 900, 0.08) + [noise(0.04, 6000, 2500, swell=[0.1, 0.6])],
        [lapping(14, (0.4, 1.0))] + birds(0.2, song=1, warble=1))

    add(bank, 'wonder_canyon-view', -30, 20,
        wind(0.9, 600, 1300, 0.1) + [noise(0.12, 900, 250, swell=[0.5, 0.3])],
        [babble(80, (0.15, 0.5), lowpass=1200), event(3, CANYON_GUST, volume=[0.4, 0.8]),
         event(1, CRY, pitch=[-2, 2], volume=[0.25, 0.35])])

    add(bank, 'wonder_glacier', -30, 20,
        [noise(1.0, 800, 150, swell=[0.05, 0.5]), noise(0.5, 1500, 400, swell=[0.15, 0.8]),
         noise(0.08, 9000, 3500, swell=[0.15, 0.8])],
        [whistle(2, 1250, (0.08, 0.2)), event(2, CREAK, pitch=[-3, 3], volume=[0.4, 0.8]),
         event(2, PING, pitch=[-4, 4], volume=[0.1, 0.2])])

    add(bank, 'wonder_dune', -30, 20,
        [noise(0.8, 500, 70, swell=[0.05, 0.5]), noise(0.2, 9000, 3000, swell=[0.1, 0.9]),
         noise(0.15, 7000, 2000, swell=[0.15, 0.8])],
        [event(3, SAND, volume=[0.2, 0.4]), event(1, HUM, volume=[0.04, 0.06])])
    return bank


if __name__ == '__main__':
    build().save()
