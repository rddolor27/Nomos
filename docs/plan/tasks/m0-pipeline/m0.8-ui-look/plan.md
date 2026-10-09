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

## Open questions

- **Owner:** which look? Mockups come first. Needed before: building.
- **Design:** keep lil-gui for developer settings, or retire it? Suggested: keep it, behind a developer toggle only. Needed before: the step plan.
