#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? 'true'];
  })
);

const inputCsv = path.resolve(process.cwd(), args.input || '../docs/generated/curriculum-matrix-125.csv');
const outDir = path.resolve(process.cwd(), args.out || '../samples/refined-question-packages');

const EASY_SCENARIOS = [
  { key: 'expense_limit_check', domain: 'Expense Claims', task: 'Validate claim amount against policy limit' },
  { key: 'ticket_priority_map', domain: 'Support Ops', task: 'Map ticket severity to priority bucket' },
  { key: 'invoice_tax_total', domain: 'Billing', task: 'Calculate invoice total with tax' },
  { key: 'stock_reorder_flag', domain: 'Inventory', task: 'Flag reorder when stock below threshold' },
  { key: 'attendance_late_mark', domain: 'HR Ops', task: 'Mark late attendance beyond grace window' },
  { key: 'lead_score_band', domain: 'Sales Ops', task: 'Map lead score to qualification band' },
  { key: 'shipment_eta_tag', domain: 'Logistics', task: 'Tag shipment as delayed when ETA breached' },
  { key: 'refund_auto_approval', domain: 'Payments', task: 'Auto-approve small refunds below threshold' }
];

const CASE_STUDY_SCENARIOS = [
  { key: 'expense_compliance', domain: 'Finance Compliance', objective: 'Enforce policy + manager approval + duplicate guard' },
  { key: 'sla_triage', domain: 'Customer Support', objective: 'Route ticket by SLA tier and business impact' },
  { key: 'inventory_audit', domain: 'Warehouse Ops', objective: 'Trigger reorder and audit flags with risk checks' },
  { key: 'billing_adjustment', domain: 'Subscription Billing', objective: 'Apply prorated credits and cap adjustments' },
  { key: 'visitor_compliance', domain: 'Facility Security', objective: 'Validate visit requests against access policy' },
  { key: 'claims_fraud_screen', domain: 'Insurance Ops', objective: 'Detect high-risk patterns and require manual review' },
  { key: 'kyc_verification', domain: 'Fintech Compliance', objective: 'Approve onboarding only when KYC package is complete' },
  { key: 'returns_validation', domain: 'E-commerce Returns', objective: 'Validate returns by order age and item condition' },
  { key: 'promo_eligibility', domain: 'Growth Marketing', objective: 'Apply campaign rules and avoid abuse cases' }
];

const FRONTEND_UI_SCENARIOS = [
  { key: 'expense_portal_ui', title: 'Expense Claim Submission Portal', entity: 'claim' },
  { key: 'ticket_intake_ui', title: 'Support Ticket Intake Portal', entity: 'ticket' },
  { key: 'visitor_desk_ui', title: 'Visitor Check-In Desk', entity: 'visitor' },
  { key: 'invoice_review_ui', title: 'Invoice Review Console', entity: 'invoice' },
  { key: 'returns_queue_ui', title: 'Returns Processing Queue', entity: 'return request' }
];

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

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function scenarioFor(row) {
  const seq = Math.max(1, toNum(row.sequence, 1));
  if (row.track === 'react' || row.track === 'angular') return FRONTEND_UI_SCENARIOS[(seq - 1) % FRONTEND_UI_SCENARIOS.length];
  if (row.difficulty === 'easy') return EASY_SCENARIOS[(seq - 1) % EASY_SCENARIOS.length];
  return CASE_STUDY_SCENARIOS[(seq - 1) % CASE_STUDY_SCENARIOS.length];
}

function frameworkLang(track) {
  if (track === 'python') return 'python';
  if (track === 'java') return 'java';
  return 'javascript';
}

function buildDescription(row, s) {
  const lines = [
    `Business Domain: ${s.domain || 'Product Operations'}`,
    '',
    'Objective:',
    row.difficulty === 'easy' ? `- ${s.task}` : `- ${s.objective}`,
    '',
    'Functional Requirements:',
    '- Accept structured input payload',
    '- Validate policy constraints and required fields',
    '- Return deterministic decision object',
    '',
    'Acceptance Criteria:',
    '- Valid payload produces expected decision',
    '- Invalid payload returns actionable error reason',
    '- Edge cases are handled without runtime failure'
  ];

  if (row.difficulty !== 'easy') {
    lines.push('', 'Case Study Notes:', `- Scenario: ${s.key}`, '- Include policy + risk-based decisioning', '- Preserve explainable output for auditing');
  }

  return lines.join('\n');
}

