"""Military: the barracks, a road watchtower, a small fort and their map icons.

The military defends and patrols the roads; it never polices towns (docs/plan/military.md). So
nothing here borrows the police navy or badge, and nothing glorifies: no flags, banners,
heraldry, weapons on show or battle damage. The barracks' sign is the soldier's helmet.

GBA-era top-down pixel art in three-quarter view, lit from the top left, finished with the
shared 1-px OUTLINE ring. Roofs, walls and doorways come from buildings.py, so the barracks
shares the eave line and doorway of the civic buildings. Set pieces anchor at the bottom centre
of their footprint, and the fort is stamped together from ringed parts, back to front.

Build: python tools/sprites/military.py
"""
import buildings
from buildings import Building, Canvas, roof_hip, wall
from landmarks import ring
from spritekit import Sheet, add_outline, from_ascii, pad

KEY = buildings.SYM

HELMET_SIGN = [         # the soldier's kettle hat on a plain plaque
    'OOOOOOOOOOOOO',
    'OLwwwwwwwwwdO',
    'OwCCCCCCCCCdO',
    'OwCCCWKkCCCdO',
    'OwCCWKKKkCCdO',
    'OwCCKKKKkCCdO',
    'OwCxxxxxxxCdO',
    'OwCxCCCCCxcdO',
    'OwCCCCCCCCcdO',
    'OdddddddddddO',
    'OOOOOOOOOOOOO',
]


