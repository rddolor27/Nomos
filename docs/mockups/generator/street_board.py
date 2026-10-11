"""Sheet layout for the M2.7 street mockups: a picture built at native pixel size, with plates, captions and
section bars in the 3x5 font, saved scaled up by a whole number with nearest-neighbour (as the other mockups are)."""
import sys
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pix import FONT3x5  # noqa: E402

INK, PLATE, BAR, GROUND = (40, 40, 48, 255), (236, 238, 230, 255), (52, 58, 70, 255), (226, 230, 214, 255)
GUIDE = (214, 56, 160, 255)           # review marks only (hold points): never part of a sprite
FONT = {**FONT3x5, '_': ['...', '...', '...', '...', '###']}


def text_width(s):
    return 4 * len(s) - 1


def text(img, x, y, s, colour=INK):
    px = img.load()
    for ch in s.upper():
        for gy, row in enumerate(FONT.get(ch, FONT['?'])):
            for gx, bit in enumerate(row):
                if bit == '#' and 0 <= x + gx < img.width and 0 <= y + gy < img.height:
                    px[x + gx, y + gy] = colour
        x += 4


class Board:
    """A native-size canvas with a cursor `y` that sections move down; `save` crops to the used height."""

    def __init__(self, width, height=1200, ground=GROUND):
        self.image = Image.new('RGBA', (width, height), ground)
        self.width = width
        self.y = 4

    def heading(self, s):
        self.image.paste(BAR, (0, self.y, self.width, self.y + 11))
        text(self.image, 5, self.y + 3, s, PLATE)
        self.y += 15

    def put(self, im, x, y):
        self.image.alpha_composite(im, (x, y))

    def label(self, x, y, s, centre_on=None):
        """A light plate with dark letters, its top-left at (x, y), or centred on `centre_on`."""
        w = text_width(s) + 4
        if centre_on is not None:
            x = centre_on - w // 2
        self.image.paste(PLATE, (x, y, x + w, y + 9))
        text(self.image, x + 2, y + 2, s)

    def note(self, x, y, s, colour=INK):
        text(self.image, x, y, s, colour)

    def save(self, path, scale=4):
        assert self.y <= self.image.height, f'the sheet needs {self.y} rows and has {self.image.height}'
        im = self.image.crop((0, 0, self.width, self.y))
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        im.convert('RGB').save(path, optimize=True)
        print(f'{path}  {im.width}x{im.height}  (native {self.width}x{self.y}, x{scale})')
