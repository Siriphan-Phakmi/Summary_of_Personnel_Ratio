'use client';
import React from 'react';
import { handleInputChange } from './EventHandlers';
import LoadingScreen from '../../ui/LoadingScreen';
import FormDateShiftSelector from '../../common/FormDateShiftSelector';
import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';

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
        // Ensure the input is numeric only
        const inputValue = e.target.value.replace(/[^0-9]/g, '');
        
        // Update form data directly
        const name = e.target.name;
        
        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: inputValue
            };
            
            // ถ้าเป็นฟิลด์ที่เกี่ยวข้องกับการคำนวณ ให้อัพเดทค่า overall data
            if (['newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(name)) {
                const calculatedMovement = calculatePatientMovement(updated);
                
                // อัพเดทค่า overallData โดยคำนวณจาก patientCensus + movement
                const patientCensus = parseInt(updated.patientCensus) || 0;
                const calculatedOverall = patientCensus + calculatedMovement;
                
                updated.overallData = calculatedOverall.toString();
            }
            
            return updated;
        });
        
        // Set has unsaved changes
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    };
    
    return (
        <div className="mb-6 p-4 bg-primary-pastel rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">Number of patients and movement</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Census <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="patientCensus"
                        value={formData?.patientCensus || ''}
                        onChange={(e) => {
                            // Only allow numeric input
                            const numericValue = e.target.value.replace(/[^0-9]/g, '');
                            setFormData(prev => ({...prev, patientCensus: numericValue}));
                            if (setHasUnsavedChanges) setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2 bg-gray-100 border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        readOnly={true} // Make read-only for both shifts
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    {selectedShift === 'ดึก' && 
                        <p className="text-xs text-gray-500 mt-1">*ค่านี้จะถูกคำนวณจากกะเช้าและไม่สามารถแก้ไขได้</p>
                    }
                    {selectedShift === 'เช้า' && 
                        <p className="text-xs text-gray-500 mt-1">*คำนวณอัตโนมัติจาก Overall Data ของกะดึกวันก่อนหน้า ไม่สามารถแก้ไขได้</p>
                    }
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overall Data <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="overallData"
                        value={formData?.overallData || ''}
                        className="w-full p-2 bg-gray-100 border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        readOnly={true} // ไม่ให้แก้ไขได้เลย เพราะคำนวณอัตโนมัติ
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        *คำนวณตามสูตร: Patient Census + (New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead)
                    </p>
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericChange}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
            </div>
        </div>
    );
};

export const StaffSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    // Add numeric input handler
    const handleNumericInput = (e) => {
        // Ensure the input is numeric only
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        const name = e.target.name;
        
        // Update form data directly
        setFormData(prev => ({
            ...prev,
            [name]: numericValue
        }));
        
        // Set has unsaved changes
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    };
    
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
                        onChange={handleNumericInput}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericInput}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericInput}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                        onChange={handleNumericInput}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        NA
                    </label>
                    <input
                        type="text"
                        name="NA"
                        value={formData?.NA || ''}
                        onChange={handleNumericInput}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                    onChange={(e) => {
                        // Direct comment update with no validation to ensure it's editable
                        setFormData(prev => ({...prev, comment: e.target.value}));
                        setHasUnsavedChanges(true);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    placeholder="Add comment..."
                ></textarea>
            </div>
        </div>
    );
};

