"""Image 1: town close-up ("lab mode"). Native 320x180, 16x16 tiles, scaled 3x nearest-neighbour."""
import sys
from PIL import Image
import numpy as np
from pix import OUTLINE, draw_text, text_width, blend_rect, upscale, from_ascii
from tiles import (tile, item, hexc, house_thatch, house_thatch2, house_plaster, police_station, awning,
                   plate, bench, counter, police_lamp, badge_emblem, recolor_region)
from chars import Person, bubble, shadow, coin
from blobs import Blob

W, H = 320, 180
RNG = np.random.default_rng(7)

GRASS = tile(14, 16)
PAVE = tile(19, 11)
SAND = hexc('#ffcb8d')
SAND_PEBBLE = [hexc('#ffbc75'), hexc('#ffad5d')]
RIM = hexc('#e19a71')
RIM2 = hexc('#f1b07e')
GRASS_DARK = hexc('#4a952d')


def rrect(mask, x0, y0, x1, y1, r=3):
    """Fill rounded rectangle [x0,x1) x [y0,y1) in mask."""
    for y in range(max(0, y0), min(mask.shape[0], y1)):
        for x in range(max(0, x0), min(mask.shape[1], x1)):
            dx = max(x0 + r - x - 0.5, 0, x - (x1 - r) + 0.5)
            dy = max(y0 + r - y - 0.5, 0, y - (y1 - r) + 0.5)
            if dx * dx + dy * dy <= r * r:
                mask[y, x] = True


