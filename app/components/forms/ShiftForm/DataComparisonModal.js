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
                                <ComparisonRow 
                                    label="Patient Census"
                                    oldValue={existingData?.wards?.[wardName]?.numberOfPatients}
                                    newValue={formData?.wards?.[wardName]?.numberOfPatients}
                                />
                                <ComparisonRow 
                                    label="Nurse Manager"
                                    oldValue={existingData?.wards?.[wardName]?.nurseManager}
                                    newValue={formData?.wards?.[wardName]?.nurseManager}
                                />
                                <ComparisonRow 
                                    label="RN"
                                    oldValue={existingData?.wards?.[wardName]?.RN}
                                    newValue={formData?.wards?.[wardName]?.RN}
                                />
                                <ComparisonRow 
                                    label="PN"
                                    oldValue={existingData?.wards?.[wardName]?.PN}
                                    newValue={formData?.wards?.[wardName]?.PN}
                                />
                                <ComparisonRow 
                                    label="WC"
                                    oldValue={existingData?.wards?.[wardName]?.WC}
                                    newValue={formData?.wards?.[wardName]?.WC}
                                />
                                <ComparisonRow 
                                    label="New Admit"
                                    oldValue={existingData?.wards?.[wardName]?.newAdmit}
                                    newValue={formData?.wards?.[wardName]?.newAdmit}
                                />
                                <ComparisonRow 
                                    label="Transfer In"
                                    oldValue={existingData?.wards?.[wardName]?.transferIn}
                                    newValue={formData?.wards?.[wardName]?.transferIn}
                                />
                                <ComparisonRow 
                                    label="Refer In"
                                    oldValue={existingData?.wards?.[wardName]?.referIn}
                                    newValue={formData?.wards?.[wardName]?.referIn}
                                />
                                <ComparisonRow 
                                    label="Transfer Out"
                                    oldValue={existingData?.wards?.[wardName]?.transferOut}
                                    newValue={formData?.wards?.[wardName]?.transferOut}
                                />
                                <ComparisonRow 
                                    label="Refer Out"
                                    oldValue={existingData?.wards?.[wardName]?.referOut}
                                    newValue={formData?.wards?.[wardName]?.referOut}
                                />
                                <ComparisonRow 
                                    label="Discharge"
                                    oldValue={existingData?.wards?.[wardName]?.discharge}
                                    newValue={formData?.wards?.[wardName]?.discharge}
                                />
                                <ComparisonRow 
                                    label="Dead"
                                    oldValue={existingData?.wards?.[wardName]?.dead}
                                    newValue={formData?.wards?.[wardName]?.dead}
                                />
                                <ComparisonRow 
                                    label="Overall Data"
                                    oldValue={existingData?.wards?.[wardName]?.overallData}
                                    newValue={formData?.wards?.[wardName]?.overallData}
                                />
                                <ComparisonRow 
                                    label="Available Beds"
                                    oldValue={existingData?.wards?.[wardName]?.availableBeds}
                                    newValue={formData?.wards?.[wardName]?.availableBeds}
                                />
                                <ComparisonRow 
                                    label="Unavailable Beds"
                                    oldValue={existingData?.wards?.[wardName]?.unavailable}
                                    newValue={formData?.wards?.[wardName]?.unavailable}
                                />
                                <ComparisonRow 
                                    label="Planned Discharge"
                                    oldValue={existingData?.wards?.[wardName]?.plannedDischarge}
                                    newValue={formData?.wards?.[wardName]?.plannedDischarge}
                                />
                                {(existingData?.wards?.[wardName]?.comment || formData?.wards?.[wardName]?.comment) && (
                                    <div className="mt-2 pt-2 border-t">
                                        <div className="text-sm font-medium text-gray-600 mb-1">Comment:</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-sm text-purple-600">{existingData?.wards?.[wardName]?.comment || '-'}</div>
                                            <div className="text-sm text-pink-600">{formData?.wards?.[wardName]?.comment || '-'}</div>
                                        </div>
                                    </div>
                                )}
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
                        onClick={() => saveData('preserve')}
                        className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
                    >
                        Preserve Existing Data
                    </button>
                    <button
                        onClick={() => saveData('overwrite')}
                        className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                        Save New Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataComparisonModal;