const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

export async function GET() {
  const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Debug" }),
  });
  const conv = await convRes.json();

  const msgRes = await fetch(
    `${BASE_URL}/embed/${PROJECT_ID}/conversations/${conv.id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Dari file Excel, tampilkan 3 baris data pertama. Jawab HANYA dengan JSON array, format: [{\"nip\":\"...\",\"nama\":\"...\",\"nilai_9box\":\"...\",\"posisi\":\"...\",\"level\":\"...\"}]",
        role: "user",
      }),
    }
  );
  const msg = await msgRes.json();

  return Response.json({ raw: msg.message.content });
}
