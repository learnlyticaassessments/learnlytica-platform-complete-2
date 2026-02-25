# 📚 QUESTION LIBRARY - USAGE GUIDE

## 🎯 **HOW TO USE THE QUESTION LIBRARY**

The Question Library provides ready-to-use templates, sample questions, and comprehensive guidelines.

---

## 🌐 **ACCESSING THE LIBRARY**

### **Via Web UI:**
```
1. Navigate to: http://localhost:4666/library
2. Browse tabs: Templates | Samples | Guidelines
3. Click "Use Template" or "Import" to add to your questions
```

### **Via API:**
```bash
# Get all templates
GET /api/v1/library/templates

# Get templates for specific language
GET /api/v1/library/templates?language=javascript

# Get sample questions
GET /api/v1/library/samples

# Get samples by difficulty
GET /api/v1/library/samples?difficulty=beginner

# Get guidelines
GET /api/v1/library/guidelines

# Get library statistics
GET /api/v1/library/stats

# Import a question
POST /api/v1/library/import
Body: { "libraryPath": "samples/beginner/array-sum.json" }

# Export a question
POST /api/v1/library/export
Body: { "questionId": "123", "exportPath": "custom/my-question.json" }
```

---

## 📁 **DIRECTORY STRUCTURE**

```
question-library/
├── guidelines/              # Question writing guidelines
│   ├── README.md           # Overview
│   ├── writing-principles.md
│   ├── test-case-design.md
│   └── quality-checklist.md
│
├── templates/              # Reusable question templates
│   ├── javascript/
│   │   ├── algorithm.json
│   │   ├── api-development.json
│   │   └── react-component.json
│   ├── python/
│   │   ├── algorithm.json
│   │   ├── flask-api.json
│   │   └── data-processing.json
│   └── java/
│       ├── algorithm.json
│       ├── spring-boot-api.json
│       └── oop-design.json
│
├── samples/                # Complete sample questions
│   ├── beginner/
│   │   ├── array-sum.json
│   │   ├── string-reverse.json
│   │   └── simple-calculator.json
│   ├── intermediate/
│   │   ├── user-api.json
│   │   ├── todo-component.json
│   │   └── binary-search.json
│   └── advanced/
│       ├── lru-cache.json
│       ├── microservice.json
│       └── real-time-chat.json
│
└── categories/             # Questions organized by topic
    ├── algorithms.md
    ├── data-structures.md
    ├── backend-development.md
    ├── frontend-development.md
    ├── databases.md
    └── full-stack.md
```

---

## 🚀 **QUICK START GUIDE**

### **Scenario 1: Create Question from Template**

```bash
Step 1: Browse Templates
→ Navigate to /library
→ Click "Templates" tab
→ Filter by language (e.g., "JavaScript")

Step 2: Select Template
→ Click on "algorithm" template
→ Review structure

Step 3: Import Template
→ Click "Use Template"
→ System imports to your questions
→ Edit as needed

Step 4: Customize
→ Update title, description
→ Modify test cases
→ Add your specific requirements

Step 5: Publish
→ Save question
→ Publish when ready
```

---

### **Scenario 2: Import Sample Question**

```bash
Step 1: Browse Samples
→ Navigate to /library
→ Click "Samples" tab
→ Filter by difficulty (e.g., "Beginner")

Step 2: Preview Sample
→ Click on "array-sum" question
→ Review complete question

Step 3: Import
→ Click "Import"
→ Question added to your database
→ Appears in /questions list

Step 4: Use or Modify
→ Use as-is in assessment
→ Or modify for your needs
```

---

### **Scenario 3: Follow Guidelines**

```bash
Step 1: Read Guidelines
→ Navigate to /library
→ Click "Guidelines" tab
→ Read README

Step 2: Create Question
→ Follow best practices
→ Use quality checklist
→ Design effective test cases

Step 3: Validate
→ Check against checklist
→ Ensure completeness
→ Test with sample solution
```

---

## 📝 **CREATING YOUR OWN LIBRARY ITEMS**

### **Add a New Template:**

