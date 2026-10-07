# M0.3 Loop and protocol

Part of [M0 Pipeline](../milestone.md).

- **Builds:**
  - `sim-protocol`: snapshot v1 (float32 x and y plus a 32-bit visual word, 12 bytes) in pooled transferable buffers, with no "wanted" bit; the eight action states its 3-bit field holds, where sneak and carry must displace two of the rendering research's list; the calendar constants (1,440 ticks a day, 112 days a year, 4 seasons of 28 days), from which every half-life and rate converts at build time; and the column layouts (R1, R3, R6, R8, Calendar);
  - the worker loop: fixed timestep at 10 ticks a second, MessageChannel yield, pause on `visibilitychange`, checkpoint on `pagehide`, resume without catching up (R1, R2);
  - the day-boundary phase, where aggregate commits and any tier switch that writes canonical state take effect, with focus changes recorded as tick-stamped inputs (R4);
  - day work in fixed 1,024-entity slices on the same schedule for every device and worker count, committing the settlement record when the last slice ends; the warm-up on a 1,024-agent dummy world (about 20–30 ms); and the stride scheduler, with its offset re-keyed yearly, giving identical hashes in reversed visiting order (R6, R8);
  - the lint ban on sorting views of shared memory in hot and day-boundary code, with top shares taken from a 16-bins-per-octave histogram (R6).
- **Owner decision first:** round 6 left open how late spoilage may land within sliced day work; the slice task waits for it.
- **Exit checks:**
  - seed 42 gives an identical state hash at tick 1,000 across runs (R1);
  - the worker pauses while the page is hidden (R2);
  - logging a focus change that touches nothing leaves the replay hash unchanged (R4).
