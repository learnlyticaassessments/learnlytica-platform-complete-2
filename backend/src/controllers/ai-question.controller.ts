/**
 * AI Question Controller
 * Handles HTTP requests for AI-powered question generation
 */

import { Request, Response } from 'express';
import {
  generateQuestion,
  generateTestCases,
  improveQuestion,
  reviewStudentCode
} from '../services/ai-question-generator.service';
import { createQuestion } from '../services/question.service';

/**
 * POST /api/v1/ai/generate-question
 * Generate a complete question using AI
 */
export async function generateQuestionHandler(req: Request, res: Response) {
  try {
    const { topic, language, difficulty, questionType, points, timeLimit } = req.body;

    if (!topic || !language || !difficulty || !questionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic, language, difficulty, questionType'
      });
    }

    // Generate question using AI
    const generatedQuestion = await generateQuestion({
      topic,
      language,
      difficulty,
      questionType,
      points,
      timeLimit
    });

    res.json({
      success: true,
      data: generatedQuestion,
      message: 'Question generated successfully'
    });

  } catch (error: any) {
    console.error('Generate Question Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate question'
    });
  }
}

/**
 * POST /api/v1/ai/generate-and-create
 * Generate question with AI and save to database
 */
export async function generateAndCreateHandler(req: Request, res: Response) {
  try {
    const { topic, language, difficulty, questionType, points, timeLimit } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Generate question
    const generated = await generateQuestion({
      topic,
      language,
      difficulty,
      questionType,
      points,
      timeLimit
    });

    // Create in database
    const question = await createQuestion(
      (req as any).db,
      {
        title: generated.title,
        category: generated.category,
        difficulty: generated.difficulty,
        points: generated.points,
        timeLimit: generated.timeLimit,
        description: generated.description,
        testConfig: generated.testConfig,
        starterCode: generated.starterCode,
        hints: generated.hints,
        tags: generated.tags,
        status: 'draft'
      } as any,
      {
        userId,
        organizationId,
        userRole: 'admin'
      }
    );

    res.status(201).json({
      success: true,
      data: {
        question,
        generatedSolution: generated.solution
      },
      message: 'Question generated and created successfully'
    });

  } catch (error: any) {
    console.error('Generate and Create Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate and create question'
    });
  }
}

/**
 * POST /api/v1/ai/generate-tests
 * Generate test cases for existing code
 */
export async function generateTestsHandler(req: Request, res: Response) {
  try {
    const { code, language, description } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, language'
      });
    }

    const testCases = await generateTestCases(code, language, description);

    res.json({
      success: true,
      data: testCases,
      message: 'Test cases generated successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/ai/improve-question
 * Get suggestions to improve existing question
 */
export async function improveQuestionHandler(req: Request, res: Response) {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question data required'
      });
    }

    const improvements = await improveQuestion(question);

    res.json({
      success: true,
      data: improvements,
      message: 'Improvements generated successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/ai/review-code
 * Review student code submission
 */
export async function reviewCodeHandler(req: Request, res: Response) {
  try {
    const { code, testResults, question } = req.body;

    if (!code || !testResults || !question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, testResults, question'
      });
    }

    const review = await reviewStudentCode(code, testResults, question);

    res.json({
      success: true,
      data: review,
      message: 'Code review completed'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
