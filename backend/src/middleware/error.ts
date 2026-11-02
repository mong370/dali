import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ApiError } from '../lib/ApiError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
};

function normalize(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new ApiError(422, details[0]?.message ?? 'Invalid input', 'VALIDATION_ERROR', details);
  }
  if (err instanceof multer.MulterError) return ApiError.badRequest(err.message, 'UPLOAD_ERROR');
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new ApiError(422, details[0]?.message ?? 'Invalid input', 'VALIDATION_ERROR', details);
  }
  if (err instanceof mongoose.Error.CastError) return ApiError.badRequest('Invalid identifier');
  if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000) {
    const field = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0] ?? 'value';
    return ApiError.conflict(`That ${field.split('.').pop()} is already in use`, 'DUPLICATE');
  }
  // express.json() and similar body parsers report client errors this way.
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new ApiError(status, (err as Error).message, 'BAD_REQUEST');
  }
  return new ApiError(500, 'Something went wrong on our side', 'INTERNAL_ERROR');
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const apiError = normalize(err);
  if (apiError.status >= 500) logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(apiError.status).json({
    error: { code: apiError.code, message: apiError.message, details: apiError.details },
  });
};
