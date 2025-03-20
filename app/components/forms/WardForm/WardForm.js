'use client';

/**
 * WardForm Component
 * 
 * เวอร์ชันนี้ได้รับการปรับปรุงเพื่อแก้ไขปัญหาการแสดงผลและ Dark Mode:
 * - ได้รวม MainFormContent เป็นส่วนหนึ่งของไฟล์นี้เพื่อลดความซับซ้อน
 * - เปลี่ยนค่าเริ่มต้นของ showForm เป็น true เพื่อให้แสดงฟอร์มตั้งแต่เริ่มต้น
 * - ปรับปรุง Dark Mode ให้แสดงผลได้อย่างถูกต้อง
 * - เพิ่มฟิลด์ Nurse Manager และ WC (Ward Clerk) ตามความต้องการ
 * 
 * หมายเหตุ: ApprovalHistory component ถูกปิดการใช้งานไว้เนื่องจากไม่พบไฟล์ที่เกี่ยวข้อง
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, isValid } from 'date-fns';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Swal from 'sweetalert2';

// Import components and functions from submodules
import {
    fetchWardData,
    fetchPreviousWardData,
    formatDate,
    calculatePatientCensus,
    handleInputChange,
    parseInputValue,
    handleDateSelect,
    handleShiftChange,
    handleBeforeUnload,
    WardFormSections,
    fetchAndPrepareWardData
} from './index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    deleteWardDataDraft,
    logWardDataHistory,
    getWardDataByDate
} from '../../../lib/dataAccess';

import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { getThaiDateNow, formatThaiDate, getUTCDateString } from '../../../utils/dateUtils';
import { getCurrentShift } from '../../../utils/dateHelpers';

// Import UI components
import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';
import DepartmentStatusCard from '../../common/DepartmentStatusCard';
import FormActions from '../../common/FormActions';
import ApprovalHistory from '../../common/ApprovalHistory';
import Alert from '../../common/Alert';
import { PatientCensusSection, StaffingSection, NotesSection } from './WardSections';
import FormDateShiftSelector from './FormDateShiftSelector';

// MainFormContent component
const MainFormContent = ({ 
    selectedDate,
    selectedShift,
    selectedWard,
    formData,
    setFormData,
    handleLocalDateSelect,
    handleShiftChange,
    thaiDate,
    datesWithData,
    theme,
    approvalStatus,
    setApprovalStatus,
    setHasUnsavedChanges,
    hasUnsavedChanges,
    onSaveDraft,
    onSubmit,
    isSubmitting,
    isDraftMode,
    isReadOnly,
    isLoading,
    setIsLoading,
    setInitError,
    showCalendar,
    setShowCalendar
}) => {
    const { user } = useAuth();
    const { theme: themeContext } = useTheme();
    const isDark = theme === 'dark';
    
    const [localLoading, setLocalLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        confirmText: 'ตกลง',
        cancelText: null
    });

    // Add timeout for loading state
    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            // ป้องกันกรณี isLoading เป็น undefined
            if (isLoading === true) {
                setInitError('การโหลดข้อมูลใช้เวลานานเกินไป โปรดลองใหม่อีกครั้ง');
                setIsLoading(false);
            }
        }, 15000); // 15 seconds timeout
        
        return () => clearTimeout(loadingTimeout);
    }, [isLoading, setInitError, setIsLoading]);

    // กำหนดสีพื้นหลังของฟอร์มตาม theme
    const formBgClass = isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200';
    const sectionBgClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const buttonBgClass = isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0ab4ab] hover:bg-[#099b93]';
    const inputBgClass = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';
    const labelClass = isDark ? 'text-gray-300' : 'text-gray-600';

    // จัดการการเปลี่ยนแปลงในฟอร์ม
    const handleFormChange = (category, field, value) => {
        // ตรวจสอบว่าฟอร์มเป็นแบบอ่านอย่างเดียวหรือไม่
        if (isReadOnly) {
            console.log('Form is read-only. Changes not allowed.');
            return;
        }
        
        // ตรวจสอบว่า field เป็น 'recalculateTotal' หรือไม่ เพื่อคำนวณผลรวม
        if (field === 'recalculateTotal') {
            console.log('Recalculating total...');
            // คำนวณโดยใช้ข้อมูลปัจจุบันจาก formData ถ้ามี
            if (formData && formData.patientCensus) {
                const calculatedTotal = calculatePatientCensusTotal(formData.patientCensus);
                console.log(`Recalculated total: ${calculatedTotal}`);
            } else {
                console.warn('Cannot recalculate: formData.patientCensus is missing');
            }
            return;
        }

        setHasUnsavedChanges(true);
        
        // Update formData in a single state update to avoid race conditions
        setFormData(prevData => {
            // Create a new deep copy of the data
            const updatedData = JSON.parse(JSON.stringify(prevData));
            
            // Update the specific field
            if (category) {
                if (!updatedData[category]) {
                    updatedData[category] = {};
                }
                updatedData[category][field] = value;
            } else {
                updatedData[field] = value;
            }
            
            // If this is a patient census field that affects the calculation,
            // calculate the new total immediately within the same state update
            if (category === 'patientCensus' && 
                ['hospitalPatientcensus', 'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(field)) {
                
                const patientCensus = updatedData.patientCensus;
                
                // Force conversion to Number to prevent string concatenation
                const hospitalPatientcensus = Number(parseInt(patientCensus.hospitalPatientcensus || '0', 10));
                const newAdmit = Number(parseInt(patientCensus.newAdmit || '0', 10));
                const transferIn = Number(parseInt(patientCensus.transferIn || '0', 10));
                const referIn = Number(parseInt(patientCensus.referIn || '0', 10));
                const transferOut = Number(parseInt(patientCensus.transferOut || '0', 10));
                const referOut = Number(parseInt(patientCensus.referOut || '0', 10));
                const discharge = Number(parseInt(patientCensus.discharge || '0', 10));
                const dead = Number(parseInt(patientCensus.dead || '0', 10));
                
                // Calculate using the correct formula
                const total = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
                
                console.log(`Re-calculated Patient Census: ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
                
                // Display empty string if total is 0 and all input fields are empty
                const shouldShowEmpty = total === 0 && 
                    !patientCensus.hospitalPatientcensus &&
                    !patientCensus.newAdmit && 
                    !patientCensus.transferIn && 
                    !patientCensus.referIn && 
                    !patientCensus.transferOut && 
                    !patientCensus.referOut && 
                    !patientCensus.discharge && 
                    !patientCensus.dead;
                
                // Update the total in the same state update
                updatedData.patientCensus.total = shouldShowEmpty ? '' : total;
                
                // Always update overallData with the same value as patientCensus.total
                updatedData.overallData = shouldShowEmpty ? '' : total;
            }
            
            return updatedData;
        });
    };

    // ฟังก์ชันคำนวณ Patient Census
    const calculatePatientCensusTotal = (data) => {
        // ตรวจสอบว่า data ไม่ใช่ undefined หรือ null
        if (!data) {
            console.error('calculatePatientCensusTotal: data is undefined or null');
            return '0';
        }
        
        const hospitalPatientcensus = parseInt(data.hospitalPatientcensus || '0', 10) || 0;
        const newAdmit = parseInt(data.newAdmit || '0', 10) || 0;
        const transferIn = parseInt(data.transferIn || '0', 10) || 0;
        const referIn = parseInt(data.referIn || '0', 10) || 0;
        const transferOut = parseInt(data.transferOut || '0', 10) || 0;
        const referOut = parseInt(data.referOut || '0', 10) || 0;
        const discharge = parseInt(data.discharge || '0', 10) || 0;
        const dead = parseInt(data.dead || '0', 10) || 0;

        // ตรวจสอบค่าด้วย console.log
        console.log('Patient Census Calculation In WardForm:', {
            hospitalPatientcensus,
            newAdmit,
            transferIn,
            referIn,
            transferOut,
            referOut,
            discharge,
            dead
        });
        
        const total = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
        console.log(`Total calculated in WardForm: ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
        
        return total.toString();
    };

    if (isLoading) {
        return (
            <div className={`p-8 rounded-lg shadow-md ${formBgClass} animate-pulse min-h-[400px] flex flex-col items-center justify-center`}>
                <div className="w-12 h-12 border-t-2 border-b-2 border-[#0ab4ab] rounded-full animate-spin mb-4"></div>
                <p className={`text-center ${textClass}`}>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* แสดงแผนกด้วยสี pastel ที่โดดเด่น */}
            <div className={`p-3 mb-4 rounded-lg shadow-md ${isDark ? 'bg-indigo-900' : 'bg-blue-50'} border ${isDark ? 'border-indigo-800' : 'border-blue-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-center">
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'} mb-2 sm:mb-0`}>
                        แบบฟอร์มบันทึกข้อมูล
                    </h2>
                    <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-indigo-800 text-blue-200' : 'bg-blue-100 text-blue-800'} font-medium`}>
                        แผนก: {user?.department || 'ไม่ระบุแผนก'}
                    </div>
                </div>
            </div>

            {/* ขยายส่วนวันที่และกะให้ใช้พื้นที่เต็ม */}
            <div className={`p-5 rounded-lg shadow-md ${formBgClass} mb-6 border`}>
                <div className="grid grid-cols-1 gap-6">
                    {/* ใช้พื้นที่เต็มสำหรับ DateSelector */}
                    <div className="col-span-1">
                        <FormDateShiftSelector
                            selectedDate={selectedDate}
                            onDateSelect={handleLocalDateSelect}
                            datesWithData={datesWithData}
                            showCalendar={showCalendar}
                            setShowCalendar={setShowCalendar}
                            thaiDate={thaiDate}
                            selectedShift={selectedShift}
                            onShiftChange={handleShiftChange}
                            theme={theme}
                            hasUnsavedChanges={hasUnsavedChanges}
                            onSaveDraft={onSaveDraft}
                            selectedWard={selectedWard}
                            setApprovalStatus={setApprovalStatus}
                            setFormData={setFormData}
                        />
                    </div>
                </div>
            </div>

            <WardFormSections
                formData={formData}
                handleInputChange={handleFormChange}
                isReadOnly={isReadOnly}
                theme={theme}
            />

            {!isReadOnly && (
                <div className="flex justify-end space-x-4 mt-6">
                    <button
                        onClick={onSaveDraft}
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-md ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} font-medium transition-colors duration-200`}
                    >
                        {isSubmitting && isDraftMode ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-md ${buttonBgClass} text-white font-medium transition-colors duration-200`}
                    >
                        {isSubmitting && !isDraftMode ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            )}
            
            {/* Alert Component */}
            <Alert
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                onConfirm={alertConfig.onConfirm}
            />
        </div>
    );
};

