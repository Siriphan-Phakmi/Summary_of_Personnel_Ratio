const SummarySection = ({ summaryData, setSummaryData }) => {
    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-center mb-6 text-indigo-800 bg-white/50 py-2 rounded-lg shadow-sm">
                ข้อมูลสรุป 24 ชั่วโมง
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* OPD 24hr */}
                <div className="bg-pink-50 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                    <label className="block text-sm font-medium text-pink-700 mb-2">OPD 24hr</label>
                    <input
                        type="number"
                        value={summaryData.opdTotal24hr}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                        className="w-full text-black px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-pink-300 bg-white/70"
                        placeholder="0"
                    />
                </div>

                {/* Old Patient */}
                <div className="bg-purple-50 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                    <label className="block text-sm font-medium text-purple-700 mb-2">Old Patient</label>
                    <input
                        type="number"
                        value={summaryData.existingPatients}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                        className="w-full text-black px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-300 bg-white/70"
                        placeholder="0"
                    />
                </div>

                {/* New Patient */}
                <div className="bg-blue-50 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                    <label className="block text-sm font-medium text-blue-700 mb-2">New Patient</label>
                    <input
                        type="number"
                        value={summaryData.newPatients}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                        className="w-full text-black px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white/70"
                        placeholder="0"
                    />
                </div>

                {/* Admit 24hr */}
                <div className="bg-teal-50 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                    <label className="block text-sm font-medium text-teal-700 mb-2">Admit 24hr</label>
                    <input
                        type="number"
                        value={summaryData.admissions24hr}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                        className="w-full text-black px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-300 focus:border-teal-300 bg-white/70"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    );
};

export default SummarySection; 