def ground(path_rects, pave_rects, flower_tiles=(), yellow_tiles=()):
    img = Image.new('RGBA', (W, H))
    for y in range(0, H, 16):
        for x in range(0, W, 16):
            img.paste(GRASS, (x, y))
    for (c, r) in yellow_tiles:
        img.paste(tile(13, 16), (c * 16, r * 16))
    for (c, r) in flower_tiles:
        img.paste(tile(16, 16), (c * 16, r * 16))
    mask = np.zeros((H, W), bool)
    for rc in path_rects:
        rrect(mask, *rc)
    pave = np.zeros((H, W), bool)
    for rc in pave_rects:
        rrect(pave, *rc)
    mask |= pave
    # irregular edge: little grass tufts poking into the path
    edge = mask & ~(np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1))
    ys, xs = np.nonzero(edge)
    for y, x in zip(ys, xs):
        if (x * 7 + y * 13) % 23 == 0:
            for (dy, dx) in ((0, 0), (0, 1), (1, 0)):
                if 0 <= y + dy < H and 0 <= x + dx < W:
                    mask[y + dy, x + dx] = False
    a = np.array(img)
    # sand fill with pebbles
    sand = np.zeros((H, W, 4), np.uint8)
    sand[:, :] = SAND + (255,)
    for _ in range(int(W * H * 0.012)):
        x, y = RNG.integers(0, W - 1), RNG.integers(0, H - 1)
        c = SAND_PEBBLE[RNG.integers(0, 2)]
        sand[y, x] = c + (255,)
    # paving texture
    pv = np.array(PAVE)
    pave_tex = np.tile(pv, (H // 16 + 1, W // 16 + 1, 1))[:H, :W]
    fill = np.where(pave[:, :, None], pave_tex, sand)
    a = np.where(mask[:, :, None], fill, a)
    # rims
    gr = ~mask
    nb_grass = np.zeros_like(mask)
    nb_grass[1:, :] |= gr[:-1, :]
    nb_grass[:-1, :] |= gr[1:, :]
    nb_grass[:, 1:] |= gr[:, :-1]
    nb_grass[:, :-1] |= gr[:, 1:]
    rim = mask & nb_grass
    a[rim] = RIM + (255,)
    # soft shadow under the top edge (grass above the path)
    top2 = mask & ~rim & np.roll(rim, 1, 0)
    a[top2] = RIM2 + (255,)
    nb_path = np.zeros_like(mask)
    nb_path[1:, :] |= mask[:-1, :]
    nb_path[:-1, :] |= mask[1:, :]
    nb_path[:, 1:] |= mask[:, :-1]
    nb_path[:, :-1] |= mask[:, 1:]
    a[gr & nb_path] = GRASS_DARK + (255,)
    return Image.fromarray(a), mask


class Scene:
    def __init__(self):
        self.items = []   # (sort_y, x, y, image)
        self.overlays = []  # drawn after sprites

    def add(self, im, x, y, sort_y=None):
        self.items.append((y + im.height if sort_y is None else sort_y, x, y, im))

    def person(self, p, x, y, direction='down', pose='', loot=False, shadow_w=12):
        spr = p.sprite(direction, pose, loot=loot)
        PEOPLE.append(('stealing' if pose == 'sneak' else p.role, x + 9, y + 20))
        feet = y + 21
        sh = shadow(shadow_w, 4, 80)
        self.items.append((feet - 0.5, x + (spr.width - shadow_w) // 2 + (1 if loot and direction == 'left' else 0),
                           feet - 2, sh))
        self.items.append((feet, x, y, spr))
        return spr

    def render(self, base):
        img = base.copy()
        for sy, x, y, im in sorted(self.items, key=lambda t: t[0]):
            img.alpha_composite(im, (int(x), int(y))) if x >= 0 and y >= 0 else _paste_clip(img, im, int(x), int(y))
        for x, y, im in self.overlays:
            _paste_clip(img, im, int(x), int(y))
        return img


def _paste_clip(img, im, x, y):
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(img.width, x + im.width), min(img.height, y + im.height)
    if x1 <= x0 or y1 <= y0:
        return
    img.alpha_composite(im.crop((x0 - x, y0 - y, x1 - x, y1 - y)), (x0, y0))


def chip(img, x, y, text, fg=(24, 20, 30), bg=(255, 204, 64)):
    """Small rounded label chip (original). Returns end x."""
    w = text_width(text) + 5
    px = img.load()
    for yy in range(y, y + 7):
        for xx in range(x, x + w):
            if (xx in (x, x + w - 1)) and (yy in (y, y + 6)):
                continue
            if 0 <= xx < img.width and 0 <= yy < img.height:
                px[xx, yy] = bg + (255,)
    draw_text(img, x + 3, y + 1, text, fg + (255,))
    return x + w


def hud(img, mode='LAB MODE', day='DAY 12', clock='08:40', true_n=9, rec_n=4):
    """Tiny HUD strip (original 3x5 pixel font): mode chip, day/clock, true vs recorded thefts."""
    blend_rect(img, (0, 0, W, 10), (16, 18, 30), 0.74)
    px = img.load()
    for x in range(W):
        r, g, b, a = px[x, 10]
        px[x, 10] = (int(r * 0.7), int(g * 0.7), int(b * 0.7), 255)
    white = (246, 244, 236, 255)
    dim = (170, 176, 196, 255)
    x = chip(img, 2, 2, mode)
    x = draw_text(img, x + 5, 3, day, white)
    x = draw_text(img, x + 3, 3, '\u00b7', dim)
    x = draw_text(img, x + 3, 3, clock, white)
    true_c = (238, 96, 72, 255)
    rec_c = (120, 170, 240, 255)
    label = 'THEFTS TODAY'
    seg = 3
    bar_w = lambda n: n * (seg + 1) - 1

    def block(x0, name, n, col):
        x0 = draw_text(img, x0, 3, name, dim) + 3
        for i in range(n):
            for yy in range(3, 8):
                for xx in range(seg):
                    px[x0 + i * (seg + 1) + xx, yy] = col
        x0 += bar_w(n) + 3
        return draw_text(img, x0, 3, str(n), white)
    total = (text_width(label) + 6 + text_width('TRUE') + 3 + bar_w(true_n) + 3 + text_width(str(true_n)) + 7
             + text_width('RECORDED') + 3 + bar_w(rec_n) + 3 + text_width(str(rec_n)))
    x0 = W - 4 - total
    x0 = draw_text(img, x0, 3, label, dim) + 6
    x0 = block(x0, 'TRUE', true_n, true_c) + 7
    block(x0, 'RECORDED', rec_n, rec_c)
    return img


LAYOUT = {}
PEOPLE = []   # (role/state, feet_x, feet_y) in close-up pixels, reused by the city view


def sightline(img, p0, p1, color=(255, 236, 120), alpha=0.75, dash=(2, 3)):
    """Dotted 'line of sight' overlay (lab-mode debug view)."""
    px = img.load()
    (x0, y0), (x1, y1) = p0, p1
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    on, off = dash
    for i in range(n + 1):
        if i % (on + off) >= on:
            continue
        x = round(x0 + (x1 - x0) * i / n)
        y = round(y0 + (y1 - y0) * i / n)
        if 0 <= x < W and 0 <= y < H:
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * (1 - alpha) + color[0] * alpha), int(g * (1 - alpha) + color[1] * alpha),
                        int(b * (1 - alpha) + color[2] * alpha), 255)


