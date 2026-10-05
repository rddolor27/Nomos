"""Scale ladder: REGION -> CITY -> STREET, built from downscaled crops of the three finished mockups.
The 960x540 PNGs are 3x nearest-neighbour; we take every third pixel (exact native image), crop, and show the
crop at 2x nearest-neighbour, so the panels stay crisp. Zoom boxes + connector lines are drawn on top."""
import sys
from PIL import Image, ImageDraw
from pix import draw_text, text_width

OUT = '/home/user/reports/mockups/'
W, H = 1440, 400
BG = (20, 19, 30)
GOLD = (255, 216, 74)
DARK = (8, 8, 12)
WHITE = (246, 244, 236)
DIM = (160, 166, 188)

PW, PH = 440, 272            # panel size (= 220x136 native at 2x)
PX = [24, 500, 976]
PY = 44
NATIVE_CROP = {  # (x0, y0) of the 220x124 native crop in each source image
    'country': (66, 12),
    'city': (40, 12),
    'street': (20, 40),
}
# zoom boxes in native coordinates of the panel's own source image
ZOOM_BOX = {
    'country': (144, 56, 185, 89),     # MILLBRIDGE, the settlement simulated live (icon, outline and LIVE tag)
    'city': (65, 52, 120, 86),         # the street panel's area, at 1/4 scale inside the city view
}


def native(path):
    im = Image.open(path).convert('RGB')
    return im.resize((im.width // 3, im.height // 3), Image.NEAREST)  # picks one pixel per 3x3 block


def city_with_street_chip():
    import city
    return city.build(chip_text='STREET').convert('RGB')


def panel(src, key):
    x0, y0 = NATIVE_CROP[key]
    crop = src.crop((x0, y0, x0 + PW // 2, y0 + PH // 2))
    return crop.resize((PW, PH), Image.NEAREST)


def text_img(s, color, scale):
    w = text_width(s) + 2
    im = Image.new('RGBA', (w, 7), (0, 0, 0, 0))
    draw_text(im, 1, 1, s, color + (255,), shadow=(0, 0, 0, 255))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def box_on_canvas(key, i):
    bx0, by0, bx1, by1 = ZOOM_BOX[key]
    cx0, cy0 = NATIVE_CROP[key]
    return (PX[i] + (bx0 - cx0) * 2, PY + (by0 - cy0) * 2, PX[i] + (bx1 - cx0) * 2, PY + (by1 - cy0) * 2)


def thick_rect(d, box, color, w=2, outline=DARK):
    x0, y0, x1, y1 = box
    d.rectangle((x0 - w, y0 - w, x1 + w, y1 + w), outline=outline, width=1)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), outline=outline, width=1)
    for k in range(w):
        d.rectangle((x0 - k, y0 - k, x1 + k, y1 + k), outline=color, width=1)


def line(d, p0, p1, color=GOLD):
    d.line((p0, p1), fill=DARK, width=3)
    d.line((p0, p1), fill=color, width=1)


def build():
    srcs = {
        'country': native(OUT + 'country_map.png'),
        # same render as city_zoomed_out.png, except the dashed frame's chip reads STREET (ladder only)
        'city': city_with_street_chip(),
        'street': native(OUT + 'town_closeup_blobs.png'),
    }
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    keys = ['country', 'city', 'street']
    labels = ['REGION', 'CITY', 'STREET']
    subs = ['REGION VIEW: SETTLEMENTS', 'CITY MODE: AGENTS AS DOTS', 'STREET: AGENTS AS SPRITES']
    # title
    t = text_img('ONE SIMULATION, THREE ZOOM LEVELS', DIM, 2)
    img.paste(t, (PX[0], 14), t)
    for i, k in enumerate(keys):
        p = panel(srcs[k], k)
        # frame
        d.rectangle((PX[i] - 3, PY - 3, PX[i] + PW + 2, PY + PH + 2), outline=DARK, width=1)
        d.rectangle((PX[i] - 2, PY - 2, PX[i] + PW + 1, PY + PH + 1), outline=(96, 102, 128), width=2)
        img.paste(p, (PX[i], PY))
        lab = text_img(labels[i], WHITE, 3)
        img.paste(lab, (PX[i] + PW // 2 - lab.width // 2, PY + PH + 12), lab)
        sub = text_img(subs[i], DIM, 2)
        img.paste(sub, (PX[i] + PW // 2 - sub.width // 2, PY + PH + 36), sub)
    # zoom boxes and connectors (country -> city, city -> street)
    for i, k in enumerate(['country', 'city']):
        bx0, by0, bx1, by1 = box_on_canvas(k, i)
        nx = PX[i + 1] - 3
        line(d, (bx1 + 2, by0 - 2), (nx, PY - 3))
        line(d, (bx1 + 2, by1 + 2), (nx, PY + PH + 2))
        thick_rect(d, (bx0, by0, bx1, by1), GOLD)
    # gold frames on the zoomed-in panels so the connection reads as "this box = that panel"
    for i in (1, 2):
        d.rectangle((PX[i] - 3, PY - 3, PX[i] + PW + 2, PY + PH + 2), outline=GOLD, width=2)
    return img


if __name__ == '__main__':
    out = build()
    out.save(sys.argv[1] if len(sys.argv) > 1 else
             '/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/ladder.png')