function backendStarter(track) {
  if (track === 'python') {
    return `def evaluateCase(payload):\n    # TODO: implement business logic\n    return {"approved": False, "reason": "NOT_IMPLEMENTED", "riskLevel": "unknown"}\n`;
  }
  if (track === 'java') {
    return `import java.util.Map;\nimport java.util.HashMap;\n\npublic class Evaluator {\n  public static Map<String, Object> evaluateCase(Map<String, Object> payload) {\n    Map<String, Object> out = new HashMap<>();\n    out.put("approved", false);\n    out.put("reason", "NOT_IMPLEMENTED");\n    out.put("riskLevel", "unknown");\n    return out;\n  }\n}\n`;
  }
  return `function evaluateCase(payload) {\n  // TODO: implement business logic\n  return { approved: false, reason: 'NOT_IMPLEMENTED', riskLevel: 'unknown' };\n}\n\nmodule.exports = { evaluateCase };\n`;
}

function backendSolution(track, row) {
  const limit = row.difficulty === 'easy' ? 1000 : row.difficulty === 'medium' ? 1500 : 2000;
  if (track === 'python') {
    return `def evaluateCase(payload):\n    amount = float(payload.get("amount", 0))\n    required = payload.get("requiredComplete", True)\n    duplicate = payload.get("duplicate", False)\n    risk = payload.get("riskScore", 0)\n\n    if not required:\n      return {"approved": False, "reason": "MISSING_REQUIRED_FIELDS", "riskLevel": "high"}\n    if duplicate:\n      return {"approved": False, "reason": "DUPLICATE_SUBMISSION", "riskLevel": "high"}\n    if amount > ${limit}:\n      return {"approved": False, "reason": "POLICY_LIMIT_EXCEEDED", "riskLevel": "medium"}\n    if risk >= 80:\n      return {"approved": False, "reason": "MANUAL_REVIEW_REQUIRED", "riskLevel": "high"}\n\n    return {"approved": True, "reason": "APPROVED", "riskLevel": "low"}\n`;
  }
  if (track === 'java') {
    return `import java.util.Map;\nimport java.util.HashMap;\n\npublic class Evaluator {\n  public static Map<String, Object> evaluateCase(Map<String, Object> payload) {\n    Map<String, Object> out = new HashMap<>();\n    double amount = ((Number) payload.getOrDefault("amount", 0)).doubleValue();\n    boolean required = (boolean) payload.getOrDefault("requiredComplete", true);\n    boolean duplicate = (boolean) payload.getOrDefault("duplicate", false);\n    int risk = ((Number) payload.getOrDefault("riskScore", 0)).intValue();\n\n    if (!required) { out.put("approved", false); out.put("reason", "MISSING_REQUIRED_FIELDS"); out.put("riskLevel", "high"); return out; }\n    if (duplicate) { out.put("approved", false); out.put("reason", "DUPLICATE_SUBMISSION"); out.put("riskLevel", "high"); return out; }\n    if (amount > ${limit}) { out.put("approved", false); out.put("reason", "POLICY_LIMIT_EXCEEDED"); out.put("riskLevel", "medium"); return out; }\n    if (risk >= 80) { out.put("approved", false); out.put("reason", "MANUAL_REVIEW_REQUIRED"); out.put("riskLevel", "high"); return out; }\n\n    out.put("approved", true); out.put("reason", "APPROVED"); out.put("riskLevel", "low"); return out;\n  }\n}\n`;
  }
  return `function evaluateCase(payload) {\n  const amount = Number(payload?.amount ?? 0);\n  const required = Boolean(payload?.requiredComplete ?? true);\n  const duplicate = Boolean(payload?.duplicate ?? false);\n  const risk = Number(payload?.riskScore ?? 0);\n\n  if (!required) return { approved: false, reason: 'MISSING_REQUIRED_FIELDS', riskLevel: 'high' };\n  if (duplicate) return { approved: false, reason: 'DUPLICATE_SUBMISSION', riskLevel: 'high' };\n  if (amount > ${limit}) return { approved: false, reason: 'POLICY_LIMIT_EXCEEDED', riskLevel: 'medium' };\n  if (risk >= 80) return { approved: false, reason: 'MANUAL_REVIEW_REQUIRED', riskLevel: 'high' };\n  return { approved: true, reason: 'APPROVED', riskLevel: 'low' };\n}\n\nmodule.exports = { evaluateCase };\n`;
}

