# 🧪 TESTING & VALIDATION PLAN - SOLIDIFYING THE PLATFORM

> Note: This planning document includes legacy/example references to `localhost:3000` in sample tests. Current Learnlytica runtime ports are `3666` (backend) and `4666` (frontend).

## ✅ **SMART APPROACH: TEST BEFORE EXPANDING**

You're absolutely right to solidify testing first. A well-tested foundation is critical.

---

## 🎯 **TESTING STRATEGY OVERVIEW**

### **Three-Phase Approach:**

```
Phase 1: UNIT TESTING (Backend)           ← Week 1-2
Phase 2: INTEGRATION TESTING (Full Stack) ← Week 3-4
Phase 3: END-TO-END TESTING (User Flows)  ← Week 5-6

Total Timeline: 6 weeks to production-ready
```

---

## 📋 **PHASE 1: UNIT TESTING (Week 1-2)**

### **Backend Unit Tests (Jest/Mocha)**

**What to Test:**

#### **1. Services Layer (Critical)**
```javascript
// Test: question.service.ts
describe('QuestionService', () => {
  test('createQuestion creates question correctly', async () => {
    const question = await createQuestion(db, mockQuestion, userId);
    expect(question.id).toBeDefined();
    expect(question.title).toBe(mockQuestion.title);
  });

  test('createQuestion validates required fields', async () => {
    await expect(
      createQuestion(db, {}, userId)
    ).rejects.toThrow('Title is required');
  });

  test('getQuestionById returns null for invalid id', async () => {
    const question = await getQuestionById(db, 'invalid-id');
    expect(question).toBeNull();
  });
});

// Test: assessment.service.ts
// Test: student-assessment.service.ts
// Test: analytics.service.ts
// Test: java-test-runner.service.ts
```

#### **2. Models Layer**
```javascript
// Test: question.model.ts
describe('QuestionModel', () => {
  test('creates question with correct schema', async () => {
    const result = await questionModel.createQuestion(db, data);
    expect(result).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      status: 'draft',
    });
  });
});
```

