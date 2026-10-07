# M4.6 Justice on screen

Part of [M4 Crime and police](../milestone.md).

- **Builds:**
  - the justice buildings, now original sprites rather than recoloured CC0 tiles: a slate-roofed police station with a plain badge and no flags, a jail with bars, a yard and an occupancy counter, and a records office with a ledger sign, drawn as a scroll (R3); art exists; wire it in, adding the jail yard and occupancy counter, which are not drawn;
  - justice events: a witness "!" with a short straight sight line, a victim "?", clipboard reports carried to the records office, a handcuff ring with an escort at walking speed, bars on jailing and an open door on release, with wrongful stops drawn as heavily as arrests (R3); the "!" and "?" art exists; wire it in, and draw the clipboard, handcuff-ring, bars and open-door bubbles;
  - true-view cues (the carried item, Skin A's act ring) filtered out of the recorded view, and true and recorded crime shown as two synced small panels (R2, R3);
  - the police iconography audit (cap and badge only, no weapons or heroic poses, the same emotes as citizens), patrol schedules driven by data rather than night-only, and patrol and station overlays for Skin A (R3);
  - no culture or names in justice bubbles, log lines, record states, the records office or the true and recorded panels, only case numbers and roles; no offence or report type tied to customs (noise, gathering, street vending); and patrols that never read culture, the festival calendar or crowds (R8);
  - the appearance audit and content lint extended to forbid punishment spectacles, shame marks, scars from punishment and mood rewards for watching punishment (R6).
- **Needs:** M1.3's sprite and bubble passes, M2.7's one glyph per event, M3.2's inspector, and M3.3's Skin C town and follow-cam.
- **Verify first:** whether a stream of animated crime events, or the gazette's daily justice column, builds illusory correlation as static sentence lists do (round 8). The answer sets how strict the justice-view rules must be, and the [Gazette](../../../gazette.md) tab asks for a playtest before M4 ships.
- **Exit checks:**
  - an appearance audit over 50 seeds finds no rendered attribute, apart from true-view act cues, that differs between agents who stole and agents who did not, and accessories depend only on job and random neutral items (R3);
  - the recorded view never shows a true-view cue, and every justice event produces a bubble, a log line and a chart glyph (R3).