def tag(text, fg=(255, 120, 96), bg=(22, 20, 32)):
    w = text_width(text) + 4
    im = Image.new('RGBA', (w, 9), (0, 0, 0, 0))
    px = im.load()
    for y in range(0, 7):
        for x in range(w):
            if (x in (0, w - 1)) and (y in (0, 6)):
                continue
            px[x, y] = bg + (215,)
    # pointer
    for x in range(w // 2 - 1, w // 2 + 2):
        px[x, 7] = bg + (215,)
    px[w // 2, 8] = bg + (215,)
    draw_text(im, 2, 1, text, fg + (255,))
    return im


def build(variant='human'):
    PEOPLE.clear()
    blob = variant == 'blob'

    def cast(person, item=None):
        """Same scene, either the human cast or one shared blob body (role by accessory only)."""
        return Blob(person.role, item) if blob else person

    by = 68  # building baseline (bottom of walls)
    xs = {'houseA': 0, 'shop': 92, 'police': 194, 'houseB': 276}
    LAYOUT.update(xs)
    # ------------------------------------------------------------------ ground
    sand_rects = [
        (xs['houseA'] + 15, 62, xs['houseA'] + 31, 72, 2),     # door paths
        (xs['shop'] + 15, 62, xs['shop'] + 31, 72, 2),
        (xs['police'] + 15, 62, xs['police'] + 31, 72, 2),
        (xs['houseB'] + 15, 62, xs['houseB'] + 31, 72, 2),
        (150, 104, 178, H + 4, 4),   # path south
        (176, 138, 262, 156, 4),     # path to garden
    ]
    pave_rects = [
        (0, 70, W, 106, 0),          # main street (paved)
        (8, 112, 140, 168, 6),       # plaza
        (138, 112, 152, 130, 0),
    ]
    base, mask = ground(sand_rects, pave_rects,
                        flower_tiles=[(17, 10), (18, 10), (19, 9)],
                        yellow_tiles=[(0, 11), (9, 11), (12, 7), (19, 6)])
    sc = Scene()

    # ------------------------------------------------------------------ backdrop trees (top border)
    pine = tile(6, 10, 2, 2)
    round_tree = tile(0, 10, 2, 2)
    cluster = tile(2, 9, 4, 3)
    pine_cluster = tile(8, 9, 4, 3)
    for x, y, im in [(-18, -24, pine_cluster), (58, -22, pine), (150, -26, cluster), (246, -22, pine),
                     (300, -24, cluster)]:
        sc.add(im, x, y)

    # ------------------------------------------------------------------ buildings
    hA = house_thatch()
    sc.add(hA, xs['houseA'], by - hA.height)
    shop = house_thatch2()
    sc.add(shop, xs['shop'], by - shop.height)
    pol = police_station()
    sc.add(pol, xs['police'], by - pol.height)
    hB = house_plaster()
    sc.add(hB, xs['houseB'], by - hB.height)

    ps = plate('POLICE', (250, 250, 255), (44, 62, 128))
    sc.overlays.append((xs['police'] + 32 - ps.width // 2, by - 26, ps))
    lamp = police_lamp()
    sc.add(lamp, xs['police'] + 64 + 1, by - lamp.height + 2)
    aw = awning(68)
    sc.add(aw, xs['shop'] - 2, by - 22, sort_y=by - 14)
    ss = plate('MARKET', (40, 110, 60), (246, 238, 214))
    sc.overlays.append((xs['shop'] + 32 - ss.width // 2, by - 31, ss))

    # ------------------------------------------------------------------ props
    lantern = tile(10, 5, 1, 2)
    sc.add(lantern, 68, by - 26)
    sc.add(tile(2, 6), xs['shop'] - 16, by - 15)          # barrel of goods by the shop
    sc.add(tile(12, 6), xs['shop'] - 15, by - 6)          # basket
    well = tile(5, 6, 1, 2)
    sc.add(well, 66, 122)
    bn = bench()
    sc.add(bn, 22, 148)
    sc.add(bn, 100, 148)
    sc.add(round_tree, 4, 110)
    sc.add(round_tree, 110, 108)
    for x in range(262, 330, 16):
        sc.add(tile(22, 3), x, 116)
    sc.add(tile(0, 6), 262, 126)
    sc.add(tile(1, 8), 296, 140)
    sc.add(tile(2, 8), 280, 158)
    sc.add(pine, 288, 90)
    for x, y, im in [(186, 156, round_tree), (226, 160, pine)]:
        sc.add(im, x, y)

    # shop counter (original) with goods (CC0 food icons)
    ct = counter(56)
    cx, cy = xs['shop'] + 18, by - 4
    sc.add(ct, cx, cy, sort_y=cy + ct.height)
    for i, name in enumerate(['fish.png', 'onigiri.png']):
        sc.add(item('food/' + name), cx + 2 + i * 13, cy - 10, sort_y=cy + ct.height + 0.2)

    # ------------------------------------------------------------------ people (x, y = sprite top-left)
    merchant = cast(Person(4, 'curly', 'black', 'red', 'brown', role='merchant'))
    mx, my = cx + 29, cy - 18
    sc.add(merchant.sprite('down'), mx, my, sort_y=by + 1)   # behind the counter, in front of the shop
    PEOPLE.append(('merchant', mx + 9, my + 20))
    buyer = cast(Person(1, 'bun', 'ginger', 'purple', 'olive'), 'bag')
    bx, byy = cx + ct.width + 1, cy - 6
    sc.person(buyer, bx, byy, 'left')
    thief = cast(Person(2, 'short', 'brown', 'teal', 'denim'))
    tx, ty = 46, 82
    sc.person(thief, tx, ty, 'left', 'sneak', loot=True)
    cop1 = cast(Person(6, 'short', 'black', 'teal', 'denim', role='police'))
    c1x, c1y = 196, 72
    sc.person(cop1, c1x, c1y, 'left')
    cop2 = cast(Person(3, 'bob', 'brown', 'teal', 'denim', role='police'))
    sc.person(cop2, 156, 126, 'up', 'walk')
    sleepy = cast(Person(5, 'pony', 'black', 'green', 'tan'), 'beanie')
    sx, sy = 21, 134
    sc.add(sleepy.sprite('down', 'sit'), sx, sy, sort_y=148 + 11 + 1)
    PEOPLE.append(('citizen', sx + 9, sy + 19))
    walkers = [
        (cast(Person(3, 'curly', 'dark', 'orange', 'black')), 100, 86, 'up', 'walk'),     # hungry, heading to shop
        (cast(Person(1, 'short', 'grey', 'pink', 'brown'), 'hat'), 82, 130, 'right', 'walk'),
        (cast(Person(4, 'bob', 'blonde', 'yellow', 'denim'), 'scarf'), 226, 134, 'left', 'walk'),
        (cast(Person(6, 'bun', 'black', 'red', 'grey'), 'bag'), 272, 84, 'down', 'walk'),
        (cast(Person(2, 'bob', 'ginger', 'white', 'olive'), 'scarf'), 8, 66, 'down', 'walk'),
        (cast(Person(5, 'short', 'black', 'purple', 'tan')), 236, 92, 'right', 'walk'),
    ]
    for p, x, y, d, pose in walkers:
        sc.person(p, x, y, d, pose)

    # lab-mode debug overlay: the officer's line of sight, drawn on the ground so people occlude it
    base = base.copy()
    if blob:
        sightline(base, (c1x + 4, c1y + 13), (tx + 8, ty + 16), alpha=0.9, dash=(3, 3))
    else:
        sightline(base, (c1x + 4, c1y + 10), (tx + 12, ty + 11), alpha=0.9, dash=(3, 3))
    img = sc.render(base)
    # ------------------------------------------------------------------ emotes, coin, state tag
    if blob:
        def top_row(spr):
            a = np.array(spr)[:, :, 3]
            return int(np.nonzero(a.max(axis=1))[0][0])
        def above(spr, y):            # bubble tail tip sits 1px above the sprite's outline
            return y + top_row(spr) - 14
        _paste_clip(img, bubble('!'), c1x + 2, above(cop1.sprite('left'), c1y))
        _paste_clip(img, bubble('$'), bx + 3, above(buyer.sprite('left'), byy))
        _paste_clip(img, bubble('z'), sx + 2, above(sleepy.sprite('down', 'sit'), sy))
        _paste_clip(img, bubble('food'), 100 + 2, above(walkers[0][0].sprite('up', 'walk'), 86))
        st = tag('STEALING')
        _paste_clip(img, st, tx + 10 - st.width // 2, ty + top_row(thief.sprite('left', 'sneak', loot=True)) - 10)
    else:
        _paste_clip(img, bubble('!'), c1x + 2, c1y - 13)
        _paste_clip(img, bubble('$'), bx + 3, byy - 13)
        _paste_clip(img, bubble('z'), sx + 2, sy - 12)
        _paste_clip(img, bubble('food'), 100 + 2, 86 - 13)
        st = tag('STEALING')
        _paste_clip(img, st, tx + 10 - st.width // 2, ty - 4)
    cn = coin()
    _paste_clip(img, cn, bx - 9, byy - 2)
    px = img.load()
    for (x, y) in [(bx - 2, byy + 5), (bx, byy + 8), (bx + 2, byy + 10)]:   # arc trail from the buyer's hand
        px[x, y] = (255, 240, 170, 255)
    # dust puffs behind the sneaking citizen
    puff = from_ascii([".ww.", "wWWw", ".ww."], {'w': (236, 226, 206, 170), 'W': (250, 246, 236, 210)})
    _paste_clip(img, puff, tx + 21, ty + 16)
    _paste_clip(img, puff.resize((3, 2), Image.NEAREST), tx + 26, ty + 13)
    hud(img)
    return img


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    variant = 'blob' if '--blob' in sys.argv else 'human'
    native = build(variant)
    native.save('/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/town_native_%s.png' % variant)
    upscale(native.convert('RGB'), 3).save(args[0] if args else
                                           '/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/town_3x_%s.png' % variant)
