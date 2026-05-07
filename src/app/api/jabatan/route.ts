const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

export async function GET() {
  const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "List Jabatan" }),
  });
  const conv = await convRes.json();

  const prompt = `Sebutkan semua nilai unik dari kolom nama_jabatan di Excel master (seluruh baris).

Kembalikan JSON array string saja: ["JABATAN_A","JABATAN_B",...]`;

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
  const jsonStr = stripped.match(/\[[\s\S]*\]/)?.[0] ?? null;

  if (!jsonStr) {
    return Response.json({ error: "ai_unavailable", message: raw }, { status: 503 });
  }

  try {
    const list = JSON.parse(jsonStr) as unknown[];
    const cleaned = list
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .map((v) => v.trim());
    const unique = [...new Set(cleaned)].sort();
    return Response.json(unique);
  } catch {
    return Response.json({ error: "parse_failed", message: raw }, { status: 500 });
  }
}
