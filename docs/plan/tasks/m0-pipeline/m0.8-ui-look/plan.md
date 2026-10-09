# M0.8 UI look: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Mockups first.** The `ui-designer` drafts two or three looks, as screenshots of a working prototype or as mockups under `docs/mockups/`. The owner picks one.
- **One token module** holds the colours, type sizes, spacing and button styles. The HUD, the map, the town view and the charts all read it.
- **Toolbars:** buttons are grouped by task. A phone gets a compact bar or a menu, never a wrap over the picture.
- **Zoom:** one control set for the town, the map and the town view, in whole steps (`web.md`). The Controls panel's zoom slider goes if the owner's pick replaces it.
- **Charts:** uPlot stays (`web.md`). Restyle its axes, labels, legends and colours with the `dataviz` skill, and keep each chart's data table.
- **Code:** UI panels and views are classes made once per page (`code.md`, owner, 10 October 2026).

## Files

- `apps/web/src/panels/`: `hud.ts`, `charts.ts` and `controls.ts`;
- `apps/web/src/map/`: `map-view.ts` and `place-view.ts`;
- a new theme module, and its CSS.

## Risks

- **First-load bytes:** the HUD and its CSS sit on the first-frame path. Keep the new styles small, and load the rest after the first frame.
- **lil-gui:** replacing it changes the controls chunk and `web.md`'s load order.
- **Found on 10 October 2026,** before building:
  - **Bytes:**
    - The "Initial JS, M0 stand-in" gate is at 16.78 of 17 kB, and `main.ts` imports `hud.ts` statically. So new toolbar and zoom code must load in a chunk after the first frame, with its own size-limit entry.
    - The "Charts chunk" is at 21.31 of 22 kB and the "Controls chunk" at 7.30 of 8 kB.
    - Before the first frame, the page loads 19.13 kB.
  - **Focus ring:** the ring and the pressed state on the map's buttons use the sun body hue, #f7c948, which the new look keeps out of the UI. Changing it means updating `RING` in `apps/web/test/browser/a11y.spec.ts`.
  - **Zoom:** the town has no Fit, Home key or pinch. Only the map and the town view have them, through `map-input.ts`.
  - **Selectors:** five browser specs find the Map button by its exact name, "Map", which lil-gui gives it today, so the new toolbar button must keep that name. The town view's specs depend on "Back to map", "Try again" and "Close map", and on `#place-status`.

## Open questions

- **Owner:** which look? Mockups come first. Needed before: building.
- **Design:** keep lil-gui for developer settings, or retire it? Suggested: keep it, behind a developer toggle only. Needed before: the step plan.
