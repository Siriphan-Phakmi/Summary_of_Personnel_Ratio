'use client';
import React from 'react';

const Staff = ({
    WARD_ORDER,
    formData,
    handleInputChange,
    initialWardData,
    displayValue,
    calculateTotals
}) => {
    return (
        <div className="min-w-[500px] flex-1">
            <div className="overflow-x-visible">
                <div className="min-w-max bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-xl shadow-xl border border-gray-100">
                    <div className="bg-[#0ab4ab] text-white p-3 font-semibold text-lg text-center whitespace-nowrap">
                        Staff
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-5 divide-y-0">
                            {/* Headers with better contrast */}
                            {['Nurse Manager', 'RN', 'PN', 'WC', 'Total'].map((header) => (
                                <div key={header} className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                    {header}
                                </div>
                            ))}

                            {/* Data Rows with improved visibility */}
                            {WARD_ORDER.map((ward) => {
                                const data = formData.wards[ward] || { ...initialWardData };
                                return (
                                    <React.Fragment key={`staff-${ward}`}>
                                        {['nurseManager', 'RN', 'PN', 'WC'].map((field) => (
                                            <div key={`${ward}-${field}`} className="border border-gray-200/50 p-1.5 bg-white/80">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={displayValue(data[field])}
                                                    onChange={(e) => handleInputChange('wards', ward, { ...data, [field]: e.target.value })}
                                                    className="w-full text-center border-0 focus:ring-0 text-gray-800 font-medium bg-transparent"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <span className="block text-center text-gray-800 font-medium">
                                                {parseInt(data.nurseManager || 0) + parseInt(data.RN || 0) + parseInt(data.PN || 0) + parseInt(data.WC || 0)}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    {/* Totals Row with improved visibility */}
                    <div className="border-t-2 border-[#0ab4ab] mt-2 p-2 bg-gray-50">
                        <div className="grid grid-cols-5 gap-0">
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.nurseManager}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.RN}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.PN}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.WC}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.nurseManager + calculateTotals.RN + calculateTotals.PN + calculateTotals.WC}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Staff;
