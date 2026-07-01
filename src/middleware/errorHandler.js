const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || 400;
  let message = err.message || "Internal server error";

  if (
    err.name === "PrismaClientKnownRequestError" || 
    err.name === "PrismaClientUnknownRequestError" ||
    err.name === "PrismaClientInitializationError"
  ) {
    statusCode = 500;
    message = "Database error occurred";
  } else if (!err.isOperational && statusCode === 500) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({ 
    ok: false, 
    error: message 
  });
};

module.exports = errorHandler;