function frontendStarter(track, scenario) {
  if (track === 'angular') {
    return `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root',\n  template: \`<main><h1>${scenario.title}</h1><p>TODO: Implement form and list flow</p></main>\`\n})\nexport class AppComponent {}\n`;
  }
  return `export default function App() {\n  return (\n    <main>\n      <h1>${scenario.title}</h1>\n      <p>TODO: Implement form and list flow</p>\n    </main>\n  );\n}\n`;
}

function frontendSolution(track, scenario) {
  if (track === 'angular') {
    return `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root',\n  template: \`\n    <main>\n      <h1>${scenario.title}</h1>\n      <form aria-label="submission form">\n        <label>Name <input aria-label="Name" /></label>\n        <label>Email <input aria-label="Email" /></label>\n        <button type="submit">Create</button>\n      </form>\n      <section><h2>Recent ${scenario.entity}s</h2></section>\n    </main>\n  \`\n})\nexport class AppComponent {}\n`;
  }
  return `export default function App() {\n  return (\n    <main>\n      <h1>${scenario.title}</h1>\n      <form aria-label=\"submission form\">\n        <label htmlFor=\"name\">Name</label>\n        <input id=\"name\" aria-label=\"Name\" />\n        <label htmlFor=\"email\">Email</label>\n        <input id=\"email\" aria-label=\"Email\" />\n        <button type=\"submit\">Create</button>\n      </form>\n      <section><h2>Recent ${scenario.entity}s</h2></section>\n    </main>\n  );\n}\n`;
}

