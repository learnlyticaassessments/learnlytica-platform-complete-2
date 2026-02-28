/**
 * Question Controller
 * Express route handlers for question API endpoints
 * @module controllers/question.controller
 */

import { Request, Response, NextFunction } from 'express';
import * as questionService from '../services/question.service';
import type { CreateQuestionDTO, UpdateQuestionDTO, QuestionFilters } from '../../shared/types/question.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: string;
  };
}

// ============================================================================
// CREATE QUESTION
// ============================================================================

export async function createQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const questionData: CreateQuestionDTO = req.body;

    const question = await questionService.createQuestion(
      req.app.locals.db,
      questionData,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

export async function runDraftTests(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { question, code, useSolution } = req.body as {
      question: CreateQuestionDTO;
      code?: string;
      useSolution?: boolean;
    };

    const result = await questionService.runDraftQuestionTests(
      req.app.locals.db,
      question,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      },
      { code, useSolution }
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function validateDraftPackage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { question } = req.body as { question: CreateQuestionDTO };

    const result = await questionService.validateDraftQuestionPackage(
      req.app.locals.db,
      question,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function importQuestionPackageZip(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file?.buffer) {
      res.status(400).json({ success: false, error: 'ZIP file is required (multipart field: file)' });
      return;
    }

    const question = await questionService.parseQuestionPackageZip(file.buffer);
    const validation = await questionService.validateDraftQuestionPackage(
      req.app.locals.db,
      question,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: {
        question,
        validation
      }
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// GET QUESTION BY ID
// ============================================================================

export async function getQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const question = await questionService.getQuestion(
      req.app.locals.db,
      id,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// GET QUESTION PREVIEW (Student View)
// ============================================================================

export async function getQuestionPreview(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const preview = await questionService.getQuestionPreview(
      req.app.locals.db,
      id,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// LIST QUESTIONS
// ============================================================================

export async function listQuestions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters: QuestionFilters = {
      category: req.query.category as any,
      problemStyle: req.query.problemStyle as any,
      technicalFocus: req.query.technicalFocus as string,
      difficulty: req.query.difficulty as any,
      status: req.query.status as any,
      curriculum: req.query.curriculum as string,
      testFramework: req.query.testFramework as any,
      search: req.query.search as string,
      createdBy: req.query.createdBy as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    };

    // Parse array query parameters
    if (req.query.skills) {
      filters.skills = Array.isArray(req.query.skills)
        ? req.query.skills as string[]
        : [req.query.skills as string];
    }

    if (req.query.tags) {
      filters.tags = Array.isArray(req.query.tags)
        ? req.query.tags as string[]
        : [req.query.tags as string];
    }

    const result = await questionService.listQuestions(
      req.app.locals.db,
      filters,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: result.questions,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listCurricula(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const curricula = await questionService.listCurricula(
      req.app.locals.db,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: curricula
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// UPDATE QUESTION
// ============================================================================

export async function updateQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData: UpdateQuestionDTO = req.body;

    const question = await questionService.updateQuestion(
      req.app.locals.db,
      id,
      updateData,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// UPDATE QUESTION STATUS
// ============================================================================

export async function updateQuestionStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const question = await questionService.updateQuestionStatus(
      req.app.locals.db,
      id,
      status,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// DELETE QUESTION
// ============================================================================

export async function deleteQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    await questionService.deleteQuestion(
      req.app.locals.db,
      id,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// CLONE QUESTION
// ============================================================================

export async function cloneQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required for cloned question' });
      return;
    }

    const question = await questionService.cloneQuestion(
      req.app.locals.db,
      id,
      title,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      }
    );

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// BULK IMPORT
// ============================================================================

export async function bulkImport(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { questions, dryRun } = req.body;

    if (!Array.isArray(questions)) {
      res.status(400).json({ error: 'Questions must be an array' });
      return;
    }

    const result = await questionService.bulkImportQuestions(
      req.app.locals.db,
      questions,
      {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userRole: req.user.role
      },
      dryRun || false
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
