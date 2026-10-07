"""Music: title, lab, town by day and by night, the country map and four festival styles.

Each track is written as chord symbols and note-name phrases ('C5:4' is C5 for four steps, 'r:2'
a rest), and small helpers expand them into the explicit [step, midi note, length in steps,
velocity] notes the game's synth reads. Phrases mark bar lines with |, and a bar line off the
meter's grid raises, so a miscounted bar cannot slip into the bank.

The festival styles share one instrument set (FESTIVAL), one key pair (F major and its relative,
D natural minor) and one accompaniment rule (festival_band), so they differ only in tempo, meter,
loudness and structure, as the culture rules ask.

Build: python tools/sounds/music.py
"""
import re

import soundkit as sk

PITCH = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
ACCIDENTAL = {'': 0, '#': 1, 'b': -1}
NOTE = re.compile(r'^([A-G])([#b]?)(\d)$')
CHORD = re.compile(r'^([A-G])([#b]?)(maj7|m7|m|7|sus4|6)?(?:/([A-G])([#b]?))?$')
QUALITY = {None: (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11),
           'm7': (0, 3, 7, 10), 'sus4': (0, 5, 7), '6': (0, 4, 7, 9)}
MAJOR = (0, 2, 4, 5, 7, 9, 11)
F, G = 5, 7
HAT, SNARE = 120, 96               # noise hold rates as MIDI notes: higher is brighter


def midi(name):
    letter, accidental, octave = NOTE.match(name).groups()
    return 12 * (int(octave) + 1) + PITCH[letter] + ACCIDENTAL[accidental]


def melody(text, bar, beat=4):
    """Phrase text to notes. Downbeats sound a little louder than beats, and beats than off-beats."""
    notes, at = [], 0
    for token in text.split():
        if token == '|':
            if at % bar:
                raise ValueError(f'bar line at step {at} is off the {bar}-step bar')
            continue
        name, steps = token.split(':')
        if name != 'r':
            notes.append([at, midi(name), int(steps), 1.0 if at % bar == 0 else 0.9 if at % beat == 0 else 0.8])
        at += int(steps)
    return notes


def chords(text, bar):
    """'F | C/E | Gm C' to (start, length, root, pitch classes, bass) per chord; chords split a bar evenly."""
    prog = []
    for k, symbols in enumerate(text.strip(' |').split('|')):
        names = symbols.split()
        if bar % len(names):
            raise ValueError(f'{len(names)} chords cannot share a {bar}-step bar')
        for j, name in enumerate(names):
            letter, accidental, quality, under, under_accidental = CHORD.match(name).groups()
            root = (PITCH[letter] + ACCIDENTAL[accidental]) % 12
            bass_pc = (PITCH[under] + ACCIDENTAL[under_accidental]) % 12 if under else root
            length = bar // len(names)
            prog.append((k * bar + j * length, length, root, {(root + i) % 12 for i in QUALITY[quality]}, bass_pc))
    return prog


def within(prog, first, last):
    return [chord for chord in prog if first <= chord[0] < last]


def tones(pcs, low, count):
    return [n for n in range(low, low + 36) if n % 12 in pcs][:count]


def bass(prog, pattern, low=36):
    """pattern holds (offset, role, steps) per chord: b is the bass note, 5 the chord's fifth above it
    and 8 the bass note's octave."""
    notes = []
    for start, length, root, _, bass_pc in prog:
        b = low + (bass_pc - low) % 12
        role = {'b': b, '5': b + ((root + 7 - b) % 12 or 12), '8': b + 12}
        notes += [[start + at, role[r], min(steps, length - at), 1.0 if at == 0 else 0.85]
                  for at, r, steps in pattern if at < length]
    return notes


def arp(prog, pattern, low, count):
    """pattern holds (offset, index into the chord's tones upward from low, steps) per chord."""
    notes = []
    for start, length, _, pcs, _ in prog:
        chord = tones(pcs, low, count)
        notes += [[start + at, chord[i], min(steps, length - at), 1.0 if at == 0 else 0.85]
                  for at, i, steps in pattern if at < length]
    return notes


