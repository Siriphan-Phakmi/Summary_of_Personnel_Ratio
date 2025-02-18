const SummarySection = ({ summaryData, setSummaryData }) => {
    return (
        <div className="mb-8">
            <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลสรุป 24 ชั่วโมง</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OPD 24hr</label>
                    <input
                        type="number"
                        value={summaryData.opdTotal24hr}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Old Patient</label>
                    <input
                        type="number"
                        value={summaryData.existingPatients}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Patient</label>
                    <input
                        type="number"
                        value={summaryData.newPatients}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admit 24hr</label>
                    <input
                        type="number"
                        value={summaryData.admissions24hr}
                        onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    );
};

export default SummarySection; 