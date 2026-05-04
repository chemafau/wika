"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TopCandidateRanking from "@/components/TopCandidateRanking";
import AITalentAdvisor from "@/components/AITalentAdvisor";
import PositionFilter from "@/components/PositionFilter";

const candidates = [
  { rank: 1, initials: "AL", name: "Alexandro", role: "Senior Frontend Developer", score: 94 },
  { rank: 2, initials: "JS", name: "Jessy", role: "Full Stack Developer", score: 89 },
  { rank: 3, initials: "MC", name: "Micro", role: "UI/UX Designer", score: 86 },
  { rank: 4, initials: "DW", name: "Dewa", role: "Backend Developer", score: 82 },
  { rank: 5, initials: "DN", name: "Dinda", role: "DevOps Engineer", score: 78 },
];

export default function Dashboard() {
  const [selectedPosition, setSelectedPosition] = useState("All Position");

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
                  <PositionFilter onFilterChange={setSelectedPosition} />
                </div>
              </div>
              <TopCandidateRanking
                candidates={candidates}
                selectedPosition={selectedPosition}
              />
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
