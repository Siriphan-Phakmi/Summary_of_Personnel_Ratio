'use client';
import React from 'react';
import { handleInputChange } from './EventHandlers';

export const PatientCensusSection = ({ formData, setFormData, setHasUnsavedChanges, selectedShift }) => {
    // ฟังก์ชันช่วยคำนวณค่าตามสูตร
    const calculatePatientMovement = (data) => {
        if (!data) return '';
        
        // ฟังก์ชันช่วยแปลงค่าที่อาจเป็นข้อความให้เป็นตัวเลข (ถ้าแปลงไม่ได้ ให้เป็น 0)
        const safeParseInt = (value) => {
            if (value === '' || value === null || value === undefined) return 0;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        };
        
        // แปลงค่าก่อนคำนวณ
        const newAdmit = safeParseInt(data.newAdmit);
        const transferIn = safeParseInt(data.transferIn);
        const referIn = safeParseInt(data.referIn);
        const transferOut = safeParseInt(data.transferOut);
        const referOut = safeParseInt(data.referOut);
        const discharge = safeParseInt(data.discharge);
        const dead = safeParseInt(data.dead);
        
        return newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
    };
    
    // Handle input changes with recalculation
    const handleNumericChange = (e) => {
        handleInputChange(e, formData, setFormData, setHasUnsavedChanges);
        
        // ถ้าเป็นฟิลด์ที่เกี่ยวข้องกับการคำนวณ ให้อัพเดทค่า overall data
        if (['newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(e.target.name)) {
            const updatedFormData = {
                ...formData,
                [e.target.name]: e.target.value
            };
            
            const calculatedValue = calculatePatientMovement(updatedFormData);
            
            // อัพเดทค่า overallData
            setFormData(prev => ({
                ...updatedFormData,
                overallData: calculatedValue.toString()
            }));
        }
    };
    
    return (
        <div className="mb-6 p-4 bg-primary-pastel rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">Number of patients and movement</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Census
                    </label>
                    <input
                        type="text"
                        name="patientCensus"
                        value={formData?.patientCensus || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        readOnly={selectedShift === 'เช้า'} // ให้แก้ไขไม่ได้เมื่อเป็นกะเช้า
                    />
                    {selectedShift === 'เช้า' && 
                        <p className="text-xs text-gray-500 mt-1">*ค่านี้จะถูกดึงมาจากกะดึกของวันก่อนหน้า</p>
                    }
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overall Data
                    </label>
                    <input
                        type="text"
                        name="overallData"
                        value={formData?.overallData || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        readOnly={true} // ไม่ให้แก้ไขได้เลย เพราะคำนวณอัตโนมัติ
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Admit
                    </label>
                    <input
                        type="text"
                        name="newAdmit"
                        value={formData?.newAdmit || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer In
                    </label>
                    <input
                        type="text"
                        name="transferIn"
                        value={formData?.transferIn || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refer In
                    </label>
                    <input
                        type="text"
                        name="referIn"
                        value={formData?.referIn || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer Out
                    </label>
                    <input
                        type="text"
                        name="transferOut"
                        value={formData?.transferOut || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refer Out
                    </label>
                    <input
                        type="text"
                        name="referOut"
                        value={formData?.referOut || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discharge
                    </label>
                    <input
                        type="text"
                        name="discharge"
                        value={formData?.discharge || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dead
                    </label>
                    <input
                        type="text"
                        name="dead"
                        value={formData?.dead || ''}
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available
                    </label>
                    <input
                        type="text"
                        name="availableBeds"
                        value={formData?.availableBeds || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unavailable
                    </label>
                    <input
                        type="text"
                        name="unavailable"
                        value={formData?.unavailable || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Planned Discharge
                    </label>
                    <input
                        type="text"
                        name="plannedDischarge"
                        value={formData?.plannedDischarge || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
};

export const StaffSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-primary">Number of Personnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nurse Manager
                    </label>
                    <input
                        type="text"
                        name="nurseManager"
                        value={formData?.nurseManager || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        RN
                    </label>
                    <input
                        type="text"
                        name="RN"
                        value={formData?.RN || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        PN
                    </label>
                    <input
                        type="text"
                        name="PN"
                        value={formData?.PN || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        WC
                    </label>
                    <input
                        type="text"
                        name="WC"
                        value={formData?.WC || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        NA
                    </label>
                    <input
                        type="text"
                        name="nas"
                        value={formData?.nas || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
};

export const NotesSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-primary">Comment</h2>
            <div>
                <textarea
                    name="comment"
                    value={formData?.comment || ''}
                    onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    placeholder="Add comment..."
                ></textarea>
            </div>
            
            <h3 className="text-lg font-semibold mt-4 mb-3 text-primary">Recording Officer</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData?.firstName || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="ชื่อ"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData?.lastName || ''}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="นามสกุล"
                    />
                </div>
            </div>
        </div>
    );
}; 