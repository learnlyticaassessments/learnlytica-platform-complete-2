/**
 * Error Handling Middleware
 * Global error handler for Express application
 * @module middleware/error.middleware
 */

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  // Question-related errors
  if (error.name === 'QuestionNotFoundError') {
    res.status(404).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.name === 'QuestionValidationError') {
    res.status(400).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.name === 'QuestionSlugExistsError') {
    res.status(409).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Lab Template errors
  if (error.name === 'LabTemplateNotFoundError') {
    res.status(404).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.name === 'LabTemplateValidationError') {
    res.status(400).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.name === 'LabTemplateInUseError') {
    res.status(409).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Assessment errors
  if (error.name === 'AssessmentNotFoundError') {
    res.status(404).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.name === 'AssessmentValidationError') {
    res.status(400).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Authorization errors
  if (error.name === 'UnauthorizedError') {
    res.status(403).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Zod validation errors
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
