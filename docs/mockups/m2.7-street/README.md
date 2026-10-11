# M2.7 Part 1, life on the street: mockups for the owner's pick

Task 1 of the [M2.7 plan](../../plan/tasks/m2-economy/m2.7-street-link-and-the-112-day-year/plan.md). Nothing here is a final sprite: the owner picks one variant on each sheet, and Task 7 draws the set in `tools/sprites`.

`docs/mockups/generator/street_sheets.py` draws each sheet at native pixel size and scales it with nearest-neighbour, 4×. The art is original, in `spritekit.PALETTE` colours with the house outline and top-left light, drawn on the repo's own blob (`characters.py`) and building kit. `test_street.py` beside it checks the palette, the sizes and the outline rule. No third-party art.

| Sheet | Shows | Pick |
| --- | --- | --- |
| `01-carried-goods.png` | The seven 8×8 goods, bread, vegetables, fish, milk, cloth, tools and firewood, each held by a blob of all six hues. | None: say if a good reads badly. |
| `02-hold-variants.png` | How a blob holds a good, on 3 hues, 3 facings and both walk frames, then facing up, the eating path of each hold and the hold point on every body frame. | Hold 1 front hip, 2 rear hip or 3 arm's length. |
| `03-eating-faces.png` | The chewing faces, 2 frames each for down, left and right, and the three-step eating loop. | Face 1 open and shut, 2 side to side or 3 wide munch. |
| `04-market-stalls.png` | The vegetable, fish and milk stalls at 48×48, beside the stall today. | Look 1 one teal canopy, 2 canopy colour by good, or 3 the good's icon on the sign. |
| `05-shop-fronts.png` | The Draper's and the Fuel Store's fronts at 64×48, each in 2 looks and in snow, beside the Bakery, Smithy and general store. | Draper look 1 bolts in the window or 2 cloth on a rail; Fuel Store look 1 open log shed or 2 long stack. |
| `06-stock-pips.png` | Stock pips for 0 to 3 in three designs, alone and over a premises. | Design 1 beads, 2 crates or 3 a jar filling. |

My picks are hold 1, face 1, stall look 2, Draper look 2, Fuel Store look 1 and pips design 1.

## Hold points

A hold point is the top-left pixel `(x, y)` of the item's 8×8 cell on the body's 18×22 canvas. Right mirrors left, so an item's x becomes 10 − x and an eating step's dx changes sign. Facing up draws no item. Eating steps `(dx, dy)` move the item from its stand hold to the mouth on eating frames 1 and 2.

| Hold | Down: stand, walk 0, walk 1 | Left: stand, walk 0, walk 1 | Eating steps down; left |
| --- | --- | --- | --- |
| 1 front hip | (0,15) (−1,16) (0,14) | (0,15) (−1,16) (0,14) | (2,−1) (5,−1); (1,−1) (2,−1) |
| 2 rear hip | (10,15) (9,16) (10,14) | (8,15) (7,16) (8,14) | (−2,−1) (−5,−1); (−3,−1) (−6,−1) |
| 3 arm's length | (−3,15) (−4,16) (−3,14) | (−3,15) (−4,16) (−3,14) | (3,−1) (8,−1); (2,−1) (5,−1) |

## Calls made

- **The hip, not the belly.** A good centred under the eyes reads as a beak or a beard, the "panel under the eyes" the sprite README warns of. `test_street.py` checks that no good touches any eye shape. Carried over the head or on the back were rejected: hats and the emote bubble sit above, and a sack on the back is the crime costume.
- **Eating slides, it does not only rise.** The plan's 0, 2 and 3 px of lift would cover the eyes, so the item steps up 1 px and slides to the mouth.
- **Chewing faces have calm open eyes and no pink.** The happy face's blush already means a purchase, so only the mouth moves.
- **Beads, not dots on a board.** At 8×8 a board leaves 1-px dots that read as tally marks. Beads are 2×2 dots in a triangle, and unlit ones show the capacity.
- **Stall look 3 hangs the good's carried icon where the coin hangs,** so one icon stands for a good everywhere. The closed stall stays one for all three, with its coin.
- **Look 2's canopies are green, blue and lilac.** They avoid red, orange and the police navy, and teal stays the merchants' colour.
- **Signs are pictograms.** The Draper's is a folded bolt and the Fuel Store's a pile of log ends. Snow comes from `buildings.snowfall()`, so the `_snow` overlay is the difference, as `add_with_snow` makes it.