function backendTestCode(track, kind, amountLimit) {
  if (track === 'python') {
    if (kind === 'approved') return `result = evaluateCase({"amount": 250, "requiredComplete": True, "duplicate": False, "riskScore": 15}); assert result["approved"] is True`;
    if (kind === 'over_limit') return `result = evaluateCase({"amount": ${amountLimit + 100}, "requiredComplete": True, "duplicate": False, "riskScore": 10}); assert result["reason"] == "POLICY_LIMIT_EXCEEDED"`;
    if (kind === 'duplicate') return `result = evaluateCase({"amount": 100, "requiredComplete": True, "duplicate": True, "riskScore": 5}); assert result["reason"] == "DUPLICATE_SUBMISSION"`;
    if (kind === 'missing') return `result = evaluateCase({"amount": 100, "requiredComplete": False, "duplicate": False, "riskScore": 5}); assert result["reason"] == "MISSING_REQUIRED_FIELDS"`;
    return `result = evaluateCase({"amount": 100, "requiredComplete": True, "duplicate": False, "riskScore": 90}); assert result["reason"] == "MANUAL_REVIEW_REQUIRED"`;
  }
  if (track === 'java') {
    if (kind === 'approved') return `Map<String,Object> in = new HashMap<>(); in.put("amount", 250); in.put("requiredComplete", true); in.put("duplicate", false); in.put("riskScore", 15); Map<String,Object> out = Evaluator.evaluateCase(in); org.junit.jupiter.api.Assertions.assertEquals(true, out.get("approved"));`;
    if (kind === 'over_limit') return `Map<String,Object> in = new HashMap<>(); in.put("amount", ${amountLimit + 100}); in.put("requiredComplete", true); in.put("duplicate", false); in.put("riskScore", 10); Map<String,Object> out = Evaluator.evaluateCase(in); org.junit.jupiter.api.Assertions.assertEquals("POLICY_LIMIT_EXCEEDED", out.get("reason"));`;
    if (kind === 'duplicate') return `Map<String,Object> in = new HashMap<>(); in.put("amount", 100); in.put("requiredComplete", true); in.put("duplicate", true); in.put("riskScore", 5); Map<String,Object> out = Evaluator.evaluateCase(in); org.junit.jupiter.api.Assertions.assertEquals("DUPLICATE_SUBMISSION", out.get("reason"));`;
    if (kind === 'missing') return `Map<String,Object> in = new HashMap<>(); in.put("amount", 100); in.put("requiredComplete", false); in.put("duplicate", false); in.put("riskScore", 5); Map<String,Object> out = Evaluator.evaluateCase(in); org.junit.jupiter.api.Assertions.assertEquals("MISSING_REQUIRED_FIELDS", out.get("reason"));`;
    return `Map<String,Object> in = new HashMap<>(); in.put("amount", 100); in.put("requiredComplete", true); in.put("duplicate", false); in.put("riskScore", 90); Map<String,Object> out = Evaluator.evaluateCase(in); org.junit.jupiter.api.Assertions.assertEquals("MANUAL_REVIEW_REQUIRED", out.get("reason"));`;
  }
  if (kind === 'approved') return `const out = evaluateCase({ amount: 250, requiredComplete: true, duplicate: false, riskScore: 15 }); expect(out.approved).toBe(true);`;
  if (kind === 'over_limit') return `const out = evaluateCase({ amount: ${amountLimit + 100}, requiredComplete: true, duplicate: false, riskScore: 10 }); expect(out.reason).toBe('POLICY_LIMIT_EXCEEDED');`;
  if (kind === 'duplicate') return `const out = evaluateCase({ amount: 100, requiredComplete: true, duplicate: true, riskScore: 5 }); expect(out.reason).toBe('DUPLICATE_SUBMISSION');`;
  if (kind === 'missing') return `const out = evaluateCase({ amount: 100, requiredComplete: false, duplicate: false, riskScore: 5 }); expect(out.reason).toBe('MISSING_REQUIRED_FIELDS');`;
  return `const out = evaluateCase({ amount: 100, requiredComplete: true, duplicate: false, riskScore: 90 }); expect(out.reason).toBe('MANUAL_REVIEW_REQUIRED');`;
}

function frontendPlaywrightTestCode(scenario, kind) {
  if (kind === 'heading') return `await page.goto('http://127.0.0.1:4173'); await expect(page.getByRole('heading', { name: /${scenario.title}/i })).toBeVisible();`;
  if (kind === 'form') return `await page.goto('http://127.0.0.1:4173'); await expect(page.getByRole('form', { name: /submission form/i })).toBeVisible(); await expect(page.getByRole('button', { name: /Create/i })).toBeVisible();`;
  if (kind === 'labels') return `await page.goto('http://127.0.0.1:4173'); await expect(page.getByLabel('Name')).toBeVisible(); await expect(page.getByLabel('Email')).toBeVisible();`;
  if (kind === 'list') return `await page.goto('http://127.0.0.1:4173'); await expect(page.getByRole('heading', { name: /Recent/i })).toBeVisible();`;
  return `await page.goto('http://127.0.0.1:4173'); await expect(page).toHaveTitle(/.+/);`;
}

function buildTestCases(row, scenario) {
  const total = toNum(row.points, 100);

  if (row.track === 'react' || row.track === 'angular') {
    const kinds = row.difficulty === 'easy' ? ['heading', 'form', 'labels', 'list'] : row.difficulty === 'medium' ? ['heading', 'form', 'labels', 'list', 'stability'] : ['heading', 'form', 'labels', 'list', 'stability', 'stability'];
    const each = Math.floor(total / kinds.length);
    return kinds.map((k, i) => ({
      id: `tc_${String(i + 1).padStart(3, '0')}`,
      name: `UI Check ${i + 1}`,
      description: `Verifies ${k} for ${scenario.title}`,
      file: `tests/ui_${i + 1}.spec.js`,
      testName: `ui_check_${i + 1}`,
      testCode: frontendPlaywrightTestCode(scenario, k),
      points: each,
      visible: true,
      category: 'ui_flow'
    }));
  }

  const kinds = row.difficulty === 'easy' ? ['approved', 'over_limit', 'duplicate', 'missing'] : row.difficulty === 'medium' ? ['approved', 'over_limit', 'duplicate', 'missing', 'risk'] : ['approved', 'over_limit', 'duplicate', 'missing', 'risk', 'risk'];
  const each = Math.floor(total / kinds.length);
  const limit = row.difficulty === 'easy' ? 1000 : row.difficulty === 'medium' ? 1500 : 2000;
  return kinds.map((k, i) => ({
    id: `tc_${String(i + 1).padStart(3, '0')}`,
    name: `Business Rule ${i + 1}`,
    description: `${scenario.domain}: ${k.replace('_', ' ')}`,
    file: row.framework === 'pytest' ? `tests/test_${i + 1}.py` : row.framework === 'junit' ? `src/test/java/Rule${i + 1}Test.java` : `tests/rule_${i + 1}.spec.js`,
    testName: `rule_${i + 1}`,
    testCode: backendTestCode(row.track, k, limit),
    points: each,
    visible: true,
    category: row.difficulty === 'easy' ? 'core_rules' : 'case_study_rules'
  }));
}

