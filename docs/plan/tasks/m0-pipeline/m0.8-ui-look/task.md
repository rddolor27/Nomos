# M0.8 UI look

Part of [M0 Pipeline](../milestone.md).

On 10 October 2026 the owner asked to improve how the app looks and reads: its buttons, its zoom and how a user reads the graphs. The `ui-designer` agent owns this work. Every item below comes from that request.

- **Builds:**
  - **one design system:** the colour, type, spacing and button styles, defined in one place from `web.md`'s colour-blind-safe palette, and used by the HUD, the map, the town view and the charts;
  - **buttons and toolbars:**
    - fewer buttons, labelled and grouped by task, with touch targets of at least 44 CSS px;
    - a compact bar on phones, in place of the town view's four-row wrap over the picture;
  - **zoom:** the same +, −, Fit, wheel, pinch and keys on the town, the map and the town view, replacing the Controls panel's zoom slider;
  - **charts a user can read:** titles, axis labels with units, legends or direct labels, palette colours, and the data table each chart already needs.
- **Owner decision first:** the look itself. The ui-designer shows two or three mockups, and the owner picks one before anything is built. Settled on 10 October 2026: the owner said to go with the coordinator's suggestion, calm slate surfaces with one orange accent, so no mockups were drawn.
- **Exit checks:**
  - axe finds no violations on the town, the map and the town view, at desktop size and at 390×844;
  - first-load bytes stay within budget, and each new chunk has a size-limit entry;
  - every chart has a title, labelled axes with units, and a data table.
