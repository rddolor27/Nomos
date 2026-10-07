# M3.8 Seasons, sound and gazette

Part of [M3 City life](../milestone.md).

Needs M1's audio chunk, synth and buses, M3.3's light periods, M3.5's harvest and M3.7's festivals. The gazette reads a record store that no plan task builds; M0.3's day-boundary record and M2's flow logs come closest.

- **Builds:**
  - seasons in the town: fields planted in spring, grown in summer, harvested over 9–14 days of autumn and fallow in winter, day length from the sunrise table, seasonal palettes, winter snow and ambience by season; art exists; wire it in (Calendar);
  - town events played near the camera and panned by screen position (purchase, emotes, doors, footsteps, work, the clock and animals), with voices capped at about 24 and each kind capped per second, and the town bed stepping from quiet to busy to market instead of stacking sounds; sounds exist; wire them in (Sound);
  - ambience by biome, time of day and season, crossfaded at dawn and dusk with the town's light periods; sounds exist; wire them in (Sound);
  - the music player for title, lab, town day and town night: one track at a time, with crossfades and variations keyed on (world seed, place, day), loaded as its own chunk when first needed; sounds exist; wire them in (Sound);
  - festival music in one of the four styles, which differ only in tempo, loudness and structure, never played in justice views; sounds exist; wire them in (Sound);
  - the town gazette: one edition per settlement each dawn, built only from the record store at the day boundary, with town, market and calendar stories in plain templates, no personal names, and a HUD panel with back issues by date (Gazette);
  - the gazette button icon at 16 and 8 px and the paper panel frame (Gazette).
- **Already done:** seasonal palettes for ground and foliage, snow tiles and roof overlays, bare and snowy trees, and HUD season icons distinct from the eight culture emblems (Calendar).
- **Owner decision first:**
  - whether music stays chiptune or adds soft sampled instruments, which would also need a file format that plays in Safari ([Sound](../../../sound.md));
  - whether street and district names come from a culture's naming custom; if so, the gazette names districts by number ([Gazette](../../../gazette.md)).
- **Exit checks:**
  - every event type with a sound also has a visual twin (Sound);
  - every gazette story traces to a record id, the gazette module imports only the record store, a replay prints byte-identical editions, and turning the gazette off changes no state hash (Gazette);
  - every gazette template and printed edition passes the name, profanity, generic-claim and hierarchy-word filters (Gazette).
