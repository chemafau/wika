"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import TopCandidateRanking from "@/components/TopCandidateRanking";
import AITalentAdvisor from "@/components/AITalentAdvisor";
import PositionFilter from "@/components/PositionFilter";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Candidate {
  rank: number;
  initials: string;
  name: string;
  role: string;
  nama_jabatan: string;
  score: number;
  nip: string;
  nilai_9box: string;
  alasan?: string;
}

const NINE_BOX_SCORE: Record<string, number> = {
  "1A": 95, "1B": 90, "1C": 85,
  "2A": 80, "2B": 75, "2C": 70,
  "3A": 65, "3B": 60, "3C": 55,
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function nineBoxToScore(nilai: string, rank: number): number {
  const key = nilai.toUpperCase().trim();
  if (NINE_BOX_SCORE[key]) return NINE_BOX_SCORE[key];
  return Math.max(60, 100 - (rank - 1) * 5);
}

// Parse respons AI ke daftar kandidat. Mendukung dua format umum:
//  1) Pipe   : "1. Nama | Posisi | Alasan"
//  2) Bullet : "• Nama (NIP: XXX) — Saat ini menjabat sebagai POSISI dengan nilai 9-box 1A. Alasan..."
// Mengembalikan array kosong kalau respons tidak berisi daftar kandidat (mis. analisis paragraf).
function parseCandidatesFromResponse(text: string, fallbackJabatan: string): Candidate[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const itemRegex = /^\s*([•\-*]|\d+[.)])\s+(.+)$/;

  const items: { rank: number; body: string }[] = [];
  let autoRank = 0;
  for (const line of lines) {
    const m = line.match(itemRegex);
    if (!m) continue;
    autoRank += 1;
    const marker = m[1];
    const body = m[2].trim();
    const numericRank = /^\d+/.exec(marker);
    const rank = numericRank ? parseInt(numericRank[0], 10) : autoRank;
    items.push({ rank, body });
  }

  if (items.length < 2) return [];

  const out: Candidate[] = [];
  for (const { rank, body } of items) {
    const c = parseOneCandidate(body, rank, fallbackJabatan);
    if (c) out.push(c);
  }
  return out;
}