const WardForm = ({ selectedWard: propSelectedWard, ...props }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedShift, setSelectedShift] = useState(getCurrentShift() === '07:00-19:00' ? 'Morning (07:00-19:00)' : 'Night (19:00-07:00)');
    const [thaiDate, setThaiDate] = useState(getThaiDateNow());
    const [approvalStatus, setApprovalStatus] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [initError, setInitError] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    // Always use the user's department directly from their profile
    const selectedWard = user?.department || '';
    
    // Initialize form data with empty values
    const [formData, setFormData] = useState({
        patientCensus: {
            hospitalPatientcensus: '',
            newAdmit: '',
            transferIn: '',
            referIn: '',
            transferOut: '',
            referOut: '',
            discharge: '',
            dead: '',
            total: ''
        },
        staffing: {
            rn: '',
            lpn: '',
            nurseManager: '',
            wc: '',
            notes: '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            isDraft: false
        },
        bedManagement: {
            available: '',
            unavailable: '',
            plannedDischarge: ''
        },
        overallData: ''
    });

    // เพิ่มการประกาศ state สำหรับ alertConfig
    const [alertConfig, setAlertConfig] = useState({
        show: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null
    });

    // สร้างฟังก์ชัน handler จากฟังก์ชันสร้าง (factory functions)
    const handleFormChange = (category, field, value) => {
        // ตรวจสอบว่าฟอร์มเป็นแบบอ่านอย่างเดียวหรือไม่
        if (isReadOnly) {
            console.log('Form is read-only. Changes not allowed.');
                    return;
                }
                
        // ตรวจสอบว่า field เป็น 'recalculateTotal' หรือไม่ เพื่อคำนวณผลรวม
        if (field === 'recalculateTotal') {
            console.log('Recalculating total...');
            // คำนวณโดยใช้ข้อมูลปัจจุบันจาก formData ถ้ามี
            if (formData && formData.patientCensus) {
                const calculatedTotal = calculatePatientCensusTotal(formData.patientCensus);
                console.log(`Recalculated total: ${calculatedTotal}`);
            } else {
                console.warn('Cannot recalculate: formData.patientCensus is missing');
                    }
                    return;
                }
                
        setHasUnsavedChanges(true);
        
        // Update formData in a single state update to avoid race conditions
        setFormData(prevData => {
            // Create a new deep copy of the data
            const updatedData = JSON.parse(JSON.stringify(prevData));
            
            // Update the specific field
            if (category) {
                if (!updatedData[category]) {
                    updatedData[category] = {};
                }
                updatedData[category][field] = value;
                        } else {
                updatedData[field] = value;
            }
            
            // If this is a patient census field that affects the calculation,
            // calculate the new total immediately within the same state update
            if (category === 'patientCensus' && 
                ['hospitalPatientcensus', 'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(field)) {
                
                const patientCensus = updatedData.patientCensus;
                
                // Force conversion to Number to prevent string concatenation
                const hospitalPatientcensus = Number(parseInt(patientCensus.hospitalPatientcensus || '0', 10));
                const newAdmit = Number(parseInt(patientCensus.newAdmit || '0', 10));
                const transferIn = Number(parseInt(patientCensus.transferIn || '0', 10));
                const referIn = Number(parseInt(patientCensus.referIn || '0', 10));
                const transferOut = Number(parseInt(patientCensus.transferOut || '0', 10));
                const referOut = Number(parseInt(patientCensus.referOut || '0', 10));
                const discharge = Number(parseInt(patientCensus.discharge || '0', 10));
                const dead = Number(parseInt(patientCensus.dead || '0', 10));
                
                // Calculate using the correct formula
                const total = hospitalPatientcensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
                
                console.log(`Re-calculated Patient Census: ${hospitalPatientcensus} + ${newAdmit} + ${transferIn} + ${referIn} - ${transferOut} - ${referOut} - ${discharge} - ${dead} = ${total}`);
                
                // Display empty string if total is 0 and all input fields are empty
                const shouldShowEmpty = total === 0 && 
                    !patientCensus.hospitalPatientcensus &&
                    !patientCensus.newAdmit && 
                    !patientCensus.transferIn && 
                    !patientCensus.referIn && 
                    !patientCensus.transferOut && 
                    !patientCensus.referOut && 
                    !patientCensus.discharge && 
                    !patientCensus.dead;
                
                // Update the total in the same state update
                updatedData.patientCensus.total = shouldShowEmpty ? '' : total;
                
                // Always update overallData with the same value as patientCensus.total
                updatedData.overallData = shouldShowEmpty ? '' : total;
            }
            
            return updatedData;
        });
    };
    
    // Replace factory function implementations with direct implementations
    const handleDateChange = async (date) => {
        setSelectedDate(date.toISOString().split('T')[0]);
            setThaiDate(formatThaiDate(date));
        
        // ตรวจสอบข้อมูลที่มีอยู่แล้ว
        if (selectedShift) {
            const result = await checkExistingData(date.toISOString().split('T')[0], user.department, selectedShift);
            
            if (result.exists) {
                if (result.isFinal) {
                    // แจ้งเตือนว่ามีข้อมูลที่บันทึกเป็น Final แล้ว
            Swal.fire({
                        title: 'พบข้อมูลที่บันทึกแล้ว',
                        text: 'ข้อมูลนี้ได้ถูกบันทึกเป็นข้อมูลสมบูรณ์แล้ว ไม่สามารถแก้ไขได้ กรุณาติดต่อผู้ดูแลระบบหากต้องการแก้ไข',
                icon: 'warning',
                        confirmButtonText: 'เข้าใจแล้ว'
                    });
                } else {
                    // แจ้งเตือนว่ามีข้อมูลร่างและโหลดข้อมูลนั้น
                    Swal.fire({
                        title: 'พบข้อมูลร่าง',
                        text: 'พบข้อมูลร่างที่บันทึกไว้ก่อนหน้า ต้องการโหลดข้อมูลร่างนี้หรือไม่?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'โหลดข้อมูลร่าง',
                        cancelButtonText: 'ไม่ต้องการ'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            setFormData(result.data);
                        }
                    });
                }
            }
        }
    };
    
    const handleShiftChange = async (shift) => {
        setSelectedShift(shift);
        
        // ตรวจสอบข้อมูลที่มีอยู่แล้ว
        if (selectedDate) {
            const result = await checkExistingData(selectedDate, user.department, shift);
            
            if (result.exists) {
                if (result.isFinal) {
                    // แจ้งเตือนว่ามีข้อมูลที่บันทึกเป็น Final แล้ว
                    Swal.fire({
                        title: 'พบข้อมูลที่บันทึกแล้ว',
                        text: 'ข้อมูลนี้ได้ถูกบันทึกเป็นข้อมูลสมบูรณ์แล้ว ไม่สามารถแก้ไขได้ กรุณาติดต่อผู้ดูแลระบบหากต้องการแก้ไข',
                        icon: 'warning',
                        confirmButtonText: 'เข้าใจแล้ว'
                    });
                } else {
                    // แจ้งเตือนว่ามีข้อมูลร่างและโหลดข้อมูลนั้น
                        Swal.fire({
                        title: 'พบข้อมูลร่าง',
                        text: 'พบข้อมูลร่างที่บันทึกไว้ก่อนหน้า ต้องการโหลดข้อมูลร่างนี้หรือไม่?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'โหลดข้อมูลร่าง',
                        cancelButtonText: 'ไม่ต้องการ'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            setFormData(result.data);
                        }
                    });
                }
                    } else {
                // ถ้าไม่มีข้อมูลที่บันทึกไว้ ให้ลองโหลดข้อมูลอัตโนมัติ
                loadAutomaticData(selectedDate, user.department, selectedShift, setIsLoading, setFormData);
            }
        }
    };
    
    const handleLocalBeforeUnload = (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
            return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
        }
    };
    
    const onSaveDraft = async () => {
        try {
            setIsSubmitting(true);
            
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!selectedDate || !selectedShift || !user?.department) {
                Swal.fire({
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาเลือกวันที่และกะการทำงาน',
                    icon: 'warning',
                    confirmButtonText: 'ตกลง'
                });
                setIsSubmitting(false);
                return;
            }
            
            // ตรวจสอบว่ามีข้อมูล Final แล้วหรือไม่
            const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            const docId = `${formattedDate}_${user.department}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกได้',
                    text: 'ข้อมูลนี้ได้ถูกบันทึกเป็นข้อมูลสมบูรณ์แล้ว ไม่สามารถแก้ไขได้',
                    icon: 'error',
                    confirmButtonText: 'เข้าใจแล้ว'
                });
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const dataToSave = {
                ...formData,
                date: formattedDate,
                wardId: user.department,
                shift: selectedShift,
                timestamp: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                updatedBy: {
                    uid: user.uid,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role
                }
            };
            
            // บันทึกลงใน wardDataDrafts
            const draftsRef = collection(db, 'wardDataDrafts');
            await addDoc(draftsRef, dataToSave);
            
                setHasUnsavedChanges(false);
            setIsSubmitting(false);
            
                Swal.fire({
                title: 'สำเร็จ',
                text: 'บันทึกร่างข้อมูลเรียบร้อยแล้ว',
                    icon: 'success',
                confirmButtonText: 'ตกลง'
            });
        } catch (error) {
            console.error('Error saving draft:', error);
            setIsSubmitting(false);
            
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกร่างข้อมูลได้: ' + error.message,
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        }
    };

    const onSubmit = async () => {
        try {
            setIsSubmitting(true);
            
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!selectedDate || !selectedShift || !user?.department) {
                Swal.fire({
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาเลือกวันที่และกะการทำงาน',
                    icon: 'warning',
                    confirmButtonText: 'ตกลง'
                });
                setIsSubmitting(false);
                return;
            }

            // ตรวจสอบว่ามีข้อมูล Final แล้วหรือไม่
            const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            const docId = `${formattedDate}_${user.department}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกได้',
                    text: 'ข้อมูลนี้ได้ถูกบันทึกเป็นข้อมูลสมบูรณ์แล้ว ไม่สามารถแก้ไขได้ กรุณาติดต่อผู้ดูแลระบบหากต้องการแก้ไข',
                    icon: 'error',
                    confirmButtonText: 'เข้าใจแล้ว'
                });
                setIsSubmitting(false);
                return;
            }
            
            // ยืนยันการบันทึกข้อมูล
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการบันทึก',
                text: 'เมื่อบันทึกข้อมูลแล้วจะไม่สามารถแก้ไขได้อีก ต้องการบันทึกหรือไม่?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (!confirmResult.isConfirmed) {
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const dataToSave = {
                ...formData,
                date: formattedDate,
                wardId: user.department,
                shift: selectedShift,
                timestamp: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                approvalStatus: 'pending',
                submittedBy: {
                    uid: user.uid,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role
                }
            };
            
            // บันทึกลงใน wardDataFinal
            await setDoc(docRef, dataToSave);
            
            // ลบข้อมูลร่างที่เกี่ยวข้อง
            const draftsRef = collection(db, 'wardDataDrafts');
            const draftsQuery = query(
                draftsRef,
                where('date', '==', formattedDate),
                where('wardId', '==', user.department),
                where('shift', '==', selectedShift)
            );
            
            const draftsSnap = await getDocs(draftsQuery);
            
            if (!draftsSnap.empty) {
                const batch = writeBatch(db);
                draftsSnap.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            
            setHasUnsavedChanges(false);
            setIsSubmitting(false);
            
            Swal.fire({
                title: 'สำเร็จ',
                text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง'
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            setIsSubmitting(false);
            
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message,
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        }
    };

    // สร้างฟังก์ชันเฉพาะที่ใช้ใน component นี้
    const handleLocalDateSelect = (e) => {
        handleDateChange(e);
    };

    // ฟังก์ชัน useEffect สำหรับโหลดข้อมูลเริ่มต้น
    useEffect(() => {
        const loadData = async () => {
            if (!user?.department || !selectedShift) {
                console.warn('Missing required parameters for fetching data');
                setIsLoading(false);
                return;
            }
            
            try {
                setIsLoading(true);
                setInitError(null);
                const dateToUse = selectedDate ? new Date(selectedDate) : new Date();
                const formattedDate = format(dateToUse, 'yyyy-MM-dd');
                
                console.log('Fetching ward data with params:', { 
                date: formattedDate,
                wardId: user.department,
                    shift: selectedShift
                });
                
                // Use the improved fetchAndPrepareWardData function
                const { data: wardData, hasData, patientCensusTotal, sourceMessage, isAutoFilledFromHistory } = 
                    await fetchAndPrepareWardData(formattedDate, user.department, selectedShift);
                
                if (wardData) {
                    console.log('Data loaded successfully:', wardData);
                    setFormData(wardData);
                    
                    // Show notification if data was auto-filled
                    if (isAutoFilledFromHistory) {
            Swal.fire({
                            title: 'ข้อมูลอัตโนมัติ',
                            text: `${sourceMessage} เป็นจำนวน ${patientCensusTotal} คน กรุณาตรวจสอบข้อมูลก่อนบันทึก`,
                            icon: 'info',
                            confirmButtonText: 'ตกลง'
                        });
                    }
                } else {
                    // Reset form with empty values for a fresh start
                    setFormData({
                        patientCensus: {
                            newAdmit: '',
                            transferIn: '',
                            referIn: '',
                            transferOut: '',
                            referOut: '',
                            discharge: '',
                            dead: '',
                            total: ''
                        },
                        staffing: {
                            rn: '',
                            lpn: '',
                            nurseManager: '',
                            wc: '',
                            notes: '',
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            isDraft: false
                        },
                        bedManagement: {
                            available: '',
                            unavailable: '',
                            plannedDischarge: ''
                        },
                        overallData: ''
                    });
                }
            } catch (error) {
                console.error('Error fetching ward data:', error);
                setInitError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user?.department, selectedShift, selectedDate]);

    // เพิ่ม event listener สำหรับการ refresh หน้า
    useEffect(() => {
        window.addEventListener('beforeunload', handleLocalBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleLocalBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // เพิ่ม useEffect สำหรับป้องกันการรีเฟรชหน้าเว็บเมื่อมีข้อมูลที่ยังไม่ได้บันทึก
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // เพิ่ม useEffect สำหรับป้องกันการกดปุ่ม back ของเบราว์เซอร์
    useEffect(() => {
        const handlePopState = (e) => {
            if (hasUnsavedChanges) {
                const confirmLeave = window.confirm('คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?');
                if (!confirmLeave) {
                    // ป้องกันการกดปุ่ม back โดยการ push state ใหม่
                    history.pushState(null, document.title, window.location.href);
                    // ยกเลิกการนำทาง
                    e.preventDefault();
                }
            }
        };

        // ทำให้เมื่อกดปุ่ม back แล้วจะยังอยู่ที่หน้าเดิม
        history.pushState(null, document.title, window.location.href);
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [hasUnsavedChanges]);

    // เพิ่ม useEffect สำหรับตั้งค่า window.hasUnsavedChanges
    useEffect(() => {
        // ตั้งค่าตัวแปรสำหรับตรวจสอบจาก Navbar
        window.hasUnsavedChanges = hasUnsavedChanges;
        
        return () => {
            // ล้างค่าเมื่อ component ถูก unmount
            window.hasUnsavedChanges = false;
        };
    }, [hasUnsavedChanges]);

    // Alert Dialog Component
    const AlertDialog = () => {
        if (!alertConfig.show) return null;
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold mb-2">{alertConfig.title}</h3>
                    <p className="mb-4">{alertConfig.message}</p>
                    <div className="flex justify-end space-x-2">
                        {alertConfig.cancelText && (
                            <button 
                                onClick={() => {
                                    setAlertConfig(prev => ({...prev, show: false}));
                                    if (alertConfig.onCancel) alertConfig.onCancel();
                                }}
                                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                {alertConfig.cancelText}
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                setAlertConfig(prev => ({...prev, show: false}));
                                if (alertConfig.onConfirm) alertConfig.onConfirm();
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            {alertConfig.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Add error display
    if (initError) {
    return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-50 border-red-200'} border rounded-lg p-6 max-w-md w-full`}>
                    <h2 className={`${theme === 'dark' ? 'text-red-400' : 'text-red-700'} text-xl font-semibold mb-3`}>Error</h2>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-red-600'} mb-4`}>{initError}</p>
                        <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                        >
                        Try Again
                        </button>
                    </div>
            </div>
        );
    }

    return (
        <div className={`w-full max-w-7xl mx-auto ${theme === 'dark' ? 'text-white' : ''}`}>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="mb-4">
                        <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading...
                    </p>
                </div>
            ) : (
                <div className="space-y-6 p-4">
                    {/* Always show MainFormContent */}
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
                        theme={isDark ? 'dark' : 'light'}
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
                    />
                    
                    <AlertDialog />
                </div>
            )}
        </div>
    );
};

// เพิ่มฟังก์ชันตรวจสอบข้อมูลที่มีอยู่แล้ว
const checkExistingData = async (date, wardId, shift) => {
    try {
        // ตรวจสอบข้อมูลใน wardDataFinal
        const formattedDate = format(new Date(date), 'yyyy-MM-dd');
        const docId = `${formattedDate}_${wardId}_${shift}`;
        const docRef = doc(db, 'wardDataFinal', docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { exists: true, isFinal: true, data: docSnap.data() };
        }
        
        // ตรวจสอบข้อมูลใน wardDataDrafts
        const draftsRef = collection(db, 'wardDataDrafts');
        const draftsQuery = query(
            draftsRef,
            where('date', '==', formattedDate),
            where('wardId', '==', wardId),
            where('shift', '==', shift)
        );
        
        const draftsSnap = await getDocs(draftsQuery);
        
        if (!draftsSnap.empty) {
            // เรียงลำดับตาม timestamp เพื่อเอาร่างล่าสุด
            const drafts = [];
            draftsSnap.forEach(doc => {
                drafts.push({ id: doc.id, ...doc.data() });
            });
            
            drafts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return { exists: true, isFinal: false, data: drafts[0] };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Error checking existing data:', error);
        return { exists: false, error };
    }
};

// เพิ่มฟังก์ชันโหลดข้อมูลอัตโนมัติ
const loadAutomaticData = async (date, wardId, shift, setIsLoading, setFormData) => {
    try {
        setIsLoading(true);
        const formattedDate = format(new Date(date), 'yyyy-MM-dd');
        
        // ใช้ฟังก์ชัน fetchAndPrepareWardData ที่มีอยู่แล้ว
        const { data: wardData, hasData, patientCensusTotal, sourceMessage } = 
            await fetchAndPrepareWardData(formattedDate, wardId, shift);
        
        if (wardData) {
            console.log('Auto-loaded data:', wardData);
            setFormData(wardData);
            
            // แจ้งเตือนว่าโหลดข้อมูลอัตโนมัติ
            Swal.fire({
                title: 'โหลดข้อมูลอัตโนมัติ',
                text: sourceMessage || 'โหลดข้อมูลอัตโนมัติสำเร็จ กรุณาตรวจสอบข้อมูล',
                icon: 'info',
                confirmButtonText: 'ตกลง'
            });
        }
    } catch (error) {
        console.error('Error loading automatic data:', error);
    } finally {
        setIsLoading(false);
    }
};

export default WardForm;