# /pr — Open a pull request

Finish the current work and open a pull request, following this project's PR workflow exactly.

## Steps

1. **Run the full test suite** — `npm test`. If any tests fail, fix them before continuing. Watch for jsdom duplicate-render issues (e.g. desktop SideRail rendering the same content twice) and scope RTL queries with `within()` to the correct container.

2. **Run lint** — `npm run lint`. Fix all warnings and errors. Zero warnings allowed (`--max-warnings 0`).

3. **Check the diff against `docs/agent-pitfalls.md`** — for prose-only pitfalls (PIT-2 validation gaps, PIT-4 enum-incomplete if-guards), confirm the diff does not reintroduce them; if one is relevant, note it in the PR body's test plan. Lint-enforced pitfalls are covered by the lint step. Also read the `bug-retro:last-analyzed` marker at the bottom of `docs/agent-pitfalls.md` and count commits since it (`git rev-list --count <marker-sha>..HEAD`); if more than 25, tell the user a `/bug-retro` run is due (do not run it automatically).

4. **Check for uncommitted changes** — run `git status` and review what's dirty. Stage and commit only files directly related to the current task. If unrelated files are modified (e.g. `clubConfig.json`, scratch files, unrelated config), leave them unstaged and call them out explicitly. Never use `git add -A` or `git add .`. Use conventional commit format with a `+semver:` directive in the body where applicable. Never use `git commit --amend`.

5. **Open the PR** — use `gh pr create`. Write a clear title (under 70 characters) and a body that covers:
   - What changed and why
   - Any review findings addressed (if this is a follow-up)
   - Test plan checklist

6. **Report** — return the PR URL and a one-line summary of what's in it.

## Hard rules

- Separate commits per logical change — never amend a published commit
- All tests green and lint clean before the PR opens
- Conventional commit format: `type(scope): description` + `+semver: patch|minor|major` in the body
- If a test or lint failure is non-obvious or requires a design decision, stop and ask rather than guessing

## Usage

```
/pr
/pr stacked    # remind Claude this is one PR in a stack — keep the diff focused
```
