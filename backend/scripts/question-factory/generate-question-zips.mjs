#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? 'true'];
  })
);

const inputCsv = path.resolve(process.cwd(), args.input || '../docs/generated/curriculum-matrix-125.csv');
const outDir = path.resolve(process.cwd(), args.out || '../samples/question-packages');

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0]
    .match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g)
    .map((h) => h.replace(/^"|"$/g, '').replaceAll('""', '"'));

  return lines.slice(1).map((line) => {
    const values = line
      .match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g)
      .map((v) => v.replace(/^"|"$/g, '').replaceAll('""', '"'));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function starterContent(track, starterFile) {
  if (track === 'python') {
    return `def solve(input_data):\n    # TODO: implement\n    return None\n`;
  }
  if (track === 'java') {
    return `public class Main {\n  public static Object solve(Object inputData) {\n    // TODO: implement\n    return null;\n  }\n}\n`;
  }
  if (track === 'react') {
    return `export default function App() {\n  return <h1>TODO: Implement flow</h1>;\n}\n`;
  }
  if (track === 'angular') {
    return `export class AppComponent {\n  title = 'TODO Implement flow';\n}\n`;
  }
  return `function solve(inputData) {\n  // TODO: implement\n  return null;\n}\nmodule.exports = { solve };\n`;
}

function solutionContent(track, starterFile) {
  if (track === 'python') {
    return `def solve(input_data):\n    return input_data\n`;
  }
  if (track === 'java') {
    return `public class Main {\n  public static Object solve(Object inputData) {\n    return inputData;\n  }\n}\n`;
  }
  if (track === 'react') {
    return `export default function App() {\n  return <h1>Submission Ready</h1>;\n}\n`;
  }
  if (track === 'angular') {
    return `export class AppComponent {\n  title = 'Submission Ready';\n}\n`;
  }
  return `function solve(inputData) {\n  return inputData;\n}\nmodule.exports = { solve };\n`;
}

function frameworkTestCommand(framework) {
  if (framework === 'pytest') return 'pytest -q';
  if (framework === 'junit') return 'mvn test';
  if (framework === 'playwright') return 'npx playwright test';
  if (framework === 'mocha') return 'npx mocha';
  if (framework === 'cypress') return 'npx cypress run';
  return 'npx jest --runInBand';
}

function buildTestCases(row) {
  const count = row.difficulty === 'easy' ? 4 : row.difficulty === 'medium' ? 5 : 6;
  const each = Math.floor(Number(row.points || 100) / count);
  return Array.from({ length: count }, (_, i) => ({
    id: `tc_${String(i + 1).padStart(3, '0')}`,
    name: `Check ${i + 1} - ${row.question_code}`,
    description: row.case_study === 'yes' ? `Case validation for ${row.scenario}` : 'Functional validation',
    file: row.framework === 'pytest' ? `tests/test_${i + 1}.py` : row.framework === 'junit' ? `src/test/java/Test${i + 1}.java` : `tests/test_${i + 1}.spec.js`,
    testName: `test_${i + 1}`,
    testCode: row.framework === 'pytest'
      ? `assert solve(None) is not None`
      : row.framework === 'junit'
        ? `org.junit.jupiter.api.Assertions.assertNotNull(Main.solve(null));`
        : `expect(solve({})).not.toBeNull();`,
    points: each,
    visible: true,
    category: row.case_study === 'yes' ? 'business' : 'core'
  }));
}

async function createZip(row) {
  const zip = new JSZip();
  const starterFile = row.starter_file || (row.track === 'react' ? 'src/App.jsx' : row.track === 'angular' ? 'src/app/app.component.ts' : 'solution.js');
  const solutionFile = row.solution_file || starterFile;
  const testCases = buildTestCases(row);

  const manifest = {
    schemaVersion: 1,
    title: row.title,
    description: row.case_study === 'yes'
      ? `Business Context: ${row.scenario}. Implement the required flow with reliable validation and predictable output.`
      : `Implement the required logic for ${row.module}.`,
    category: row.category,
    difficulty: row.difficulty,
    testFramework: row.framework,
    points: Number(row.points || 100),
    timeEstimate: Number(row.time_estimate_minutes || 30),
    starterCode: {
      files: [
        { path: starterFile, source: `starter/${starterFile}`, language: row.track === 'python' ? 'python' : row.track === 'java' ? 'java' : 'javascript' }
      ]
    },
    solution: {
      files: [
        { path: solutionFile, source: `solution/${solutionFile}`, language: row.track === 'python' ? 'python' : row.track === 'java' ? 'java' : 'javascript' }
      ]
    },
    testCases
  };

  zip.file('learnlytica-question.json', JSON.stringify(manifest, null, 2));
  zip.file(`starter/${starterFile}`, starterContent(row.track, starterFile));
  zip.file(`solution/${solutionFile}`, solutionContent(row.track, solutionFile));

  const outTrackDir = path.join(outDir, row.track, row.difficulty);
  await fs.mkdir(outTrackDir, { recursive: true });
  const zipName = `qpkg-${row.question_code}.zip`;
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const target = path.join(outTrackDir, zipName);
  await fs.writeFile(target, buffer);
  return target;
}

async function main() {
  const csvText = await fs.readFile(inputCsv, 'utf8');
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error('No rows found in CSV');
  }

  const created = [];
  for (const row of rows) {
    created.push(await createZip(row));
  }

  console.log(`Generated ${created.length} question ZIP packages in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
