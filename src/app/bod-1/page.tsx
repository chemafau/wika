"use client";

import { useState } from "react";
import Header from "@/components/Header";

interface Section {
  label: string;
  score: number;
  description: string;
}

interface Assessment {
  nama: string;
  jabatan: string;
  sections: Section[];
}

const candidates = [
  {
    name: "MUHAMMAD ABDI",
    division: "FINANCE DIVISION",
    nilai_9box: "1A",
    initials: "MA",
    pdfFile: "(PPM) Full Report Hasil Asesmen PT Wijaya Karya (Persero), Tbk_ 17-18 Februari 2025_Gatot",
  },
  {
    name: "BRAM IBRAHIM",
    division: "ASSET MANAGEMENT DIVISION",
    nilai_9box: "1A",
    initials: "BI",
    pdfFile: "(LMFEBUI) Full Report Hasil Asesmen PT Wijaya Karya (Persero), Tbk_ 11-12 Februari 2025_Rafael",
  },
  {
    name: "FARID NUR AIDY",
    division: "STRATEGIC PLANNING DIVISION",
    nilai_9box: "1A",
    initials: "FN",
    pdfFile: "(BPI) Full report Hasil Asesmen PT Wijaya Karya (Persero), Tbk_5-6 Februari 2025_Sahid",
  },
];

export default function BOD1Page() {
  const [modal, setModal] = useState<Assessment | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);

  async function handleCardClick(candidate: typeof candidates[0]) {
    setLoadingName(candidate.name);
    const res = await fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: candidate.name, pdfFile: candidate.pdfFile }),
    });
    const data = await res.json();
    setLoadingName(null);
    setModal(data);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-73px)]">
      <Header title="BOD-1" />
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-gray-900">Talent</h2>
          <span className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {candidates.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <div
              key={c.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCardClick(c)}
            >
              <div className="p-5 flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0 relative">
                  {loadingName === c.name ? (
                    <i className="fas fa-spinner fa-spin text-[#1e3a5f]"></i>
                  ) : (
                    c.initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{c.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{c.division}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium">
                    Box {c.nilai_9box}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-4">
                <button className="text-gray-400 hover:text-[#1e3a5f] transition-colors" title="Lihat laporan">
                  <i className="fas fa-clipboard-list text-sm"></i>
                </button>
                <button className="text-gray-400 hover:text-[#1e3a5f] transition-colors" title="Lihat profil">
                  <i className="fas fa-user-circle text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="bg-[#1e3a5f] px-5 py-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white">{modal.nama}</h3>
                <p className="text-xs text-white/70 mt-0.5">{modal.jabatan}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {(modal as unknown as { error?: string; raw?: string }).error ? (
                <div className="text-xs text-red-500 whitespace-pre-wrap">
                  <p className="font-semibold mb-1">Gagal parse response AI:</p>
                  <p>{(modal as unknown as { raw?: string }).raw}</p>
                </div>
              ) : modal.sections?.length > 0 ? (
                modal.sections.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                      <span className="text-sm font-semibold text-gray-500">({s.score})</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Tidak ada data asesmen ditemukan.</p>
              )}
            </div>
            <div className="px-5 pb-4 pt-2 border-t border-gray-100 text-right flex-shrink-0">
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

      <footer className="bg-[#1e3a5f] text-white py-4 px-6 text-center text-sm">
        <p>© 2024 TalentHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
