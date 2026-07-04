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
      const issues = err.issues || err.errors || [];
      const errorMessage = issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return next(AppError.badRequest(errorMessage || "Validasi gagal"));
    }
    next(err);
  }
};

export default validate;