---
name: bug-retro
description: Re-run the fix-commit retrospective since the last analyzed commit and propose updates to docs/agent-pitfalls.md
---

# Bug Retro

Mine fix commits since the last retro for recurring bug patterns and propose
updates to `docs/agent-pitfalls.md`. This skill proposes; it does not silently
rewrite the pitfalls doc or the instructions file.

## Steps

1. **Read the high-water mark** — find the `<!-- bug-retro:last-analyzed <sha> (<date>) -->`
   comment on the last line of `docs/agent-pitfalls.md`. If the marker is
   missing, ask the user for a starting commit before continuing.

2. **Collect fix commits since then**:
   ```
   git log <last>..HEAD --no-merges --pretty='%H%x09%s' -i -E --grep='^(fix|revert)(\(|:|!)|regress'
   ```
   Also run `git log <last>..HEAD --oneline --no-merges` to compute the fix
   ratio (fix commits / total new commits) for the report.
   Note: `--grep` matches the full commit message, so the net is deliberately
   over-inclusive — e.g. `feat`/`test` commits whose bodies mention
   "regression" will match. Discard non-fixes during analysis (step 4).

3. **Dedupe** squash-merge duplicates: match by PR number `(#N)` in the
   subject; when subjects collide without a PR number, fall back to
   `git show <sha> | git patch-id --stable`.

4. **Analyze each fix** — read `git show <sha>`. Where cheap, trace the
   introducing commit via `git log -L` or `git blame` on the fixed lines, to
   confirm the pattern, not to assign blame. Do NOT use co-author trailers as
   a fault signal — trailers mark AI touch, not AI fault.

5. **Categorize** each fix against the existing PIT-N entries in
   `docs/agent-pitfalls.md`. Propose a **new** PIT entry only when a pattern
   recurs (≥2 fixes) or is high-impact; otherwise mention it in the report
   without a doc change.

6. **Propose, don't apply.** Output a report containing:
   - a table of fix commit → category
   - the proposed `docs/agent-pitfalls.md` diff (new rows, updated History
     lines)
   - any newly lintable pattern, with a candidate `no-restricted-syntax`
     selector for `eslint.config.js`
   - the new marker value

   Hard rules:
   - Never edit `.github/copilot-instructions.md`.
   - Edit `docs/agent-pitfalls.md` (including the marker) only after the user
     approves the proposal.

7. **On approval** — apply the doc edit and bump the marker to the analyzed
   HEAD in a single commit: `docs(pitfalls): <description>`, conventional
   commit format, with a `+semver: patch` directive per this repo's commit
   rules (see `.github/copilot-instructions.md` Commit Rules).

## Usage

```
/bug-retro
```
