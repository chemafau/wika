"use client";

import { useState, useEffect } from "react";
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

export default function Dashboard() {
  const [selectedJabatan, setSelectedJabatan] = useState("All Position");
  const [allJabatan, setAllJabatan] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [activeNip, setActiveNip] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [iframeConvId, setIframeConvId] = useState<string | null>(null);
  const PAGE_SIZE = 5;

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

  const CANDIDATES_CACHE_KEY = "wika_candidates_cache_v2";
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit

  function getCacheKey(jabatan?: string, limit?: number): string {
    return `${jabatan ?? "ALL"}__${limit ?? 0}`;
  }

  function readCache(jabatan?: string, limit?: number): Candidate[] | null {
    try {
      const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      const entry = cache[getCacheKey(jabatan, limit)];
      if (!entry) return null;
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
      return entry.data;
    } catch {
      return null;
    }
  }

  function writeCache(jabatan: string | undefined, limit: number | undefined, data: Candidate[]) {
    try {
      const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      cache[getCacheKey(jabatan, limit)] = { timestamp: Date.now(), data };
      localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore quota errors
    }
  }

  async function fetchCandidates(jabatan?: string, limit?: number) {
    setError(null);
    setPage(1);

    // Tampilkan dari cache instan kalau ada (revalidate di background)
    const cached = readCache(jabatan, limit);
    if (cached) {
      setCandidates(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (jabatan && jabatan !== "All Position") {
        params.set("jabatan", jabatan);
        if (limit && limit > 0) params.set("limit", String(limit));
      }
      if (iframeConvId) params.set("conversationId", iframeConvId);
      const url = params.toString()
        ? `/api/candidates?${params.toString()}`
        : "/api/candidates";
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        if (!cached) setError("AI sedang tidak tersedia. Coba beberapa saat lagi.");
      } else {
        setCandidates(data);
        writeCache(jabatan, limit, data);
      }
    } catch {
      if (!cached) setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
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
    fetchCandidates();
    fetchJabatanList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(candidates.length / PAGE_SIZE);
  const pagedCandidates = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (jab: string) => {
    setSelectedJabatan(jab);
    fetchCandidates(jab);
  };

  function detectRecommendationIntent(
    message: string
  ): { jabatan: string; limit?: number } | null {
    const lower = message.toLowerCase();
    const trigger = /tampilkan|top\s+\d|rekomendasi|kandidat|cocok|siapa|berikan|list/i;
    if (!trigger.test(lower)) return null;

    const matchedJabatan = [...allJabatan]
      .sort((a, b) => b.length - a.length)
      .find((j) => lower.includes(j.toLowerCase()));
    if (!matchedJabatan) return null;

    const numMatch = message.match(/\b(\d+)\b/);
    const limit = numMatch ? parseInt(numMatch[1], 10) : undefined;

    return {
      jabatan: matchedJabatan,
      limit: limit && limit > 0 && limit <= 50 ? limit : undefined,
    };
  }

  function handleUserMessageInChat(content: string) {
    const intent = detectRecommendationIntent(content);
    if (intent) {
      const matched =
        allJabatan.find((j) => j.toLowerCase() === intent.jabatan.toLowerCase()) ??
        intent.jabatan;
      setSelectedJabatan(matched);
      fetchCandidates(matched, intent.limit);
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
              onConversationReady={(id) => setIframeConvId(id)}
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
