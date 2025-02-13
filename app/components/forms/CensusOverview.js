'use client';
import React from 'react';

const CensusOverview = ({ 
    WARD_ORDER, 
    formData, 
    handleInputChange, 
    initialWardData, 
    formatWardName,
    calculateTotals,
    isReadOnly // เพิ่ม prop สำหรับควบคุมการแก้ไขข้อมูล
}) => {
    const handleCensusChange = (ward, value) => {
        const data = formData.wards[ward] || { ...initialWardData };
        handleInputChange('wards', ward, { 
            ...data, 
            numberOfPatients: value,
            overallData: value // Set initial overallData to match numberOfPatients
        });
    };

    return (
        <div className="min-w-[350px] flex-1">
            <div className="overflow-x-visible">
                <div className="min-w-max bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-xl shadow-xl border border-gray-100">
                    <div className="bg-[#0ab4ab] text-white p-3 font-semibold text-lg text-center whitespace-nowrap">
                        Census Overview
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-3 divide-y-0"> {/* เปลี่ยนจาก 2 เป็น 3 คอลัมน์ */}
                            {/* Headers */}
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Ward
                            </div>
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Patient Census
                            </div>
                            <div className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                Overall Data
                            </div>

                            {/* Data Rows */}
                            {WARD_ORDER.map((ward) => {
                                const data = formData.wards[ward] || { ...initialWardData };
                                return (
                                    <React.Fragment key={ward}>
                                        {/* Ward Name Column */}
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <span className="block text-center text-gray-800 font-medium">
                                                {formatWardName(ward)}
                                            </span>
                                        </div>
                                        {/* Patient Census Column */}
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <input
                                                type="number"
                                                min="0"
                                                max="99999"
                                                value={data.numberOfPatients}
                                                onChange={(e) => handleCensusChange(ward, e.target.value)}
                                                className="w-full text-center border-0 focus:ring-0 text-gray-800 font-medium bg-transparent"
                                                placeholder="0"
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                        {/* Overall Data Column */}
                                        <div className="border border-gray-200/50 p-1.5 bg-white/80">
                                            <span className="block text-center text-gray-800 font-medium">
                                                {data.overallData}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    {/* Totals Row */}
                    <div className="border-t-2 border-[#0ab4ab] mt-2 p-2 bg-gray-50">
                        <div className="grid grid-cols-3 gap-0"> {/* เปลี่ยนจาก 2 เป็น 3 คอลัมน์ */}
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                Total
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.numberOfPatients}
                            </div>
                            <div className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                {calculateTotals.overallData}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CensusOverview;
