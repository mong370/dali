export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown) =>
    new ApiError(400, message, code, details);
  static unauthorized = (message = 'Please sign in to continue', code = 'UNAUTHORIZED') =>
    new ApiError(401, message, code);
  static forbidden = (message = 'You do not have access to this resource') =>
    new ApiError(403, message, 'FORBIDDEN');
  static notFound = (message = 'Not found') => new ApiError(404, message, 'NOT_FOUND');
  static conflict = (message: string, code = 'CONFLICT', details?: unknown) =>
    new ApiError(409, message, code, details);
}
