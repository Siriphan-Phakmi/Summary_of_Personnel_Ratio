'use client';

const SignatureSection = ({ summaryData, setSummaryData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Supervisor */}
      <div>
        <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">Supervisor Signature</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* ...existing supervisor inputs... */}
        </div>
      </div>

      {/* Recorder */}
      <div>
        <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ผู้บันทึกข้อมูล</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* ...existing recorder inputs... */}
        </div>
      </div>
    </div>
  );
};

export default SignatureSection;
