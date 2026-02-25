# 🔌 API TESTING FRAMEWORK GUIDE

## ✅ **COMPREHENSIVE API TESTING SUPPORT**

Test REST APIs with Supertest (Node.js) and Pytest-Requests (Python)

---

## 📦 **Supported Frameworks**

### **1. Supertest** (Node.js/Express APIs)
- Test Express.js applications
- REST API endpoint testing
- Request/Response validation
- Status code checking
- JSON body validation

### **2. Pytest-Requests** (Python/Flask/FastAPI APIs)
- Test Flask applications
- Test FastAPI applications
- REST API endpoint testing
- Request/Response validation
- JSON body validation

---

## 🎯 **Use Cases**

### **Backend Developer Assessments:**
- Build REST API endpoints
- Implement CRUD operations
- Handle authentication
- Data validation
- Error handling

### **Full-Stack Assessments:**
- Build complete backend
- Connect to database
- Implement API logic
- Test with real HTTP requests

---

## 🚀 **Supertest Examples (Node.js)**

### **Example 1: Test GET Endpoint**

```javascript
// Question: Create a /users endpoint that returns all users

// Student's Express App (app.js):
const express = require('express');
const app = express();

app.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

module.exports = app;

// Test Case Configuration:
{
  "testConfig": {
    "framework": "supertest",
    "testCases": [
      {
        "id": "test-1",
        "name": "GET /users returns 200",
        "points": 25,
        "method": "GET",
        "endpoint": "/users",
        "expectedStatus": 200
      },
      {
        "id": "test-2",
        "name": "GET /users returns array",
        "points": 25,
        "testCode": `
          const response = await request(app).get('/users');
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        `
      }
    ]
  }
}
```

### **Example 2: Test POST Endpoint**

```javascript
// Question: Create POST /users endpoint to create user

// Student's Implementation:
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = { id: Date.now(), name, email };
  res.status(201).json(newUser);
});

// Test Cases:
{
  "testCases": [
    {
      "name": "POST /users creates user",
      "points": 30,
      "method": "POST",
      "endpoint": "/users",
      "body": { "name": "Alice", "email": "alice@test.com" },
      "expectedStatus": 201
    },
    {
      "name": "POST /users returns created user",
      "points": 20,
      "testCode": `
        const response = await request(app)
          .post('/users')
          .send({ name: 'Bob', email: 'bob@test.com' });
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Bob');
      `
    }
  ]
}
```

### **Example 3: Test PUT/PATCH Endpoint**

```javascript
// Test Cases:
{
  "testCases": [
    {
      "name": "PUT /users/:id updates user",
      "points": 25,
      "testCode": `
        const response = await request(app)
          .put('/users/1')
          .send({ name: 'Updated Name' });
        
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Name');
      `
    }
  ]
}
```

### **Example 4: Test DELETE Endpoint**

```javascript
{
  "testCases": [
    {
      "name": "DELETE /users/:id removes user",
      "points": 25,
      "testCode": `
        const response = await request(app).delete('/users/1');
        expect(response.status).toBe(204);
      `
    }
  ]
}
```

### **Example 5: Test Authentication**

```javascript
{
  "testCases": [
    {
      "name": "Protected route requires auth",
      "points": 30,
      "testCode": `
        const response = await request(app).get('/protected');
        expect(response.status).toBe(401);
      `
    },
    {
      "name": "Valid token grants access",
      "points": 30,
      "testCode": `
        const response = await request(app)
          .get('/protected')
          .set('Authorization', 'Bearer validtoken');
        expect(response.status).toBe(200);
      `
    }
  ]
}
```

---

## 🐍 **Pytest-Requests Examples (Python)**

### **Example 1: Test Flask GET Endpoint**

```python
# Student's Flask App (app.py):
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/users')
def get_users():
    return jsonify([
        {'id': 1, 'name': 'John Doe'},
        {'id': 2, 'name': 'Jane Smith'}
    ])

# Test Cases:
{
  "testConfig": {
    "framework": "pytest-requests",
    "testCases": [
      {
        "id": "test_1",
        "name": "GET /users returns 200",
        "points": 25,
        "method": "GET",
        "endpoint": "/users",
        "expectedStatus": 200
      },
      {
        "id": "test_2",
        "name": "GET /users returns users",
        "points": 25,
        "testCode": `
          response = client.get('/users')
          assert response.status_code == 200
          data = response.json()
          assert isinstance(data, list)
          assert len(data) > 0
        `
      }
    ]
  }
}
```

### **Example 2: Test FastAPI POST Endpoint**

```python
# Student's FastAPI App:
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    name: str
    email: str

@app.post('/users', status_code=201)
def create_user(user: User):
    return {**user.dict(), 'id': 1}

# Test Cases:
{
  "testCases": [
    {
      "name": "POST /users creates user",
      "points": 30,
      "method": "POST",
      "endpoint": "/users",
      "body": {"name": "Alice", "email": "alice@test.com"},
      "expectedStatus": 201
    }
  ]
}
```

---

## 📊 **Test Result Format**

API tests return detailed metrics:

```json
{
  "success": true,
  "testsRun": 5,
  "testsPassed": 4,
  "totalPoints": 100,
  "pointsEarned": 80,
  "results": [
    {
      "name": "GET /users returns 200",
      "passed": true,
      "points": 20,
      "duration": 45,
      "statusCode": 200,
      "responseTime": 42
    },
    {
      "name": "POST /users creates user",
      "passed": false,
      "points": 20,
      "error": "Expected status 201, got 400",
      "statusCode": 400,
      "responseTime": 38
    }
  ],
  "apiMetrics": {
    "averageResponseTime": 85,
    "totalRequests": 5,
    "successfulRequests": 4
  }
}
```

---

## 🎯 **Assessment Examples**

### **Beginner: Simple CRUD API**
- Create GET /items endpoint
- Create POST /items endpoint
- Return proper status codes
- **Points:** 100

### **Intermediate: User Management API**
- Full CRUD for users
- Input validation
- Error handling
- Authentication middleware
- **Points:** 200

### **Advanced: E-Commerce API**
- Products, Cart, Orders endpoints
- Authentication & Authorization
- Payment processing
- Order history
- **Points:** 500

---

## 🔐 **Security**

- ✅ Network disabled (can't call external APIs)
- ✅ CPU limited (1 core)
- ✅ Memory limited (512MB)
- ✅ 30-second timeout
- ✅ Automatic cleanup

---

## ⚡ **Performance Metrics**

Tests include:
- Response time (per request)
- Average response time
- Total requests made
- Successful vs failed requests
- Test duration

---

## 💡 **Best Practices**

1. **Test status codes first** - Verify endpoint exists
2. **Test response structure** - Check JSON schema
3. **Test edge cases** - Invalid input, missing fields
4. **Test error handling** - 400, 404, 500 responses
5. **Test authentication** - Protected routes
6. **Keep tests independent** - No shared state

---

## ✅ **Complete Framework Support**

```
Unit Tests:
├── Jest        (JavaScript)
└── Pytest      (Python)

E2E Tests:
└── Playwright  (Browser automation)

API Tests: ✨ NEW
├── Supertest        (Node.js/Express)
└── Pytest-Requests  (Python/Flask/FastAPI)

Coverage: Complete Stack! 🎉
```

---

**Now you can test backend APIs with real HTTP requests!** 🔌

---

*API Testing Framework*  
*Added to Module 4*  
*Version: 1.0.0*  
*Status: Production Ready ✅*
