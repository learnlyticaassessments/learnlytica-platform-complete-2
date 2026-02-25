# ☕ JAVA TESTING GUIDE - JUNIT 5

## ✅ **JAVA/JUNIT SUPPORT NOW FULLY INTEGRATED**

Your platform now supports comprehensive Java testing with JUnit 5!

---

## 🎯 **WHAT'S SUPPORTED**

### **Java Versions:**
```
✅ Java 17 (LTS) - Primary
✅ Java 11 (Compatible)
✅ Java 8 (Compatible with syntax adjustments)
```

### **Build Tools:**
```
✅ Maven (Primary)
✅ Gradle (Supported)
```

### **Testing Frameworks:**
```
✅ JUnit 5 (Jupiter)
✅ Mockito (Mocking)
✅ AssertJ (Assertions - optional)
```

### **What You Can Test:**
```
✅ Object-Oriented Programming
✅ Data Structures & Algorithms
✅ Collections Framework
✅ Streams & Lambda
✅ Multithreading
✅ Exception Handling
✅ File I/O (limited for security)
✅ JDBC/JPA (with H2 database)
✅ Spring Boot Applications
✅ REST APIs (Spring)
✅ Business Logic
✅ Design Patterns
```

---

## 📝 **BASIC JAVA ASSESSMENT**

### **Example 1: Simple Calculator**

**Question:**
```
Create a Calculator class with add, subtract, multiply, and divide methods.
```

**Student Code (Solution.java):**
```java
public class Solution {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
    
    public int multiply(int a, int b) {
        return a * b;
    }
    
    public double divide(int a, int b) {
        if (b == 0) {
            throw new ArithmeticException("Division by zero");
        }
        return (double) a / b;
    }
}
```

**Test Configuration:**
```json
{
  "testConfig": {
    "framework": "junit",
    "execution": {
      "timeout": 30000
    },
    "testCases": [
      {
        "id": "test-1",
        "name": "Addition works correctly",
        "points": 25,
        "testCode": "Solution calc = new Solution(); assertEquals(5, calc.add(2, 3));"
      },
      {
        "id": "test-2",
        "name": "Subtraction works correctly",
        "points": 25,
        "testCode": "Solution calc = new Solution(); assertEquals(1, calc.subtract(3, 2));"
      },
      {
        "id": "test-3",
        "name": "Multiplication works correctly",
        "points": 25,
        "testCode": "Solution calc = new Solution(); assertEquals(6, calc.multiply(2, 3));"
      },
      {
        "id": "test-4",
        "name": "Division by zero throws exception",
        "points": 25,
        "testCode": "Solution calc = new Solution(); assertThrows(ArithmeticException.class, () -> calc.divide(5, 0));"
      }
    ]
  }
}
```

---

## 🔗 **COLLECTIONS & DATA STRUCTURES**

### **Example 2: ArrayList Operations**

**Student Code:**
```java
import java.util.ArrayList;
import java.util.List;

public class Solution {
    public List<Integer> filterEvenNumbers(List<Integer> numbers) {
        List<Integer> result = new ArrayList<>();
        for (Integer num : numbers) {
            if (num % 2 == 0) {
                result.add(num);
            }
        }
        return result;
    }
    
    public int sumList(List<Integer> numbers) {
        return numbers.stream()
                     .mapToInt(Integer::intValue)
                     .sum();
    }
}
```

**Tests:**
```json
{
  "testCases": [
    {
      "name": "Filters even numbers correctly",
      "points": 30,
      "testCode": "Solution s = new Solution(); List<Integer> input = Arrays.asList(1,2,3,4,5,6); List<Integer> result = s.filterEvenNumbers(input); assertEquals(3, result.size()); assertTrue(result.contains(2));"
    },
    {
      "name": "Sums list correctly",
      "points": 20,
      "testCode": "Solution s = new Solution(); assertEquals(15, s.sumList(Arrays.asList(1,2,3,4,5)));"
    }
  ]
}
```

---

## 🌐 **SPRING BOOT REST API**

### **Example 3: REST Controller**

**Student Code:**
```java
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class Solution {
    private List<User> users = new ArrayList<>();
    
    @GetMapping
    public List<User> getAllUsers() {
        return users;
    }
    
    @PostMapping
    public User createUser(@RequestBody User user) {
        user.setId((long) (users.size() + 1));
        users.add(user);
        return user;
    }
    
    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return users.stream()
                   .filter(u -> u.getId().equals(id))
                   .findFirst()
                   .orElse(null);
    }
}

class User {
    private Long id;
    private String name;
    private String email;
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
```

**Tests:**
```json
{
  "testCases": [
    {
      "name": "GET /api/users returns empty list initially",
      "points": 20,
      "testCode": "Solution controller = new Solution(); List<User> users = controller.getAllUsers(); assertEquals(0, users.size());"
    },
    {
      "name": "POST /api/users creates user",
      "points": 30,
      "testCode": "Solution controller = new Solution(); User user = new User(); user.setName(\"John\"); user.setEmail(\"john@test.com\"); User created = controller.createUser(user); assertNotNull(created.getId()); assertEquals(\"John\", created.getName());"
    }
  ]
}
```

---

## 🧵 **MULTITHREADING**

### **Example 4: Thread-Safe Counter**

**Student Code:**
```java
public class Solution {
    private int count = 0;
    
    public synchronized void increment() {
        count++;
    }
    
    public synchronized int getCount() {
        return count;
    }
}
```

