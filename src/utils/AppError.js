class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Bad Request") {
    return new AppError(msg, 400);
  }
  static unauthorized(msg = "Unauthorized") {
    return new AppError(msg, 401);
  }
  static forbidden(msg = "Forbidden") {
    return new AppError(msg, 403);
  }
  static notFound(msg = "Not Found") {
    return new AppError(msg, 404);
  }
  static internal(msg = "Internal Server Error") {
    return new AppError(msg, 500);
  }
  static badGateway(msg = "Bad Gateway") {
    return new AppError(msg, 502);
  }
}

export default AppError;