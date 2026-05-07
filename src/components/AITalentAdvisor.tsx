"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AITalentAdvisor() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="bg-[#1e3a5f] px-4 py-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-robot text-white text-sm"></i>
          <h2 className="text-sm font-semibold text-white">AI Talent Advisor</h2>
        </div>
      </div>
      <div className="p-3 flex-1">
        <iframe
          src={`https://maldevta.com/embed?projectId=prj_a5746e6d2deb36c65aad&embedToken=prj_a5746e6d2deb36c65aad&uid=${user?.id || ""}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="microphone"
          style={{ border: "1px solid #e5e7eb", borderRadius: "8px", minHeight: "400px" }}
        ></iframe>
      </div>
    </div>
  );
}
