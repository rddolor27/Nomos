---
name: commit
description: Commit the current changes in this repo as small, focused commits with short messages and the owner credited as co-author. Use when the user asks to commit, save or push work.
disable-model-invocation: true
---

# Commit

1. Run `git status --short` and `git diff --stat` to see what changed.
2. Group the changes into logical units: one feature, fix, doc or config change per commit. Never mix product code with `docs/`.
3. For each group, stage only its files and commit with:
   - a subject of 50 characters or fewer, in the imperative mood ("Add …", "Fix …", "Update …"), with no trailing period;
   - one or two short body lines, only if the subject is not enough;
   - this trailer, exactly:

     ```
     Co-Authored-By: rddolor27 <80044625+rddolor27@users.noreply.github.com>
     ```

     Keep any attribution lines your environment adds after it. The repo is public, so never put a personal email in a commit.
4. Show `git log --oneline` for the new commits.
5. Push only if the user asked. Ask before any force-push or history rewrite.