def every(steps, indexes):
    return [(k * steps, i, steps) for k, i in enumerate(indexes)]


def line(prog, low, high, near):
    """One held chord tone per chord, the one nearest the last: a smooth inner voice."""
    notes = []
    for start, length, _, pcs, _ in prog:
        near = min((n for n in range(low, high + 1) if n % 12 in pcs), key=lambda n: (abs(n - near), n))
        notes.append([start, near, length, 0.9])
    return notes


def shift(notes, tonic, scale, degrees):
    """Move diatonic notes along the scale, such as degrees=-2 for a third below."""
    moved = []
    for at, note, steps, velocity in notes:
        pos = (note - tonic) // 12 * 7 + scale.index((note - tonic) % 12) + degrees
        moved.append([at, tonic + pos // 7 * 12 + scale[pos % 7], steps, velocity])
    return moved


def hits(pattern, note, bars):
    """One drum hit per digit in a bar's pattern, at velocity digit / 9."""
    return [[k, note, 1, round(int(c) / 9, 3)] for k, c in enumerate(pattern * bars) if c != '.']


def pulse(duty, volume, **shape):
    # The high-pass recentres narrow duties, which otherwise ride on a DC offset that thumps.
    return {'wave': 'pulse', 'duty': duty, 'volume': volume, 'attack': 0.005, 'decay': 0.12,
            'sustain': 0.6, 'release': 0.05, 'lowpass': 4000, 'highpass': 40, 'gate': 0.9, **shape}


def triangle(volume, **shape):
    return {'wave': 'triangle', 'volume': volume, 'attack': 0.005, 'release': 0.04, 'gate': 0.85, **shape}


def noise(volume, decay, **shape):
    return {'wave': 'noise', 'volume': volume, 'attack': 0.001, 'decay': decay, 'sustain': 0.0,
            'release': 0.01, 'gate': 1.0, **shape}


def track(tempo, prog, instruments, parts, gain, step_beats=0.25):
    steps = prog[-1][0] + prog[-1][1]
    for name, notes in parts.items():
        if name not in instruments or any(at + length > steps for at, _, length, _ in notes):
            raise ValueError(f'{name}: unknown instrument or a note past the {steps}-step loop')
    return {'tempo': tempo, 'steps': steps, 'step_beats': step_beats, 'gain': gain,
            'instruments': instruments,
            'tracks': [{'instrument': name, 'notes': notes} for name, notes in parts.items()]}


FESTIVAL = {
    'lead': pulse(0.25, 0.16, lowpass=4500),
    'second': pulse(0.5, 0.11, lowpass=3000),
    'bass': triangle(0.13),
    'tick': noise(0.16, 0.03, highpass=4000),
    'tap': noise(0.16, 0.1, lowpass=5000),
}


def festival_band(prog, bar, beat):
    """The festivals' one accompaniment: the bass walks root, fifth and octave on the beats, a tap
    marks each bar's first beat and a tick the others."""
    steps = prog[-1][0] + prog[-1][1]
    walk = [(at, 'b' if at == 0 else '5' if at // beat % 2 else '8', beat) for at in range(0, bar, beat)]
    return {'bass': bass(prog, walk),
            'tick': [[at, HAT, 1, 0.6] for at in range(0, steps, beat) if at % bar],
            'tap': [[at, SNARE, 1, 0.9] for at in range(0, steps, bar)]}


def title():
    prog = chords('F | C/E | Dm | Bb | F/A | Gm7 | C7 | F | Bb | C | Am | Dm | Bb | F/A | Gm7 | C7', 16)
    lead = melody('A4:2 C5:2 F5:6 E5:2 F5:4 | G5:6 E5:2 C5:8 | D5:2 E5:2 F5:6 E5:2 D5:4 | F5:6 D5:2 Bb4:8 | '
                  'A4:2 C5:2 F5:6 E5:2 F5:4 | A5:6 G5:2 F5:4 D5:4 | G5:4 E5:4 C5:4 D5:2 E5:2 | F5:12 r:4 | '
                  'D5:4 F5:4 Bb5:6 A5:2 | G5:8 r:2 E5:2 G5:4 | C5:4 E5:4 A5:6 G5:2 | F5:8 r:2 D5:2 F5:4 | '
                  'D5:2 C5:2 D5:4 F5:6 G5:2 | A5:6 G5:2 F5:4 C5:4 | '
                  'D5:2 E5:2 F5:4 G5:4 A5:4 | Bb5:6 G5:2 E5:4 C5:4 |', 16)
    instruments = {
        'lead': pulse(0.5, 0.17, attack=0.012, decay=0.3, sustain=0.7, release=0.1, vibrato=[5, 0.08],
                      lowpass=2800, gate=0.95),
        'arp': pulse(0.25, 0.12, decay=0.15, sustain=0.35, lowpass=2400),
        'bass': triangle(0.18),
        'tick': noise(0.14, 0.03, highpass=4000),
    }
    return track(96, prog, instruments, gain=-2.5, parts={
        'lead': lead,
        'arp': arp(prog, every(2, [0, 1, 2, 1] * 2), 55, 3),
        'bass': bass(prog, [(0, 'b', 6), (6, '5', 2), (8, 'b', 4), (12, '5', 4)]),
        'tick': hits('3.2.5.2.3.2.5.2.', HAT, 16),
    })


def lab():
    prog = chords('Cmaj7 | D/C | Em7 | Am7 | Fmaj7 | G | Em7 Am7 | Dm7 G | '
                  'Fmaj7 | G/F | Em7 | Am7 | Dm7 | Em7 | Fmaj7 | G', 16)
    lead = melody('E5:6 D5:2 G5:8 | F#5:6 E5:2 A5:8 | G5:4 E5:4 D5:4 B4:4 | C5:6 D5:2 E5:8 | '
                  'A5:6 G5:2 E5:4 C5:4 | D5:6 B4:2 G4:8 | G4:4 B4:4 C5:4 E5:4 | F5:6 E5:2 D5:8 | '
                  'C6:6 B5:2 A5:8 | G5:8 D5:8 | B5:6 A5:2 G5:8 | E5:8 r:4 C5:4 | '
                  'D5:6 E5:2 F5:4 A5:4 | G5:6 F5:2 E5:4 B4:4 | C5:6 D5:2 E5:4 A5:4 | G5:8 r:8 |', 16)
    instruments = {
        'lead': pulse(0.5, 0.15, attack=0.02, decay=0.4, sustain=0.6, release=0.15, vibrato=[4.5, 0.07],
                      lowpass=2000, gate=0.95),
        'arp': pulse(0.125, 0.16, decay=0.1, sustain=0.25, release=0.08, lowpass=3000),
        'bass': triangle(0.14),
    }
    return track(84, prog, instruments, gain=-1.4, parts={
        'lead': lead,
        'arp': arp(prog, every(2, [0, 2, 1, 3] * 2), 50, 4),
        'bass': bass(prog, [(0, 'b', 8), (8, '5', 8)]),
    })


def town_day():
    a = 'G | Bm7 | C | D | Em | C | '
    prog = chords(a + 'Am7 D | G | C | D | Bm7 | Em | Am7 | D | C D | D7 | ' + a + 'Am7 D7 | G D7', 16)
    head = ('D5:4 B4:2 C5:2 D5:4 G5:4 | F#5:2 E5:2 D5:4 B4:8 | E5:4 C5:2 D5:2 E5:4 A5:4 | G5:2 F#5:2 E5:4 D5:8 | '
            'B4:4 G4:2 A4:2 B4:4 E5:4 | G5:2 F#5:2 E5:4 C5:8 | A4:2 B4:2 C5:2 E5:2 D5:2 C5:2 B4:2 A4:2 | ')
    lead = melody(head + 'B4:6 A4:2 G4:8 | '
                  'E5:4 G5:6 E5:2 C5:4 | D5:4 F#5:6 D5:2 A4:4 | B4:4 D5:4 F#5:4 A5:4 | G5:8 F#5:4 E5:4 | '
                  'C5:4 E5:6 C5:2 A4:4 | D5:4 F#5:6 A5:2 F#5:4 | E5:4 G5:4 F#5:4 A5:4 | C6:4 A5:4 F#5:4 E5:4 | '
                  + head + 'G4:8 A4:4 C5:4 |', 16)
    instruments = {
        'lead': pulse(0.25, 0.15, decay=0.15, sustain=0.6, lowpass=4500),
        'second': pulse(0.5, 0.11, decay=0.08, sustain=0.4, lowpass=3000, gate=0.8),
        'bass': triangle(0.14, gate=0.7),
        'tick': noise(0.14, 0.03, highpass=4000),
        'tap': noise(0.16, 0.1, lowpass=5000),
    }
    # The second voice plays off-beat chord stabs, then shadows the lead a third below in the last A.
    stabs = arp(within(prog, 0, 256), [(2, 0, 1), (6, 1, 1), (10, 0, 1), (14, 1, 1)], 59, 2)
    return track(116, prog, instruments, gain=0.8, parts={
        'lead': lead,
        'second': stabs + shift([n for n in lead if n[0] >= 256], G, MAJOR, -2),
        'bass': bass(prog, [(0, 'b', 4), (4, '5', 4), (8, '8', 4), (12, '5', 4)]),
        'tick': hits('5.3.5.3.5.3.5.3.', HAT, 24),
        'tap': hits('....7.......7...', SNARE, 24),
    })


def town_night():
    # 12/8: a step is an eighth note and the tempo counts dotted quarters, for a slow rocking lilt.
    prog = chords('Eb | Cm7 | Abmaj7 | Bbsus4 Bb | Eb | Cm7 | Abmaj7 Bb | Eb | '
                  'Abmaj7 | Gm7 Cm7 | Fm7 Bb7 | Bbsus4 Bb', 12)
    rise = 'Eb5:3 Bb4:3 C5:2 D5:1 Eb5:3 | C5:3 G4:3 Ab4:2 Bb4:1 C5:3 | '
    lead = melody(rise + 'Ab4:3 C5:2 Eb5:1 G5:6 | F5:6 D5:3 r:3 | '
                  + rise + 'Ab4:3 C5:2 Eb5:1 F5:3 D5:3 | Eb5:9 r:3 | '
                  'C5:3 Eb5:3 Ab5:3 G5:3 | F5:3 D5:3 Eb5:3 G5:3 | Ab5:3 G5:2 F5:1 Eb5:3 D5:3 | Eb5:6 D5:3 C5:3 |',
                  12, 3)
    instruments = {
        'lead': pulse(0.5, 0.15, attack=0.03, decay=0.5, sustain=0.65, release=0.25, vibrato=[4.5, 0.1],
                      lowpass=1600, gate=0.95),
        'arp': pulse(0.25, 0.095, attack=0.01, decay=0.25, sustain=0.3, release=0.15, lowpass=1800),
        'bass': triangle(0.14, release=0.1),
    }
    return track(56, prog, instruments, gain=-2.8, step_beats=1 / 3, parts={
        'lead': lead,
        'arp': arp(prog, every(1, [0, 1, 2, 3, 2, 1] * 2), 51, 4),
        'bass': bass(prog, [(0, 'b', 12)]),
    })


def country_map():
    prog = chords('D | G/D | D | C | Bm | G | Em7 | A | G | A | F#m | Bm | G | D/F# | Em7 | Asus4 A', 16)
    lead = melody('D5:4 A5:8 F#5:4 | G5:4 B5:8 D5:4 | F#5:6 E5:2 D5:4 A4:4 | G5:8 E5:4 C5:4 | '
                  'D5:6 C#5:2 B4:4 F#5:4 | G5:6 F#5:2 E5:4 D5:4 | E5:4 G5:4 B5:4 D6:4 | C#6:8 A5:4 E5:4 | '
                  'D5:4 G5:4 B5:8 | A5:4 E5:4 C#5:8 | C#5:4 F#5:4 A5:8 | B5:6 A5:2 F#5:8 | '
                  'G5:6 A5:2 B5:4 D6:4 | D6:6 C#6:2 A5:8 | G5:6 E5:2 D5:4 B4:4 | D5:8 C#5:8 |', 16)
    instruments = {
        'lead': pulse(0.25, 0.15, decay=0.25, sustain=0.65, release=0.1, vibrato=[5, 0.06], lowpass=3500),
        'arp': pulse(0.5, 0.08, decay=0.1, sustain=0.4, lowpass=2500),
        'bass': triangle(0.13),
        'tick': noise(0.2, 0.03, highpass=4000),
        'tap': noise(0.2, 0.12, lowpass=4000),
    }
    return track(100, prog, instruments, gain=0.5, parts={
        'lead': lead,
        'arp': arp(prog, every(2, [0, 1, 2, 3, 4, 3, 2, 1]), 50, 5),
        'bass': bass(prog, [(0, 'b', 4), (4, '5', 4), (8, 'b', 4), (12, '5', 4)]),
        'tick': hits('3.2.3.2.3.2.3.2.', HAT, 16),
        'tap': hits('........6.......', SNARE, 16),
    })


def brightstep():
    """Verse and chorus twice, fast and loud: the second voice joins with held tones, then thirds."""
    verse = 'F | Bb | F | C | Dm | Bb | Gm C | F | '
    chorus = 'Bb | C | F | Dm | Bb | C | F | C7 | '
    prog = chords((verse + chorus) * 2, 16)
    lead = melody(('A5:2 F5:2 C6:6 Bb5:2 A5:4 | F5:2 D5:2 Bb5:6 A5:2 F5:4 | '
                   'A5:2 F5:2 C6:6 Bb5:2 A5:4 | E5:4 G5:4 C6:8 | '
                   'D6:2 C6:2 A5:2 F5:2 E5:2 D5:4 A4:2 | Bb4:2 D5:2 F5:4 Bb5:4 A5:4 | '
                   'G5:2 F5:2 D5:4 E5:2 F5:2 G5:4 | A5:4 F5:4 C5:4 r:4 | '
                   'D6:4 F5:4 Bb5:8 | C6:4 G5:4 E5:4 G5:4 | A5:6 G5:2 F5:4 C6:4 | D6:8 A5:8 | '
                   'D6:4 F5:4 Bb5:8 | C6:4 Bb5:4 G5:4 E5:4 | F5:4 A5:4 C6:4 A5:4 | '
                   'Bb5:4 G5:4 E5:4 G5:4 | ') * 2, 16)
    second = line(within(prog, 128, 384), 57, 67, 62) + shift([n for n in lead if n[0] >= 384], F, MAJOR, -2)
    return track(140, prog, FESTIVAL, {'lead': lead, 'second': second, **festival_band(prog, 16, 4)}, gain=1.5)


def turnwheel():
    """A round in 3/4: the second voice sings the same four phrases four bars behind and an octave below."""
    prog = chords('F | Bb | C | F | ' * 5, 12)
    tune = ('F5:8 A5:4 | Bb5:8 F5:4 | E5:8 G5:4 | F5:12 | '
            'A5:4 F5:4 C6:4 | Bb5:4 D5:4 F5:4 | G5:4 E5:4 C6:4 | A5:4 C6:4 A5:4 | '
            'C5:2 D5:2 F5:2 G5:2 A5:2 F5:2 | Bb4:2 C5:2 D5:2 F5:2 D5:2 C5:2 | '
            'E5:2 F5:2 G5:2 E5:2 C5:2 E5:2 | F5:2 G5:2 A5:2 G5:2 F5:4 | '
            'A5:4 C6:4 A5:2 G5:2 | F5:6 D5:2 Bb4:4 | C6:4 Bb5:4 G5:4 | F5:12 | ')
    return track(108, prog, FESTIVAL, {'lead': melody(tune + 'r:48 |', 12),
                                       'second': shift(melody('r:48 | ' + tune, 12), F, MAJOR, -7),
                                       **festival_band(prog, 12, 4)}, gain=0.2)


def echofield():
    """Call and response: the lead calls for two bars and the second voice answers in the call's rhythm."""
    prog = chords('Dm | Bb | F | C | Dm | Bb | C | Am | Bb | C | F | Dm | Gm | Am | Bb | C', 16)
    calls = ['D5:4 F5:4 A5:2 G5:2 F5:4 | Bb4:4 D5:4 F5:8', 'F5:4 A5:4 D6:2 C6:2 A5:4 | F5:4 D5:4 Bb4:8',
             'D5:2 E5:2 F5:2 G5:2 F5:4 D5:4 | E5:2 F5:2 G5:2 A5:2 G5:4 C5:4',
             'G5:4 Bb5:4 D6:2 C6:2 Bb5:4 | A5:4 E5:4 C5:8']
    answers = ['A4:4 C5:4 F5:2 E5:2 C5:4 | G4:4 C5:4 E5:8', 'E5:4 G5:4 C6:2 Bb5:2 G5:4 | E5:4 C5:4 A4:8',
               'A4:2 Bb4:2 C5:2 D5:2 C5:4 A4:4 | D5:2 E5:2 F5:2 G5:2 F5:4 D5:4',
               'D5:4 F5:4 Bb5:2 A5:2 F5:4 | C5:4 E5:4 G5:8']
    return track(100, prog, FESTIVAL, {'lead': melody(''.join(f'{c} | r:32 | ' for c in calls), 16),
                                       'second': melody(''.join(f'r:32 | {a} | ' for a in answers), 16),
                                       **festival_band(prog, 16, 4)}, gain=1.2)


def evenstride():
    """A slow, soft processional in D minor, turning to F major in its middle phrase."""
    prog = chords('Dm | Gm | Bb | Am | F | C | Gm | Bb | Dm | Bb | Gm Am | Dm', 16)
    lead = melody('A4:8 D5:4 F5:4 | G5:8 F5:4 D5:4 | F5:8 D5:4 Bb4:4 | C5:8 E5:8 | '
                  'C5:8 F5:4 A5:4 | G5:8 E5:4 C5:4 | D5:8 G5:4 A5:4 | Bb5:8 F5:8 | '
                  'A4:8 D5:4 F5:4 | D5:8 C5:4 Bb4:4 | Bb4:8 C5:8 | D5:12 r:4 |', 16)
    return track(72, prog, FESTIVAL, {'lead': lead, 'second': line(prog, 55, 65, 60),
                                      **festival_band(prog, 16, 4)}, gain=-2.5)


def build():
    bank = sk.Bank('music')
    bank.add('music_title', 'music', title(), key='F major', meter='4/4', form='A B')
    bank.add('music_lab', 'music', lab(), key='C major', meter='4/4', form='A B')
    bank.add('music_town-day', 'music', town_day(), key='G major', meter='4/4', form='A B A')
    bank.add('music_town-night', 'music', town_night(), key='E-flat major', meter='12/8', form='A A B')
    bank.add('music_country-map', 'music', country_map(), key='D major', meter='4/4', form='A B')
    bank.add('music_festival-brightstep', 'music', brightstep(), key='F major', meter='4/4',
             form='verse chorus verse chorus')
    bank.add('music_festival-turnwheel', 'music', turnwheel(), key='F major', meter='3/4',
             form='round in two voices')
    bank.add('music_festival-echofield', 'music', echofield(), key='D minor', meter='4/4',
             form='call and response')
    bank.add('music_festival-evenstride', 'music', evenstride(), key='D minor', meter='4/4', form='processional')
    return bank


if __name__ == '__main__':
    build().save()
