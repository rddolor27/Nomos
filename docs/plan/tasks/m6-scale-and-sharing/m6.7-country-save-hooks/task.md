# M6.7 Country save hooks

Part of [M6 Scale and sharing](../milestone.md).

Needs M7's settlement and route ledgers and their blocks, so it runs once M7 closes. Round 4 placed these hooks in M6 when country mode followed launch. M8 and M9 fill the history, notables and edit-diff sections later.

- **Builds:**
  - country sections in the save format (settlement and route ledgers, regions and markets, per-settlement edit diffs, the notables cache, multi-resolution history, generator versions), gzipped with `CompressionStream` into OPFS or IndexedDB, and share links extended with `mode=country`, the world seed, generator versions and the focus log (R4);
  - the settlement culture block in saves as top-3 sparse counts, with dense counts where needed, budgeted at 50–118 KB gzip for 10,000 settlements and measured before the format freezes (R8).
- **Owner decision first:** whether the culture block must fit under the 0.5 MB save cap, or the cap rises to round 8's projected 0.55–0.62 MB.
- **Exit checks:**
  - a save of 10,000 settlement ledgers with goods, food, happiness and wealth blocks stays under about 0.5 MB gzip, replacing round 4's 0.3 MB (R4, R6); a share URL with a focus log restores the same canonical hash (R4).