#### **3. Validators**
```javascript
// Test: question.validator.ts
describe('QuestionValidator', () => {
  test('validates question creation schema', () => {
    const validData = { title: 'Test', category: 'backend' };
    const result = createQuestionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('rejects invalid data', () => {
    const invalidData = { title: '' };
    const result = createQuestionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

#### **4. Test Runners (CRITICAL)**
```javascript
// Test: java-test-runner.service.ts
describe('JavaTestRunner', () => {
  test('validates Java code correctly', () => {
    const validCode = 'public class Solution { }';
    expect(() => validateJavaCode(validCode)).not.toThrow();
  });

  test('rejects dangerous Java code', () => {
    const dangerousCode = 'Runtime.getRuntime().exec("rm -rf /");';
    expect(() => validateJavaCode(dangerousCode)).toThrow();
  });

  test('parses JUnit results correctly', () => {
    const output = '[INFO] Tests run: 5, Failures: 1, Errors: 0';
    const results = parseJUnitResults(output, mockTestCases);
    expect(results).toHaveLength(5);
    expect(results.filter(r => r.passed)).toHaveLength(4);
  });
});
```

#### **5. Code Validators (Security Critical)**
```javascript
// Test: code-validator.service.ts
describe('CodeValidator', () => {
  test('blocks dangerous JavaScript patterns', () => {
    const code = "require('child_process').exec('rm -rf /')";
    expect(() => validateCode(code, 'javascript')).toThrow();
  });

  test('blocks dangerous Python patterns', () => {
    const code = 'import os; os.system("rm -rf /")';
    expect(() => validateCode(code, 'python')).toThrow();
  });

  test('blocks dangerous Java patterns', () => {
    const code = 'Runtime.getRuntime().exec("cmd")';
    expect(() => validateJavaCode(code)).toThrow();
  });
});
```

**Coverage Goals:**
```
Services:     90%+ coverage
Models:       85%+ coverage
Validators:   100% coverage (security critical)
Controllers:  80%+ coverage
```

---

## 🔗 **PHASE 2: INTEGRATION TESTING (Week 3-4)**

### **API Integration Tests**

**What to Test:**

#### **1. Question Management APIs**
```javascript
describe('Question API Integration', () => {
  test('POST /api/v1/questions creates question', async () => {
    const response = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${token}`)
      .send(mockQuestion);
    
    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe(mockQuestion.title);
  });

  test('GET /api/v1/questions returns paginated results', async () => {
    const response = await request(app)
      .get('/api/v1/questions?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('questions');
    expect(response.body.data).toHaveProperty('pagination');
  });

  test('PATCH /api/v1/questions/:id/status updates status', async () => {
    const response = await request(app)
      .patch(`/api/v1/questions/${questionId}/status`)
      .send({ status: 'published' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('published');
  });
});
```

#### **2. Assessment APIs**
```javascript
describe('Assessment API Integration', () => {
  test('creates assessment with questions', async () => {
    const response = await request(app)
      .post('/api/v1/assessments')
      .send({
        title: 'Test Assessment',
        questionIds: [q1, q2, q3],
        labTemplateId: labId
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.questions).toHaveLength(3);
  });

  test('assigns assessment to students', async () => {
    const response = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/assign`)
      .send({
        studentIds: [s1, s2],
        dueDate: '2024-12-31'
      });
    
    expect(response.status).toBe(200);
  });
});
```

#### **3. Student Assessment APIs**
```javascript
describe('Student Assessment API Integration', () => {
  test('student can view assigned assessments', async () => {
    const response = await request(app)
      .get('/api/v1/student/assessments')
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  test('student can start assessment', async () => {
    const response = await request(app)
      .post(`/api/v1/student/assessments/${saId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('in_progress');
  });

  test('student can submit assessment', async () => {
    const response = await request(app)
      .post(`/api/v1/student/assessments/${saId}/submit`)
      .send({ code: mockCode, timeSpentMinutes: 45 });
    
    expect(response.status).toBe(200);
    expect(response.body.data.score).toBeGreaterThanOrEqual(0);
  });
});
```

#### **4. Analytics APIs**
```javascript
describe('Analytics API Integration', () => {
  test('returns dashboard statistics', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/dashboard');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('questions');
    expect(response.body.data).toHaveProperty('students');
  });
});
```

#### **5. Test Execution Integration**
```javascript
describe('Code Execution Integration', () => {
  test('executes JavaScript tests correctly', async () => {
    const response = await request(app)
      .post(`/api/v1/student/assessments/${saId}/run-tests`)
      .send({
        code: 'function add(a,b) { return a+b; }',
        testFramework: 'jest'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('testsRun');
    expect(response.body.data).toHaveProperty('testsPassed');
  });

  test('executes Python tests correctly', async () => {
    const response = await request(app)
      .post(`/api/v1/student/assessments/${saId}/run-tests`)
      .send({
        code: 'def add(a, b): return a + b',
        testFramework: 'pytest'
      });
    
    expect(response.status).toBe(200);
  });

  test('executes Java tests correctly', async () => {
    const response = await request(app)
      .post(`/api/v1/student/assessments/${saId}/run-tests`)
      .send({
        code: 'public class Solution { public int add(int a, int b) { return a+b; }}',
        testFramework: 'junit'
      });
    
    expect(response.status).toBe(200);
  });
});
```

---

## 🎭 **PHASE 3: END-TO-END TESTING (Week 5-6)**

### **E2E Tests with Playwright**

**What to Test:**

#### **1. Admin Question Creation Flow**
```javascript
// tests/e2e/admin-question-flow.spec.ts
test('Admin can create and publish question', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.fill('#email', 'admin@test.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to create question
  await page.click('a[href="/questions"]');
  await page.click('a[href="/questions/create"]');
  
  // Fill form
  await page.fill('#title', 'Test Question');
  await page.selectOption('#category', 'backend');
  await page.selectOption('#framework', 'junit');
  await page.fill('#description', 'Test description');
  
  // Add test case
  await page.click('button:has-text("Add Test Case")');
  await page.fill('[name="testCases.0.name"]', 'Test 1');
  await page.fill('[name="testCases.0.points"]', '25');
  
  // Create
  await page.click('button:has-text("Create Question")');
  
  // Verify created
  await expect(page.locator('h1')).toContainText('Test Question');
  
  // Publish
  await page.click('button:has-text("Publish")');
  await expect(page.locator('.status')).toContainText('Published');
});
```

#### **2. Admin Assessment Creation Flow**
```javascript
test('Admin can create assessment', async ({ page }) => {
  await loginAsAdmin(page);
  
  await page.goto('/assessments/create');
  
  // Basic info
  await page.fill('#title', 'Java Assessment');
  await page.fill('#description', 'Test Java skills');
  
  // Select lab template
  await page.selectOption('#labTemplate', 'java-env');
  
  // Select questions
  await page.check('[data-question-id="q1"]');
  await page.check('[data-question-id="q2"]');
  
  // Settings
  await page.fill('#timeLimit', '120');
  await page.fill('#passingScore', '70');
  
  // Create
  await page.click('button:has-text("Create Assessment")');
  
  await expect(page).toHaveURL(/\/assessments\/[a-z0-9-]+/);
});
```

#### **3. Student Assessment Taking Flow**
```javascript
test('Student can take and submit assessment', async ({ page }) => {
  await loginAsStudent(page);
  
  // View assessments
  await page.goto('/student/assessments');
  await expect(page.locator('.assessment-card')).toBeVisible();
  
  // Start assessment
  await page.click('button:has-text("Start Assessment")');
  
  // Wait for editor to load
  await page.waitForSelector('.monaco-editor');
  
  // Write code
  const editor = page.locator('.monaco-editor');
  await editor.click();
  await page.keyboard.type('public class Solution {');
  await page.keyboard.press('Enter');
  await page.keyboard.type('  public int add(int a, int b) {');
  await page.keyboard.press('Enter');
  await page.keyboard.type('    return a + b;');
  await page.keyboard.press('Enter');
  await page.keyboard.type('  }');
  await page.keyboard.press('Enter');
  await page.keyboard.type('}');
  
  // Run tests
  await page.click('button:has-text("Run Tests")');
  
  // Wait for results
  await page.waitForSelector('.test-results');
  await expect(page.locator('.test-passed')).toBeVisible();
  
  // Submit
  await page.click('button:has-text("Submit")');
  await page.click('button:has-text("Confirm")'); // Confirmation dialog
  
  // Verify submitted
  await expect(page).toHaveURL('/student/assessments');
  await expect(page.locator('.status-submitted')).toBeVisible();
});
```

#### **4. Analytics Dashboard Flow**
```javascript
test('Admin can view analytics', async ({ page }) => {
  await loginAsAdmin(page);
  
  await page.goto('/analytics');
  
  // Verify stats cards
  await expect(page.locator('[data-stat="total-questions"]')).toBeVisible();
  await expect(page.locator('[data-stat="total-students"]')).toBeVisible();
  await expect(page.locator('[data-stat="average-score"]')).toBeVisible();
  
  // Verify charts
  await expect(page.locator('.chart')).toBeVisible();
});
```

---

## 🔒 **SECURITY TESTING (Critical)**

### **What to Test:**

#### **1. Code Injection Prevention**
```javascript
describe('Security: Code Injection', () => {
  test('blocks JavaScript code injection', async () => {
    const maliciousCode = `
      require('child_process').exec('rm -rf /');
      eval('process.exit()');
    `;
    
    const response = await request(app)
      .post('/api/v1/student/assessments/${saId}/run-tests')
      .send({ code: maliciousCode, testFramework: 'jest' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('forbidden pattern');
  });

  test('blocks Python code injection', async () => {
    const maliciousCode = `
      import os
      os.system('rm -rf /')
    `;
    
    const response = await request(app)
      .post('/api/v1/student/assessments/${saId}/run-tests')
      .send({ code: maliciousCode, testFramework: 'pytest' });
    
    expect(response.status).toBe(400);
  });

  test('blocks Java code injection', async () => {
    const maliciousCode = `
      public class Solution {
        public void hack() {
          Runtime.getRuntime().exec("rm -rf /");
        }
      }
    `;
    
    const response = await request(app)
      .post('/api/v1/student/assessments/${saId}/run-tests')
      .send({ code: maliciousCode, testFramework: 'junit' });
    
    expect(response.status).toBe(400);
  });
});
```

#### **2. Authentication & Authorization**
```javascript
describe('Security: Authentication', () => {
  test('rejects unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/v1/questions');
    
    expect(response.status).toBe(401);
  });

  test('rejects invalid tokens', async () => {
    const response = await request(app)
      .get('/api/v1/questions')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });

  test('students cannot access admin endpoints', async () => {
    const response = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(mockQuestion);
    
    expect(response.status).toBe(403);
  });
});
```

#### **3. Docker Container Isolation**
```javascript
describe('Security: Container Isolation', () => {
  test('container has no network access', async () => {
    const code = `
      const http = require('http');
      http.get('http://google.com');
    `;
    
    const response = await runTests(code, 'jest');
    expect(response.stderr).toContain('network');
  });

  test('container respects CPU limits', async () => {
    // Infinite loop
    const code = `while(true) {}`;
    
    await expect(
      runTests(code, 'jest', { timeout: 5000 })
    ).rejects.toThrow('timeout');
  });

  test('container respects memory limits', async () => {
    // Memory bomb
    const code = `const arr = []; while(true) arr.push(new Array(1000000));`;
    
    await expect(
      runTests(code, 'jest')
    ).rejects.toThrow();
  });
});
```

---

## 📊 **PERFORMANCE TESTING**

### **Load Testing**

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function() {
  // Test question listing
  let res = http.get('http://localhost:3000/api/v1/questions', {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Performance Goals:**
```
API Response Time:    < 500ms (p95)
Code Execution:       < 10s per test
Page Load:           < 2s
Concurrent Users:     500+
Database Queries:     < 100ms
```

---

## 🧪 **TEST INFRASTRUCTURE SETUP**

### **1. Create Test Database**
```bash
# Create test database
createdb learnlytica_test

# Run migrations
psql -d learnlytica_test -f backend/migrations/*.sql

# Seed test data
psql -d learnlytica_test -f tests/fixtures/seed.sql
```

### **2. Test Environment Configuration**
```bash
# backend/.env.test
DATABASE_URL=postgresql://localhost/learnlytica_test
NODE_ENV=test
JWT_SECRET=test-secret
DOCKER_HOST=unix:///var/run/docker.sock
```

### **3. Test Scripts**
```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

---

## ✅ **TESTING CHECKLIST**

### **Week 1-2: Unit Tests**
```
□ Services layer (90%+ coverage)
  □ question.service.ts
  □ assessment.service.ts
  □ student-assessment.service.ts
  □ analytics.service.ts
  □ java-test-runner.service.ts
  □ test-runner.service.ts
  
□ Models layer (85%+ coverage)
  □ question.model.ts
  □ assessment.model.ts
  □ lab-template.model.ts
  
□ Validators (100% coverage)
  □ question.validator.ts
  □ assessment.validator.ts
  □ code-validator.service.ts
  
□ Controllers (80%+ coverage)
  □ All controllers tested
```

### **Week 3-4: Integration Tests**
```
□ API Integration
  □ Question APIs (9 endpoints)
  □ Assessment APIs (9 endpoints)
  □ Student APIs (5 endpoints)
  □ Analytics APIs (4 endpoints)
  □ Lab Template APIs (5 endpoints)
  
□ Database Integration
  □ CRUD operations
  □ Transactions
  □ Constraints
  
□ Docker Integration
  □ Jest execution
  □ Pytest execution
  □ JUnit execution
  □ Playwright execution
  □ Supertest execution
```

### **Week 5-6: E2E Tests**
```
□ Admin Flows
  □ Question creation
  □ Assessment creation
  □ Student assignment
  □ Analytics viewing
  
□ Student Flows
  □ View assessments
  □ Take assessment
  □ Run tests
  □ Submit assessment
  □ View results
  
□ Security Tests
  □ Code injection prevention
  □ Auth/authorization
  □ Container isolation
  □ Rate limiting
```

---

## 📈 **SUCCESS CRITERIA**

### **Coverage Targets:**
```
Unit Tests:         90%+ coverage
Integration Tests:  85%+ coverage
E2E Tests:         All critical flows
Security Tests:    100% of attack vectors
Performance:       < 500ms API response (p95)
```

### **Quality Gates:**
```
✅ All tests passing
✅ No critical security vulnerabilities
✅ Performance benchmarks met
✅ Code coverage targets met
✅ E2E flows working
✅ Docker execution stable
✅ Database integrity maintained
```

---

## 🎯 **AFTER TESTING IS COMPLETE**

### **You'll Have:**
```
✅ Comprehensive test suite (500+ tests)
✅ 90%+ code coverage
✅ All security vulnerabilities addressed
✅ Performance benchmarks established
✅ Confidence in production deployment
✅ CI/CD pipeline ready
✅ Documentation updated
```

### **Then You Can:**
```
1. Deploy to production with confidence
2. Onboard first customers
3. Gather real-world feedback
4. Begin Phase 2 enhancements:
   - AI Code Review
   - Video Proctoring
   - SSO/SAML
```

---

## 🚀 **RECOMMENDED APPROACH**

```
Week 1-2:  Write unit tests, achieve 90% coverage
Week 3-4:  Write integration tests, test all APIs
Week 5-6:  Write E2E tests, test user flows
Week 7:    Security audit, penetration testing
Week 8:    Performance testing, load testing
Week 9:    Bug fixes, optimization
Week 10:   Production deployment
Week 11+:  Monitor, iterate, plan Phase 2
```

**Total: ~10 weeks to production-hardened platform**

---

**🎊 EXCELLENT DECISION TO SOLIDIFY TESTING FIRST!**

**This will give you a rock-solid foundation for future enhancements.**

---

*Testing & Validation Plan*
*Version: 1.0.0*
*Created: 2024-02-25*
