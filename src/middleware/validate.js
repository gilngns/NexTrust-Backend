import { ZodError } from "zod";
import AppError from "../utils/AppError.js";

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
      const errorMessage = err.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return next(AppError.badRequest());
    }
    next(err);
  }
};

export default validate;
