---
checkpoint: 48
date: 2026-10-12
milestone: M3.2
status: paused
based_on: 0685fd4
next: M3.2 Task 9 (bubble sprites) and Task 6 (the card), then Task 5 (drawing), then the pre-push round and the push (docs/plan/tasks/m3-city-life/m3.2-daily-routines/plan.md)
waiting_on: [the owner's picks of the bubbles (A is used provisionally) and of Part 4's walls and street corners, perf.yml started once by the owner]
---

# Checkpoint 0048: lives building

## State

M3.2's Tasks 2–4 are built and committed but not pushed (6e4f2dd..0685fd4).
- Blobs have needs and keyed traits.
- They spend free time indoors, on doorsteps, on the plaza or on greens, and they chat: 767 chats on Highcourt's day 0.
- The snapshot carries `ACTION_SIT`, `ACTION_TALK` and the emote ids. Nothing draws them yet.

**Pins:** Highcourt's are `4db351f9` (phone) and `ba53250f` (desktop), and the `streets` golden is `22af632a`. `42/phone` `746a06a3` and the economy `6a652730` hold.

**Bytes:** initial JS is 37.09 kB. The sim worker chunk is 25.10 kB, above its 22 kB limit, which the pre-push round raises.

## Decisions

- **Owner, 06:30:** the first-load JS budget rises from 35 to 40 KB brotli. The size limit, `CLAUDE.md` and `web.md` follow, and the shared plan doc gets it at the next sync.
- **Coordinator:**
  - Task 9's bubbles come before Task 5, with the recommended A designs, pending the owner's pick;
  - a chat may run past 21:30 if both blobs are home by 22:00 (Task 4's ruling);
  - the allocation gate checks the street world on day 4.

## Open

- **The owner's picks:** the bubbles (A or B each), and Part 4's walls and street corners.
- **For the owner, from the screenshots:** more apartments for more blobs, or a stronger bell.
- **The push** needs:
  - the browser specs re-pinned to the new street life;
  - the worker chunk's limit raised to its measure plus 1 kB;
  - a fresh build.
- **Backlog:** as in checkpoint 0047, plus a street `warmUp`, so the allocation gate can return to day 1.

## Next

1. **When Task 9 lands:** a `render-engineer` builds Task 5. `town/people.ts` maps the emotes and draws sitting from `ACTION_SIT` and talking from `ACTION_TALK`, with chatters facing each other.
2. **When Task 6 lands,** check its card spec.
3. **The pre-push round:**
   - build;
   - set the size limits;
   - re-pin and run the browser specs, one at a time;
   - take screenshots of chats on the plaza for the owner.

   Then push, log it, and write a checkpoint.
4. **Uncommitted state:** none. Agents commit by path and never push.
