import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

export function saveBase64File(base64String) {
  if (!base64String || typeof base64String !== 'string' || !base64String.startsWith("data:")) {
    return base64String;
  }

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64String;
  }

  const type = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  
  let ext = "bin";
  if (type === "image/png") ext = "png";
  else if (type === "image/jpeg") ext = "jpg";
  else if (type === "image/jpg") ext = "jpg";
  else if (type === "image/webp") ext = "webp";
  else if (type === "application/pdf") ext = "pdf";

  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);

  const baseUrl = process.env.API_URL || "http://localhost:3000";
  return `${baseUrl}/uploads/${fileName}`;
}

export default { saveBase64File };