function buildManifest(row, scenario, starterFile, solutionFile, testCases) {
  return {
    schemaVersion: 1,
    title: row.title,
    description: buildDescription(row, scenario),
    category: row.category,
    difficulty: row.difficulty,
    testFramework: row.framework,
    points: toNum(row.points, 100),
    timeEstimate: toNum(row.time_estimate_minutes, 30),
    skills: [row.track, row.module, row.difficulty],
    tags: String(row.tags || '').split('|').filter(Boolean),
    starterCode: {
      files: [{ path: starterFile, source: `starter/${starterFile}`, language: frameworkLang(row.track) }]
    },
    solution: {
      files: [{ path: solutionFile, source: `solution/${solutionFile}`, language: frameworkLang(row.track) }]
    },
    testCases
  };
}

function sourceFiles(row, scenario) {
  const starterFile = row.starter_file || (row.track === 'python' ? 'solution.py' : row.track === 'java' ? 'src/Evaluator.java' : 'solution.js');
  const solutionFile = row.solution_file || starterFile;

  if (row.track === 'react' || row.track === 'angular') {
    return { starterFile, solutionFile, starter: frontendStarter(row.track, scenario), solution: frontendSolution(row.track, scenario) };
  }

  return { starterFile, solutionFile, starter: backendStarter(row.track), solution: backendSolution(row.track, row) };
}

async function zipDir(sourceDir, outZipPath) {
  await fs.mkdir(path.dirname(outZipPath), { recursive: true });
  const files = ['learnlytica-question.json', 'starter', 'solution'];
  await execFileAsync('zip', ['-qr', outZipPath, ...files], { cwd: sourceDir });
}

async function createZip(row) {
  const scenario = scenarioFor(row);
  const { starterFile, solutionFile, starter, solution } = sourceFiles(row, scenario);
  const testCases = buildTestCases(row, scenario);
  const manifest = buildManifest(row, scenario, starterFile, solutionFile, testCases);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'learnlytica-qpkg-'));
  try {
    await fs.mkdir(path.join(tempDir, 'starter', path.dirname(starterFile)), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'solution', path.dirname(solutionFile)), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'learnlytica-question.json'), JSON.stringify(manifest, null, 2), 'utf8');
    await fs.writeFile(path.join(tempDir, 'starter', starterFile), starter, 'utf8');
    await fs.writeFile(path.join(tempDir, 'solution', solutionFile), solution, 'utf8');

    const trackDir = path.join(outDir, row.track, row.difficulty);
    const outPath = path.join(trackDir, `refined-${row.question_code}.zip`);
    await zipDir(tempDir, outPath);
    return outPath;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const csvText = await fs.readFile(inputCsv, 'utf8');
  const rows = parseCsv(csvText);
  if (!rows.length) throw new Error('No rows in CSV');

  const outputs = [];
  for (const row of rows) {
    outputs.push(await createZip(row));
  }

  const manifestPath = path.join(outDir, 'manifest.txt');
  await fs.writeFile(manifestPath, outputs.join('\n'), 'utf8');
  console.log(`Generated ${outputs.length} refined ZIP packages at ${outDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
