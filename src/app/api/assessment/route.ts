const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

export async function POST(request: Request) {
  const { name, pdfFile } = await request.json();

  const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: `Assessment ${name}` }),
  });
  const conv = await convRes.json();

  const prompt = `Dari file PDF "${pdfFile}", ambil hasil asesmen untuk ${name}.
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

  // strip markdown code fences if present
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
}
