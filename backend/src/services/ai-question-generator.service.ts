/**
 * AI Question Generator Service
 * Uses Claude AI to generate complete programming questions
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface GenerateQuestionRequest {
  topic: string;
  language: 'javascript' | 'python' | 'java';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionType: 'algorithm' | 'api' | 'component' | 'database' | 'fullstack';
  points?: number;
  timeLimit?: number;
  provider?: 'claude' | 'gpt';
  model?: string;
  curriculumText?: string;
  audienceType?: 'fresher' | 'experienced' | 'mixed';
  audienceExperience?: string;
  targetMaturity?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  domain?: string;
  audienceNotes?: string;
  rubric?: {
    basicWeight?: number;
    edgeWeight?: number;
    negativeWeight?: number;
    performanceWeight?: number;
    hiddenTestPercent?: number;
    passingPercent?: number;
    totalPoints?: number;
  };
}

export interface AIProviderOptions {
  provider?: 'claude' | 'gpt';
  model?: string;
}

export interface GeneratedQuestion {
  title: string;
  category: string;
  difficulty: string;
  points: number;
  timeLimit: number;
  description: string;
  testConfig: {
    framework: string;
    execution: {
      timeout: number;
    };
    testCases: Array<{
      id: string;
      name: string;
      points: number;
      testCode: string;
    }>;
  };
  starterCode: {
    files: Array<{
      name: string;
      content: string;
    }>;
  };
  solution: string;
  hints: string[];
  tags: string[];
}

function cleanJsonBlock(input: string): string {
  let cleaned = String(input || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

function resolveProvider(request: GenerateQuestionRequest): 'claude' | 'gpt' {
  return request.provider === 'gpt' ? 'gpt' : 'claude';
}

async function generateWithClaude(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
  if (!anthropic) {
    throw new Error('Claude provider is not configured. Set ANTHROPIC_API_KEY.');
  }

  const message = await anthropic.messages.create({
    model: model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  return message.content[0]?.type === 'text' ? message.content[0].text : '';
}

async function generateWithGpt(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GPT provider is not configured. Set OPENAI_API_KEY.');
  }

  const fetchFn = (globalThis as any).fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime.');
  }

  const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${body.slice(0, 400)}`);
  }

  const json = await response.json();
  return json?.choices?.[0]?.message?.content || '';
}

/**
 * Generate a complete question using Claude AI
 */
export async function generateQuestion(
  request: GenerateQuestionRequest
): Promise<GeneratedQuestion> {
  
  const systemPrompt = `You are an expert educator creating programming assessment questions.

Your task is to generate a complete, production-ready coding question with comprehensive test cases.

CRITICAL: Return ONLY valid JSON matching this exact schema, with no markdown formatting, no code blocks, no explanations:

{
  "title": "string (clear, concise question title)",
  "category": "string (algorithms, backend, frontend, database, fullstack)",
  "difficulty": "string (beginner, intermediate, advanced)",
  "points": number (50-100 for beginner, 100-300 for intermediate, 300-500 for advanced),
  "timeLimit": number (minutes: 15-30 for beginner, 30-60 for intermediate, 60-120 for advanced),
  "description": "string (markdown formatted with Requirements, Constraints, Examples sections)",
  "testConfig": {
    "framework": "string (jest for JS, pytest for Python, junit for Java)",
    "execution": {
      "timeout": number (milliseconds, typically 30000)
    },
    "testCases": [
      {
        "id": "string (test-1, test-2, etc)",
        "name": "string (descriptive test name)",
        "file": "string (test file path)",
        "testName": "string (stable test identifier)",
        "points": number (distribute total points across 6-10 tests),
        "visible": "boolean (true for learner-visible test, false for hidden)",
        "category": "string (basic | edge | negative | performance)",
        "testCode": "string (actual test code that will run)"
      }
    ]
  },
  "starterCode": {
    "files": [
      {
        "name": "string (solution.js, solution.py, Solution.java)",
        "content": "string (function signature with TODO comment)"
      }
    ]
  },
  "solution": "string (complete working solution for validation)",
  "hints": ["string (3 progressive hints)"],
  "tags": ["string (relevant tags)"]
}

REQUIREMENTS:
1. Generate 6-10 comprehensive test cases with this distribution:
   - basic/happy-path: at least 2
   - edge cases: at least 2
   - negative/invalid-input: at least 1
   - performance/scalability: at least 1
2. Visibility mix:
   - visible=true: 60-70% of tests
   - visible=false: 30-40% of tests (must include at least 1 hidden edge or performance test)

3. Test code must be actual executable code for the specified framework
4. Description must include clear examples with input/output
5. Starter code should have helpful comments
6. Solution must be complete and working
7. All points must sum to the total points value`;

  const audienceBlock = [
    `Audience Type: ${request.audienceType || 'mixed'}`,
    `Audience Experience: ${request.audienceExperience || 'not specified'}`,
    `Target Maturity: ${request.targetMaturity || request.difficulty}`,
    `Domain: ${request.domain || 'general software'}`
  ].join('\n');

  const curriculumBlock = request.curriculumText
    ? `Curriculum Context (must align to this):\n${request.curriculumText.slice(0, 8000)}`
    : 'Curriculum Context: not provided';

  const notesBlock = request.audienceNotes
    ? `Additional Notes:\n${request.audienceNotes}`
    : 'Additional Notes: none';

  const rubric = request.rubric || {};
  const rubricBlock = [
    'Rubric Guidance (must influence test/score design):',
    `- totalPoints: ${rubric.totalPoints ?? request.points ?? 'auto'}`,
    `- passingPercent: ${rubric.passingPercent ?? 60}`,
    `- hiddenTestPercent target: ${rubric.hiddenTestPercent ?? 35}%`,
    `- category weights: basic=${rubric.basicWeight ?? 40}, edge=${rubric.edgeWeight ?? 25}, negative=${rubric.negativeWeight ?? 20}, performance=${rubric.performanceWeight ?? 15}`
  ].join('\n');

  const userPrompt = `Generate a ${request.difficulty} ${request.language} question about: ${request.topic}

Question Type: ${request.questionType}
Target Points: ${request.points || 'auto-determine based on difficulty'}
Time Limit: ${request.timeLimit || 'auto-determine based on difficulty'} minutes
${audienceBlock}

${curriculumBlock}

${notesBlock}

${rubricBlock}

Create a complete question with comprehensive test cases that students can solve.
Ensure tone, complexity, naming, and acceptance criteria fit the audience profile and domain.
If curriculum context is provided, align problem statement and skills directly to it.`;

  try {
    const provider = resolveProvider(request);
    const responseText = provider === 'gpt'
      ? await generateWithGpt(systemPrompt, userPrompt, request.model)
      : await generateWithClaude(systemPrompt, userPrompt, request.model);

    const cleanedResponse = cleanJsonBlock(responseText);

    // Parse JSON
    const question: GeneratedQuestion = JSON.parse(cleanedResponse);

    // Validate required fields
    if (!question.title || !question.testConfig || !question.testConfig.testCases) {
      throw new Error('Invalid question structure generated');
    }

    return question;

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    throw new Error(`Failed to generate question: ${error.message}`);
  }
}

