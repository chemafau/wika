"use client";

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

interface TopCandidateRankingProps {
  candidates: Candidate[];
  onAnalyze: (candidate: Candidate) => void;
  loadingNip: string | null;
  activeNip: string | null;
  selectedJabatan?: string;
}

export default function TopCandidateRanking({
  candidates,
  onAnalyze,
  loadingNip,
  activeNip,
  selectedJabatan,
}: TopCandidateRankingProps) {
  const isRecommendationMode =
    !!selectedJabatan && selectedJabatan !== "All Position";
  return (
    <>
      <div className="p-3">
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div
              key={candidate.rank}
              className={`flex flex-col gap-2 p-2 bg-white border rounded-lg hover:shadow-md transition-shadow ${
                activeNip === candidate.nip
                  ? "border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {candidate.rank}
                  </div>
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs flex-shrink-0">
                    {candidate.initials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{candidate.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                    type="button"
                    onClick={() => {
                      console.log("[chat-btn] clicked", candidate.nip, candidate.name);
                      onAnalyze(candidate);
                    }}
                    disabled={loadingNip === candidate.nip}
                    className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center hover:bg-[#162d4a] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loadingNip === candidate.nip ? (
                      <i className="fas fa-spinner fa-spin text-white text-xs"></i>
                    ) : (
                      <i className="fas fa-comment text-white text-xs"></i>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {candidates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <i className={`fas ${isRecommendationMode ? "fa-user-slash" : "fa-search"} text-3xl mb-2`}></i>
            {isRecommendationMode ? (
              <>
                <p className="font-medium text-gray-700">
                  Tidak ada kandidat yang cocok untuk jabatan
                </p>
                <p className="text-sm text-gray-500 mt-1">&ldquo;{selectedJabatan}&rdquo;</p>
                <p className="text-xs text-gray-400 mt-2">
                  AI tidak menemukan kandidat di pool yang sesuai untuk jabatan tersebut.
                </p>
              </>
            ) : (
              <p>No candidates found for this position</p>
            )}
          </div>
        )}
        <div className="px-4 py-2 border-t border-gray-100 text-center mt-2">
          <span className="text-xs text-gray-500">{candidates.length} Candidates on this page</span>
        </div>
      </div>
    </>
  );
}