function parseOneCandidate(body: string, rank: number, fallbackJabatan: string): Candidate | null {
  const nipMatch = body.match(/NIP\s*:?\s*([A-Z0-9-]+)/i);
  const nineBoxMatch = body.match(/9[\s-]?box\s+([1-3][A-C])/i);
  const nip = nipMatch?.[1] ?? "";
  const nilai = nineBoxMatch?.[1]?.toUpperCase() ?? "";

  let name = "";
  let role = "";
  let alasan = body;

  // Format pipe: "Nama | Posisi | Alasan"
  if (body.includes("|")) {
    const parts = body.split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      name = parts[0];
      role = parts[1];
      alasan = parts.slice(2).join(" | ");
    }
  }

  // Format bullet/narasi
  if (!name) {
    // Nama = teks dari awal sampai sebelum "(NIP", "—", " - ", atau ":"
    const nameMatch = body.match(/^([^()|—:]+?)(?=\s*\(|\s+—|\s+-\s|:)/);
    name = nameMatch?.[1]?.trim() ?? body.split(/[(—:]/)[0].trim();
  }
  if (!name) return null;

  if (!role) {
    const roleMatch =
      body.match(/menjabat\s+sebagai\s+(.+?)(?=\s+dengan\s|\s+nilai\s|[.,;])/i) ??
      body.match(/(?:^|\s)sebagai\s+(.+?)(?=\s+dengan\s|\s+nilai\s|[.,;])/i) ??
      body.match(/(?:posisi|jabatan)\s*:?\s+(.+?)(?=\s+dengan\s|[.,;])/i);
    role = roleMatch?.[1]?.trim() ?? "";
  }

  const namaJabatan =
    fallbackJabatan && fallbackJabatan !== "All Position" ? fallbackJabatan : role;

  return {
    rank,
    initials: getInitials(name),
    name,
    role,
    nama_jabatan: namaJabatan,
    score: nineBoxToScore(nilai, rank),
    nip,
    nilai_9box: nilai,
    alasan,
  };
}

export default function Dashboard() {
  const [selectedJabatan, setSelectedJabatan] = useState("All Position");
  const [allJabatan, setAllJabatan] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [activeNip, setActiveNip] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const PAGE_SIZE = 5;

  // Ref agar handler dari iframe (created saat mount, closure stale) tetap baca state terbaru.
  const selectedJabatanRef = useRef(selectedJabatan);
  useEffect(() => {
    selectedJabatanRef.current = selectedJabatan;
  }, [selectedJabatan]);

  // Timer fallback untuk auto-clear loading kalau AI lama / response tidak match parser.
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startLoading() {
    setLoading(true);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => setLoading(false), 30_000);
  }
  function stopLoading() {
    setLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }

  function handleAnalyze(candidate: Candidate) {
    const targetJabatan =
      selectedJabatan && selectedJabatan !== "All Position" ? selectedJabatan : null;

    const parts = [
      candidate.name,
      candidate.nip ? `NIP ${candidate.nip}` : null,
      candidate.nama_jabatan || candidate.role,
      candidate.nilai_9box ? `9-box ${candidate.nilai_9box}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = targetJabatan
      ? `Kenapa ${parts} ada di peringkat ${candidate.rank} untuk jabatan "${targetJabatan}"?`
      : `Jelaskan profil ${parts} dan beri rekomendasi pengembangan/penempatan.`;

    setActiveNip(candidate.nip || candidate.name);
    setPendingPrompt(prompt);
    setToast(
      targetJabatan
        ? `Menganalisis kecocokan ${candidate.name} untuk "${targetJabatan}"`
        : `Pertanyaan tentang ${candidate.name} dikirim ke AI Talent Advisor`
    );
    setTimeout(() => setToast(null), 3000);
  }

  const JABATAN_CACHE_KEY = "wika_jabatan_list_v1";

  async function fetchJabatanList() {
    try {
      const res = await fetch("/api/jabatan");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllJabatan(data);
        try {
          localStorage.setItem(JABATAN_CACHE_KEY, JSON.stringify(data));
        } catch {
          // ignore quota errors
        }
      }
    } catch {
      // network error; rely on cache
    }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem(JABATAN_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllJabatan(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
    fetchJabatanList();
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(candidates.length / PAGE_SIZE);
  const pagedCandidates = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (jab: string) => {
    setSelectedJabatan(jab);
    setPage(1);
    setError(null);
    if (jab === "All Position") {
      setCandidates([]);
      stopLoading();
      return;
    }
    startLoading();
    setPendingPrompt(`tampilkan top 10 kandidat untuk jabatan ${jab}`);
  };

  function detectRecommendationIntent(message: string): string | null {
    const lower = message.toLowerCase();
    const trigger = /tampilkan|top\s+\d|rekomendasi|kandidat|cocok|siapa|berikan|list/i;
    if (!trigger.test(lower)) return null;
    const matchedJabatan = [...allJabatan]
      .sort((a, b) => b.length - a.length)
      .find((j) => lower.includes(j.toLowerCase()));
    return matchedJabatan ?? null;
  }

  function handleUserMessageInChat(content: string) {
    const matched = detectRecommendationIntent(content);
    if (matched) {
      const synced =
        allJabatan.find((j) => j.toLowerCase() === matched.toLowerCase()) ?? matched;
      setSelectedJabatan(synced);
      setPage(1);
      startLoading();
    }
  }

  function handleAiResponse(content: string) {
    const parsed = parseCandidatesFromResponse(content, selectedJabatanRef.current);
    if (parsed.length > 0) {
      setCandidates(parsed);
      setPage(1);
      setError(null);
      stopLoading();
    } else if (loading) {
      // Respons bukan daftar kandidat (mis. analisis paragraf), tapi kita lagi nunggu list.
      // Stop loading supaya UI tidak menggantung; biarkan candidates lama.
      stopLoading();
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-[calc(100vh-73px)]">
        <Header title="Dashboard" />
        <div className="p-4 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1e3a5f] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-users text-white text-sm"></i>
                      <h2 className="text-sm font-semibold text-white">Top Candidate Ranking</h2>
                    </div>
                    <PositionFilter
                      positions={allJabatan}
                      value={selectedJabatan}
                      onFilterChange={handleFilterChange}
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
                    {selectedJabatan !== "All Position"
                      ? `AI sedang mencari kandidat yang cocok untuk "${selectedJabatan}"...`
                      : "Loading candidates..."}
                  </div>
                ) : error ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <i className="fas fa-exclamation-circle text-2xl mb-2 block text-yellow-400"></i>
                    {error}
                  </div>
                ) : (
                  <>
                    <TopCandidateRanking
                      candidates={pagedCandidates}
                      onAnalyze={handleAnalyze}
                      loadingNip={null}
                      activeNip={activeNip}
                      selectedJabatan={selectedJabatan}
                    />
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <AITalentAdvisor
              pendingPrompt={pendingPrompt}
              onPromptDelivered={() => setPendingPrompt(null)}
              onUserMessage={handleUserMessageInChat}
              onAiResponse={handleAiResponse}
            />
          </div>
        </div>
        <footer className="bg-[#1e3a5f] text-white py-4 px-6 text-center text-sm">
          <p>© 2024 TalentHub. All rights reserved.</p>
        </footer>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#1e3a5f] text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            <span>{toast}</span>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
