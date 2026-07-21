import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

//app nya
import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiLimiter } from "./config/limiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
const swaggerSpec = yaml.parse(swaggerFile);

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const corsOptions = {
  origin: "*", 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); 

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    service: "NexTrust Backend",
    status: "running",
    docs: "/api-docs",
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/webhook")) return next();
  return apiLimiter(req, res, next);
});

app.use("/api", apiRoutes);

app.use(errorHandler);

export default app;