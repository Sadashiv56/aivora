export class ApiError extends Error {
  constructor(statusCode, message, code = "INTERNAL_ERROR", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST", errors = []) {
    return new ApiError(400, message, code, errors);
  }
  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }
  static conflict(message = "Conflict", code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
  static invalid(msg, code, errors) {
    return new ApiError(400, msg, code, errors);
  }
}