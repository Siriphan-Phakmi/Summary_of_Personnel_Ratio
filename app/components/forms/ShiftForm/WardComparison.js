import { ComparisonRow } from './ComparisonRow';

export const WardComparison = ({ wardName, existingData, formData }) => {
        const existingWard = existingData.wards?.[wardName] || {};
        const newWard = formData.wards[wardName] || {};

        return (
            <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium text-lg mb-4 text-[#0ab4ab]">{wardName}</h4>
                <div className="grid grid-cols-3 gap-4 mb-2 font-semibold">
                    <div>Field</div>
                    <div>Current Data</div>
                    <div>New Data</div>
                </div>
                <div className="space-y-1">
                    <ComparisonRow label="Patient Census" oldValue={existingWard.numberOfPatients} newValue={newWard.numberOfPatients} />
                    <ComparisonRow label="Nurse Manager" oldValue={existingWard.nurseManager} newValue={newWard.nurseManager} />
                    <ComparisonRow label="RN" oldValue={existingWard.RN} newValue={newWard.RN} />
                    <ComparisonRow label="PN" oldValue={existingWard.PN} newValue={newWard.PN} />
                    <ComparisonRow label="WC" oldValue={existingWard.WC} newValue={newWard.WC} />
                    <ComparisonRow label="New Admit" oldValue={existingWard.newAdmit} newValue={newWard.newAdmit} />
                    <ComparisonRow label="Transfer In" oldValue={existingWard.transferIn} newValue={newWard.transferIn} />
                    <ComparisonRow label="Refer In" oldValue={existingWard.referIn} newValue={newWard.referIn} />
                    <ComparisonRow label="Transfer Out" oldValue={existingWard.transferOut} newValue={newWard.transferOut} />
                    <ComparisonRow label="Refer Out" oldValue={existingWard.referOut} newValue={newWard.referOut} />
                    <ComparisonRow label="Discharge" oldValue={existingWard.discharge} newValue={newWard.discharge} />
                    <ComparisonRow label="Dead" oldValue={existingWard.dead} newValue={newWard.dead} />
                    <ComparisonRow label="Overall Data" oldValue={existingWard.overallData} newValue={newWard.overallData} />
                    <ComparisonRow label="Available Beds" oldValue={existingWard.availableBeds} newValue={newWard.availableBeds} />
                    <ComparisonRow label="Unavailable" oldValue={existingWard.unavailable} newValue={newWard.unavailable} />
                    <ComparisonRow label="Plan D/C" oldValue={existingWard.plannedDischarge} newValue={newWard.plannedDischarge} />
                    {(existingWard.comment || newWard.comment) && (
                        <div className="mt-2 pt-2 border-t">
                            <div className="text-sm font-medium text-gray-600 mb-1">Comment:</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-sm text-purple-600">{existingWard.comment || '-'}</div>
                                <div className="text-sm text-pink-600">{newWard.comment || '-'}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };