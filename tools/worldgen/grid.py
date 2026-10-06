"""Grid helpers shared by the world stages: neighbour lists, breadth-first distances, connected
parts and compass sides.

Cells are indexed y * width + x. Neighbour lists keep one fixed order, orthogonal steps first,
so every stage visits neighbours the same way and a port can match it.
"""
from collections import deque
from functools import lru_cache

ORTHO = ((0, -1), (1, 0), (0, 1), (-1, 0))
DIAG = ((1, -1), (1, 1), (-1, 1), (-1, -1))
SIDES = 'nesw'


@lru_cache(maxsize=None)
def neighbours(width, height, diagonal=True):
    steps = ORTHO + DIAG if diagonal else ORTHO
    return tuple(tuple((y + dy) * width + x + dx for dx, dy in steps
                       if 0 <= x + dx < width and 0 <= y + dy < height)
                 for y in range(height) for x in range(width))


def dist2(ax, ay, bx, by):
    dx, dy = ax - bx, ay - by
    return dx * dx + dy * dy


def distances(nbrs, sources, passable=None, limit=255):
    """Steps to the nearest source, capped at `limit`; cells failing `passable` are never entered."""
    dist = [limit] * len(nbrs)
    queue = deque()
    for i in sources:
        dist[i] = 0
        queue.append(i)
    while queue:
        c = queue.popleft()
        d = dist[c] + 1
        if d >= limit:
            continue
        for m in nbrs[c]:
            if dist[m] > d and (passable is None or passable[m]):
                dist[m] = d
                queue.append(m)
    return dist


def parts(nbrs, member):
    """Label each connected group of member cells 0, 1, ... in index order; -1 elsewhere."""
    label = [-1] * len(nbrs)
    sizes = []
    for start in range(len(nbrs)):
        if not member[start] or label[start] >= 0:
            continue
        label[start] = len(sizes)
        queue, count = deque([start]), 0
        while queue:
            c = queue.popleft()
            count += 1
            for m in nbrs[c]:
                if member[m] and label[m] < 0:
                    label[m] = len(sizes)
                    queue.append(m)
        sizes.append(count)
    return label, sizes


def side(dx, dy, taken=''):
    """The compass side a step leaves by; a diagonal takes whichever of its two sides is free."""
    vertical = 'n' if dy < 0 else 's' if dy > 0 else ''
    horizontal = 'w' if dx < 0 else 'e' if dx > 0 else ''
    if not vertical or not horizontal:
        return vertical or horizontal
    return horizontal if vertical in taken and horizontal not in taken else vertical


def sides_text(letters):
    chosen = set(letters)
    return ''.join(s for s in SIDES if s in chosen)
