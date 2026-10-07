# M6.5 Card remix and authoring: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Card remix (R9):**
  - a player picks the visible knobs and one of the card's pre-validated treatments;
  - the result shares as an M6.3 link, or as a QR code for classrooms;
  - paired arms keep entity ids stable, so remixed comparisons stay powered.
- **Card authoring (R9):**
  - a player sets arms, metrics, the claim type (estimate, property or comparison) and seeds;
  - prompts come from templates with slots, never free text;
  - M1.1's statistics judge every claim and print its verdict with the "hand-picked setup" label;
  - treatments never key on culture: the treatment editor offers no culture field, and its draws use M4.1's guarded shape.
- **Judging runs in the browser.** Authored cards have no CI, so the judge runs in a worker on the player's machine. It uses M1.1's `claims` package, the same code CI uses.
  - It runs the two-stage design: 20 seeds, extended to 50 only when needed, to keep it fast.
  - It shows progress, and can be cancelled.

## Packages and files

- `apps/web/src/cards/remix.ts` and `apps/web/src/cards/author/`: the arms editor, the metric picker, the claim type, seeds, and the template picker.
- `packages/claims`: browser-safe as written in M1.1, with nothing Node-only.
- `packages/sim-worker/src/judge.ts`: runs a card's arms on paired seeds in a worker, and reports verdicts.
- `packages/sim-protocol/src/card-def.ts`: the card definition and its link encoding, which extends M6.3's format with a card section.
- `apps/web/src/qr.ts`: a small QR encoder, or a vetted dependency if it fits the size budget.

## Interfaces and data

- **`CardDef`:** `{ version, base: LabCardId | 'city', arms: Treatment[], metric: MetricId, claim: 'estimate' | 'property' | 'comparison', seeds: number[] | 'fresh', template: TemplateId, slots: Record<string, number | EnumId> }`.
- **Templates:** a fixed table of prompt sentences with typed slots, reviewed for wording (M0.6's text lints).
- **Paired arms:** both arms spawn from the same (seed, record, time), and treatments apply as stage inputs that never re-key entity ids.

## Method and sources

- **Remix, authoring, templates, stable ids and the "hand-picked setup" label:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md), "Cards stay honest" and "Teaching uses paired arms on one world"; and [R9 builder scope notes](../../../../research/round-9-maps-and-world-builder/notes/builder-scope.md).
- **Statistics and verdicts:** M1.1's brief and the [R2 summary](../../../../research/round-2-follow-up/summary.md), "Validation".

## Tests for the exit checks

M6 lists no exit check for cards, so one of the plan's ongoing tests closes it:
- `a treatment edit changes no unrelated entity id`: for 100 random treatments, every entity id outside the treatment's scope is identical between the two arms.

Its own tests:
- `browser judge equals CI judge`: the same card and seeds give the same verdict and statistics in the browser worker and in Node.
- `no free text`: the card link decoder rejects any string field. Every prompt renders from a template.
- `no culture in treatments`: the treatment schema has no culture field, and M4.1's flip test passes with authored treatments on.

## Risks and unknowns

- **Judging cost on phones:** 50 paired seeds × 2 arms may take minutes. The two-stage design and a seeds cap per tier keep it bearable; show an estimate before Run.
- **Authored claims can mislead.** Every verdict shows its claim type, seed count, the "hand-picked setup" label and an Inconclusive option, never a bare "true".
