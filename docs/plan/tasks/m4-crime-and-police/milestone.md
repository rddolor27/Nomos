# M4 Crime and police: sub-milestones

M4 holds 24 build tasks and 15 exit checks in the [implementation plan](../../implementation-plan.md#m4-crime-and-police), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0–M3 can rescale them. The plan's M4 effort line, 2–3 weeks plus 4–6 days for the visual layer, covers rounds 1 and 3 only. Round 4 adds 1–2 days, and the owner's plans add 0.5–1 day for sound and 1–2 for the gazette. The 14 tasks from rounds 2, 6 and 8 carry no estimate of their own. The plan's own figures sum to 16.5–26 days, and this breakdown to 28–40.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M4.1 Guarded decisions](m4.1-guarded-decisions/task.md) | Every guarded decision as a threshold and one keyed draw, under the flip test in CI | 2–3 days | | | |
| [M4.2 Crime and justice loop](m4.2-crime-and-justice-loop/task.md) | Offending, the hotspot field, patrols, arrests and jail, with true and recorded crime kept apart | 8–11 days | | | |
| [M4.3 Calibrated crime](m4.3-calibrated-crime/task.md) | Clearances, reporting, hotspots and re-arrests tuned to measured figures, with daily district logs | 5–7 days | | | |
| [M4.4 Victims, records and trust](m4.4-victims-records-and-trust/task.md) | Record states, and what crime and wrongful stops do to victims, contacts and trust in police | 3–4 days | | | |
| [M4.5 Culture audit](m4.5-culture-audit/task.md) | The outcome and exposure audit over 50 paired seeds, with its counterfactual worlds | 3–5 days | | | |
| [M4.6 Justice on screen](m4.6-justice-on-screen/task.md) | Justice buildings, events and the true and recorded views, drawn without stereotypes | 5–7 days | | | |
| [M4.7 Justice sounds and gazette](m4.7-justice-sounds-and-gazette/task.md) | The justice sounds in play, and the gazette's justice column | 2–3 days | | | |
| **Total** | | **28–40 days** | | | |

Three points apply throughout:
- **Guards before crime code.** M4.1 puts the flip test in CI first, so each later decision registers its threshold and draw key as it is written.
- **The model before the pictures.** M4.2–M4.5 build and audit the model, mostly headless, before M4.6 draws justice on screen.
- **Wire in what exists.** The justice buildings, the "!" and "?" bubbles and the 7 justice sounds are already built, so their tasks mostly wire them in.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
