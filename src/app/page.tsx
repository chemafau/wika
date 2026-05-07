"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import TopCandidateRanking from "@/components/TopCandidateRanking";
import AITalentAdvisor from "@/components/AITalentAdvisor";
import PositionFilter from "@/components/PositionFilter";

interface Candidate {
  rank: number;
  initials: string;
  name: string;
  role: string;
  score: number;
  nip: string;
  nilai_9box: string;
}

export default function Dashboard() {
  const [selectedPosition, setSelectedPosition] = useState("All Position");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError("AI sedang tidak tersedia. Coba beberapa saat lagi.");
        } else {
          setCandidates(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal terhubung ke server.");
        setLoading(false);
      });
  }, []);

  const uniquePositions = [...new Set(candidates.map((c) => c.role))];

  const filteredCandidates = selectedPosition === "All Position"
    ? candidates
    : candidates.filter((c) => c.role === selectedPosition);

  const totalPages = Math.ceil(filteredCandidates.length / PAGE_SIZE);
  const pagedCandidates = filteredCandidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (pos: string) => {
    setSelectedPosition(pos);
    setPage(1);
  };

  return (
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
                  <PositionFilter positions={uniquePositions} onFilterChange={handleFilterChange} />
                </div>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
                  Loading candidates...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <i className="fas fa-exclamation-circle text-2xl mb-2 block text-yellow-400"></i>
                  {error}
                </div>
              ) : (
                <>
                  <TopCandidateRanking candidates={pagedCandidates} />
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
          <AITalentAdvisor />
        </div>
      </div>
      <footer className="bg-[#1e3a5f] text-white py-4 px-6 text-center text-sm">
        <p>© 2024 TalentHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
