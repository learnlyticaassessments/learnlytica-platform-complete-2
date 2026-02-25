/**
 * Question Library Controller
 * Handles HTTP requests for question library operations
 */

import { Request, Response } from 'express';
import {
  getTemplates,
  getSamples,
  getGuidelines,
  importQuestionFromLibrary,
  exportQuestionToLibrary,
  getLibraryStats
} from '../services/question-library.service';

/**
 * GET /api/v1/library/templates
 * Get all templates or filter by language
 */
export async function getTemplatesHandler(req: Request, res: Response) {
  try {
    const { language } = req.query;
    const templates = await getTemplates(language as string);

    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v1/library/samples
 * Get sample questions by difficulty
 */
export async function getSamplesHandler(req: Request, res: Response) {
  try {
    const { difficulty } = req.query;
    const samples = await getSamples(difficulty as string);

    res.json({
      success: true,
      data: samples
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v1/library/guidelines
 * Get all guidelines documentation
 */
export async function getGuidelinesHandler(req: Request, res: Response) {
  try {
    const guidelines = await getGuidelines();

    res.json({
      success: true,
      data: guidelines
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/library/import
 * Import a question from library to database
 */
export async function importQuestionHandler(req: Request, res: Response) {
  try {
    const { libraryPath } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!libraryPath) {
      return res.status(400).json({
        success: false,
        error: 'Library path is required'
      });
    }

    const question = await importQuestionFromLibrary(
      (req as any).db,
      libraryPath,
      userId,
      organizationId
    );

    res.status(201).json({
      success: true,
      data: question,
      message: 'Question imported successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/v1/library/export
 * Export a question from database to library
 */
export async function exportQuestionHandler(req: Request, res: Response) {
  try {
    const { questionId, exportPath } = req.body;

    if (!questionId || !exportPath) {
      return res.status(400).json({
        success: false,
        error: 'Question ID and export path are required'
      });
    }

    const filePath = await exportQuestionToLibrary(
      (req as any).db,
      questionId,
      exportPath
    );

    res.json({
      success: true,
      data: { filePath },
      message: 'Question exported successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v1/library/stats
 * Get library statistics
 */
export async function getLibraryStatsHandler(req: Request, res: Response) {
  try {
    const stats = await getLibraryStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
