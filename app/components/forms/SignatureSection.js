'use client';

const SignatureSection = ({ summaryData, setSummaryData }) => {
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
      <div className="grid grid-cols-1 gap-8">
        {/* Supervisor Signature */}
        <div className="bg-green-50/80 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-green-800 mb-4 bg-white/50 py-2 px-4 rounded-lg text-center shadow-sm">
            Supervisor Signature
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-green-700">First Name</label>
              <input
                type="text"
                value={summaryData.supervisorFirstName}
                onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorFirstName: e.target.value }))}
                className="w-full text-black px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-300 bg-white/70"
                placeholder="ชื่อ"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-green-700">Last Name</label>
              <input
                type="text"
                value={summaryData.supervisorLastName}
                onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorLastName: e.target.value }))}
                className="w-full text-black px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-300 bg-white/70"
                placeholder="นามสกุล"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureSection;
