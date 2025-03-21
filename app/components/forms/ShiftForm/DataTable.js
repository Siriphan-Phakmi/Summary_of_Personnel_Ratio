import React from 'react';
import { formatWardName } from '../../../utils/formatters';
import { wardMapping } from '../../../utils/wardConstants';
import ApproveButton from './ApproveButton';

export const DataTable = ({
    WARD_ORDER,
    formData,
    handleInputChange,
    displayValue,
    approvalStatuses = {}, // Add approvalStatuses parameter with a default empty object
    selectedDate,
    readOnly = false
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
        'WC': 'WC',
        'NA': 'nurseAid'
    };

    // Map additional info types to their corresponding keys in formData
    const infoTypeToKey = {
        'Available': 'availableBeds',
        'Unavailable': 'unavailable',
        'Planned Discharge': 'plannedDischarge'
    };

    // ฟังก์ชันช่วยจัดการการป้อนข้อมูลอย่างปลอดภัย
    const safeHandleInputChange = (key, ward, value) => {
        if (typeof handleInputChange === 'function') {
            // รับค่า numeric input เท่านั้น และอนุญาตเฉพาะตัวเลข
            const numericValue = value.replace(/[^0-9]/g, '');
            handleInputChange(key, ward, numericValue);
        }
    };

    // สร้างฟังก์ชันช่วยเพื่อปกป้องการเข้าถึงค่าจาก formData.wards
    const safeGetWardData = (ward, key) => {
        if (!formData || !formData[ward]) {
            return '';
        }
        return formData[ward][key];
    };

    // ตรวจสอบว่า WARD_ORDER มีค่าและเป็น array หรือไม่
    const validWardOrder = Array.isArray(WARD_ORDER) ? WARD_ORDER : [];

    return (
        <div className="overflow-x-auto">
            <div className="inline-flex gap-1 min-w-max p-1">
                {/* Headers Row */}
                <div className="flex flex-col gap-1">
                    <div className="h-12 flex items-center justify-center">
                        <h3 className="text-xs font-bold text-gray-700 font-THSarabun">Wards</h3>
                    </div>
                    {validWardOrder.map((ward) => (
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
                    {validWardOrder.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-[#0ab4ab]/20 to-[#0ab4ab]/10 rounded-md p-1 text-[#0ab4ab] shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={displayValue(safeGetWardData(ward, 'numberOfPatients'))}
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={displayValue(formData?.totals?.numberOfPatients || '0')}
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
                    {validWardOrder.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-blue-400/20 to-blue-500/10 rounded-md p-1 text-blue-600 shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={displayValue(safeGetWardData(ward, 'overallData'))}
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={displayValue(formData?.totals?.overallData || '0')}
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
                        {validWardOrder.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-md p-1 text-green-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={displayValue(safeGetWardData(ward, key))}
                                        onChange={(e) => safeHandleInputChange(key, ward, e.target.value)}
                                        className={`w-16 text-center text-sm font-bold ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-b border-green-500 focus:outline-none focus:border-green-500 text-black placeholder-green-300 font-THSarabun`}
                                        placeholder="0"
                                        min="0"
                                        readOnly={readOnly}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={displayValue(formData?.totals?.[key] || '0')}
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
                        {validWardOrder.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 rounded-md p-1 text-yellow-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={displayValue(safeGetWardData(ward, key))}
                                        onChange={(e) => safeHandleInputChange(key, ward, e.target.value)}
                                        className={`w-16 text-center text-sm font-bold ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-b border-yellow-500 focus:outline-none focus:border-yellow-500 text-black placeholder-yellow-300 font-THSarabun`}
                                        placeholder="0"
                                        min="0"
                                        readOnly={readOnly}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={displayValue(formData?.totals?.[key] || '0')}
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
                        {validWardOrder.map((ward) => (
                            <div key={ward} className="bg-gradient-to-r from-pink-400/20 to-pink-500/10 rounded-md p-1 text-pink-600 shadow h-8">
                                <div className="text-center">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={displayValue(safeGetWardData(ward, key))}
                                        onChange={(e) => safeHandleInputChange(key, ward, e.target.value)}
                                        className={`w-16 text-center text-sm font-bold ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-b border-pink-500 focus:outline-none focus:border-pink-500 text-black placeholder-pink-300 font-THSarabun`}
                                        placeholder="0"
                                        min="0"
                                        readOnly={readOnly}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={displayValue(formData?.totals?.[key] || '0')}
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
                    {validWardOrder.map((ward) => (
                        <div key={ward} className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-md p-1 shadow h-8">
                            <div className="text-center">
                                <input
                                    type="text"
                                    value={formData?.[ward]?.comment || ''}
                                    onChange={(e) => safeHandleInputChange('comment', ward, e.target.value)}
                                    className={`w-24 text-center text-xs ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-b border-gray-400 focus:outline-none focus:border-gray-600 text-black placeholder-gray-300 font-THSarabun`}
                                    placeholder="Add comment..."
                                    readOnly={readOnly}
                                    disabled={readOnly}
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
                    {validWardOrder.map((ward) => (
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