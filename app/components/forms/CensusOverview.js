'use client';

const CensusOverview = ({ summaryData, setSummaryData }) => {
  return (
    <div className="mb-8">
      <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลสรุป 24 ชั่วโมง</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-black text-sm font-medium text-gray-700 mb-1">OPD 24hr</label>
          <input
            type="number"
            value={summaryData.opdTotal24hr}
            onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab]"
            placeholder="0"
          />
        </div>
        {/* ...existing input fields... */}
      </div>
    </div>
  );
};

export default CensusOverview;
