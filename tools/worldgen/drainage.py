"""Drainage: priority-flood from the sea and the map edges, erosion-lite in stream-power style,
lakes in deep enough depressions (closed basins too big for one lake keep a smaller terminal
lake), then flow accumulation weighted by rain and rivers of size 1-3.

Integer arithmetic only, so a TypeScript port can match it exactly.
"""
import heapq
from math import isqrt

from grid import neighbours, parts
from rng import ELEVATION, draw

LAKE_DEPTH = 24
MAX_LAKE = 80
RAIN_UNIT = 128
RIVER_CELLS = 36
EROSION_PASSES = 2
# Shares the ELEVATION stream with terrain.py, whose keys are the fbm octaves and 0x100-0x109.
FLAT = 0x107


def flood(seed, width, height, elevation, sinks):
    """Priority-flood from the sinks (ocean, terminal lakes) and the map edges. Equal heights
    leave in a keyed order, so water wanders across a flat to its outlet instead of running in
    straight rays. Returns (filled, receiver, order)."""
    nbrs = neighbours(width, height)
    n = len(elevation)
    filled = list(elevation)
    receiver = [-1] * n
    done = bytearray(n)
    heap = []
    for i in range(n):
        x, y = i % width, i // width
        if sinks[i] or x in (0, width - 1) or y in (0, height - 1):
            heap.append((elevation[i], draw(seed, ELEVATION, FLAT, i), i))
            done[i] = 1
    heapq.heapify(heap)
    order = []
    while heap:
        level, _, c = heapq.heappop(heap)
        order.append(c)
        for m in nbrs[c]:
            if not done[m]:
                done[m] = 1
                filled[m] = max(elevation[m], level)
                receiver[m] = c
                heapq.heappush(heap, (filled[m], draw(seed, ELEVATION, FLAT, m), m))
    return filled, receiver, order


def accumulate(order, receiver, rain, ocean):
    flow = [0] * len(order)
    for c in reversed(order):
        if ocean[c]:
            continue
        flow[c] += RAIN_UNIT // 4 + rain[c]
        r = receiver[c]
        if r >= 0 and not ocean[r]:
            flow[r] += flow[c]
    return flow


def _erode(elevation, filled, receiver, flow, ocean):
    """Stream-power incision: cut a share of the drop to the receiver that grows with sqrt(flow)."""
    out = list(elevation)
    for i, r in enumerate(receiver):
        if ocean[i] or r < 0:
            continue
        drop = filled[i] - filled[r]
        if drop > 0:
            cut = drop * min(isqrt(flow[i] // RAIN_UNIT), 12) // 24
            out[i] = max(elevation[i] - cut, filled[r] + 1, 1)
    return out


def _lakes(width, height, elevation, filled, ocean):
    """A filled depression deep enough and 2+ cells becomes a lake; shallower ones are levelled.
    A basin too big for one lake holds water only in its lowest MAX_LAKE cells, with no outlet,
    like a lake in a dry closed basin. Returns (lake, terminal, elevation)."""
    n = len(elevation)
    pit = bytearray(1 if not ocean[i] and filled[i] > elevation[i] else 0 for i in range(n))
    nbrs = neighbours(width, height)
    same = tuple(tuple(m for m in nbrs[i] if filled[m] == filled[i]) for i in range(n))
    label, sizes = parts(same, pit)
    members = [[] for _ in sizes]
    for i in range(n):
        if pit[i]:
            members[label[i]].append(i)
    lake, terminal, level = bytearray(n), bytearray(n), list(elevation)
    for cells in members:
        depth = max(filled[i] - elevation[i] for i in cells)
        if len(cells) < 2 or depth < LAKE_DEPTH:
            for i in cells:
                level[i] = filled[i]
        elif len(cells) <= MAX_LAKE:
            for i in cells:
                lake[i] = 1
        else:
            for i in _lowest(cells, elevation, nbrs):
                lake[i] = terminal[i] = 1
    before, closed = bytes(lake), bytes(terminal)
    for i in range(n):
        if not ocean[i]:
            wet = sum(before[m] for m in nbrs[i])
            if not before[i] and wet >= 6:
                lake[i], terminal[i] = 1, max(closed[m] for m in nbrs[i])
            elif before[i] and wet <= 1:
                lake[i] = terminal[i] = 0
                if not closed[i]:
                    level[i] = filled[i]
    return lake, terminal, level


def _lowest(cells, elevation, nbrs):
    """The basin's lowest MAX_LAKE cells as one connected body, grown upwards from its deepest."""
    inside = set(cells)
    start = min(cells, key=lambda i: (elevation[i], i))
    heap, taken = [(elevation[start], start)], set()
    while heap and len(taken) < MAX_LAKE:
        _, c = heapq.heappop(heap)
        if c not in taken:
            taken.add(c)
            for m in nbrs[c]:
                if m in inside and m not in taken:
                    heapq.heappush(heap, (elevation[m], m))
    return taken


def drain(seed, width, height, elevation, ocean, rain):
    """Returns (elevation, lake, receiver, flow, river) after erosion-lite and lake filling."""
    for _ in range(EROSION_PASSES):
        filled, receiver, order = flood(seed, width, height, elevation, ocean)
        elevation = _erode(elevation, filled, receiver, accumulate(order, receiver, rain, ocean), ocean)
    filled, receiver, order = flood(seed, width, height, elevation, ocean)
    lake, terminal, elevation = _lakes(width, height, elevation, filled, ocean)
    if any(terminal):
        sinks = bytearray(o | t for o, t in zip(ocean, terminal))
        filled, receiver, order = flood(seed, width, height, elevation, sinks)
        elevation = [f if f > e and not lake[i] else e for i, (e, f) in enumerate(zip(elevation, filled))]
    flow = accumulate(order, receiver, rain, ocean)
    return elevation, lake, receiver, flow, rivers(width, height, flow, receiver, lake, ocean)


def rivers(width, height, flow, receiver, lake, ocean):
    """Size 1-3 where flow passes 1x, 4x and 12x the threshold; stubs under 3 cells are dropped."""
    unit = RIVER_CELLS * RAIN_UNIT
    n = len(flow)
    river = bytearray(0 if ocean[i] or lake[i] else 3 if flow[i] >= 12 * unit else 2 if flow[i] >= 4 * unit
                      else 1 if flow[i] >= unit else 0 for i in range(n))
    links = [[] for _ in range(n)]
    for i in range(n):
        r = receiver[i]
        if river[i] and r >= 0 and river[r]:
            links[i].append(r)
            links[r].append(i)
    label, sizes = parts(links, river)
    return bytearray(river[i] if river[i] and sizes[label[i]] >= 3 else 0 for i in range(n))
