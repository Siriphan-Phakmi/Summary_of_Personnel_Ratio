'use client';
import React from 'react';

const PatientMovement = ({ 
    WARD_ORDER, 
    formData, 
    handleInputChange, 
    initialWardData, 
    displayValue, 
    calculateTotals,
    isReadOnly // เพิ่ม prop สำหรับควบคุมการแก้ไขข้อมูล
}) => {
    const movementFields = {
        newAdmit: 'New Admit',
        transferIn: 'Transfer In',
        referIn: 'Refer In',
        transferOut: 'Transfer Out',
        referOut: 'Refer Out',
        discharge: 'Discharge',
        dead: 'Dead'
    };

    // เพิ่มฟังก์ชันคำนวณ overallData
    const calculateOverallData = (data) => {
        return Math.max(0,
            (parseInt(data.numberOfPatients) || 0) +
            (parseInt(data.newAdmit) || 0) +
            (parseInt(data.transferIn) || 0) +
            (parseInt(data.referIn) || 0) -
            (parseInt(data.transferOut) || 0) -
            (parseInt(data.referOut) || 0) -
            (parseInt(data.discharge) || 0) -
            (parseInt(data.dead) || 0)
        );
    };

    const handleMovementChange = (ward, field, value) => {
        const updatedData = {
            ...formData.wards[ward],
            [field]: value
        };
        
        // คำนวณ overallData ใหม่
        const newOverallData = calculateOverallData(updatedData);
        updatedData.overallData = newOverallData.toString();
        
        handleInputChange('wards', ward, updatedData);
    };

    return (
        <div className="min-w-[800px] flex-1">
            <div className="overflow-x-visible">
                <div className="min-w-max bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-xl shadow-xl border border-gray-100">
                    <div className="bg-[#0ab4ab] text-white p-3 font-semibold text-lg text-center whitespace-nowrap">
                        Patient Movement
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-7 divide-y-0">
                            {/* Headers with better contrast */}
                            {Object.values(movementFields).map((header) => (
                                <div key={header} className="border border-gray-200/50 p-1 text-center font-medium bg-gradient-to-br from-[#0ab4ab] to-[#0ab4ab]/90 text-white shadow-sm">
                                    {header}
                                </div>
                            ))}

                            {/* Data Rows with improved visibility */}
                            {WARD_ORDER.map((ward) => {
                                const data = formData.wards[ward] || { ...initialWardData };
                                return (
                                    <React.Fragment key={`movement-${ward}`}>
                                        {Object.entries(movementFields).map(([field, label]) => (
                                            <div key={`${ward}-${field}`} className="border border-gray-200/50 p-1.5 bg-white/80">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={displayValue(data[field])}
                                                    onChange={(e) => handleMovementChange(ward, field, e.target.value)}
                                                    className="w-full text-center border-0 focus:ring-0 text-gray-800 font-medium bg-transparent"
                                                    placeholder="0"
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    {/* Totals Row with improved visibility */}
                    <div className="border-t-2 border-[#0ab4ab] mt-2 p-2 bg-gray-50">
                        <div className="grid grid-cols-7 gap-0">
                            {Object.keys(movementFields).map((field) => (
                                <div key={`total-${field}`} className="p-1.5 text-center font-semibold text-gray-800 bg-white/90 rounded">
                                    {calculateTotals[field]}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientMovement;
