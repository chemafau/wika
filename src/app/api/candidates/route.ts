const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

function convertNineBox(nilai: string): number {
  const map: Record<string, number> = {
    "1A": 95, "1B": 90, "1C": 85,
    "2A": 80, "2B": 75, "2C": 70,
    "3A": 65, "3B": 60, "3C": 55,
  };
  return map[nilai?.toUpperCase()] ?? 50;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function GET() {
  // 1. Buat conversation
  const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Fetch Candidates" }),
  });
  const conv = await convRes.json();

  // 2. Kirim prompt - JANGAN minta AI hitung score, cukup minta data mentah
  const prompt = `Dari file Excel yang tersedia, berikan daftar kandidat unik berdasarkan NIP.
Ambil data terkini untuk setiap kandidat (baris dengan tanggal_akhir = 9999-12-31 atau terbaru).
Jawab HANYA dengan JSON array, tanpa teks lain, tanpa penjelasan apapun.
Format jawaban:
[{"nip":"...","nama":"...","posisi":"...","level":"...","nilai_9box":"..."}]
PENTING: Hanya gunakan data yang ada di file Excel. Jangan menambahkan atau mengarang data apapun.`;

  const msgRes = await fetch(
    `${BASE_URL}/embed/${PROJECT_ID}/conversations/${conv.id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: prompt, role: "user" }),
    }
  );
  const msg = await msgRes.json();

  // 3. Parse JSON dari response AI
  const raw: string = msg.message.content;
  const jsonStr = raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
  const rawCandidates = JSON.parse(jsonStr);

  // 4. Konversi score pakai kode (bukan AI), sort, tambah rank
  const candidates = rawCandidates
    .map((c: { nip: string; nama: string; posisi: string; level: string; nilai_9box?: string; nilai9box?: string }) => {
      const nilai = c.nilai_9box ?? c.nilai9box ?? "";
      return {
        nip: c.nip,
        name: c.nama,
        role: `${c.level} ${c.posisi}`.trim(),
        initials: getInitials(c.nama),
        score: convertNineBox(nilai), // selalu pakai fungsi konversi, bukan dari AI
        nilai_9box: nilai,
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .map((c: object, i: number) => ({ ...c, rank: i + 1 }));

  return Response.json(candidates);
}
