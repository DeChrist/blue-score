---
name: execute-plan
description: Execute an approved plan by dispatching each step to the plan-executor subagent (Sonnet 5), instead of running steps on the main model.
---

# Execute Plan

Given an approved plan (from plan mode, or a `.claude/*.plan.md` file):

1. Split the plan into ordered, independently-runnable steps.
2. For EACH step, in order, spawn the `plan-executor` agent via the Agent tool:
   - `subagent_type: "plan-executor"`
   - DO NOT pass a `model` parameter — the frontmatter (Sonnet 5) must win.
     Passing `model` here would override it and defeat the purpose.
   - `prompt`: the plan file path + this step's text + the files it touches +
     any "next step needs to know" notes returned by the previous step.
3. After each step returns, relay its summary; stop and surface if it failed.
4. Steps that touch the same files run sequentially. Only fan out (multiple
   Agent calls in one message) when steps are genuinely independent.
5. When all steps are done, run the full suite (`npx vitest run`) yourself and
   report. Consult `docs/technical-debt-backlog.md` per the repo contract in
   `.github/copilot-instructions.md`.
