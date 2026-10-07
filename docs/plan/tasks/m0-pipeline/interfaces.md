# M0 interfaces: the contract between sub-milestones

M0's sub-milestones are planned in parallel, so the names and layouts they share are fixed here first. Each item has one owner, the sub-milestone that builds it. A plan may refine an item it owns, but must update this file in the same commit; plans that consume an item use it exactly as written.

## Packages

| Package | Path | Role | Built in |
| --- | --- | --- | --- |
| `@nomos/sim-core` | `packages/sim-core` | Pure TypeScript sim with no DOM: draws, noise, calendar, agent store, ledgers, exact maths, and the world step | M0.1–M0.3 |
| `@nomos/sim-protocol` | `packages/sim-protocol` | Constants, the snapshot layout, the binary map format and the worker messages, shared by every side | M0.3, map in M0.4 |
| `@nomos/sim-worker` | `packages/sim-worker` | The Web Worker: timing, pause and checkpoints around sim-core's world step | M0.3 |
| `@nomos/render-gl` | `packages/render-gl` | `WorldRenderer` on WebGL2, with the Canvas2D fallback | M0.4 |
| `@nomos/web` | `apps/web` | The page: load path, HUD, charts, tiers and accessibility | M0.5 |
| `@nomos/cli` | `tools/cli` | Headless runs and replay hashes in Node, through sim-core's world step | M0.3 |
| `@nomos/bench` | `tools/bench` | The CI budget, allocation and startup gates | M0.6 |
| `@nomos/sim-culture` | `packages/sim-culture` | Culture code, walled off from crime, police, labour, wage, wealth, ability, housing and migration code | M0.6 |

Dependencies point one way: `sim-core` ← `sim-protocol` ← `sim-worker`; `render-gl` imports only `sim-protocol`; `web` imports `sim-protocol` and `render-gl` and starts the worker; `cli` imports `sim-core` and `sim-protocol`. The world step lives in `sim-core`, so headless runs and the worker run the same code.

## The world step (owner: M0.3)

- `createWorld(seed: number, tier: Tier): World` and `step(world: World): void`, one tick per call, in `sim-core`. A `World` holds the agent store, the ledgers and the tick counter.
- `stateHash(world: World): number`: a 32-bit hash over every replay-relevant column and ledger, the value the determinism checks compare.
- `Tier` is `'phone' | 'phone-plus' | 'desktop'`, with agent caps of 10,000, 25,000 and 100,000.

## Snapshot v1 (owner: M0.3)

- 12 bytes per agent, little-endian. Bytes 0–3 are x and 4–7 are y, as float32 in world pixels (16 per tile, origin top-left). Bytes 8–11 are the visual word, a uint32.
- Snapshots travel in pooled, transferable `ArrayBuffer`s; the app hands each one back, so three buffers circulate and none is allocated per tick.
- The visual word, read and written only through `sim-protocol`'s helpers:

| Bits | Field | Values |
| --- | --- | --- |
| 0–6 | `look` | 0–95, one of the 96 looks; no sim rule reads it (R8, R9) |
| 7 | reserved | 0 |
| 8–10 | `action` | 0 idle, 1 walk, 2 sit, 3 sleep, 4 work, 5 talk, 6 sneak, 7 carry (R1, R3) |
| 11–15 | `emote` | 0 none, then emote ids up to 31 |
| 16–23 | `job` | 0 none, then job-item ids up to 255 |
| 24–25 | `facing` | 0 down, 1 left, 2 up, 3 right |
| 26 | `trueOnly` | 1 for a cue the recorded view must never draw; the render-filter test checks it |
| 27–31 | reserved | 0 |

- There is no "wanted" bit (R1, R3).
- Helpers: `packVisual(look, action, emote, job, facing, trueOnly): number`, and `lookOf`, `actionOf`, `emoteOf`, `jobOf`, `facingOf` and `isTrueOnly`, each taking `(word: number): number`.

## Worker messages (owner: M0.3)

- App to worker:
  - `{ type: 'init', seed, tier, map: ArrayBuffer }`
  - `{ type: 'pause' }` and `{ type: 'resume' }`
  - `{ type: 'return', buffer: ArrayBuffer }`
- Worker to app:
  - `{ type: 'ready', agents }`
  - `{ type: 'snapshot', tick, count, buffer: ArrayBuffer }`
  - `{ type: 'stats', tick, systemMs: Record<string, number> }`
  - `{ type: 'checkpoint', tick, state: ArrayBuffer }` on `pagehide`
- Speed controls and skip arrive in M1 (Calendar); the worker refuses settings messages while a run plays.

## The binary map, version 1 (owner: M0.4)

- One format for generated and hand-made maps (R9): terrain kinds, IntGrid walkability, and entities (homes with capacity, workplaces, shops with hours, civic buildings).
- It lives in `sim-protocol` as `parseMap(buffer: ArrayBuffer): MapV1`. It is served with a compressible content type (R5).
- Tiles name sprite frames, never atlas indices (R9).
- The worker loads it in `init`; the renderer reads the same `MapV1` for Skin A's minimap colours.

## WorldRenderer (owner: M0.4)

- In `render-gl`, with the method names from the plan: `init`, `resize`, `setMap`, `pushSnapshot`, `draw`, `setSkin`, `setLod` and `dispose`.
- `pushSnapshot` takes `{ tick, count, buffer }`, exactly as the worker sends it, and returns the buffer to the app once drawn.
- `setSkin` takes `'dots' | 'blobs' | 'town'`; skins not built yet fall back to dots (R3).
