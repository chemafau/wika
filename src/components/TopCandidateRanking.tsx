"use client";

interface Candidate {
  rank: number;
  initials: string;
  name: string;
  role: string;
  score: number;
}

interface TopCandidateRankingProps {
  candidates: Candidate[];
  selectedPosition: string;
}

export default function TopCandidateRanking({ candidates, selectedPosition }: TopCandidateRankingProps) {
  const filteredCandidates =
    selectedPosition === "All Position"
      ? candidates
      : candidates.filter((c) => c.role.includes(selectedPosition.split(" ")[0]));

  return (
    <div className="p-3">
      <div className="space-y-2">
        {filteredCandidates.map((candidate) => (
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
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        ))}
      </div>
      {filteredCandidates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-search text-3xl mb-2"></i>
          <p>No candidates found for this position</p>
        </div>
      )}
      <div className="px-4 py-2 border-t border-gray-100 text-center mt-2">
        <span className="text-xs text-gray-500">{filteredCandidates.length} Total Candidates</span>
      </div>
    </div>
  );
}
