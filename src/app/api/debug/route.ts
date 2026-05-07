import path from "path";
import fs from "fs";

const DOCS_DIR = path.join(process.cwd(), "public", "documents");

export async function GET() {
  const files = fs.readdirSync(DOCS_DIR);
  const results: Record<string, string> = {};

  for (const file of files) {
    if (!file.endsWith(".pdf")) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      const buffer = fs.readFileSync(path.join(DOCS_DIR, file));
      const data = await pdfParse(buffer);
      results[file] = data.text?.slice(0, 300) ?? "EMPTY";
    } catch (e) {
      results[file] = `ERROR: ${String(e)}`;
    }
  }

  return Response.json(results);
}
