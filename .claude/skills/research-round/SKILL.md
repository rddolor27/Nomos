---
name: research-round
description: Run a new Nomos research round the way rounds 1–5 were run. Parallel researchers write labelled notes, a report is synthesized and independently fact-checked, then plan tasks are added with the round's tag. Use when the user asks to research a new topic, question or design decision for the project.
---

# Research round

Find the next round number N: the highest `docs/research/round-*` plus one. Choose a short topic slug.

1. **Questions.** Split the topic into 3–6 independent questions that each decide something in the plan.
2. **Research in parallel.** Start one `researcher` agent per question in a single message. Give each one:
   - its question;
   - the project context (`CLAUDE.md` and `docs/plan/implementation-plan.md`);
   - the notes path `docs/research/round-N-<slug>/notes/<question>.md`;
   - a prototypes folder, if it needs to measure anything.
3. **Report.** Write `docs/research/round-N-<slug>/report.md` from the notes:
   - lead with the answer, then one section per question;
   - put links inline;
   - flag every figure seen only in a search summary.
4. **Fact-check.** Run the `fact-checker` agent on the report against the notes. Apply its fixes, and keep its list of unfixed issues for the open-questions table.
5. **Plan.** Add tasks and exit checks to the right milestones, each tagged (RN). Update the shared doc first, then export it with `/sync-plan-doc`. Write the round's `summary.md` and add the round to `docs/README.md`.
6. **Commit.** Use `/commit`, one commit per piece: notes, prototypes, report, summary and plan.

Benchmarks run on a shared VM, so record `/proc/loadavg` beside every timing and never present desktop numbers as phone numbers.
