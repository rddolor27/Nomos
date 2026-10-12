---
checkpoint: 49
date: 2026-10-12
milestone: M3.2
status: paused
based_on: 12c03b9
next: ask the owner what comes next - polish what the screenshots show, M3.2 Task 7 (friends and visits), Task 8 (the whole day by needs, step plan on Opus first), or M3.1 Part 4's walls (Task 26, after the art pick)
waiting_on: [the owner's choice of the next step, the owner's picks of the bubbles (A in use) and of Part 4's walls and street corners, perf.yml started once by the owner]
---

# Checkpoint 0049: lives pushed

## State

M3.2's first slice is pushed (bae269b).
- **The sim:** blobs have needs and keyed traits. They spend free time indoors, on doorsteps, on the plaza and on greens, and they chat under speech bubbles: 767 chats on Highcourt's day 0.
- **On screen:** the Town skin draws sitters, chatters and the new bubbles, and the blob card says what a blob is doing and why.

M3.1 Part 4's Tasks 22, 27 and 23 were pushed earlier (e764299), and M2.7 Part 1 is done.

**Pins:** Highcourt's are `4db351f9` and `ba53250f`, and the `streets` golden is `22af632a`. `42/phone` `746a06a3` and the economy `6a652730` never moved.

**Bytes:** initial JS is 37.27 of 40 kB, and the first frame 51.09 of 100 kB.

## Decisions

- **Owner, 12 October:**
  - ring towns, then lives, with the bell curve;
  - the first-load JS budget rises to 40 KB.
- **Coordinator:**
  - Task 23 joined Part 4's build;
  - Task 27 ran before Task 26;
  - the bubbles use the A designs pending the owner's pick;
  - the allocation gate checks the street world on day 4.
- **The engineers' rulings** are in `HANDOFF.md`'s log for each task.

## Open

- **Reads badly,** from the screenshots:
  - blobs pile up, and chat partners hide each other;
  - pairs chat behind stalls;
  - the card covers 90% of the view's height;
  - there is no `sit_up` frame;
  - a chatting sitter stands up.
- **Left in M3.2:**
  - Task 7, friends and visits;
  - Task 8, the whole day by needs, which needs an Opus step plan;
  - Task 10, soldiers;
  - Task 11, the close, with one Opus `determinism-review` over M3.2's sim commits.
- **Left in M3.1 Part 4:**
  - Task 24's pieces, after the owner's pick;
  - Tasks 25, 26 and 28–30, each needing the owner's go.
- **Backlog:**
  - a street `warmUp`;
  - `reason` stale from 04:00 to 06:00;
  - one footbridge per river;
  - the street snapshot row over budget at 10k and up;
  - the HUD wrapping away from Highcourt;
  - keeper election under a chunked step;
  - a worker split before launch.
- **perf.yml** hasn't run since the economy joined the step.

## Next

1. Ask the owner which comes next, with a short plan for each choice.
2. **Uncommitted state:** none. Everything is pushed except this checkpoint's own commit.
