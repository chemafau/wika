"use client";

import { useState } from "react";

interface Candidate {
  rank: number;
  initials: string;
  name: string;
  role: string;
  score: number;
  nip: string;
  nilai_9box: string;
}

interface TopCandidateRankingProps {
  candidates: Candidate[];
}

export default function TopCandidateRanking({ candidates }: TopCandidateRankingProps) {
  const [modal, setModal] = useState<{ name: string; analysis: string } | null>(null);
  const [loadingNip, setLoadingNip] = useState<string | null>(null);

  async function handleAnalyze(candidate: Candidate) {
    setLoadingNip(candidate.nip);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nip: candidate.nip,
        name: candidate.name,
        nilai_9box: candidate.nilai_9box,
      }),
    });
    const data = await res.json();
    setLoadingNip(null);
    setModal({ name: candidate.name, analysis: data.analysis });
  }

  return (
    <>
      <div className="p-3">
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div
              key={candidate.rank}
              className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {candidate.rank}
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs">
                  {candidate.initials}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{candidate.name}</h4>
                  <p className="text-xs text-gray-500">{candidate.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e3a5f] rounded-full"
                    style={{ width: `${candidate.score}%` }}
                  ></div>
                </div>
                <div className="min-w-[50px] px-2 py-1 bg-[#1e3a5f] rounded text-center">
                  <span className="text-xs font-bold text-white">{candidate.score}%</span>
                  <span className="text-[8px] text-white/80 block">Match</span>
                </div>
                <button
                  onClick={() => handleAnalyze(candidate)}
                  disabled={loadingNip === candidate.nip}
                  className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                >
                  {loadingNip === candidate.nip ? (
                    <i className="fas fa-spinner fa-spin text-white text-xs"></i>
                  ) : (
                    <i className="fas fa-comment text-white text-xs"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        {candidates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-search text-3xl mb-2"></i>
            <p>No candidates found for this position</p>
          </div>
        )}
        <div className="px-4 py-2 border-t border-gray-100 text-center mt-2">
          <span className="text-xs text-gray-500">{candidates.length} Candidates on this page</span>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-[#1e3a5f] px-4 py-3 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-robot text-white text-sm"></i>
                <h3 className="text-sm font-semibold text-white">Analisis AI — {modal.name}</h3>
              </div>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{modal.analysis}</p>
            </div>
            <div className="px-4 pb-4 text-right">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-1.5 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#162d4a]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
