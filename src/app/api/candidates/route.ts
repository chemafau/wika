const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const BASE_URL = "https://maldevta.com";

function convertNineBox(nilai: string): number {
  if (!nilai || nilai.trim() === "") return 75;
  const map: Record<string, number> = {
    "1A": 95, "1B": 90, "1C": 85,
    "2A": 80, "2B": 75, "2C": 70,
    "3A": 65, "3B": 60, "3C": 55,
  };
  return map[nilai.toUpperCase()] ?? 50;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface RawCandidate {
  nip: string;
  nama: string;
  posisi: string;
  level: string;
  nama_jabatan?: string;
  namajabatan?: string;
  nilai_9box?: string;
  nilai9box?: string;
  alasan?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jabatan = searchParams.get("jabatan")?.trim();
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
    ? Math.floor(limitParam)
    : null;
  const reuseConvId = searchParams.get("conversationId")?.trim();

  let convId = reuseConvId;
  if (!convId) {
    const convRes = await fetch(`${BASE_URL}/embed/${PROJECT_ID}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: jabatan ? `Top kandidat untuk ${jabatan}` : "Daftar kandidat",
      }),
    });
    const conv = await convRes.json();
    convId = conv.id;
  }

  // Pakai pertanyaan natural seperti user ngetik di chat. Project context maldevta
  // sudah handle source selection + format. Hanya tambah JSON output instruction.
  const naturalQuery = jabatan
    ? `tampilkan top ${limit ?? 10} kandidat untuk jabatan ${jabatan}`
    : `berikan daftar kandidat dari Excel master (data terkini, tanggal_akhir = 9999-12-31)`;

  const prompt = `${naturalQuery}

Output JSON array saja: [{"nip":"...","nama":"...","posisi":"...","level":"...","nama_jabatan":"...","nilai_9box":"...","alasan":"..."}]`;

  const msgRes = await fetch(
    `${BASE_URL}/embed/${PROJECT_ID}/conversations/${convId}/messages`,
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

  let rawCandidates: RawCandidate[];
  try {
    rawCandidates = JSON.parse(jsonStr);
  } catch {
    return Response.json({ error: "parse_failed", message: raw }, { status: 500 });
  }

  const candidates = rawCandidates.map((c) => {
    const nilai = c.nilai_9box ?? c.nilai9box ?? "";
    const namaJabatan = c.nama_jabatan ?? c.namajabatan ?? "";
    return {
      nip: c.nip,
      name: c.nama,
      role: `${c.level} ${c.posisi}`.trim(),
      nama_jabatan: namaJabatan,
      initials: getInitials(c.nama),
      score: convertNineBox(nilai),
      nilai_9box: nilai,
      alasan: c.alasan ?? "",
    };
  });

  if (jabatan) {
    const sliced = limit ? candidates.slice(0, limit) : candidates;
    return Response.json(sliced.map((c, i) => ({ ...c, rank: i + 1 })));
  }

  const sorted = candidates
    .sort((a, b) => b.score - a.score)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return Response.json(sorted);
}
