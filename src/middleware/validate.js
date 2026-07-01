const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errorMessage = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }
    next(err);
  }
};

module.exports = validate;
