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

`require-array-sort-compare` and `no-redundant-type-constituents` require type-aware linting; `parserOptions.projectService` is set in `eslint.config.js` to enable this.

## Not covered — would need new packages

| Sonar rule | Severity | Findings | ESLint equivalent | Package needed |
| --- | --- | --- | --- | --- |
| S6759 | Minor | 4 | `react/prefer-read-only-props` | `eslint-plugin-react` |
| S6772 | Major | 2 | `react/jsx-child-element-spacing` | `eslint-plugin-react` |
| S7764 | Minor | 4 | `unicorn/prefer-global-this` | `eslint-plugin-unicorn` |
| S7778 | Minor | 2 | `unicorn/no-array-push-push` | `eslint-plugin-unicorn` |

Adding `eslint-plugin-react` would cover the two Major JSX/props findings and is worth considering if the React surface grows.

## No standard ESLint equivalent

| Sonar rule | Severity | Findings | Finding description |
| --- | --- | --- | --- |
| S7723 | Minor | 7 | Prefer `new Array()` over `Array()` |
| S7786 | Minor | 1 | Prefer `TypeError` over bare `Error` |

## Requires design work before lint enforcement

| Sonar rule | Severity | Findings | Notes |
| --- | --- | --- | --- |
| S3776 | Critical | 2 | Cognitive complexity > 15 in `rotaGenerator.ts` — `sonarjs/cognitive-complexity` exists but enforcing it requires simplifying the generator first (see TD backlog P2) |
