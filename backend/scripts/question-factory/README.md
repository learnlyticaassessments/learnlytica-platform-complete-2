# Question Factory Scripts

These scripts help you generate curriculum and ZIP packages for bulk question authoring.

## 1) Generate 125-row curriculum CSV

Run from repo root:

```bash
node backend/scripts/question-factory/generate-curriculum-matrix.mjs
```

Output:
- `docs/generated/curriculum-matrix-125.csv`

## 2) Generate ZIP packages from CSV

Run from `backend/`:

```bash
cd backend
node scripts/question-factory/generate-question-zips.mjs
```

Default input:
- `../docs/generated/curriculum-matrix-125.csv`

Default output:
- `../samples/question-packages`

## 3) Generate refined business-specific ZIP packages (125)

Run from `backend/`:

```bash
cd backend
node scripts/question-factory/generate-refined-business-zips.mjs
```

Output:
- `../samples/refined-question-packages`
- `../samples/refined-question-packages/manifest.txt`

## 4) Optional custom paths

```bash
cd backend
node scripts/question-factory/generate-question-zips.mjs --input=../docs/generated/curriculum-matrix-125.csv --out=../samples/question-packages
```

## 5) Import + draft evaluate flow

Yes, you can directly:
1. Import ZIP into Questions using your existing ZIP import API/UI
2. Run draft evaluation using existing "Run Tests" / draft validation flow

Recommended gate:
- First import 5 ZIPs per track and validate evaluator behavior before bulk publishing.
