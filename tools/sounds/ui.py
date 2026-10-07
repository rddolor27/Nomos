"""UI sounds: menus, lab cards and the Build mode's tools, gentle and short.

Soft triangle tones with the odd noise tick; the tuned ones stay in C, so the interface sounds like
one instrument. The three lab verdicts share a rhythm, a timbre and a loudness and differ only in
contour: a held claim rises, a failed claim falls, as its effect went the other way, and an
inconclusive one rocks on an open fifth. There is no fail buzzer.

Each sound gives its loudness as RMS in dBFS, and soundkit.add_effect() sets the gain that reaches it.

Build: python tools/sounds/ui.py
"""
import soundkit as sk
from soundkit import add_effect, bell, hiss, pluck

E4, C5, E5, G5, A5, C6, E6 = 64, 72, 76, 79, 81, 84, 88


def verdict(notes):
    """Bell notes, the last left to ring with an octave shimmer: the lab verdicts differ only in notes."""
    *steps, last = notes
    at = 0.085 * len(steps)
    return [bell(0.085 * i, note, 0.25, 0.35) for i, note in enumerate(steps)] + [
        bell(at, last, 0.5, 0.35), bell(at, last + 12, 0.3, 0.08, 'sine')]


SOUNDS = {
    'ui_click': (-23, [
        pluck(0, [2600, 1700], 0.014, 0.5),
        hiss(0, 18000, 0.004, 0.12, attack=0.0005, highpass=3000),
    ]),
    'ui_toggle-on': (-26, [
        pluck(0, [620, 1240], 0.07, 0.5),
        pluck(0, [1240, 2480], 0.03, 0.06, 'pulse', duty=0.25, lowpass=4000, highpass=200),
    ]),
    'ui_toggle-off': (-26, [
        pluck(0, [1100, 550], 0.07, 0.5),
        pluck(0, [2200, 1100], 0.03, 0.06, 'pulse', duty=0.25, lowpass=4000, highpass=200),
    ]),
    'ui_panel-open': (-29, [
        hiss(0, [2500, 8000], 0.14, 0.1, attack=0.06, lowpass=3000, highpass=300),
        pluck(0, [330, 660], 0.14, 0.35, attack=0.04),
        pluck(0.11, C6, 0.06, 0.18),
    ]),
    'ui_panel-close': (-29, [
        hiss(0, [8000, 2500], 0.14, 0.1, attack=0.02, lowpass=3000, highpass=300),
        pluck(0, [660, 330], 0.14, 0.35, attack=0.01),
        pluck(0.11, C5, 0.06, 0.18),
    ]),
    'ui_notify': (-28, [
        bell(0, A5, 0.3, 0.4),
        bell(0, A5 + 12, 0.15, 0.1, 'sine'),
        bell(0.12, E6, 0.4, 0.4),
        bell(0.12, E6 + 12, 0.2, 0.1, 'sine'),
    ]),
    'ui_error': (-25, [
        layer for at in (0, 0.12) for layer in (
            pluck(at, E4, 0.08, 0.35),
            pluck(at, E4 - 12, 0.08, 0.2, 'pulse', lowpass=500),
        )
    ]),
    'ui_save': (-29, [
        *[pluck(at, [1800, 1400], 0.012, 0.25) for at in (0, 0.045, 0.09)],
        bell(0.14, C5, 0.35, 0.3),
        bell(0.155, G5, 0.35, 0.3),
    ]),
    'ui_lab_bet-locked': (-26, [
        hiss(0, 14000, 0.006, 0.25, highpass=2500),
        pluck(0, [1500, 1100], 0.015, 0.3),
        hiss(0.035, 12000, 0.006, 0.25, highpass=2500),
        pluck(0.035, [1100, 800], 0.015, 0.3),
        pluck(0.035, [200, 130], 0.12, 0.5),
    ]),
    'ui_lab_run-started': (-26, [
        {'wave': 'triangle', 'freq': [262, 523], 'length': 0.3, 'attack': 0.04, 'release': 0.1, 'volume': 0.35},
        hiss(0, [2000, 7000], 0.3, 0.07, attack=0.2, lowpass=4000, highpass=500),
        *[pluck(at, C6, 0.04, 0.15) for at in (0.1, 0.18, 0.26)],
    ]),
    'ui_lab_result-held': (-27, verdict([C5, E5, G5, C6])),
    'ui_lab_result-failed': (-27, verdict([C6, G5, E5, C5])),
    'ui_lab_result-inconclusive': (-27, verdict([C5, G5, C5, G5])),
    'ui_build_brush': (-29, [
        hiss(0, [6000, 3500], 0.1, 0.3, attack=0.03, highpass=600, lowpass=3500),
    ]),
    'ui_build_place': (-25, [
        pluck(0, [520, 180], 0.07, 0.5),
        hiss(0, 6000, 0.01, 0.15, lowpass=3000),
    ]),
    'ui_build_erase': (-29, [
        hiss(0, [9000, 1500], 0.12, 0.25, highpass=300, lowpass=5000),
        pluck(0, [350, 900], 0.08, 0.2),
    ]),
    'ui_build_undo': (-27, [
        {'wave': 'triangle', 'freq': [480, 900], 'length': 0.08, 'attack': 0.08, 'release': 0.012, 'volume': 0.4},
        pluck(0.085, [1400, 1100], 0.012, 0.2),
    ]),
}


def build():
    bank = sk.Bank('ui')
    for name, (rms_db, layers) in SOUNDS.items():
        add_effect(bank, name, rms_db, layers)
    return bank


if __name__ == '__main__':
    build().save()
