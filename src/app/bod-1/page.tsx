import Header from "@/components/Header";

export default function BOD1Page() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-73px)]">
      <Header title="BOD-1" />
      <div className="p-6 flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-[#22c55e]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-chart-bar text-[#22c55e] text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">BOD-1 Analytics</h2>
          <p className="text-gray-500">Board of Directors View - Level 1</p>
          <p className="text-sm text-gray-400 mt-4">Coming soon...</p>
        </div>
      </div>
      <footer className="bg-[#1e3a5f] text-white py-4 px-6 text-center text-sm">
        <p>© 2024 TalentHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
