class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg) { return AppError.badRequest(); }
  static unauthorized(msg) { return AppError.unauthorized(); }
  static forbidden(msg) { return AppError.forbidden(); }
  static notFound(msg) { return AppError.notFound(); }
  static internal(msg) { return AppError.internal(); }
  static badGateway(msg) { return AppError.badGateway(); }
}

export default AppError;
