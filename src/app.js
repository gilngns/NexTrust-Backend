import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import limiter from "./config/limiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
const swaggerSpec = yaml.parse(swaggerFile);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

app.get("/", (req, res) => {
  res.json({
    service: "NexTrust Backend",
    status: "running",
    docs: "/api-docs"
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", apiRoutes);

app.use(errorHandler);

export default app;
