"use client";

import { useState } from "react";

const positions = [
  "All Position",
  "Frontend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "Backend Developer",
  "DevOps Engineer",
];

interface PositionFilterProps {
  onFilterChange?: (position: string) => void;
}

export default function PositionFilter({ onFilterChange }: PositionFilterProps) {
  const [selectedPosition, setSelectedPosition] = useState("All Position");

  const handleChange = (value: string) => {
    setSelectedPosition(value);
    onFilterChange?.(value);
  };

  return (
    <div className="relative">
      <select
        value={selectedPosition}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
      >
        {positions.map((pos) => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>
      <i className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none"></i>
    </div>
  );
}

export { positions };
