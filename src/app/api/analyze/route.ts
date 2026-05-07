const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

export async function POST(request: Request) {
  const { nip, name, nilai_9box } = await request.json();

  const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: `Analyze ${nip}` }),
  });
  const conv = await convRes.json();

  const prompt = `Berdasarkan data dari file Excel yang tersedia, jelaskan mengapa kandidat bernama ${name} (NIP: ${nip}) mendapatkan nilai 9-box "${nilai_9box}".
Gunakan HANYA data dari file Excel. Jangan gunakan data dari file PDF manapun.
Gunakan bahasa Indonesia. Jawab dengan ringkas dan jelas, maksimal 4 poin.
PENTING: Hanya gunakan data yang ada di file Excel. Jangan menambahkan informasi yang tidak ada.`;

  const msgRes = await fetch(
    `${BASE_URL}/embed/${PROJECT_ID}/conversations/${conv.id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: prompt, role: "user" }),
    }
  );
  const msg = await msgRes.json();

  return Response.json({ analysis: msg.message.content });
}
