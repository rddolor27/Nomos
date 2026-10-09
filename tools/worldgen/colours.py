"""Colour distance for the map's country colours (M8.3, Task 14), with NumPy alone.

Lab is CIE L*a*b* under D65 from sRGB, as colorspacious 1.1.2 converts it and the owner's swatch sheet measured the
picks: a D50-adapted Lab, as CSS lab() uses, moves the margins by up to 2.5. Distances are CIEDE2000 (Sharma, Wu and
Dalal 2005). Colour-blind views apply Machado, Oliveira and Fernandes 2009's full-severity matrices in linear sRGB.
"""
import numpy as np

# IEC 61966-2-1's XYZ-to-sRGB matrix, inverted, and the D65 white point.
_SRGB_TO_XYZ = np.linalg.inv(np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]]))
_D65 = np.array([95.047, 100, 108.883])
MACHADO = {
    'protan': np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]),
    'deutan': np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]),
    'tritan': np.array([[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]),
}
VIEWERS = ('normal', *MACHADO)


def _linear(c):
    return np.where(c < 0.04045, c / 12.92, ((np.abs(c) + 0.055) / 1.055) ** 2.4)


def _gamma(c):
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.abs(c) ** (1 / 2.4) - 0.055)


def to_lab(rgb):
    """sRGB 0-255, in rows, to Lab under D65."""
    xyz = np.einsum('ij,...j->...i', _SRGB_TO_XYZ, _linear(np.asarray(rgb, float) / 255)) * 100
    t = xyz / _D65
    f = np.where(t < (6 / 29) ** 3, (29 / 6) ** 2 / 3 * t + 4 / 29, np.abs(t) ** (1 / 3))
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def seen_by(rgb, viewer):
    """sRGB 0-255 as a viewer sees it: as is for normal vision, else through Machado's matrix, clipped to the gamut."""
    if viewer == 'normal':
        return np.asarray(rgb, float)
    seen = np.einsum('ij,...j->...i', MACHADO[viewer], _linear(np.asarray(rgb, float) / 255))
    return np.clip(_gamma(seen), 0, 1) * 255


def wheel_hue(rgb):
    """Colour-wheel hue in degrees, the one a designer means: pure blue is 240."""
    c = np.asarray(rgb, float) / 255
    top, low = c.max(-1), c.min(-1)
    span = np.where(top == low, 1, top - low)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = np.where(top == r, ((g - b) / span) % 6, np.where(top == g, (b - r) / span + 2, (r - g) / span + 4)) * 60
    return np.where(top == low, 0, h)


def ciede2000(lab1, lab2):
    """CIEDE2000 between Lab arrays that broadcast against each other."""
    L1, a1, b1, L2, a2, b2 = lab1[..., 0], lab1[..., 1], lab1[..., 2], lab2[..., 0], lab2[..., 1], lab2[..., 2]
    Cb = (np.hypot(a1, b1) + np.hypot(a2, b2)) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p, h2p = np.degrees(np.arctan2(b1, a1p)) % 360, np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(C1p * C2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp, hs = (L1 + L2) / 2, (C1p + C2p) / 2, h1p + h2p
    hbp = np.where(C1p * C2p == 0, hs,
                   np.where(np.abs(h1p - h2p) > 180, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2), hs / 2))
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp))
         + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.2 * np.cos(np.radians(4 * hbp - 63)))
    dtheta = 30 * np.exp(-((hbp - 275) / 25) ** 2)
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dtheta)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def rgb_of(hexcode):
    return tuple(int(hexcode[i:i + 2], 16) for i in (1, 3, 5))
