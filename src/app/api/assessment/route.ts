import path from "path";
import fs from "fs";

const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";
const DOCS_DIR = path.join(process.cwd(), "public", "documents");

async function parsePdf(buffer: Buffer): Promise<{ text: string } | { error: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    if (!data.text) return { error: "PDF parsed but text is empty" };
    return { text: data.text };
  } catch (e) {
    return { error: String(e) };
  }
}

async function readLocalPdf(pdfFile: string): Promise<{ text: string } | { error: string }> {
  const filePath = path.join(DOCS_DIR, `${pdfFile}.pdf`);
  if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` };
  const buffer = fs.readFileSync(filePath);
  return parsePdf(buffer);
}

function getDriveDirectUrl(driveLink: string): string {
  const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveLink;
  return `https://drive.google.com/uc?export=download&id=${match[1]}`;
}

async function readDrivePdf(driveLink: string): Promise<{ text: string } | { error: string }> {
  try {
    const url = getDriveDirectUrl(driveLink);
    const res = await fetch(url);
    if (!res.ok) return { error: `Drive fetch failed: ${res.status}` };
    const arrayBuffer = await res.arrayBuffer();
    return parsePdf(Buffer.from(arrayBuffer));
  } catch (e) {
    return { error: String(e) };
  }
}

export async function POST(request: Request) {
  try {
    const { name, pdfFile, driveLink } = await request.json();

    const pdfResult = driveLink
      ? await readDrivePdf(driveLink)
      : await readLocalPdf(pdfFile);

    const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Assessment ${name}` }),
    });
    const conv = await convRes.json();

    let prompt: string;

    if ("error" in pdfResult) {
      // PDF lokal tidak ada → fallback ke maldevta
      prompt = `Dari file PDF "${pdfFile}", ambil hasil asesmen untuk ${name}.
Jawab HANYA dengan JSON, tanpa teks lain, format:
{
  "nama": "...",
  "jabatan": "...",
  "sections": [
    { "label": "nama kompetensi/aspek", "score": <angka 1-5>, "description": "penjelasan hasil asesmen" }
  ]
}
Ambil semua aspek/kompetensi yang ada di laporan.
PENTING: Hanya gunakan data yang ada di file PDF tersebut. Jangan menambahkan atau mengarang data.`;
    } else {
      prompt = `Berikut adalah isi laporan hasil asesmen untuk ${name}:

=== ISI LAPORAN ASESMEN ===
${pdfResult.text.slice(0, 12000)}
===========================

Dari data di atas, berikan ringkasan hasil asesmen dalam format JSON:
{
  "nama": "...",
  "jabatan": "...",
  "sections": [
    { "label": "nama kompetensi/aspek", "score": <angka 1-5>, "description": "penjelasan hasil asesmen" }
  ]
}
Jawab HANYA dengan JSON, tanpa teks lain. Gunakan semua aspek/kompetensi yang ada di laporan.`;
    }

    const msgRes = await fetch(
      `${BASE_URL}/embed/${PROJECT_ID}/conversations/${conv.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: prompt, role: "user" }),
      }
    );
    const msg = await msgRes.json();

    const raw: string = msg.message.content;
    const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const jsonStr = stripped.match(/\{[\s\S]*\}/)?.[0] ?? null;

    if (!jsonStr) {
      return Response.json({ error: "parse_failed", raw });
    }

    try {
      const data = JSON.parse(jsonStr);
      return Response.json(data);
    } catch {
      return Response.json({ error: "invalid_json", raw });
    }
  } catch (e) {
    return Response.json({ error: "server_error", message: String(e) }, { status: 500 });
  }
}
