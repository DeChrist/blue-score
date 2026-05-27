# SonarCloud → ESLint Rule Mapping

Documents which SonarCloud findings can be prevented by ESLint rules in this project, and which cannot without adding new packages. Findings were reviewed on 2026-05-24 against 32 open issues.

Security findings are excluded — those are triaged separately; see the [TD backlog](technical-debt-backlog.md).

## Covered by existing ESLint config

These rules are active in `eslint.config.js`. SonarCloud violations that fall into these categories will now fail `npm run lint` before they reach a scan.

| Sonar rule | Severity | ESLint rule | Finding |
| --- | --- | --- | --- |
| S2871 | Critical | `@typescript-eslint/require-array-sort-compare` | `.sort()` without comparator on string arrays — locale-dependent ordering |
| S7735 | Minor | `no-negated-condition` | Negated `if/else` condition (guard clauses without `else` are not flagged) |
| S3358 | Major | `no-nested-ternary` | Nested ternary expression |
| S4138 | Minor | `@typescript-eslint/prefer-for-of` | Index-only `for` loop iterable as `for-of` |
| S6571 | Minor | `@typescript-eslint/no-redundant-type-constituents` | `unknown \| null` union — `unknown` already subsumes `null` |
| S6759 | Minor | `react/prefer-read-only-props` | React props should be typed as read-only |
| S6772 | Major | `react/jsx-child-element-spacing` | Ambiguous spacing between text and JSX elements |
| S7764 | Minor | `unicorn/prefer-global-this` | Prefer `globalThis` instead of environment-specific globals such as `window` |
| S7778 | Minor | `unicorn/no-array-push-push` | Multiple adjacent `.push()` calls on the same array |

`require-array-sort-compare` and `no-redundant-type-constituents` require type-aware linting; `parserOptions.projectService` is set in `eslint.config.js` to enable this.

## Not covered — would need new packages

No remaining rules in this category at the moment.

## No standard ESLint equivalent

| Sonar rule | Severity | Findings | Finding description |
| --- | --- | --- | --- |
| S7723 | Minor | 7 | Prefer `new Array()` over `Array()` |
| S7786 | Minor | 1 | Prefer `TypeError` over bare `Error` |

## Requires design work before lint enforcement

| Sonar rule | Severity | Findings | Notes |
| --- | --- | --- | --- |
| S3776 | Critical | 2 | Cognitive complexity > 15 in `rotaGenerator.ts` — `sonarjs/cognitive-complexity` exists but enforcing it requires simplifying the generator first (see TD backlog P2) |