**Tests:**
```json
{
  "testCases": [
    {
      "name": "Counter increments correctly",
      "points": 25,
      "testCode": "Solution counter = new Solution(); counter.increment(); counter.increment(); assertEquals(2, counter.getCount());"
    },
    {
      "name": "Counter is thread-safe",
      "points": 25,
      "testCode": "Solution counter = new Solution(); Thread t1 = new Thread(() -> { for(int i=0; i<100; i++) counter.increment(); }); Thread t2 = new Thread(() -> { for(int i=0; i<100; i++) counter.increment(); }); t1.start(); t2.start(); t1.join(); t2.join(); assertEquals(200, counter.getCount());"
    }
  ]
}
```

---

## 💾 **DATABASE OPERATIONS (H2)**

### **Example 5: JDBC Operations**

**Student Code:**
```java
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Solution {
    private Connection connection;
    
    public Solution() throws SQLException {
        connection = DriverManager.getConnection("jdbc:h2:mem:test");
        createTable();
    }
    
    private void createTable() throws SQLException {
        String sql = "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))";
        connection.createStatement().execute(sql);
    }
    
    public void insertUser(int id, String name) throws SQLException {
        String sql = "INSERT INTO users VALUES (?, ?)";
        PreparedStatement stmt = connection.prepareStatement(sql);
        stmt.setInt(1, id);
        stmt.setString(2, name);
        stmt.executeUpdate();
    }
    
    public List<String> getAllUsers() throws SQLException {
        List<String> users = new ArrayList<>();
        String sql = "SELECT name FROM users";
        ResultSet rs = connection.createStatement().executeQuery(sql);
        while (rs.next()) {
            users.add(rs.getString("name"));
        }
        return users;
    }
}
```

**Tests:**
```json
{
  "testCases": [
    {
      "name": "Inserts user into database",
      "points": 30,
      "testCode": "Solution db = new Solution(); db.insertUser(1, \"Alice\"); List<String> users = db.getAllUsers(); assertEquals(1, users.size()); assertEquals(\"Alice\", users.get(0));"
    }
  ]
}
```

---

## 📊 **TEST RESULT FORMAT**

Java tests return detailed results:

```json
{
  "success": true,
  "testsRun": 4,
  "testsPassed": 3,
  "totalPoints": 100,
  "pointsEarned": 75,
  "results": [
    {
      "name": "Addition works correctly",
      "passed": true,
      "points": 25,
      "duration": 45,
      "className": "SolutionTest",
      "methodName": "test1"
    },
    {
      "name": "Division by zero throws exception",
      "passed": false,
      "points": 25,
      "error": "Expected ArithmeticException but got none",
      "duration": 32
    }
  ],
  "compilationErrors": null,
  "executionTime": 2340
}
```

---

## 🔐 **SECURITY RESTRICTIONS**

For security, the following are blocked:

```java
❌ Runtime.getRuntime()           // Process execution
❌ ProcessBuilder                 // Process execution
❌ System.exit()                  // VM termination
❌ java.io.File                   // File system access
❌ java.nio.file                  // File system access
❌ java.net.*                     // Network access
❌ javax.net.*                    // Network access
```

**Allowed:**
```java
✅ java.util.*                    // Collections, utilities
✅ java.sql.*                     // Database (H2 in-memory)
✅ java.time.*                    // Date/Time
✅ java.math.*                    // Math operations
✅ org.junit.*                    // Testing
✅ org.mockito.*                  // Mocking
✅ org.springframework.*          // Spring Framework
```

---

## 🚀 **ASSESSMENT TYPES**

### **Beginner Level:**
```
✅ Basic syntax (variables, loops, conditions)
✅ Methods and classes
✅ Arrays and Collections
✅ String manipulation
✅ Exception handling basics
Points: 50-100
```

### **Intermediate Level:**
```
✅ OOP concepts (inheritance, polymorphism)
✅ Interfaces and Abstract classes
✅ Collections Framework
✅ Streams and Lambda
✅ File I/O
✅ Basic multithreading
Points: 100-200
```

### **Advanced Level:**
```
✅ Design Patterns
✅ Spring Boot applications
✅ REST API development
✅ JDBC/JPA operations
✅ Advanced multithreading
✅ Performance optimization
Points: 200-500
```

---

## 💡 **BEST PRACTICES**

1. **Always provide package name** in student code if needed
2. **Use clear test descriptions** for better feedback
3. **Test edge cases** (null, empty, boundary values)
4. **Include multiple assertions** per test when appropriate
5. **Test exception handling** explicitly
6. **Use meaningful variable names** in tests

---

## ✅ **WHAT MAKES THIS POWERFUL**

```
Real JUnit 5 Execution    ✅ Not simulated
Maven Build System        ✅ Industry standard
Actual Compilation        ✅ Real compiler errors
Spring Boot Support       ✅ Enterprise frameworks
H2 Database              ✅ In-memory SQL testing
Mockito Support          ✅ Professional mocking
Production-Grade         ✅ Enterprise ready
```

---

**☕ Java support is now FULLY INTEGRATED into your platform!**

**Students can write real Java code, get real JUnit test results, and receive accurate scores!**

---

*Java Testing Guide*
*JUnit 5 Integration*
*Version: 1.0.0*
*Status: Production Ready ✅*
