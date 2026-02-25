import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "touchpoint_m3.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");

export const db = new Database(dbPath);

try {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  console.log("DB schema loaded from:", schemaPath);
  console.log("DB file:", dbPath);
} catch (e) {
  console.log("Failed to load schema.sql at:", schemaPath);
  console.log("Error:", e.message);
}