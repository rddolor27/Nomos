"""Justice sounds: the theft act, reports, stops, arrests, wrongful stops, release and records.

Neutral by rule: no siren, no fanfare, no menace, and nothing that follows a person afterwards.
The theft cue is a plain swipe, the same for everyone, and plays only in the true view. An arrest
and a wrongful stop share one frame, a short transient and then two soft mid tones on the same
timing, so they match in length and weight and differ only in timbre and interval. build() checks
that they stay equal.

Each sound gives its loudness as RMS in dBFS, and soundkit.add_effect() sets the gain that reaches it.

Build: python tools/sounds/justice.py
"""
import soundkit as sk
from soundkit import add_effect, hiss, pluck

A4, B4, E4 = 69, 71, 64
OUTCOME_DB = -24


def outcome(transient, notes):
    """The frame an arrest and a wrongful stop share: a transient, then two soft tones."""
    tones = []
    for at, note in zip((0.15, 0.38), notes):
        tone = {'start': at, 'note': note, 'length': 0.18, 'attack': 0.01, 'decay': 0.17, 'sustain': 0.5,
                'release': 0.2}
        tones += [{**tone, 'wave': 'triangle', 'volume': 0.4},
                  {**tone, 'wave': 'pulse', 'volume': 0.1, 'lowpass': 1500}]
    return transient + tones


SOUNDS = {
    'justice_theft': (-25, [
        hiss(0, [1800, 7000], 0.14, 0.4, attack=0.04, highpass=600, lowpass=5000),
        pluck(0.12, [520, 390], 0.05, 0.25),
    ]),
    'justice_report-filed': (-27, [
        *[hiss(at, rate, 0.06, 0.25, attack=0.01, highpass=1500, lowpass=5000)
          for at, rate in ((0, [5000, 3500]), (0.08, [4000, 5500]), (0.16, [5000, 3000]))],
        pluck(0.26, [600, 400], 0.04, 0.25),
        hiss(0.262, 3000, 0.02, 0.18, lowpass=3000),
    ]),
    'justice_stop': (-21.5, [
        layer for at in (0, 0.12) for layer in (
            pluck(at, [800, 560], 0.045, 0.4),
            hiss(at, 8000, 0.006, 0.12, highpass=2000),
        )
    ]),
    'justice_arrest': (OUTCOME_DB, outcome([
        *[hiss(0.02 * k, 14000, 0.004, 0.25, highpass=3000) for k in range(4)],
        pluck(0.08, [2100, 2100], 0.15, 0.2),
        pluck(0.08, [3070, 3070], 0.1, 0.1, 'sine'),
    ], [A4, E4])),
    'justice_wrongful-stop': (OUTCOME_DB, outcome([
        pluck(0, [300, 200], 0.06, 0.4),
        hiss(0, 4000, 0.03, 0.25, lowpass=3000),
        pluck(0.08, [620, 620], 0.15, 0.45),
        pluck(0.08, [1490, 1490], 0.1, 0.12, 'sine'),
    ], [A4, B4])),
    'justice_release': (-26.5, [
        hiss(0, 9000, 0.008, 0.15, highpass=1500),
        pluck(0, [900, 600], 0.02, 0.3),
        pluck(0.005, [220, 150], 0.06, 0.35),
        {'start': 0.06, 'wave': 'pulse', 'duty': 0.15, 'freq': [120, 200], 'length': 0.3, 'attack': 0.05,
         'decay': 0.25, 'sustain': 0.4, 'release': 0.08, 'vibrato': [10, 0.6], 'highpass': 500, 'lowpass': 2000,
         'volume': 0.25},
        hiss(0.1, [1500, 3500], 0.45, 0.08, attack=0.2, highpass=400, lowpass=3000),
    ]),
    'justice_record-filed': (-25.5, [
        hiss(0, [7000, 4000], 0.12, 0.2, attack=0.03, highpass=1500, lowpass=5000),
        pluck(0.15, [160, 90], 0.06, 0.5),
        hiss(0.15, 2000, 0.03, 0.3, lowpass=1500),
    ]),
}


def build():
    bank = sk.Bank('justice')
    for name, (rms_db, layers) in SOUNDS.items():
        add_effect(bank, name, rms_db, layers)
    arrest, wrongful = bank.sounds['justice_arrest'], bank.sounds['justice_wrongful-stop']
    assert len(bank.audio['justice_wrongful-stop']) == len(bank.audio['justice_arrest']), \
        'a wrongful stop must last exactly as long as an arrest'
    assert abs(wrongful['rms_db'] - arrest['rms_db']) <= 1, 'a wrongful stop must be as loud as an arrest'
    return bank


if __name__ == '__main__':
    build().save()
