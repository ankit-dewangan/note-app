import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail: Joi.ValidationErrorItem) => detail.message)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessage,
      });
    }

    req.body = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail: Joi.ValidationErrorItem) => detail.message)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: errorMessage,
      });
    }

    req.params = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail: Joi.ValidationErrorItem) => detail.message)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: errorMessage,
      });
    }

    req.query = value;
    next();
  };
}

// Common validation schemas
export const noteSchemas = {
  create: Joi.object({
    title: Joi.string().required().min(1).max(200).trim(),
    content: Joi.string().required(),
    collaborators: Joi.array().items(Joi.string().email()).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200).trim().optional(),
    content: Joi.string().optional(),
    collaborators: Joi.array().items(Joi.string().email()).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    isArchived: Joi.boolean().optional(),
  }),

  id: Joi.object({
    id: Joi.string().required().min(1),
  }),
};

export const searchSchemas = {
  query: Joi.object({
    query: Joi.string().required().min(1).max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    collaborators: Joi.array().items(Joi.string().email()).optional(),
  }),
};

export const fileSchemas = {
  upload: Joi.object({
    filename: Joi.string().required(),
    originalName: Joi.string().required(),
    mimeType: Joi.string().required(),
    size: Joi.number().integer().min(1).max(100 * 1024 * 1024), // 100MB max
    noteId: Joi.string().optional(),
  }),

  id: Joi.object({
    id: Joi.string().required().min(1),
  }),
};

export const collaboratorSchemas = {
  add: Joi.object({
    email: Joi.string().email().required(),
    permissions: Joi.string().valid('read', 'write', 'admin').default('write'),
  }),

  remove: Joi.object({
    noteId: Joi.string().required(),
    userId: Joi.string().required(),
  }),
}; 