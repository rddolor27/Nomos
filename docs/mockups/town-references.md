# Town look references

What makes a top-down pixel-art town read well, for the walls, houses and props of M3.1 part 2. In short: one light, one outline and one palette; gates where roads enter; squares where roads meet; and variety from recombined parts rather than richer pieces.

These references were written from memory on 10 October 2026, without web access. Every link is labelled "not opened" until someone checks it. Take only lessons from them: never copy, trace or recolour their art (`.claude/rules/content.md`).

| Reference | Evidence | What to take from it |
|---|---|---|
| Kenney, [Tiny Town](https://kenney.nl/assets/tiny-town) (CC0 pack) | not opened | Variety comes from recombining a few wall, roof and fence parts on a 16-px grid. Fences and walls join in every direction from a small set of pieces. |
| Pixel-boy, [Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs) (CC0 pack) | not opened | Props such as wells, barrels and lanterns sit at doors and corners, which makes a street read as lived in. Every object carries the same dark outline. |
| [Rothenburg ob der Tauber](https://en.wikipedia.org/wiki/Rothenburg_ob_der_Tauber) | not opened | One ring wall with towers at its corners and turns, a gate where each main road enters, and the market square where those roads meet. |
| [Nördlingen](https://en.wikipedia.org/wiki/N%C3%B6rdlingen) | not opened | A near-round wall with a gate on each axis road. Houses pack against the inside of the wall, with a lane running round behind it. |
| [Bastide](https://en.wikipedia.org/wiki/Bastide) (planned market towns) | not opened | A grid of equal plots around a central market square, with straight streets from the gates to the square. Plot size follows the plan, not the owner. |
| [Stardew Valley](https://en.wikipedia.org/wiki/Stardew_Valley), its town scenes, described in words only | not opened | Houses differ by shape, roof colour and material, not by grandeur. Props cluster at doors, squares and the town's edges, and the seasons change the ground, not the people. |

## How the new pieces use these

- **Walls:** one tile thick, with 2×2 towers at the corners and a gate where a road enters, as in Rothenburg and Nördlingen. `place.py` should place gates on the roads, never the reverse (M3.1 part 2, step 5).
- **Squares:** roads from the gates should meet at the market square, as in the bastides. The notice board, pump and trough belong there.
- **Houses:** weatherboard and rubble add material, not status. Every style shares the same door, windows, boxes and chimney size (content rule 5).
- **Props:** cluster them at doors, squares and gates, as the CC0 packs do, rather than scattering them evenly.