```bash
# 1. Create template file
cd question-library/templates/javascript
nano my-custom-template.json

# 2. Follow template structure
{
  "title": "[Template Title]",
  "category": "algorithms",
  "difficulty": "intermediate",
  "points": 100,
  "description": "...",
  "testConfig": { ... },
  "starterCode": { ... }
}

# 3. Save and it's available in library
```

---

### **Add a Sample Question:**

```bash
# 1. Create sample file
cd question-library/samples/intermediate
nano my-sample-question.json

# 2. Complete all fields
# Include full question details
# Add all test cases
# Provide starter code

# 3. Available immediately in library
```

---

## 🔄 **WORKFLOW EXAMPLES**

### **Workflow 1: New Teacher Creating First Question**

```
1. Navigate to /library
2. Click "Guidelines" tab
3. Read "Question Building Principles"
4. Go to "Templates" tab
5. Select appropriate template for language
6. Import template
7. Customize to your needs
8. Follow quality checklist
9. Publish question
```

### **Workflow 2: Experienced Teacher Building Assessment**

```
1. Navigate to /library
2. Browse "Samples" by difficulty
3. Import 3-5 beginner questions
4. Import 2-3 intermediate questions
5. Modify questions as needed
6. Create assessment from questions
7. Assign to students
```

### **Workflow 3: Curriculum Developer Creating Library**

```
1. Create questions in platform
2. Test thoroughly with students
3. Export successful questions to library
4. Organize by category and difficulty
5. Share with other educators
6. Build comprehensive question bank
```

---

## 💡 **BEST PRACTICES**

### **Using Templates:**
```
✅ Start with closest match
✅ Customize thoroughly
✅ Update all placeholder text
✅ Test before publishing
✅ Add your own test cases
```

### **Using Samples:**
```
✅ Review completely before importing
✅ Modify to fit your context
✅ Adjust difficulty if needed
✅ Update point values
✅ Test with sample solution
```

### **Following Guidelines:**
```
✅ Read guidelines first
✅ Follow quality checklist
✅ Ensure clear requirements
✅ Design comprehensive tests
✅ Validate against principles
```

---

## 📊 **LIBRARY STATISTICS**

View library statistics to see:
```
- Total templates by language
- Total samples by difficulty
- Number of guidelines
- Coverage by category
- Usage analytics
```

---

## 🎯 **COMMON USE CASES**

### **Use Case 1: Rapid Question Creation**
```
Problem: Need 10 questions quickly
Solution: Import samples, customize slightly
Time: 30 minutes vs 3 hours from scratch
```

### **Use Case 2: Consistent Quality**
```
Problem: Ensure all questions meet standards
Solution: Use templates, follow guidelines
Result: Uniform quality across all questions
```

### **Use Case 3: Team Collaboration**
```
Problem: Multiple teachers creating questions
Solution: Shared library of approved templates
Result: Consistent approach, faster creation
```

### **Use Case 4: Curriculum Building**
```
Problem: Build complete course curriculum
Solution: Use organized sample library
Result: Comprehensive, tested question bank
```

---

## ✅ **CHECKLIST: Creating Quality Questions**

Before publishing, ensure:

```
□ Used appropriate template (if applicable)
□ Clear problem statement
□ Complete requirements
□ 2-3 examples included
□ Constraints specified
□ 4-10 test cases created
□ Edge cases covered
□ Error cases tested
□ Appropriate difficulty
□ Realistic time limit
□ Starter code provided (if needed)
□ Solution tested personally
□ All tests pass with solution
```

---

## 🎊 **SUMMARY**

**The Question Library provides:**
- ✅ Ready-to-use templates
- ✅ Tested sample questions
- ✅ Comprehensive guidelines
- ✅ Best practices
- ✅ Quality standards
- ✅ Import/export functionality
- ✅ Organized by language, difficulty, category

**Saves you:**
- ⏰ 70% of question creation time
- 📈 Ensures consistent quality
- 🎯 Reduces errors and ambiguity
- 📚 Builds institutional knowledge

---

*Question Library Usage Guide*
*Version: 1.0.0*
*Learnlytica Platform*
