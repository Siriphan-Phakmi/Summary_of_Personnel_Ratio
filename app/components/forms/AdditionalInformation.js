'use client';
import React from 'react';

const AdditionalInformation = ({ 
    WARD_ORDER, 
    formData, 
    handleInputChange, 
    initialWardData, 
    displayValue,
    calculateTotals 
}) => {
    return (
        <div className="min-w-[500px] flex-1"> {/* ปรับความกว้างให้รองรับคอลัมน์เพิ่ม */}
            <div className="overflow-x-visible">
                <div className="min-w-max bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-xl shadow-xl border border-gray-100">
                    <div className="bg-[#0ab4ab] text-white p-3 font-semibold text-lg text-center whitespace-nowrap">
                        Additional Information
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-4 divide-y-0"> {/* เปลี่ยนจาก 2 เป็น 4 คอลัมน์ */}
                            {/* Header */}
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Available Beds
                            </div>
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Unavailable
                            </div>
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Plan D/C
                            </div>
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Comment
                            </div>

                            {/* Data Rows */}
                            {WARD_ORDER.map((ward) => {
                                const data = formData.wards[ward] || { ...initialWardData };
                                return (
                                    <React.Fragment key={`additional-${ward}`}>
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <input
                                                type="number"
                                                min="0"
                                                max="99999"
                                                value={displayValue(data.availableBeds)}
                                                onChange={(e) => handleInputChange('wards', ward, { ...data, availableBeds: e.target.value })}
                                                className="w-full text-center border-0 focus:ring-0 text-gray-800 px-2 font-medium bg-transparent"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <input
                                                type="number"
                                                min="0"
                                                max="99999"
                                                value={displayValue(data.unavailable)}
                                                onChange={(e) => handleInputChange('wards', ward, { ...data, unavailable: e.target.value })}
                                                className="w-full text-center border-0 focus:ring-0 text-gray-800 font-medium bg-transparent"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <input
                                                type="number"
                                                min="0"
                                                max="99999"
                                                value={displayValue(data.plannedDischarge)}
                                                onChange={(e) => handleInputChange('wards', ward, { ...data, plannedDischarge: e.target.value })}
                                                className="w-full text-center border-0 focus:ring-0 text-gray-800 font-medium bg-transparent"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <input
                                                type="text"
                                                value={data.comment || ''}
                                                onChange={(e) => handleInputChange('wards', ward, { ...data, comment: e.target.value })}
                                                className="w-full text-left border-0 focus:ring-0 text-gray-800 px-2 font-medium bg-transparent"
                                                placeholder="Add comment..."
                                            />
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    {/* Add Totals Row */}
                    <div className="border-t-2 border-[#0ab4ab] mt-2 p-2 bg-gray-50">
                        <div className="grid grid-cols-4 gap-0">
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.availableBeds}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.unavailable}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.plannedDischarge}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800">
                                -
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdditionalInformation;
