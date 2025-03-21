'use client';

/**
 * WardForm Component v2.0
 * 
 * การปรับปรุง:
 * - แยกส่วนต่างๆ ออกเป็นโมดูล เพื่อให้ไฟล์มีขนาดเล็กลงและง่ายต่อการจัดการ
 * - ปรับปรุงการแสดงผลในโหมด Dark Mode
 * - เพิ่มฟิลด์ใหม่สำหรับ Nurse Manager และ Ward Clerk
 * - ประสานการทำงานกับ MainFormContent
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getCurrentShift } from '../../../utils/dateHelpers';

// Import components จากโมดูลที่แยกออกไป
import MainFormContent from './MainFormContent';

// Import data handlers
import { 
    loadData, 
    resetForm, 
    calculatePatientCensusTotal,
    validateFormBeforeSave,
    showAlert,
    showConfirm 
} from './DataHandlers';

// Import form actions
import { 
    createOnSaveDraft, 
    createOnSubmit, 
    handleWardFormSubmit, 
    createHandleCancel 
} from './FormActions';

// Import event handlers
import { 
    createHandleDateChange,
    createHandleShiftChange,
    createHandleBeforeUnload
} from './EventHandlers';

import DataComparisonModal from './DataComparisonModal';

// Initial form data structure
const initialFormData = {
    patientCensusData: {},
    personnelData: {},
    notes: {},
    patientCensusTotal: 0,
    date: '',
    shift: '',
    departmentId: '',
    wardId: '',
    status: ''
};

/**
 * WardForm - คอมโพเนนต์หลักสำหรับฟอร์มกรอกข้อมูลวอร์ด
 */
