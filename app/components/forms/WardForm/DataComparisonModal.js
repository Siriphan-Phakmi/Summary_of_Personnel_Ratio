'use client';

import React from 'react';

/**
 * คอมโพเนนต์สำหรับเปรียบเทียบข้อมูลก่อนบันทึกฉบับร่าง
 */
const DataComparisonModal = ({
    isOpen,
    onClose,
    onSave,
    existingData,
    newData,
    theme = 'light',
    mode = 'save' // รับโหมดการทำงานใหม่
}) => {
    if (!isOpen) return null;
    
    // กำหนดให้ใช้ light mode เสมอ
    const isDark = false;
    
    // ฟังก์ชันตรวจสอบว่าค่าเปลี่ยนแปลงหรือไม่
    const hasValueChanged = (oldValue, newValue) => {
        if (oldValue === newValue) return false;
        if (oldValue === undefined && newValue === '') return false;
        if (oldValue === '' && newValue === undefined) return false;
        if (oldValue === null && newValue === '') return false;
        if (oldValue === '' && newValue === null) return false;
        return true;
    };
    
    // คอมโพเนนต์แสดงข้อมูลแถวเปรียบเทียบ
    const ComparisonRow = ({ label, oldValue, newValue }) => {
        const valueChanged = hasValueChanged(oldValue, newValue);
        const oldValueHasData = oldValue !== undefined && oldValue !== null && oldValue !== '';
        const newValueEmpty = newValue === undefined || newValue === null || newValue === '';
        const willLoseData = oldValueHasData && newValueEmpty;
        
        // ฟอร์แมตค่าให้อ่านง่าย
        const formatValue = (value) => {
            if (value === undefined || value === null) return '-';
            if (value === '') return 'ไม่ระบุ (Not specified)';
            return value.toString();
        };
        
        return (
            <div className={`grid grid-cols-3 gap-4 py-2 px-3 ${valueChanged ? 'bg-yellow-50' : ''} ${willLoseData ? 'bg-red-50' : ''} rounded-md`}>
                <div className="text-sm font-medium text-gray-600">{label}</div>
                <div className="text-sm text-blue-600">{formatValue(oldValue)}</div>
                <div className={`text-sm text-blue-600 ${valueChanged ? 'font-bold' : ''} ${willLoseData ? 'text-red-500' : ''}`}>
                    {formatValue(newValue)}
                    {willLoseData && <span className="ml-2 text-xs text-red-500">(Data loss warning)</span>}
                </div>
            </div>
        );
    };
    
    // เตรียมข้อมูลสำหรับเปรียบเทียบ
    const preparePatientCensusData = () => {
        const fields = [
            { key: 'hospitalPatientcensus', label: 'จำนวนผู้ป่วยในโรงพยาบาล (Hospital Patient Census)' },
            { key: 'newAdmit', label: 'รับใหม่ (New Admit)' },
            { key: 'transferIn', label: 'รับย้าย (Transfer In)' },
            { key: 'referIn', label: 'Refer In' },
            { key: 'transferOut', label: 'ย้ายออก (Transfer Out)' },
            { key: 'referOut', label: 'Refer Out' },
            { key: 'discharge', label: 'จำหน่าย (Discharge)' },
            { key: 'dead', label: 'เสียชีวิต (Death)' }
        ];
        
        return fields.map(field => ({
            label: field.label,
            oldValue: existingData?.patientCensusData?.[field.key],
            newValue: newData?.patientCensusData?.[field.key]
        }));
    };
    
    const preparePersonnelData = () => {
        const fields = [
            { key: 'nurseManager', label: 'Nurse Manager' },
            { key: 'RN', label: 'RN (Registered Nurse)' },
            { key: 'PN', label: 'PN (Practical Nurse)' },
            { key: 'WC', label: 'Ward Clerk' }
        ];
        
        return fields.map(field => ({
            label: field.label,
            oldValue: existingData?.personnelData?.[field.key],
            newValue: newData?.personnelData?.[field.key]
        }));
    };
    
    const patientCensusComparison = preparePatientCensusData();
    const personnelComparison = preparePersonnelData();
    
    // ตรวจสอบว่ามีข้อมูลที่จะสูญหายหรือไม่
    const checkForDataLoss = () => {
        const checkField = (oldValue, newValue) => {
            const oldValueHasData = oldValue !== undefined && oldValue !== null && oldValue !== '';
            const newValueEmpty = newValue === undefined || newValue === null || newValue === '';
            return oldValueHasData && newValueEmpty;
        };
        
        // ตรวจสอบข้อมูล Patient Census
        if (existingData?.patientCensusData && newData?.patientCensusData) {
            for (const key in existingData.patientCensusData) {
                if (checkField(existingData.patientCensusData[key], newData.patientCensusData[key])) {
                    return true;
                }
            }
        }
        
        // ตรวจสอบข้อมูลบุคลากร
        if (existingData?.personnelData && newData?.personnelData) {
            for (const key in existingData.personnelData) {
                if (checkField(existingData.personnelData[key], newData.personnelData[key])) {
                    return true;
                }
            }
        }
        
        // ตรวจสอบหมายเหตุ
        if (checkField(existingData?.notes?.general, newData?.notes?.general)) {
            return true;
        }
        
        return false;
    };
    
    const hasDataLoss = checkForDataLoss();
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white text-gray-800 rounded-xl p-6 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl">
                <h2 className="text-xl font-medium mb-4 text-gray-800">
                    {mode === 'save' ? 'ยืนยันการบันทึกฉบับร่าง' : 'เปรียบเทียบข้อมูลก่อนบันทึก'}
                </h2>
                
                {mode === 'save' ? (
                    <div className="text-center p-4">
                        <p className="text-lg mb-4">คุณต้องการบันทึกข้อมูลนี้เป็นฉบับร่างหรือไม่?</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => onSave('overwrite')}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                บันทึกทับ
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ข้อมูลทั่วไป */}
                        <div className="p-4 border rounded-lg border-gray-200">
                            <h3 className="font-medium text-lg mb-3 text-gray-800">ข้อมูลทั่วไป (General Information)</h3>
                            <div className="space-y-2">
                                <ComparisonRow 
                                    label="กะการทำงาน (Shift)" 
                                    oldValue={existingData?.shift} 
                                    newValue={newData?.shift} 
                                />
                                <ComparisonRow 
                                    label="วันที่ (Date)" 
                                    oldValue={existingData?.date} 
                                    newValue={newData?.date} 
                                />
                                <ComparisonRow 
                                    label="แผนก (Department)" 
                                    oldValue={existingData?.department} 
                                    newValue={newData?.department} 
                                />
                            </div>
                        </div>
                        
                        {/* ข้อมูล Patient Census */}
                        <div className="p-4 border rounded-lg border-gray-200">
                            <h3 className="font-medium text-lg mb-3 text-gray-800">Patient Census</h3>
                            <div className="space-y-2">
                                {patientCensusComparison.map((item, index) => (
                                    <ComparisonRow 
                                        key={index}
                                        label={item.label} 
                                        oldValue={item.oldValue} 
                                        newValue={item.newValue} 
                                    />
                                ))}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <ComparisonRow 
                                        label="จำนวนผู้ป่วยรวม (Total Patient Count)" 
                                        oldValue={existingData?.patientCensusTotal} 
                                        newValue={newData?.patientCensusTotal} 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* ข้อมูลบุคลากร */}
                        <div className="p-4 border rounded-lg border-gray-200">
                            <h3 className="font-medium text-lg mb-3 text-gray-800">ข้อมูลบุคลากร (Personnel Data)</h3>
                            <div className="space-y-2">
                                {personnelComparison.map((item, index) => (
                                    <ComparisonRow 
                                        key={index}
                                        label={item.label} 
                                        oldValue={item.oldValue} 
                                        newValue={item.newValue} 
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* หมายเหตุ */}
                        <div className="p-4 border rounded-lg border-gray-200">
                            <h3 className="font-medium text-lg mb-3 text-gray-800">หมายเหตุ (Notes)</h3>
                            <div className="space-y-2">
                                <ComparisonRow 
                                    label="หมายเหตุ (Notes)" 
                                    oldValue={existingData?.notes?.general} 
                                    newValue={newData?.notes?.general} 
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="mt-6 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                        ยกเลิก (Cancel)
                    </button>
                    
                    {hasDataLoss && (
                        <button
                            onClick={() => onSave('preserve')}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            title="Preserve existing data in fields where new data is empty"
                        >
                            บันทึกแบบรักษาข้อมูลเดิม (Save & Preserve Data)
                        </button>
                    )}
                    
                    <button
                        onClick={() => onSave('overwrite')}
                        className="px-4 py-2 text-white rounded-lg bg-[#0ab4ab] hover:bg-[#099b93]"
                    >
                        บันทึกข้อมูล (Save)
                    </button>
                </div>
                
                {hasDataLoss && (
                    <div className="mt-3 text-sm text-red-500 bg-red-50 p-3 rounded-md">
                        <p>⚠️ คำเตือน: มีข้อมูลเดิมบางส่วนที่จะหายไปหากบันทึกข้อมูลใหม่ทับ</p>
                        <p>⚠️ Warning: Some existing data will be lost if you save the new data</p>
                        <p>• "บันทึกแบบรักษาข้อมูลเดิม" (Save & Preserve Data) - Keep existing data in fields where no new data was entered</p>
                        <p>• "บันทึกข้อมูล" (Save) - Replace all data (existing data may be lost)</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataComparisonModal; 