// เพิ่ม MainFormContent component
export const MainFormContent = ({ 
    isLoading,
    selectedDate,
    selectedShift,
    selectedWard,
    formData,
    setFormData,
    handleLocalDateSelect,
    handleShiftChange,
    thaiDate,
    setThaiDate,
    showCalendar,
    setShowCalendar,
    datesWithData,
    theme,
    approvalStatus,
    setHasUnsavedChanges,
    onSaveDraft,
    onSubmit,
    isSubmitting
}) => {
    // ฟังก์ชันสำหรับการแสดงผลตามเงื่อนไข
    const renderContent = () => {
        if (isLoading) {
            return <LoadingScreen />;
        }

        // ถ้ายังไม่เลือกวันที่หรือกะ ให้แสดงเฉพาะส่วนเลือกวันที่และกะเท่านั้น
        if (!selectedDate || !selectedShift) {
            return (
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">กรุณาเลือกข้อมูลเริ่มต้น</h2>
                        <p className="text-gray-600 dark:text-gray-300">โปรดเลือกวันที่และกะก่อนเริ่มกรอกข้อมูล</p>
                    </div>
                    
                    <FormDateShiftSelector
                        selectedDate={selectedDate}
                        onDateSelect={handleLocalDateSelect}
                        thaiDate={thaiDate}
                        setThaiDate={setThaiDate}
                        selectedShift={selectedShift === 'เช้า' ? '07:00-19:00' : '19:00-07:00'}
                        onShiftChange={(value) => {
                            const newShift = value === '07:00-19:00' ? 'เช้า' : 'ดึก';
                            if (typeof handleShiftChange === 'function') {
                                handleShiftChange(newShift);
                            } else {
                                console.warn('handleShiftChange is not a function in MainFormContent');
                            }
                        }}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
                        datesWithData={datesWithData}
                        theme={theme}
                    />
                </div>
            );
        }
        
        // ถ้าเลือกวันที่และกะแล้ว แสดงฟอร์มทั้งหมด (เปลี่ยนลำดับ Component ให้ NotesSection อยู่ก่อน RecordingOfficerSection)
        return (
            <form onSubmit={onSubmit} className="space-y-8">
                <PatientCensusSection
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    selectedShift={selectedShift}
                />
                
                <StaffSection
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />
                
                <NotesSection
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />
                
                <RecordingOfficerSection
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />

                <ActionButtons
                    onSaveDraft={onSaveDraft}
                    isSubmitting={isSubmitting}
                />
            </form>
        );
    };

    return (
        <div className="max-w-5xl mx-auto my-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                    บันทึกข้อมูลประจำวัน
                </h1>
                
                <div className="bg-primary-light/20 dark:bg-primary-dark/20 p-3 rounded-lg mb-6 text-center">
                    <h2 className="text-xl font-semibold text-primary dark:text-primary-light">
                        {selectedWard || 'กรุณาเลือกวอร์ด'}
                    </h2>
                </div>
                
                <FormDateShiftSelector
                    selectedDate={selectedDate}
                    onDateSelect={handleLocalDateSelect}
                    thaiDate={thaiDate}
                    setThaiDate={setThaiDate}
                    selectedShift={selectedShift === 'เช้า' ? '07:00-19:00' : '19:00-07:00'}
                    onShiftChange={(value) => {
                        const newShift = value === '07:00-19:00' ? 'เช้า' : 'ดึก';
                        if (typeof handleShiftChange === 'function') {
                            handleShiftChange(newShift);
                        } else {
                            console.warn('handleShiftChange is not a function in MainFormContent');
                        }
                    }}
                    showCalendar={showCalendar}
                    setShowCalendar={setShowCalendar}
                    datesWithData={datesWithData}
                    theme={theme}
                />
                
                {approvalStatus && (
                    <div className="mb-4">
                        <ApprovalStatusIndicator status={approvalStatus} />
                    </div>
                )}
            </div>
            
            <div className="space-y-8">
                {renderContent()}
            </div>
        </div>
    );
};

// เพิ่ม RecordingOfficerSection component
export const RecordingOfficerSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Recording Officer <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อ <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={(e) => {
                            // Direct update to ensure field is editable
                            setFormData(prev => ({...prev, firstName: e.target.value}));
                            setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2 border rounded-md bg-white text-gray-700"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={(e) => {
                            // Direct update to ensure field is editable
                            setFormData(prev => ({...prev, lastName: e.target.value}));
                            setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2 border rounded-md bg-white text-gray-700"
                        required
                    />
                </div>
            </div>
        </div>
    );
};

// เพิ่ม ActionButtons component
export const ActionButtons = ({ onSaveDraft, isSubmitting }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4 mb-8">
            <button
                type="button"
                onClick={onSaveDraft}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
            </button>
            
            <button
                type="submit"
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
        </div>
    );
}; 