const WardForm = ({ selectedWard, preselectedDate, preselectedShift }) => {
    const router = useRouter();
    const { user } = useAuth();
    const { theme } = useTheme();
    
    // ตรวจสอบกะปัจจุบันตามเวลา
    const currentShift = getCurrentShift();
    const initialShift = preselectedShift || 
                         (currentShift === '07:00-19:00' ? 'Morning (07:00-19:00)' : 'Night (19:00-07:00)');
    
    // State สำหรับข้อมูลทั่วไป
    const [selectedDate, setSelectedDate] = useState(preselectedDate || new Date());
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [thaiDate, setThaiDate] = useState(() => formatThaiDate(preselectedDate || new Date()));
    const [formData, setFormData] = useState(initialFormData);
    const [datesWithData, setDatesWithData] = useState([]);
    
    // State สำหรับการควบคุม UI
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initError, setInitError] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null);
    
    // เพิ่ม state สำหรับควบคุม Modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    
    // ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
    function formatThaiDate(date) {
        if (!date) return '';
        return format(date, 'dd MMMM yyyy', { locale: th });
    }
    
    // สร้าง event handlers สำหรับฟอร์ม
    const handleLocalDateSelect = createHandleDateChange(
        setSelectedDate, setThaiDate, formatThaiDate, setHasUnsavedChanges
    );
    
    const handleShiftChange = createHandleShiftChange(
        setSelectedShift, setHasUnsavedChanges
    );
    
    const handleLocalBeforeUnload = createHandleBeforeUnload(hasUnsavedChanges);
    
    // สร้าง callback สำหรับ reset form
    const resetFormCallback = useCallback((shift = selectedShift) => {
        resetForm(setFormData, initialFormData, setHasUnsavedChanges, setIsDraftMode, setIsSubmitting, shift);
    }, [selectedShift]);
    
    // สร้าง callback สำหรับ save draft และ submit
    const onSaveDraft = useMemo(() =>
        createOnSaveDraft(
            formData,
            setFormData,
            selectedDate,
            selectedWard,
            selectedShift,
            setIsSubmitting,
            setIsDraftMode,
            setHasUnsavedChanges,
            user
        ),
        [formData, selectedDate, selectedWard, selectedShift, user]
    );

    const onSubmit = useMemo(() =>
        createOnSubmit(
            formData,
            setFormData,
            selectedDate,
            selectedWard,
            selectedShift,
            setIsSubmitting,
            setIsDraftMode,
            setHasUnsavedChanges,
            user
        ),
        [formData, selectedDate, selectedWard, selectedShift, user]
    );

    // ตรวจสอบข้อมูลที่จำเป็นและเตือนผู้ใช้หากไม่ครบถ้วน
    useEffect(() => {
        // ตรวจสอบเมื่อมีการเปลี่ยนแปลงค่าที่เกี่ยวข้อง
        if (!selectedDate || !selectedWard || !selectedShift) {
            // แสดงคำแนะนำสำหรับผู้ใช้บนหน้าจอ
            console.log('โปรดเลือกวันที่ แผนก และกะการทำงานให้ครบถ้วน');
        }
    }, [selectedDate, selectedWard, selectedShift]);
    
    // Effect สำหรับตรวจสอบการเปลี่ยนแปลงหน้าเว็บ
    useEffect(() => {
        window.addEventListener('beforeunload', handleLocalBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleLocalBeforeUnload);
        };
    }, [handleLocalBeforeUnload]);
    
    // Effect สำหรับโหลดข้อมูลเมื่อมีการเปลี่ยนแปลงวันที่หรือกะ
    useEffect(() => {
        if (!selectedDate || !selectedWard || !selectedShift) {
            setIsLoading(false);
            return;
        }
        
        let isMounted = true;
        
        // เรียกใช้ loadData แบบแยกออกมา
        const fetchData = async () => {
            try {
                // เรียกใช้ loadData จาก DataHandlers
                await loadData(
                    selectedDate, 
                    selectedWard, 
                    selectedShift, 
                    setFormData, 
                    setIsLoading, 
                    setInitError, 
                    () => resetFormCallback(selectedShift),
                    setIsReadOnly, 
                    setApprovalStatus,
                    setHasUnsavedChanges,
                    setIsDraftMode,
                    setIsSubmitting
                );
            } catch (error) {
                console.error('Error in loadData:', error);
                if (isMounted) {
                    setInitError(`เกิดข้อผิดพลาด: ${error.message}`);
                    setIsLoading(false);
                }
            }
        };
        
        // เรียกใช้ฟังก์ชัน fetchData
        fetchData();
        
        // ตั้งค่า cleanup function
        return () => {
            isMounted = false;
        };
    }, [
        selectedDate, 
        selectedWard, 
        selectedShift, 
        resetFormCallback, 
        setApprovalStatus, 
        setFormData, 
        setInitError, 
        setIsLoading, 
        setIsReadOnly,
        setIsDraftMode,
        setIsSubmitting
    ]);
    
    // แสดงข้อความเมื่อมีข้อผิดพลาด
    if (initError) {
        return (
            <div className={`p-8 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col items-center justify-center">
                    <div className="text-red-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
                    <p className="text-center mb-4">{initError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0ab4ab] hover:bg-[#099b93]'} text-white`}
                    >
                        โหลดหน้านี้ใหม่
                    </button>
                </div>
            </div>
        );
    }
    
    // ส่งค่าไปยัง MainFormContent
    return (
        <div className="relative">
            <MainFormContent
                selectedDate={selectedDate}
                selectedShift={selectedShift}
                selectedWard={selectedWard}
                formData={formData}
                setFormData={setFormData}
                handleLocalDateSelect={handleLocalDateSelect}
                handleShiftChange={handleShiftChange}
                thaiDate={thaiDate}
                datesWithData={datesWithData}
                theme={theme}
                approvalStatus={approvalStatus}
                setApprovalStatus={setApprovalStatus}
                setHasUnsavedChanges={setHasUnsavedChanges}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveDraft={onSaveDraft}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                isDraftMode={isDraftMode}
                isReadOnly={isReadOnly}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setInitError={setInitError}
                showCalendar={showCalendar}
                setShowCalendar={setShowCalendar}
                calculatePatientCensusTotal={calculatePatientCensusTotal}
            />
        </div>
    );
};

export default WardForm;