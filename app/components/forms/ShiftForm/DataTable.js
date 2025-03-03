import { formatWardName } from '../../../utils/formatters';
import { wardMapping } from '../../../utils/wardConstants';
import ApproveButton from './ApproveButton';

export const DataTable = ({
    WARD_ORDER,
    formData,
    handleInputChange,
    displayValue,
    approvalStatuses = {}, // Add approvalStatuses parameter with a default empty object
    selectedDate
}) => {
    // Map movement types to their corresponding keys in formData
    const movementTypeToKey = {
        'New Admit': 'newAdmit',
        'Transfer In': 'transferIn',
        'Refer In': 'referIn',
        'Transfer Out': 'transferOut',
        'Refer Out': 'referOut',
        'Discharge': 'discharge',
        'Dead': 'dead'
    };

    // Map staff types to their corresponding keys in formData
    const staffTypeToKey = {
        'Nurse Manager': 'nurseManager',
        'RN': 'RN',
        'PN': 'PN',
        'WC': 'WC'
    };

    // Map additional info types to their corresponding keys in formData
    const infoTypeToKey = {
        'Available': 'availableBeds',
        'Unavailable': 'unavailable',
        'Planned Discharge': 'plannedDischarge'
    };

    return (
        <div className="overflow-x-auto">
            <div className="inline-flex gap-1 min-w-max p-1">
                {/* Headers Row */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h3 className="text-xs font-bold text-gray-700 font-THSarabun">Wards</h3>
                    </div>
                    {WARD_ORDER.map((ward) => (
                        <div key={ward} className="h-8 flex items-center">
                            <span className="text-xs font-semibold text-[#0ab4ab] font-THSarabun whitespace-nowrap">
                                {wardMapping[ward] || ward}
                            </span> 
                        </div>
                    ))}
                    <div className="h-8 flex items-center">
                        <span className="text-xs font-semibold text-purple-600 font-THSarabun">Total</span>
                    </div>
                </div>

                {/* Patient Census */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Patient Census</h4>
                    </div>
                    {WARD_ORDER.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-[#0ab4ab]/20 to-[#0ab4ab]/10 rounded-md p-1 text-[#0ab4ab] shadow h-8">
                            <div className="text-center">
                                <input
                                    type="number"
                                    value={displayValue(formData.wards[ward]?.numberOfPatients)}
                                    className="w-16 text-center text-sm font-bold bg-gray-100 border-b border-[#0ab4ab] focus:outline-none text-[#0ab4ab] placeholder-[#0ab4ab]/50 font-THSarabun cursor-not-allowed"
                                    placeholder="0"
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                    ))}
                    <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                        <div className="text-center">
                            <input
                                type="number"
                                value={displayValue(formData.totals.numberOfPatients)}
                                readOnly
                                className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Overall Data */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Overall Data</h4>
                    </div>
                    {WARD_ORDER.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-blue-400/20 to-blue-500/10 rounded-md p-1 text-blue-600 shadow h-8">
                            <div className="text-center">
                                <input
                                    type="number"
                                    value={displayValue(formData.wards[ward]?.overallData)}
                                    className="w-16 text-center text-sm font-bold bg-gray-100 border-b border-blue-500 focus:outline-none text-blue-600 placeholder-blue-300 font-THSarabun cursor-not-allowed"
                                    placeholder="0"
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                    ))}
                    <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                        <div className="text-center">
                            <input
                                type="number"
                                value={displayValue(formData.totals.overallData)}
                                readOnly
                                className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Staff Section */}
                {Object.entries(staffTypeToKey).map(([displayName, key]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <div className="h-12 flex items-center justify-center">
                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{displayName}</h4>
                        </div>
                        {WARD_ORDER.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-md p-1 text-green-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="number"
                                        value={displayValue(formData.wards[ward]?.[key])}
                                        onChange={(e) => handleInputChange('staff', ward, { [key]: e.target.value })}
                                        className="w-16 text-center text-sm font-bold bg-white border-b border-green-500 focus:outline-none focus:border-green-500 text-black placeholder-green-300 font-THSarabun"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="number"
                                    value={displayValue(formData.totals[key])}
                                    readOnly
                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Patient Movement Section */}
                {Object.entries(movementTypeToKey).map(([displayName, key]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <div className="h-12 flex items-center justify-center">
                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{displayName}</h4>
                        </div>
                        {WARD_ORDER.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 rounded-md p-1 text-yellow-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="number"
                                        value={displayValue(formData.wards[ward]?.[key])}
                                        onChange={(e) => handleInputChange('movement', ward, { [key]: e.target.value })}
                                        className="w-16 text-center text-sm font-bold bg-white border-b border-yellow-500 focus:outline-none focus:border-yellow-500 text-black placeholder-yellow-300 font-THSarabun"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="number"
                                    value={displayValue(formData.totals[key])}
                                    readOnly
                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Additional Information Section */}
                {Object.entries(infoTypeToKey).map(([displayName, key]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <div className="h-12 flex items-center justify-center">
                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{displayName}</h4>
                        </div>
                        {WARD_ORDER.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-pink-400/20 to-pink-500/10 rounded-md p-1 text-pink-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="number"
                                        value={displayValue(formData.wards[ward]?.[key])}
                                        onChange={(e) => handleInputChange('info', ward, { [key]: e.target.value })}
                                        className="w-16 text-center text-sm font-bold bg-white border-b border-pink-500 focus:outline-none focus:border-pink-500 text-black placeholder-pink-300 font-THSarabun"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="number"
                                    value={displayValue(formData.totals[key])}
                                    readOnly
                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Comment Section */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Comment</h4>
                    </div>
                    {WARD_ORDER.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-md p-1 shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    value={formData.wards[ward]?.comment || ''}
                                    onChange={(e) => handleInputChange('comment', ward, { comment: e.target.value })}
                                    className="w-24 text-center text-xs bg-white border-b border-gray-400 focus:outline-none focus:border-gray-600 text-black placeholder-gray-300 font-THSarabun"
                                    placeholder="Add comment..."
                                />
                            </div>
                        </div>
                    ))}
                    <div className="h-8"></div>
                </div>

                {/* Approval Status Section */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Approval Status</h4>
                    </div>
                    {WARD_ORDER.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-md p-1 shadow h-8">
                            <div className="text-center flex justify-center items-center">
                                {approvalStatuses[ward] ? (
                                    <ApproveButton
                                        wardId={ward}
                                        date={selectedDate}
                                        status={approvalStatuses[ward]}
                                    />
                                ) : (
                                    <span className="text-xs text-gray-500">No data</span>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="h-8"></div>
                </div>
            </div>
        </div>
    );
};

// สร้าง DataTable โดยรับ props data และ onChange