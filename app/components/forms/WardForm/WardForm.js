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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../../context/ThemeContext';
import { format, parse, isAfter, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';
import { getCurrentShift } from '../../../utils/dateHelpers';
import AlertUtil from '../../../utils/AlertUtil';

// Import components จากโมดูลที่แยกออกไป
import MainFormContent from './MainFormContent';
import FormDateShiftSelector from './FormDateShiftSelector';

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
import { saveDraft, saveFinal, checkApprovalStatus, validateRequiredFields } from './FormHandlers';
import { fetchMorningShiftData, fetchLast7DaysDataByShift, calculatePatientCensus } from './DataFetchers';

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
const WardForm = ({ departmentList }) => {
    const router = useRouter();
    const { user } = useAuth();
    const { theme } = useTheme();
    const toast = useCallback(({ title, status, duration, isClosable }) => {
        AlertUtil.showAlert(title, status, duration, isClosable);
    }, []);
    
    // ตรวจสอบกะปัจจุบันตามเวลา
    const currentShift = getCurrentShift();
    const initialShift = currentShift === '07:00-19:00' ? 'Morning (07:00-19:00)' : 'Night (19:00-07:00)';
    
    // State สำหรับข้อมูลทั่วไป
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [selectedWard, setSelectedWard] = useState('');
    const [thaiDate, setThaiDate] = useState(() => formatThaiDate(new Date()));
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
    const [activeTab, setActiveTab] = useState(0);
    const [isFormFinal, setIsFormFinal] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    
    // เพิ่ม state สำหรับควบคุม Modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    
    // เมื่อคอมโพเนนต์โหลด ให้เลือกวอร์ดแรกจากรายการหากมี
    useEffect(() => {
        if (departmentList && departmentList.length > 0 && !selectedWard) {
            // เลือกวอร์ดแรกจากรายการ
            for (const dept of departmentList) {
                if (dept.wards && dept.wards.length > 0) {
                    setSelectedWard(dept.wards[0].id);
                    break;
                }
            }
        }
    }, [departmentList, selectedWard]);
    
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
    
    // อัปเดตการโหลดข้อมูล
    useEffect(() => {
        if (!selectedWard) return;
        
        // Set loading state
        setIsLoading(true);
        setInitError(null);
        
        // Create a timeout for error handling - reduced from 20s to 15s
        const loadingTimeout = setTimeout(() => {
            // If still loading after timeout, show error
            if (isLoading) {
                console.log('Loading timeout reached');
                setInitError('การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
                setIsLoading(false);
            }
        }, 15000); // 15 seconds timeout
        
        console.log('Loading data for:', { date: selectedDate, ward: selectedWard, shift: selectedShift });
        
        // Call loadData with enhanced parameters
        loadData({
            selectedDate: selectedDate,
            selectedWard: selectedWard,
            selectedShift: selectedShift,
            setLoading: setIsLoading,
            setError: setInitError,
            setFormData: setFormData,
            setActiveTab: setActiveTab, 
            setIsFormFinal: setIsDraftMode,
            setApprovalStatus: setApprovalStatus,
            showToast: (message) => {
                toast({
                    title: message.message,
                    status: message.type || 'info',
                    duration: message.duration || 5000,
                    isClosable: true,
                    position: 'top'
                });
            },
            checkApprovalStatus: checkApprovalStatus,
            resetForm: resetFormCallback, // Use the callback version to ensure proper reference
            isDarkMode: theme === 'dark',
            departmentList: departmentList || []
        }).catch(error => {
            console.error('Error loading data:', error);
            setIsLoading(false);
            setInitError(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}`);
            
            // Reset form to a usable state when error occurs
            resetFormCallback(selectedShift);
        }).finally(() => {
            // Always clear the timeout when done
            clearTimeout(loadingTimeout);
        });
    }, [selectedDate, selectedWard, selectedShift, toast, theme, resetFormCallback, departmentList]);
    
    // ปรับปรุงฟังก์ชัน handleInputChange
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        
        setHasUnsavedChanges(true);
        
        setFormData(prevData => {
            const newData = { ...prevData };
            
            // Handle nested fields (e.g., patientCensusSection.hospitalPatientCensus)
            if (name.includes('.')) {
                const parts = name.split('.');
                let target = newData;
                
                // Navigate through the object structure
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!target[part]) target[part] = {};
                    target = target[part];
                }
                
                // Set the value
                target[parts[parts.length - 1]] = value;
            } else {
                // For top-level fields
                newData[name] = value;
            }
            
            // Automatic calculation for patientCensusSection
            if (name.startsWith('patientCensusSection.')) {
                // Calculate Patient Census when patientCensusSection data changes
                if (newData.patientCensusSection) {
                    const patientCensusTotal = calculatePatientCensus(newData.patientCensusSection);
                    
                    // Update the appropriate field based on shift
                    if (selectedShift.toLowerCase().includes('night')) {
                        // Night shift: Set overallData
                        newData.overallData = patientCensusTotal.toString();
                    } else {
                        // Morning shift: Set patientCensusSection.total
                        if (!newData.patientCensusSection) newData.patientCensusSection = {};
                        newData.patientCensusSection.total = patientCensusTotal.toString();
                    }
                }
            }
            
            return newData;
        });
    }, [selectedShift]);

    // ปรับปรุงฟังก์ชัน handleSaveDraft
    const handleDraftSave = async () => {
        if (!user) {
            toast({
                title: 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const result = await saveDraft({
                formData,
                userId: user.uid,
                userName: user.displayName || user.email,
                setLoading: setIsSubmitting,
                setError: setSubmitError,
                showToast: (message) => {
                    toast({
                        title: message.message,
                        status: message.type || 'info',
                        duration: message.duration || 5000,
                        isClosable: true,
                        position: 'top'
                    });
                }
            });
            
            if (result.success) {
                setHasUnsavedChanges(false);
                setFormData(result.data);
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            setSubmitError(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
            toast({
                title: `เกิดข้อผิดพลาดในการบันทึก: ${error.message}`,
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ปรับปรุงฟังก์ชัน handleSaveFinal
    const handleFinalSave = async () => {
        if (!user) {
            toast({
                title: 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const result = await saveFinal({
                formData,
                userId: user.uid,
                userName: user.displayName || user.email,
                setLoading: setIsSubmitting,
                setError: setSubmitError,
                showToast: (message) => {
                    toast({
                        title: message.message,
                        status: message.type || 'info',
                        duration: message.duration || 5000,
                        isClosable: true,
                        position: 'top'
                    });
                },
                validateRequiredFields
            });
            
            if (result.success) {
                setHasUnsavedChanges(false);
                setIsDraftMode(false);
                setFormData(result.data);
                setApprovalStatus(result.data.approvalStatus);
            }
        } catch (error) {
            console.error('Error saving final data:', error);
            setSubmitError(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
            toast({
                title: `เกิดข้อผิดพลาดในการบันทึก: ${error.message}`,
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Display auto-filled message if applicable
    const renderAutoFilledMessage = () => {
        if (formData.autoFilledFrom) {
            return (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">ข้อมูลถูกเติมอัตโนมัติจาก {formData.autoFilledFrom}</strong>
                </div>
            );
        }
        return null;
    };

    // Function to show toast notifications
    const showToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
        toast({
            title: message,
            status: type,
            duration: duration,
            isClosable: true,
            position: 'top'
        });
    }, [toast]);
    
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