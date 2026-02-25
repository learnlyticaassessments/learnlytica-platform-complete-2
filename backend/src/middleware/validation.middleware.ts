/**
 * Validation Middleware
 * @module middleware/validation.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validate request data against Zod schema
 */
export function validateRequest(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : 
                   source === 'query' ? req.query : 
                   req.params;

      const result = schema.safeParse(data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
        return;
      }

      // Replace with validated data
      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'query') {
        req.query = result.data as any;
      } else {
        req.params = result.data;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Validation error'
      });
    }
  };
}
