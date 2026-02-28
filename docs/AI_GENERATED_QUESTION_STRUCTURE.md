# AI Generated Question Structure (Standard)

This is the target structure for AI-generated question packages across frameworks (`jest`, `pytest`, `junit`, `playwright`).

## 1) Manifest fields

Required root fields:
- `schemaVersion`
- `title`
- `description`
- `category` (`frontend|backend|fullstack|database|devops`)
- `difficulty` (`easy|medium|hard` after normalization)
- `testFramework`
- `points`
- `timeEstimate`
- `starterCode.files[]` with `path|source|language`
- `solution.files[]` with `path|source|language`
- `testCases[]`

## 2) Test case fields

Each test case should include:
- `id`
- `name`
- `file`
- `testName`
- `points`
- `visible` (boolean)
- `category` (`basic|edge|negative|performance`)
- `testCode` (or `testCodePath` in ZIP package)

## 3) Mandatory test mix policy

For each generated question:
- 6 to 10 tests total
- At least:
  - 2 `basic`
  - 2 `edge`
  - 1 `negative`
  - 1 `performance`
- Visibility distribution:
  - 60-70% visible
  - 30-40% hidden
  - minimum 1 hidden test

## 4) Scoring rules

- Sum of all test `points` must equal manifest `points` (or scoring total after normalization)
- Recommended pass threshold: 60%
- Hidden tests should carry meaningful points (avoid all hidden tests being low-weight)

## 5) Framework-specific notes

- `junit`: use deterministic assertions, avoid external dependencies
- `pytest`: avoid non-deterministic/random data in tests
- `jest`: ensure function/module import path is consistent with starter file
- `playwright`: include robust selectors and avoid flaky waits

## 6) Business quality rules

- Medium/Hard must be case-study driven
- Include business context + validation rules + acceptance criteria
- Edge and performance tests should map to real business risk scenarios

## 7) Why this standard

This structure ensures:
- consistent learner-visible guidance
- hidden anti-cheat coverage
- edge robustness
- performance signals before publish
