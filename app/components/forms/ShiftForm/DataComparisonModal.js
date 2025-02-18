'use client';

import { ComparisonRow } from './ComparisonRow';

const DataComparisonModal = ({
    showDataComparison,
    existingData,
    formData,
    summaryData,
    setShowDataComparison,
    saveData,
    WARD_ORDER
}) => {
    if (!showDataComparison || !existingData) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-medium mb-4">Data Comparison</h2>
                <div className="space-y-4">
                    {WARD_ORDER.map(wardName => (
                        <div key={wardName} className="border rounded-lg p-4">
                            <h3 className="font-medium text-lg mb-2">{wardName}</h3>
                            <div className="grid grid-cols-3 gap-4 mb-2">
                                <div className="font-medium">Field</div>
                                <div className="font-medium">Current</div>
                                <div className="font-medium">New</div>
                            </div>
                            <div className="space-y-1">
                                {/* โครงสร้างข้อมูลที่ต้องการเปรียบเทียบ */}
                                <ComparisonRow 
                                    label="Patient Census"
                                    oldValue={existingData?.wards?.[wardName]?.numberOfPatients}
                                    newValue={formData?.wards?.[wardName]?.numberOfPatients}
                                />
                                {/* เพิ่ม ComparisonRow อื่นๆ ตามต้องการ */}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button
                        onClick={() => setShowDataComparison(false)}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveData}
                        className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataComparisonModal;