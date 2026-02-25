# Playwright Test Framework Setup

> Note: `localhost:3000` in examples below is a sample target app URL for Playwright tests, not the Learnlytica platform runtime port.

## Overview

Playwright is integrated for E2E testing and UI automation in assessments.

## Docker Image

```bash
cd docker/execution-environments
docker build -t learnlytica/executor-playwright:latest -f Dockerfile.playwright .
```

## Use Cases

### 1. Frontend Component Testing
Test React/Vue components in real browsers:

```javascript
// Question: Create a Todo List component
// Test:
test('should add todo item', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('[data-testid="todo-input"]', 'Buy milk');
  await page.click('[data-testid="add-button"]');
  await expect(page.locator('[data-testid="todo-item"]')).toHaveText('Buy milk');
});
```

### 2. Full-Stack Application Testing
Test complete applications:

```javascript
test('user can login and view dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toHaveText('Welcome');
});
```

### 3. API Testing
Test REST APIs:

```javascript
test('API should return user data', async ({ request }) => {
  const response = await request.get('/api/users/1');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.name).toBe('John Doe');
});
```

### 4. Accessibility Testing
Verify WCAG compliance:

```javascript
test('page should be accessible', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Question Configuration

In the question creation UI, select "Playwright" as the test framework:

```json
{
  "testConfig": {
    "framework": "playwright",
    "execution": {
      "timeout": 60000,
      "headless": true
    },
    "testCases": [
      {
        "id": "test-1",
        "name": "Component renders correctly",
        "points": 25,
        "testCode": "await page.goto('http://localhost:3000'); await expect(page.locator('h1')).toBeVisible();"
      }
    ]
  }
}
```

## Security Notes

- Tests run in headless mode
- Network access disabled by default
- No file system access outside /workspace
- Resource limits enforced (1 CPU, 512MB RAM)

## Browser Support

The Playwright image includes:
- Chromium
- Firefox
- WebKit (Safari)

All tests run in headless mode for security.

## Screenshot & Video Support

Playwright can capture screenshots and videos during test execution:

```javascript
test('capture screenshot on failure', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'screenshot.png' });
});
```

Screenshots are captured in the Docker container and can be extracted if needed.

## Common Patterns

### Test a Form Submission
```javascript
test('form submission works', async ({ page }) => {
  await page.goto('http://localhost:3000/contact');
  await page.fill('#name', 'John Doe');
  await page.fill('#email', 'john@example.com');
  await page.fill('#message', 'Hello!');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Test Navigation
```javascript
test('navigation works', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('a[href="/about"]');
  await expect(page).toHaveURL('/about');
  await expect(page.locator('h1')).toHaveText('About Us');
});
```

### Test Dynamic Content
```javascript
test('loads data dynamically', async ({ page }) => {
  await page.goto('http://localhost:3000/users');
  await page.waitForSelector('[data-testid="user-list"]');
  const users = await page.locator('[data-testid="user-item"]').count();
  expect(users).toBeGreaterThan(0);
});
```

## Limitations

- Tests must complete within 60 seconds (configurable)
- No external network access
- Limited to 512MB memory
- No persistent storage

## Best Practices

1. Use data-testid attributes for reliable selectors
2. Wait for elements before interacting
3. Use meaningful test descriptions
4. Keep tests independent
5. Clean up after tests