def barracks():
    b = Building(4)
    c = b.c
    b.roof('shingle', 'shingle')
    b.wall('sand')
    c.hline(b.wx0, b.wx1, b.E + 1, 'd')                       # timber beam under the eave
    c.hline(b.wx0, b.wx1, b.E + 2, 'w')
    for x in (b.wx0, b.wx1 - 1):                              # corner posts
        c.rect(x, b.E + 3, x + 1, b.g - 3, 'w')
        c.vline(x, b.E + 3, b.g - 3, 'L')
    c.vline(b.wx1, b.E + 3, b.g - 3, 'd')
    b.doorway()
    for x in (8, 14, b.W - 20, b.W - 14):                     # two pairs of narrow windows, mirrored
        c.stamp(x, b.E + 6, buildings.NARROW_WINDOW)
        c.hline(x, x + 4, b.E + 17, 'K')
    c.prop((b.W - 13) // 2, b.E - 10, HELMET_SIGN)
    return b, [b.door_x() + 9, b.g]


def watchtower():
    W, H = 32, 64
    c = Canvas(W, H)
    g = H - 2
    for i, w in enumerate((4, 8, 12, 16, 20, 24, 28, 30)):    # shingle pyramid roof
        x0, x1 = W // 2 - w // 2, W // 2 + w // 2 - 1
        for x in range(x0, x1 + 1):
            ch = 'L' if x < W // 2 - w // 4 else 'd' if x > W // 2 + w // 4 - 1 else 'w'
            if i % 3 == 2 and x0 < x < x1:
                ch = {'L': 'w', 'w': 'd', 'd': 'd'}[ch]
            c.put(x, 1 + i, ch)
    c.hline(1, W - 2, 9, 'w')
    c.hline(1, W - 2, 10, 'd')
    c.hline(3, W - 4, 11, 'O')
    c.rect(4, 12, W - 5, 23, 'd')                             # the lookout's shaded inside
    for x in (3, W - 6):                                      # corner posts
        c.vline(x, 12, 23, 'L')
        c.vline(x + 1, 12, 23, 'w')
        c.vline(x + 2, 12, 23, 'O')
    c.vline(W - 4, 12, 23, 'w')
    c.vline(W - 5, 12, 23, 'L')
    c.vline(W - 6, 12, 23, 'O')
    for y in (18, 21):                                        # plank railing
        c.hline(3, W - 4, y - 1, 'O')
        c.hline(3, W - 4, y, 'L')
        c.hline(3, W - 4, y + 1, 'w')
    c.hline(1, W - 2, 24, 'O')                                # platform edge
    c.hline(1, W - 2, 25, 'L')
    c.hline(1, W - 2, 26, 'w')
    c.hline(1, W - 2, 27, 'd')
    span = g - 31
    for y in range(28, g - 3):
        t = (y - 28) / span
        c.put(round(8 - t), y, 'd')                           # back legs, in shade
        c.put(round(W - 9 + t), y, 'd')
        lx = round(5 - 3 * t)                                 # front legs, splayed
        c.put(lx, y, 'L')
        c.put(lx + 1, y, 'w')
        c.put(W - 2 - lx, y, 'w')
        c.put(W - 1 - lx, y, 'd')
    for y0, y1 in ((30, 44), (44, 58)):                       # cross braces between the front legs
        for y in range(y0, y1 + 1):
            t = (y - y0) / (y1 - y0)
            lx = round(5 - 3 * (y - 28) / span) + 2
            rx = W - 1 - lx
            c.put(round(lx + t * (rx - lx)), y, 'w')
            c.put(round(rx - t * (rx - lx)), y, 'w')
    for y in range(28, g - 3):                                # ladder
        c.put(13, y, 'w')
        c.put(18, y, 'd')
        if y % 3 == 0:
            c.hline(14, 17, y, 'L')
    for x in (1, W - 7):                                      # stone footings
        c.ground(x, ['OOOOOOO', 'OKKKKkO', 'OkkkkxO', 'OOOOOOO'])
    return c


# ------------------------------------------------------------------ fort
def merlons(w, far):
    """Merlons along a parapet, 3 px wide and 3 apart: lit caps over their faces, with the parapet's
    lit top between them. Far-side gaps open on the sky; near-side gaps show the shaded walkway."""
    gap = ('.', '.', 'K') if far else ('O', 'x', 'K')
    rows = ['', '', '']
    for x in range(w):
        face = 'x' if x % 6 == 2 else 'k'
        for r, ch in enumerate(('K', face, face) if x % 6 < 3 else gap):
            rows[r] += ch
    return rows


def stone_face(w, h, oy=0):
    """Coursed stone, lit on its left edge and shaded on its right."""
    c = Canvas(w, h)
    c.tile(0, 0, w - 1, h - 1, ['Kkkkkkkx', 'kkkkkkkx', 'kkkkkkkx', 'xxxxxxxx'], stagger=4, oy=oy)
    c.vline(0, 0, h - 1, 'K')
    c.vline(w - 1, 0, h - 1, 'x')
    return c.rows()


def tower(w, h):
    """A square tower: merlons round a deck seen from above, then its front face."""
    deck = ['K' + 'x' * (w - 2) + 'x', 'K' + 'k' * (w - 2) + 'x']
    top = merlons(w, True) + deck + merlons(w, False)
    return top + stone_face(w, h - len(top))


def curtain(w, h, far=False):
    """A stretch of wall: merlons, then the face."""
    return merlons(w, far) + stone_face(w, h - 3, oy=1)


def gatehouse(w, h):
    """A raised stretch of wall over an arched gate of plain plank doors."""
    c = Canvas(w, h)
    c.stamp(0, 0, curtain(w, h))
    gate = buildings.doorway(inner='w', floor='w', h=h - 7)
    gx = (w - len(gate[0])) // 2
    c.stamp(gx, 7, gate)
    for dx in (3, 6, 12, 15):                                  # planks either side of where the leaves meet
        for y in range(9, h):
            if c.get(gx + dx, y) == 'w':
                c.put(gx + dx, y, 'd')
    c.vline(gx + 9, 8, h - 1, 'O')
    c.hline(gx + 3, gx + len(gate[0]) - 4, 6, 'K')            # lit course over the arch
    return c.rows()


def walkway(h, side):
    """A side wall seen from above: merlons notching its outer edge, the walkway, a drop to the yard."""
    rows = []
    for y in range(h):
        merlon = ('K' if side == 'left' else 'x') if y % 5 < 3 else '.'
        rows.append(merlon + 'Kkkkkx' if side == 'left' else 'Kkkkkx' + merlon)
    return rows


def yard_house(w):
    """A long plain storehouse against the back wall."""
    c = Canvas(w, 19)
    roof_hip(c, 0, w - 1, 0, 9, 'shingle', 'shingle')
    c.hline(2, w - 3, 10, 'O')
    wall(c, 2, w - 3, 11, 18, 'sand', plinth=None)
    for x in (7, 15, w - 20, w - 12):
        c.stamp(x, 12, ['OOOOO', 'OAAAO', 'OaaaO', 'OOOOO'])
    c.stamp(w // 2 - 3, 12, ['OOOOOO', 'OddddO', 'OddddO', 'OddddO', 'OwwwwO', 'OwwwwO', 'OwwwwO'])
    return c.rows()


def fort():
    W, H = 96, 64
    c = Canvas(W, H)
    c.rect(9, 17, W - 10, 44, 's')                             # the packed-earth yard
    for y in range(17, 45):
        for x in range(9, W - 9):
            if buildings._hash(x, y) % 9 == 0:
                c.put(x, y, 'S')
    c.prop(13, 0, ring(curtain(W - 26, 17, far=True)))         # back wall
    for x, side in ((1, 'left'), (W - 9, 'right')):
        c.prop(x, 14, ring(walkway(24, side)))                 # side walls
    for x in (0, W - 17):
        c.prop(x, 0, ring(tower(15, 22)))                      # back towers
    c.prop(20, 9, ring(yard_house(W - 40)))
    c.prop(14, 41, ring(curtain(W - 28, 21)))                  # front wall
    c.prop(W // 2 - 15, 37, ring(gatehouse(30, 25)))
    for x in (0, W - 19):
        c.prop(x, 33, ring(tower(17, 29)))                     # front towers
    return c


# ------------------------------------------------------------------ map icons
# Silhouettes for the Region view (16 px) and the Country view (8 px), drawn as fills and ringed.
# The watchtowers rise into the tile above; all four carry `overlay`, like the wonder icons.
ICON16 = {
    'fort': [
        'K.Kx......K.Kx',
        'KKkx......KKkx',
        'KKkxK.K.K.KKkx',
        'KKkxKKKKkxKKkx',
        'KKkxkkkkkxKKkx',
        'KKkxkkkkkxKKkx',
        'KKkxkkddkxKKkx',
        'KKkxkkddkxKKkx',
        'xxxxxxddxxxxxx',
    ],
    'watchtower': [
        '......Lw......',
        '.....LLwd.....',
        '....LLwwdd....',
        '...LLwwwwdd...',
        '..LLwwwwwwdd..',
        '.wwwwwwwwwwwd.',
        '..Lddddddddw..',
        '..LLLLLLLLLw..',
        '.LLLLLLLLLLLw.',
        '..Lw......wd..',
        '..Lww....wwd..',
        '..Lw.w..w.wd..',
        '..Lw..ww..wd..',
        '..Lw.w..w.wd..',
        '.Lw.w....w.wd.',
        '.Lww......wwd.',
        '.Lw........wd.',
        'KKkx......KKkx',
    ],
}
ICON8 = {
    'fort': [
        'Kk..Kx',
        'KkKkKx',
        'KkddKx',
        'xxddxx',
    ],
    'watchtower': [
        '..Lw..',
        '.LLwd.',
        'Lwwwwd',
        '.Lddw.',
        '.LLLw.',
        '.L..d.',
        '.Lwwd.',
        'L....d',
    ],
}


def icon(rows, size, name):
    if any(len(r) != size - 2 for r in rows):
        raise ValueError(f'map{size}_military_{name}: rows must be {size - 2} wide')
    im = add_outline(pad(from_ascii(rows, KEY)))
    if im.height < size:
        im = pad(im, 0, size - im.height, 0, 0)
    if im.height > size * 3 // 2:
        raise ValueError(f'map{size}_military_{name} rises too far: {im.height} rows')
    return im


# ------------------------------------------------------------------ sheet
def build():
    sheet = Sheet('military')
    b, door = barracks()
    sheet.add('building_barracks', b.c.image(), footprint=b.footprint, door=door)
    t = watchtower()
    sheet.add('military_watchtower', t.image(), footprint=[2, 1], door=[t.w // 2, t.h - 2])
    f = fort()
    sheet.add('military_fort', f.image(), footprint=[6, 3], door=[f.w // 2, f.h - 2])
    for size, icons in ((16, ICON16), (8, ICON8)):
        for name, rows in icons.items():
            sheet.add(f'map{size}_military_{name}', icon(rows, size, name), overlay=True)
    return sheet


if __name__ == '__main__':
    build().save()