/**
 * Generate test cases for existing code
 */
export async function generateTestCases(
  code: string,
  language: string,
  description?: string,
  options?: AIProviderOptions
): Promise<any[]> {
  
  const systemPrompt = `Generate comprehensive test cases for the provided code.

Return ONLY valid JSON array with no markdown:
[
  {
    "id": "test-1",
    "name": "descriptive name",
    "points": 15,
    "testCode": "actual executable test code"
  }
]

Include:
- Happy path tests
- Edge cases (empty, null, single element, large input)
- Error cases
- Performance tests`;

  const userPrompt = `Language: ${language}
${description ? `Description: ${description}` : ''}

Code:
\`\`\`
${code}
\`\`\`

Generate 8 comprehensive test cases.`;

  try {
    const responseText = options?.provider === 'gpt'
      ? await generateWithGpt(systemPrompt, userPrompt, options.model)
      : await generateWithClaude(systemPrompt, userPrompt, options?.model);

    const cleaned = cleanJsonBlock(responseText || '[]');

    return JSON.parse(cleaned);

  } catch (error: any) {
    throw new Error(`Failed to generate test cases: ${error.message}`);
  }
}

/**
 * Improve existing question
 */
export async function improveQuestion(
  existingQuestion: any,
  options?: AIProviderOptions
): Promise<any> {
  
  const systemPrompt = `Analyze and improve the provided question.

Return ONLY valid JSON with improvements:
{
  "improvedDescription": "better description",
  "additionalTestCases": [...],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "improvedStarterCode": "better starter code"
}`;

  const userPrompt = `Improve this question:
${JSON.stringify(existingQuestion, null, 2)}

Suggest:
1. Clearer description
2. Additional edge case tests
3. Better starter code
4. Any missing requirements`;

  try {
    const responseText = options?.provider === 'gpt'
      ? await generateWithGpt(systemPrompt, userPrompt, options.model)
      : await generateWithClaude(systemPrompt, userPrompt, options?.model);

    const cleaned = cleanJsonBlock(responseText || '{}');

    return JSON.parse(cleaned);

  } catch (error: any) {
    throw new Error(`Failed to improve question: ${error.message}`);
  }
}

/**
 * Review student code and provide feedback
 */
export async function reviewStudentCode(
  code: string,
  testResults: any,
  question: any,
  options?: AIProviderOptions
): Promise<any> {
  
  const systemPrompt = `Review student code and provide constructive feedback.

Return ONLY valid JSON:
{
  "overall": "string (overall assessment)",
  "correctness": "string (correctness feedback)",
  "performance": "string (performance analysis)",
  "codeQuality": "string (code quality feedback)",
  "bestPractices": "string (best practices suggestions)",
  "suggestions": ["specific improvements"]
}`;

  const userPrompt = `Question: ${question.title}

Student Code:
\`\`\`
${code}
\`\`\`

Test Results:
- Tests Passed: ${testResults.testsPassed}/${testResults.testsRun}
- Score: ${testResults.pointsEarned}/${testResults.totalPoints}

Provide constructive feedback on correctness, performance, code quality, and best practices.`;

  try {
    const responseText = options?.provider === 'gpt'
      ? await generateWithGpt(systemPrompt, userPrompt, options.model)
      : await generateWithClaude(systemPrompt, userPrompt, options?.model);

    const cleaned = cleanJsonBlock(responseText || '{}');

    return JSON.parse(cleaned);

  } catch (error: any) {
    throw new Error(`Failed to review code: ${error.message}`);
  }
}
