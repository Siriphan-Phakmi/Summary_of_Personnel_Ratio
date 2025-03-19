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

// Import components and functions from submodules
import {
    fetchDatesWithData,
    fetchPreviousShiftData,
    fetchApprovalData,
    fetchLatestRecord,
    checkApprovalStatus,
    safeFetchWardData,
    handleInputChange,
    handleShiftChange,
    handleDateSelect,
    handleBeforeUnload,
    handleWardFormSubmit,
    calculateTotal,
    ApprovalDataButton,
    LatestRecordButton,
    checkPast30DaysRecords,
    fetchWardData,
    parseInputValue,
    navigateToCreateIndex,
    checkMorningShiftDataExists,
    fetchLast7DaysData,
    calculatePatientCensus,
    checkFinalApprovalStatus
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
import { format, isToday, isValid } from 'date-fns';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Swal from 'sweetalert2';
import { useState, useEffect, useRef } from 'react';

import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';
import DepartmentStatusCard from '../../common/DepartmentStatusCard';
import FormActions from '../../common/FormActions';
import ApprovalHistory from '../../common/ApprovalHistory';

// Import WardSections components
import { PatientCensusSection, StaffingSection, NotesSection, WardFormSections } from './WardSections';

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
    setHasUnsavedChanges,
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

    // จัดการการเปลี่ยนแปลงค่าในฟอร์ม
    const handleFormChange = (category, field, value) => {
        setHasUnsavedChanges(true);
        
        const newFormData = { ...formData };
        
        if (!newFormData[category]) {
            newFormData[category] = {};
        }
        
        newFormData[category][field] = parseInputValue(value);
        
        // อัปเดตค่ารวมอัตโนมัติ
        if (category === 'patientCensus' || category === 'staffing') {
            calculateTotal(category, newFormData);
        }
        
        setFormData(newFormData);
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
            <div className={`p-4 rounded-lg shadow-md ${formBgClass} mb-6 border`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ใช้ FormDateShiftSelector แทน input ธรรมดา */}
                    <FormDateShiftSelector
                        selectedDate={selectedDate}
                        selectedShift={selectedShift}
                        onDateSelect={(date) => {
                            const isoDate = date.toISOString().split('T')[0];
                            handleLocalDateSelect({ target: { value: isoDate } });
                        }}
                        onShiftChange={handleShiftChange}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
                        datesWithData={datesWithData}
                        thaiDate={thaiDate}
                        theme={isDark ? 'dark' : 'light'}
                    />
                    
                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${labelClass}`}>แผนก:</label>
                        <div className={`block w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                            {selectedWard || 'ไม่ระบุแผนก'}
                        </div>
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
        </div>
    );
};

