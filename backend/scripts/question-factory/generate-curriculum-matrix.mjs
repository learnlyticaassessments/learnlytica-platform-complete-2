#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const tracks = [
  { key: 'java', framework: 'junit', category: 'backend', starter: 'src/Main.java', solution: 'src/Main.java' },
  { key: 'python', framework: 'pytest', category: 'backend', starter: 'solution.py', solution: 'solution.py' },
  { key: 'javascript', framework: 'jest', category: 'backend', starter: 'solution.js', solution: 'solution.js' },
  { key: 'react', framework: 'playwright', category: 'frontend', starter: 'src/App.jsx', solution: 'src/App.jsx' },
  { key: 'angular', framework: 'playwright', category: 'frontend', starter: 'src/app/app.component.ts', solution: 'src/app/app.component.ts' }
];

const modulePlan = {
  easy: [
    'Core Syntax and Data Handling',
    'Functions Classes and Architecture',
    'Functions Classes and Architecture',
    'Validation and Error Handling',
    'Testing and Quality',
    'API and Data Integration',
    'Core Syntax and Data Handling',
    'Performance and Robustness'
  ],
  medium: [
    'API and Data Integration',
    'Functions Classes and Architecture',
    'Validation and Error Handling',
    'Testing and Quality',
    'Performance and Robustness',
    'API and Data Integration',
    'Performance and Robustness',
    'Core Syntax and Data Handling',
    'API and Data Integration'
  ],
  hard: [
    'Performance and Robustness',
    'API and Data Integration',
    'Performance and Robustness',
    'Functions Classes and Architecture',
    'Validation and Error Handling',
    'Testing and Quality',
    'Performance and Robustness',
    'API and Data Integration'
  ]
};

const caseThemes = [
  'Expense claims compliance workflow',
  'Support ticket SLA routing',
  'Inventory reorder and audit checks',
  'Subscription billing adjustments',
  'Visitor desk approval compliance'
];

const headers = [
  'track',
  'framework',
  'difficulty',
  'sequence',
  'question_code',
  'module',
  'title',
  'category',
  'time_estimate_minutes',
  'points',
  'case_study',
  'scenario',
  'starter_file',
  'solution_file',
  'tags'
];

function titleCase(str) {
  return str
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function buildTitle(track, difficulty, moduleName, seq, scenario) {
  const trackLabel = titleCase(track);
  if (difficulty === 'easy') {
    return `${trackLabel} ${moduleName} Exercise ${String(seq).padStart(2, '0')}`;
  }
  return `${trackLabel} Case Study ${String(seq).padStart(2, '0')} - ${scenario}`;
}

const rows = [];
for (const track of tracks) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const list = modulePlan[difficulty];
    list.forEach((moduleName, idx) => {
      const sequence = idx + 1;
      const code = `${track.key}-${difficulty}-${String(sequence).padStart(2, '0')}`;
      const scenario = difficulty === 'easy' ? '' : caseThemes[(sequence - 1) % caseThemes.length];
      const points = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200;
      const timeEstimate = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60;
      const tags = [track.key, difficulty, moduleName.toLowerCase().replace(/\s+/g, '-'), 'curriculum'].join('|');

      rows.push([
        track.key,
        track.framework,
        difficulty,
        String(sequence),
        code,
        moduleName,
        buildTitle(track.key, difficulty, moduleName, sequence, scenario),
        track.category,
        String(timeEstimate),
        String(points),
        difficulty === 'easy' ? 'no' : 'yes',
        scenario,
        track.starter,
        track.solution,
        tags
      ]);
    });
  }
}

const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n');
const outPath = path.resolve(process.cwd(), 'docs/generated/curriculum-matrix-125.csv');
await fs.writeFile(outPath, csv, 'utf8');
console.log(`Generated ${rows.length} rows -> ${outPath}`);
