'use client';

const SignatureSection = ({ summaryData, setSummaryData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Supervisor */}
      <div>
        <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">Supervisor Signature</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={summaryData.supervisorFirstName}
              onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorFirstName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={summaryData.supervisorLastName}
              onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorLastName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
              placeholder="Last Name"
            />
          </div>
        </div>
      </div>

      {/* Recorder */}
      <div>
        <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">เจ้าหน้าที่ผู้บันทึกข้อมูล</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={summaryData.recorderFirstName}
              onChange={(e) => setSummaryData(prev => ({ ...prev, recorderFirstName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={summaryData.recorderLastName}
              onChange={(e) => setSummaryData(prev => ({ ...prev, recorderLastName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
              placeholder="Last Name"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureSection;