const WardForm = ({ selectedWard: propSelectedWard, ...props }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
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
    
    // Initialize form data with empty values
    const [formData, setFormData] = useState({
        patientCensus: {
            numberBedsTotal: '',
            numberPatientsAtMidnight: '',
            transfers: '',
            admissions: '',
            discharges: ''
        },
        staffing: {
            rn: '',
            lpn: '',
            nurseManager: '',
            notes: '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            isDraft: false
        }
    });

    const [showHistory, setShowHistory] = useState(false);

    // เพิ่ม useEffect สำหรับตรวจสอบ department ของผู้ใช้เมื่อมีการ login
    useEffect(() => {
        if (user?.department) {
            console.log('User department:', user.department);
        }
    }, [user?.department]);

    // เพิ่ม useEffect เพื่อดึงข้อมูลแบบอัตโนมัติเมื่อโหลดคอมโพเนนต์
    useEffect(() => {
        // ฟังก์ชันดึงข้อมูลเริ่มต้น
        const initializeData = async () => {
            if (!user?.department) {
                console.warn('User department not available yet');
                return;
            }

            try {
                setIsLoading(true);
                
                // กำหนดค่าตั้งต้น
                const dateToUse = selectedDate || format(new Date(), 'yyyy-MM-dd');
                const shiftToUse = selectedShift || getCurrentShift();
                
                // ดึงวันที่ที่มีข้อมูล
                const datesData = await fetchDatesWithData(user.department);
                if (datesData) {
                    setDatesWithData(datesData);
                }
                
                // ดึงข้อมูลสำหรับวันที่และกะที่เลือก
                const wardData = await fetchWardData(dateToUse, user.department, shiftToUse);
                if (wardData) {
                    console.log('Found data for current date/shift:', wardData);
                    setFormData(wardData);
                    
                    // ตรวจสอบสถานะการอนุมัติ
                    await checkApprovalStatus(dateToUse, user.department)
                        .then(status => {
                            setApprovalStatus(status);
                            if (status === 'approved') {
                                setIsReadOnly(true);
                            }
                        })
                        .catch(error => {
                            console.error('Error checking approval status:', error);
                        });
                } else {
                    console.log('No data found for current date/shift, initializing empty form');
                    // ไม่พบข้อมูล ให้เริ่มต้นด้วยฟอร์มว่าง
                    setFormData({
                        patientCensus: '0',
                        staffing: {
                            rn: '',
                            lpn: '',
                            nurseManager: '',
                            notes: '',
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            isDraft: false
                        },
                        shift: shiftToUse,
                        wardId: user.department
                    });
                    
                    // ตรวจสอบฉบับร่าง
                    checkDraftExists().then(hasDraft => {
                        if (hasDraft) {
                            Swal.fire({
                                icon: 'info',
                                title: 'พบฉบับร่าง',
                                text: 'มีฉบับร่างที่บันทึกไว้ก่อนหน้านี้ คุณสามารถเลือกดูได้ที่รายการฉบับร่าง',
                                confirmButtonColor: '#0ab4ab'
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error initializing data:', error);
                setInitError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
                
                Swal.fire({
                    title: 'Error',
                    text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab',
                    showConfirmButton: true,
                    confirmButtonText: 'ลองใหม่',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [user?.department, selectedDate, selectedShift]);

    // เพิ่มฟังก์ชัน handleLocalDateSelect
    const handleLocalDateSelect = async (e) => {
        const date = e.target.value;
        if (!date || !user?.department || !selectedShift) {
            console.warn('Missing required parameters for fetching data', {
                date,
                department: user?.department,
                shift: selectedShift
            });
            return;
        }
        
        try {
            setIsLoading(true);
            const wardData = await fetchWardData(date, user.department, selectedShift);
            if (wardData) {
                setFormData(prevData => ({
                    ...prevData,
                    ...wardData
                }));
            }
            setSelectedDate(date);
            setThaiDate(formatThaiDate(date));
        } catch (error) {
            console.error('Error fetching ward data:', error);
            setInitError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่มฟังก์ชัน checkDraftExists
    const checkDraftExists = async () => {
        try {
            if (!user?.uid || !user?.department) return false;
            
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลฉบับร่างทั้งหมดของผู้ใช้
            const drafts = await getUserDrafts(user.uid, user.department);
            
            // ตรวจสอบว่ามีฉบับร่างสำหรับวันที่เลือกหรือไม่
            return drafts && drafts.some(draft => 
                draft.date === formattedDate && 
                (draft.shift === selectedShift || !selectedShift)
            );
        } catch (error) {
            console.error('Error checking drafts:', error);
            return false;
        }
    };

    // แก้ไขฟังก์ชัน handleLocalShiftChange
    const handleLocalShiftChange = async (shift) => {
        setSelectedShift(shift);
        
        // ตรวจสอบว่าผู้ใช้มี department หรือไม่
        if (!user?.department) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบข้อมูลแผนก',
                text: 'ไม่พบข้อมูลแผนกของผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        try {
            setIsLoading(true);
            
            // กำหนดค่าเพื่อให้ชัดเจนว่าส่งอะไรไปบ้าง
            const dateToUse = selectedDate || new Date();
            const wardToUse = user.department;
            const shiftToUse = shift;
            
            console.log('Fetching ward data with params:', { date: dateToUse, wardId: wardToUse, shift: shiftToUse });
            
            // ตรวจสอบว่ามีข้อมูลเดิมของวัน/กะนี้หรือไม่
            const existingData = await fetchWardData(dateToUse, wardToUse, shiftToUse);
            
            if (existingData) {
                // มีข้อมูลอยู่แล้ว ให้แสดงข้อมูลที่มีอยู่
                console.log('Found existing data for this shift:', existingData);
                setFormData(existingData);
                
                // ตรวจสอบว่าเป็น Final หรือไม่
                if (existingData.approvalStatus === 'approved') {
                    setIsReadOnly(true);
                    Swal.fire({
                        icon: 'info',
                        title: 'ข้อมูลได้รับการอนุมัติแล้ว',
                        text: 'ข้อมูลนี้ได้รับการอนุมัติเป็น Final แล้ว ไม่สามารถแก้ไขได้',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    setIsReadOnly(false);
                }
                
                setIsLoading(false);
                return;
            }
            
            // กรณีเป็นกะเช้า (07:00-19:00) ให้ตรวจสอบข้อมูล 7 วันย้อนหลัง
            if (shift === 'เช้า' || shift === '07:00-19:00' || shift === 'Morning (07:00-19:00)') {
                console.log('Looking for past 7 days data for morning shift');
                // เรียกใช้ฟังก์ชันดึงข้อมูล 7 วันย้อนหลัง
                const last7DaysData = await fetchLast7DaysData(dateToUse, wardToUse);
                
                if (last7DaysData) {
                    console.log('Found data from last 7 days:', last7DaysData);
                    // คัดลอกข้อมูลที่จำเป็น
                    const newFormData = {
                        ...last7DaysData,
                        shift: shift,
                        wardId: wardToUse,
                        patientCensus: '0'
                    };
                    
                    setFormData(newFormData);
                    setIsReadOnly(false);
                    
                    Swal.fire({
                        icon: 'info',
                        title: 'ดึงข้อมูลอัตโนมัติ',
                        text: 'ระบบได้ดึงข้อมูลจาก 7 วันย้อนหลัง คุณสามารถแก้ไขข้อมูลได้',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    // ไม่พบข้อมูล 7 วันย้อนหลัง เริ่มต้นด้วยค่าว่าง
                    setFormData({
                        patientCensus: '0',
                        staffing: {
                            rn: '',
                            lpn: '',
                            nurseManager: '',
                            notes: '',
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            isDraft: false
                        },
                        shift: shift,
                        wardId: wardToUse
                    });
                    setIsReadOnly(false);
                }
            } 
            // กรณีเป็นกะดึก (19:00-07:00) ให้ตรวจสอบข้อมูลกะเช้าของวันเดียวกัน
            else if (shift === 'ดึก' || shift === '19:00-07:00' || shift === 'Night (19:00-07:00)') {
                console.log('Looking for morning shift data for the same day');
                // ดึงข้อมูลกะเช้าของวันเดียวกัน
                const morningShiftData = await fetchWardData(dateToUse, wardToUse, 'Morning (07:00-19:00)');
                
                if (morningShiftData) {
                    console.log('Found morning shift data:', morningShiftData);
                    // คัดลอกข้อมูลจากกะเช้ามาใช้
                    const newFormData = {
                        ...morningShiftData,
                        shift: shift,
                        patientCensus: morningShiftData.patientCensus || '0'
                    };
                    
                    setFormData(newFormData);
                    setIsReadOnly(false);
                    
                    Swal.fire({
                        icon: 'info',
                        title: 'ดึงข้อมูลอัตโนมัติ',
                        text: 'ระบบได้ดึงข้อมูลจากกะเช้าของวันนี้ คุณสามารถแก้ไขข้อมูลได้',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    console.log('No morning shift data found, looking for past data');
                    // ไม่พบข้อมูลกะเช้า ลองหาข้อมูลจาก 7 วันย้อนหลัง
                    const last7DaysData = await fetchLast7DaysData(dateToUse, wardToUse);
                    
                    if (last7DaysData) {
                        console.log('Found data from last 7 days instead:', last7DaysData);
                        // คัดลอกข้อมูลที่จำเป็น
                        const newFormData = {
                            ...last7DaysData,
                            shift: shift,
                            wardId: wardToUse,
                            patientCensus: '0'
                        };
                        
                        setFormData(newFormData);
                        setIsReadOnly(false);
                        
                        Swal.fire({
                            icon: 'info',
                            title: 'ดึงข้อมูลอัตโนมัติ',
                            text: 'ไม่พบข้อมูลกะเช้า ระบบได้ดึงข้อมูลจาก 7 วันย้อนหลัง คุณสามารถแก้ไขข้อมูลได้',
                            confirmButtonColor: '#0ab4ab'
                        });
                    } else {
                        // ไม่พบข้อมูลใดๆ เริ่มต้นด้วยค่าว่าง
                        setFormData({
                            patientCensus: '0',
                            staffing: {
                                rn: '',
                                lpn: '',
                                nurseManager: '',
                                notes: '',
                                firstName: user?.firstName || '',
                                lastName: user?.lastName || '',
                                isDraft: false
                            },
                            shift: shift,
                            wardId: wardToUse
                        });
                        setIsReadOnly(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error in handleLocalShiftChange:', error);
            setIsLoading(false);
            
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดึงข้อมูลได้ โปรดลองใหม่อีกครั้ง',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    // ฟังก์ชัน onSaveDraft จะบันทึกเป็นแบบร่าง
    const onSaveDraft = async () => {
        try {
            if (!user) {
                Swal.fire({
                    icon: 'error',
                    title: 'กรุณาเข้าสู่ระบบ',
                    text: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถบันทึกข้อมูลได้',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
            
            setIsSubmitting(true);
            setIsDraftMode(true);

            // ตรวจสอบว่าผู้ใช้มี department หรือไม่
            if (!user.department) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่พบข้อมูลแผนก',
                    text: 'ไม่พบข้อมูลแผนกของผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ',
                    confirmButtonColor: '#0ab4ab'
                });
                setIsSubmitting(false);
                return;
            }
            
            // ข้อมูลสำหรับการบันทึกฉบับร่าง
            const draftData = {
                ...formData,
                wardId: user.department,
                date: selectedDate,
                shift: selectedShift,
                userId: user.uid,
                username: user.username,
                timestamp: new Date().toISOString(),
                isDraft: true
            };
            
            // ทำการบันทึกฉบับร่าง
            const result = await saveWardDataDraft(draftData);
            
            if (result.success) {
                setHasUnsavedChanges(false);
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกฉบับร่างสำเร็จ',
                    text: 'ข้อมูลถูกบันทึกเป็นฉบับร่างเรียบร้อยแล้ว',
                    confirmButtonColor: '#0ab4ab'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: result.error || 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองใหม่อีกครั้ง',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
            setIsDraftMode(false);
        }
    };

    // ฟังก์ชัน onSubmit จะบันทึกข้อมูลเป็นแบบสมบูรณ์
    const onSubmit = async () => {
        try {
            setIsSubmitting(true);
            
            if (!user || !user.uid) {
                Swal.fire({
                    icon: 'error',
                    title: 'กรุณาเข้าสู่ระบบ',
                    text: 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถบันทึกข้อมูลได้',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
            
            // ตรวจสอบว่าผู้ใช้มี department หรือไม่
            if (!user.department) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่พบข้อมูลแผนก',
                    text: 'ไม่พบข้อมูลแผนกของผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ',
                    confirmButtonColor: '#0ab4ab'
                });
                setIsSubmitting(false);
                return;
            }
            
            // ข้อมูลสำหรับการบันทึกแบบสมบูรณ์
            const finalData = {
                ...formData,
                wardId: user.department,
                date: selectedDate,
                shift: selectedShift,
                userId: user.uid,
                username: user.username,
                submitTime: new Date().toISOString(),
                isDraft: false
            };
            
            // ตรวจสอบว่าข้อมูลน่าจะถูกต้องหรือไม่
            const validationResponse = validateWardData(finalData);
            if (!validationResponse.isValid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: validationResponse.message || 'กรุณากรอกข้อมูลให้ครบถ้วน',
                    confirmButtonColor: '#0ab4ab'
                });
                setIsSubmitting(false);
                return;
            }
            
            // แสดงข้อความยืนยัน
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการบันทึกข้อมูล',
                text: 'คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33'
            });
            
            if (!confirmResult.isConfirmed) {
                setIsSubmitting(false);
                return;
            }
            
            // ทำการบันทึกข้อมูล
            await saveWardDataFinal(finalData);
            
            // บันทึกประวัติการแก้ไข
            await logWardDataHistory(
                finalData,
                'submit',
                user.uid
            );
            
            // แสดงข้อความสำเร็จ
            Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                confirmButtonColor: '#0ab4ab'
            });
            
            setHasUnsavedChanges(false);
            
            // รีเซ็ตฟอร์ม
            setFormData({
                patientCensus: {
                    numberBedsTotal: '',
                    numberPatientsAtMidnight: '',
                    transfers: '',
                    admissions: '',
                    discharges: ''
                },
                staffing: {
                    rn: '',
                    lpn: '',
                    nurseManager: '',
                    notes: '',
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    isDraft: false
                }
            });
            
            // โหลดข้อมูลใหม่
            const refreshedData = await fetchWardData(selectedDate, user.department, selectedShift);
            if (refreshedData) {
                setFormData(refreshedData);
            }
            
            // ตรวจสอบสถานะการอนุมัติใหม่
            const newStatus = await checkApprovalStatus(selectedDate, user.department);
            setApprovalStatus(newStatus);
        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
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
                        selectedWard={user?.department || ''}
                        formData={formData}
                        setFormData={setFormData}
                        handleLocalDateSelect={handleLocalDateSelect}
                        handleShiftChange={handleLocalShiftChange}
                        thaiDate={thaiDate}
                        datesWithData={datesWithData}
                        theme={theme}
                        approvalStatus={approvalStatus}
                        setHasUnsavedChanges={setHasUnsavedChanges}
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
                    
                    {/* Approval History (commented out as it appears to be missing) */}
                    {/* {showHistory && (
                        <ApprovalHistory
                            isOpen={showHistory}
                            onClose={() => setShowHistory(false)}
                            wardId={selectedWard}
                            date={selectedDate}
                            shift={selectedShift}
                            theme={theme}
                        />
                    )} */}
                </div>
            )}
        </div>
    );
};

// แก้ไขฟังก์ชัน formatDate
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default WardForm;