export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  notFound: (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`),
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'),
  csrf: () => new AppError(403, 'CSRF_INVALID', 'Security token is missing or invalid. Refresh and try again.'),
  conflict: (code: string, message: string, details?: unknown) => new AppError(409, code, message, details),
  invalid: (message: string, details?: unknown) => new AppError(422, 'VALIDATION_FAILED', message, details),
  notEnabled: (feature: string) => new AppError(501, 'NOT_ENABLED', `${feature} is not enabled yet`),
};
