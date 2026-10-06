"""Names shared by the world and place generators, and the record a place is built from."""
from dataclasses import dataclass

# Country biomes; each draws with the map sheet's tile of the same name, and both waters as water.
BIOMES = ('ocean', 'lake', 'grassland', 'farmland', 'forest-deciduous', 'forest-conifer', 'marsh', 'sand',
          'hills', 'mountain', 'peak')
TIERS = ('capital', 'city', 'town', 'village', 'hamlet')
WONDERS = ('waterfall', 'giant-tree', 'sea-arch', 'stone-arch', 'hot-springs', 'geyser', 'crystal-cave',
           'caldera-lake', 'canyon-view', 'glacier', 'dune')
LANDMARKS = ('lighthouse', 'viaduct', 'observatory', 'clock-tower', 'glasshouse', 'library', 'amphitheatre',
             'windmill', 'garden-terraces', 'fountain')


@dataclass(frozen=True)
class PlaceContext:
    """What a zoomed-in place knows about its country cell (round 4's context record).

    Sides are letters from 'nesw'. `seed` is the place's own seed, draw(world seed, PLACE, ...),
    so a place rebuilds identically on every visit.
    """
    seed: int
    name: str
    biome: str
    temperature: int            # 0..255, cold to hot
    moisture: int               # 0..255, dry to wet
    tier: str | None = None     # settlements only
    population: int = 0
    sea: str = ''               # sides that face the sea
    coast: str = ''             # 'beach' or 'cliffs' where there is sea
    river: str = ''             # sides a river enters or leaves by
    roads: str = ''             # sides roads arrive from
    farmland: str = ''          # sides that face fields
    landmarks: tuple = ()
    wonder: str | None = None
