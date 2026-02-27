# Curriculum + ZIP Factory Plan (Java, Python, JavaScript, React, Angular)

## 1) Scope and Target
Create **125 questions total**:
- 5 tracks: `java`, `python`, `javascript`, `react`, `angular`
- 25 questions per track
- Difficulty split per track:
  - Easy: 8
  - Medium: 9
  - Hard: 8

Design rule:
- `Easy` = focused concept/task questions
- `Medium` and `Hard` = case-study driven questions with business context

## 2) Framework Mapping in Learnlytica
Use these test frameworks already supported by your platform:
- Java track -> `junit`
- Python track -> `pytest`
- JavaScript track -> `jest` (or `mocha` for specific modules)
- React track -> `playwright` + optional component/unit checks in `jest`
- Angular track -> `playwright` + optional unit checks in `jest`

Question category mapping to existing schema:
- Java, Python, JavaScript: `backend`
- React, Angular: `frontend`

Difficulty mapping must be exact:
- `easy`, `medium`, `hard`

## 3) Curriculum Matrix (Per Track)
Each track should include these modules and counts.

| Module | Easy | Medium | Hard | Notes |
|---|---:|---:|---:|---|
| Core Syntax + Data Handling | 2 | 1 | 0 | Build base fluency |
| Functions/Classes/Architecture | 2 | 2 | 1 | Reusability and design |
| API + Data Integration | 1 | 2 | 2 | Case-driven from medium onward |
| Validation + Error Handling | 1 | 1 | 1 | Strong business reliability |
| Testing + Quality | 1 | 1 | 1 | Assertions, edge cases, coverage |
| Performance + Robustness | 1 | 2 | 3 | Optimization and scale |
| Total | 8 | 9 | 8 | 25 |

## 4) Case Study Policy (Medium/Hard)
For every medium/hard question, include:
- Business title (example: `Expense Claims Compliance Pipeline`)
- Scenario and actor (operations analyst, support agent, finance approver)
- Input constraints and real-world edge cases
- Acceptance criteria in checklist format
- Explicit scoring rubric by test cases
- Failure examples (what should be rejected)

Case study template:
1. Business Context
2. Functional Requirements
3. Validation Rules
4. Technical Constraints
5. Acceptance Criteria
6. Sample Input/Output
7. Starter Code Notes

## 5) Naming Convention
Question code format:
- `<track>-<difficulty>-<module>-<seq>`
- Example: `react-medium-api-03`

ZIP filename format:
- `qpkg-<track>-<difficulty>-<seq>.zip`
- Example: `qpkg-python-hard-07.zip`

## 6) Required ZIP Structure (Compatible with Current Parser)
Your backend accepts one of these manifest names at ZIP root:
- `learnlytica-question.json` (recommended)
- `question.json`
- `manifest.json`

Recommended ZIP layout:

```text
qpkg-react-medium-03.zip
├─ learnlytica-question.json
├─ starter/
│  ├─ src/App.jsx
│  └─ ...
└─ solution/
   ├─ src/App.jsx
   └─ ...
```

## 7) Manifest Schema (Working Baseline)
Use this structure so import + validation works with current code.

```json
{
  "schemaVersion": 1,
  "title": "Business-safe expense claim validator",
  "description": "...",
  "category": "frontend",
  "difficulty": "medium",
  "testFramework": "playwright",
  "points": 100,
  "timeEstimate": 45,
  "starterCode": {
    "files": [
      { "path": "src/App.jsx", "source": "starter/src/App.jsx", "language": "javascript" }
    ]
  },
  "solution": {
    "files": [
      { "path": "src/App.jsx", "source": "solution/src/App.jsx", "language": "javascript" }
    ]
  },
  "testCases": [
    {
      "id": "tc_001",
      "name": "Rejects claim when amount exceeds policy",
      "description": "Validates policy cap",
      "file": "tests/policy-cap.spec.js",
      "testName": "reject_over_cap",
      "testCode": "expect(validateClaim(input)).toEqual({ ok: false, reason: 'CAP_EXCEEDED' });",
      "points": 20,
      "visible": true,
      "category": "policy"
    }
  ]
}
```

## 8) Authoring Checklist (Per Question)
- Title is business meaningful
- Difficulty is one of: `easy|medium|hard`
- Category is one of: `frontend|backend|fullstack|database|devops`
- `testFramework` matches track framework
- At least 4 test cases (easy) / 5+ (medium/hard)
- Sum of test case points = scoring total
- Passing threshold set (recommended 60%)
- Starter code compiles/runs
- Solution passes all tests
- Time estimate realistic

## 9) Quality Gates Before Publishing
Gate 1: Package validation
- Import ZIP via `Import Question Package` endpoint
- Ensure DTO validation passes

Gate 2: Test correctness
- Run draft tests with solution
- Confirm expected pass count and score

Gate 3: Negative verification
- Run tests with starter code
- Ensure starter code does not pass hidden logic checks

Gate 4: Content QA
- Check grammar, clarity, and business realism
- Ensure no ambiguous acceptance criteria

## 10) Batch Production Workflow (Recommended)
1. Build a CSV/JSON question spec sheet per track.
2. Generate ZIPs from spec template via script.
3. Bulk import to draft.
4. Auto-run draft validation.
5. Manual review only for failed/low-quality items.
6. Publish in batches by track and difficulty.

## 11) Rollout Plan (Low Risk)
Phase A:
- Create and validate first 5 questions per track (25 total)
- Verify learner outcomes and evaluator stability

Phase B:
- Expand to full 25 per track
- Add hidden tests for medium/hard

Phase C:
- Add analytics mapping by track/module for curriculum insights

## 12) Suggested Initial Case Study Themes
Use common enterprise themes for medium/hard:
- Expense claim policy enforcement
- Support ticket triage and SLA handling
- Inventory reorder threshold and audit trail
- Subscription billing adjustments and prorations
- Visitor desk compliance and exception handling

## 13) Deliverables to Prepare Next
- `curriculum-matrix.csv` (all 125 question specs)
- `zip-generator` script (spec -> ZIP)
- `reference-solutions` folder
- `import-validation-report.md`

## 14) Decision on ZIP Flow
Yes, keep using ZIP flow now.
Reason:
- It is already integrated with your current import/validation path.
- It supports deterministic packaging and repeatable QA.
- It is safer for bulk authoring than manual form-based creation.
