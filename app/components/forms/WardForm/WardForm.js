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
            // คำนวณ Patient Census
            calculatePatientCensusTotal();
            return;
        }

        setHasUnsavedChanges(true);
        
        setFormData(prevData => {
            // การป้องกันข้อมูล null/undefined
            const updatedData = { ...prevData };
            
            // ถ้ามี category ให้อัปเดตเฉพาะ field ใน category นั้น
            if (category) {
                updatedData[category] = {
                    ...updatedData[category],
                    [field]: value
                };
            } else {
                // ถ้าไม่มี category ให้อัปเดตที่ root level
                updatedData[field] = value;
            }
            
            // หลังจากอัปเดตข้อมูล ถ้าเป็นการเปลี่ยนแปลงข้อมูลใน patientCensus ให้คำนวณผลรวมใหม่
            if (category === 'patientCensus') {
                // เรียกใช้ฟังก์ชันคำนวณผลรวม
                setTimeout(() => {
                    calculatePatientCensusTotal(updatedData);
                }, 0);
            }
            
            return updatedData;
        });
    };

    // ฟังก์ชันคำนวณ Patient Census
    const calculatePatientCensusTotal = (currentData = null) => {
        // ใช้ข้อมูลที่ส่งเข้ามา หรือถ้าไม่มีให้ใช้ formData ปัจจุบัน
        const data = currentData || formData;
        
        if (!data?.patientCensus) {
            console.warn('Cannot calculate total: patientCensus data is missing');
            return;
        }
        
        const patientCensus = data.patientCensus;
        
        // แปลงค่าเป็นตัวเลข
        const newAdmit = parseInt(patientCensus.newAdmit || '0');
        const transferIn = parseInt(patientCensus.transferIn || '0');
        const referIn = parseInt(patientCensus.referIn || '0');
        const transferOut = parseInt(patientCensus.transferOut || '0');
        const referOut = parseInt(patientCensus.referOut || '0');
        const discharge = parseInt(patientCensus.discharge || '0');
        const dead = parseInt(patientCensus.dead || '0');
        
        // คำนวณตามสูตร
        const totalAdmitted = newAdmit + transferIn + referIn;
        const totalDischarged = transferOut + referOut + discharge + dead;
        
        const total = totalAdmitted - totalDischarged;
        
        // อัปเดตค่า total
        setFormData(prevData => {
            const updatedData = { ...prevData };
            
            // อัปเดต total ใน patientCensus
            updatedData.patientCensus = {
                ...updatedData.patientCensus,
                total: total.toString()
            };
            
            // ถ้าเป็นกะดึก (Night) ให้อัปเดต overallData ด้วย
            if (selectedShift === 'Night (19:00-07:00)') {
                updatedData.overallData = total.toString();
            }
            
            return updatedData;
        });
        
        console.log('Calculated Patient Census Total:', total);
        
        return total;
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ใช้พื้นที่มากขึ้นสำหรับ DateSelector */}
                    <div className="md:col-span-1">
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
                    </div>
                    
                    {/* เพิ่มพื้นที่สำหรับ ShiftSelection */}
                    <div className="md:col-span-1">
                        <div className={`h-full flex flex-col justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>กะการทำงาน:</label>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => handleShiftChange('Morning (07:00-19:00)')}
                                    className={`flex-1 px-4 py-3 rounded-lg transition-colors duration-200 ${
                                        selectedShift === 'Morning (07:00-19:00)' 
                                            ? (isDark ? 'bg-green-700 text-white' : 'bg-green-200 text-green-800')
                                            : (isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')
                                    }`}
                                >
                                    <span className="block text-center">เช้า (07:00-19:00)</span>
                                </button>
                                <button
                                    onClick={() => handleShiftChange('Night (19:00-07:00)')}
                                    className={`flex-1 px-4 py-3 rounded-lg transition-colors duration-200 ${
                                        selectedShift === 'Night (19:00-07:00)' 
                                            ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-800')
                                            : (isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')
                                    }`}
                                >
                                    <span className="block text-center">ดึก (19:00-07:00)</span>
                                </button>
                            </div>
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
    // Always use the user's department directly from their profile
    const selectedWard = user?.department || '';
    
    // Initialize form data with empty values
    const [formData, setFormData] = useState({
        patientCensus: {
            newAdmit: '0',
            transferIn: '0',
            referIn: '0',
            transferOut: '0',
            referOut: '0',
            discharge: '0',
            dead: '0',
            total: '0'
        },
        staffing: {
            rn: '0',
            lpn: '0',
            nurseManager: '0',
            wc: '0',
            notes: '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            isDraft: false
        },
        bedManagement: {
            available: '0',
            unavailable: '0',
            plannedDischarge: '0'
        },
        overallData: '0'
    });

    const [showHistory, setShowHistory] = useState(false);

    // ดึงข้อมูลร่างและข้อมูลที่บันทึกไว้ก่อนหน้า
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        
        const loadData = async () => {
            try {
                if (!user?.department || !selectedDate || !selectedShift) {
                    setIsLoading(false);
                    return;
                }
                
                // จัดรูปแบบวันที่ให้เป็น yyyy-MM-dd
                const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
                
                // สร้าง docId จากข้อมูลที่เลือก
                const docId = `${formattedDate}_${user.department}_${selectedShift}`;
                
                console.log('Checking for existing data with docId:', docId);
                
                // ตรวจสอบว่ามีข้อมูลร่างสำหรับผู้ใช้นี้หรือไม่
                const userDrafts = await getUserDrafts(user?.uid, user.department, formattedDate, selectedShift);
                
                // ตรวจสอบว่ามีข้อมูลที่บันทึกแล้วหรือไม่
                const docRef = doc(db, 'wardDataFinal', docId);
                const docSnap = await getDoc(docRef);
                
                // ถ้ามีข้อมูลที่บันทึกแล้ว จะใช้ข้อมูลนั้น
                if (docSnap.exists()) {
                    console.log('Found existing Final data');
                    
                    const data = docSnap.data();
                    if (isMounted) {
                        setFormData(data);
                        setIsReadOnly(true); // ตั้งค่าให้เป็นแบบอ่านอย่างเดียว เนื่องจากเป็นข้อมูลที่บันทึกแล้ว
                        setIsLoading(false);
                        
                        // แจ้งเตือนผู้ใช้ว่าข้อมูลนี้ได้รับการบันทึกเป็นฉบับสมบูรณ์แล้ว
                        toast({
                            title: 'ข้อมูลฉบับสมบูรณ์',
                            description: 'ข้อมูลนี้ได้รับการบันทึกเป็นฉบับสมบูรณ์แล้ว ไม่สามารถแก้ไขได้',
                            status: 'info',
                            duration: 5000,
                            isClosable: true,
                        });
                    }
                    return;
                }
                
                // ถ้ามีร่าง จะใช้ร่างล่าสุด
                if (userDrafts && userDrafts.length > 0) {
                    console.log('Found user drafts:', userDrafts.length);
                    // เรียงลำดับตาม timestamp ให้ร่างล่าสุดอยู่ข้างบน
                    userDrafts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    const latestDraft = userDrafts[0];
                    
                    if (isMounted) {
                        setFormData(latestDraft);
                        setIsLoading(false);
                        setHasUnsavedChanges(false); // ไม่มีการเปลี่ยนแปลงใหม่ เพราะเพิ่งโหลดข้อมูลร่างมา
                        
                        // แจ้งเตือนผู้ใช้ว่ามีร่างที่ถูกบันทึกไว้
                        toast({
                            title: 'พบข้อมูลร่าง',
                            description: 'โหลดข้อมูลร่างล่าสุดสำเร็จ',
                            status: 'success',
                            duration: 3000,
                            isClosable: true,
                        });
                    }
                    return;
                }
                
                // ถ้าไม่มีร่างและไม่มีข้อมูลที่บันทึกแล้ว:
                // 1. ดึงข้อมูลย้อนหลัง 7 วันเพื่อใช้ในการคำนวณ
                // 2. สร้างข้อมูลเริ่มต้นใหม่
                
                // สร้างข้อมูลใหม่เริ่มต้น (จะถูกอัปเดตด้วยข้อมูลจากวันก่อนหน้าถ้ามี)
                let initialData = {
                    patientCensus: {
                        total: '0',
                        newAdmit: '0',
                        transferIn: '0',
                        referIn: '0',
                        transferOut: '0',
                        referOut: '0',
                        discharge: '0',
                        dead: '0'
                    },
                    bedManagement: {
                        available: '0',
                        unavailable: '0',
                        plannedDischarge: '0'
                    },
                    staffing: {
                        nurseManager: '0',
                        rn: '0',
                        lpn: '0',
                        na: '0',
                        wc: '0',
                        other: '0',
                        firstName: '',
                        lastName: '',
                        notes: ''
                    },
                    overallData: '0'
                };

                // ดึงข้อมูลย้อนหลัง 7 วัน
                const previousData = await getPreviousWardData(user.department, formattedDate, 7);
                
                // ถ้ามีข้อมูลย้อนหลัง ใช้ข้อมูลล่าสุดเป็นค่าเริ่มต้น
                if (previousData && previousData.length > 0) {
                    console.log('Found previous data:', previousData.length);
                    
                    // ถ้าเป็นกะเช้า (Morning) ใช้ข้อมูลจากกะดึกล่าสุด
                    if (selectedShift === 'Morning (07:00-19:00)') {
                        // หาข้อมูลกะดึกล่าสุด
                        const latestNightShift = previousData.find(data => data.shift === 'Night (19:00-07:00)');
                        
                        if (latestNightShift) {
                            console.log('Using data from latest night shift');
                            // ใช้ overall data จากกะดึกเป็นค่าเริ่มต้น
                            const previousOverallData = parseInt(latestNightShift.overallData || '0');
                            initialData.patientCensus.total = previousOverallData.toString();
                        }
                    } 
                    // ถ้าเป็นกะดึก (Night) ใช้ข้อมูลจากกะเช้าของวันเดียวกัน
                    else if (selectedShift === 'Night (19:00-07:00)') {
                        // สร้าง docId สำหรับกะเช้าของวันเดียวกัน
                        const morningDocId = `${formattedDate}_${user.department}_Morning (07:00-19:00)`;
                        const morningDocRef = doc(db, 'wardDataFinal', morningDocId);
                        const morningDocSnap = await getDoc(morningDocRef);
                        
                        if (morningDocSnap.exists()) {
                            console.log('Using data from morning shift of the same day');
                            const morningData = morningDocSnap.data();
                            // ใช้ patient census จากกะเช้าเป็นค่าเริ่มต้น
                            const morningCensus = parseInt(morningData.patientCensus?.total || '0');
                            initialData.patientCensus.total = morningCensus.toString();
                            initialData.overallData = morningCensus.toString();
                        } else {
                            // ถ้าไม่มีข้อมูลกะเช้า ใช้ข้อมูลล่าสุดจากวันก่อนหน้า
                            console.log('No morning shift data found for today, using previous data');
                            if (previousData.length > 0) {
                                const latestData = previousData[0]; // ข้อมูลล่าสุด
                                const previousTotal = parseInt(latestData.patientCensus?.total || '0');
                                initialData.patientCensus.total = previousTotal.toString();
                                initialData.overallData = previousTotal.toString();
                            }
                        }
                    }
                }
                
                if (isMounted) {
                    setFormData(initialData);
                    setIsLoading(false);
                    setHasUnsavedChanges(false); // ยังไม่มีการเปลี่ยนแปลง
                }
                
            } catch (error) {
                console.error('Error loading data:', error);
                if (isMounted) {
                    setIsLoading(false);
                    
                    // แจ้งเตือนข้อผิดพลาด
                    toast({
                        title: 'เกิดข้อผิดพลาด',
                        description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    }, [user?.department, selectedDate, selectedShift]);
    
    // ฟังก์ชันดึงข้อมูลย้อนหลัง
    const getPreviousWardData = async (department, currentDate, days) => {
        try {
            console.log(`Getting previous ${days} days data for department ${department} from ${currentDate}`);
            const currentDateObj = new Date(currentDate);
            
            // สร้างอาร์เรย์เพื่อเก็บข้อมูล
            const allPreviousData = [];
            
            // ดึงข้อมูลย้อนหลังตามจำนวนวันที่กำหนด
            for (let i = 1; i <= days; i++) {
                // คำนวณวันที่ย้อนหลัง
                const previousDate = new Date(currentDateObj);
                previousDate.setDate(previousDate.getDate() - i);
                const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');
                
                // ดึงข้อมูลกะเช้าและกะดึกของวันนั้น
                const morningDocId = `${formattedPreviousDate}_${department}_Morning (07:00-19:00)`;
                const nightDocId = `${formattedPreviousDate}_${department}_Night (19:00-07:00)`;
                
                const morningDocRef = doc(db, 'wardDataFinal', morningDocId);
                const nightDocRef = doc(db, 'wardDataFinal', nightDocId);
                
                const [morningDocSnap, nightDocSnap] = await Promise.all([
                    getDoc(morningDocRef),
                    getDoc(nightDocRef)
                ]);
                
                // เพิ่มข้อมูลลงในอาร์เรย์
                if (morningDocSnap.exists()) {
                    allPreviousData.push(morningDocSnap.data());
                }
                
                if (nightDocSnap.exists()) {
                    allPreviousData.push(nightDocSnap.data());
                }
            }
            
            // เรียงลำดับข้อมูลตามวันที่และกะ (ล่าสุดอยู่ข้างบน)
            allPreviousData.sort((a, b) => {
                // เปรียบเทียบวันที่ก่อน
                const dateComparison = new Date(b.date) - new Date(a.date);
                if (dateComparison !== 0) return dateComparison;
                
                // ถ้าวันที่เดียวกัน เรียงตามกะ (Night มาก่อน Morning)
                if (a.shift === 'Night (19:00-07:00)' && b.shift === 'Morning (07:00-19:00)') {
                    return -1;
                } else if (a.shift === 'Morning (07:00-19:00)' && b.shift === 'Night (19:00-07:00)') {
                    return 1;
                }
                
                return 0;
            });
            
            return allPreviousData;
        } catch (error) {
            console.error('Error getting previous data:', error);
            return [];
        }
    };

    // Modify the handleLocalDateSelect function to always use user.department
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
            console.log('Fetching ward data with params:', { 
                date: date, 
                wardId: user.department,
                shift: selectedShift
            });
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
            if (!user?.uid || !selectedWard) return false;
            
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลฉบับร่างทั้งหมดของผู้ใช้
            const drafts = await getUserDrafts(user.uid, selectedWard);
            
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
        
        // ตรวจสอบว่ามีการเลือก ward แล้วหรือไม่
        if (!selectedWard) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือก Ward',
                text: 'โปรดเลือก Ward ก่อนทำการเลือกกะ',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        try {
            setIsLoading(true);
            
            // กำหนดค่าเพื่อให้ชัดเจนว่าส่งอะไรไปบ้าง
            const dateToUse = selectedDate || new Date();
            const wardToUse = selectedWard;
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
                    
                    // คำนวณ Patient Census แบบอัตโนมัติ
                    const patientCensusData = {
                        newAdmit: last7DaysData.patientCensus?.newAdmit || '0',
                        transferIn: last7DaysData.patientCensus?.transferIn || '0',
                        referIn: last7DaysData.patientCensus?.referIn || '0',
                        transferOut: last7DaysData.patientCensus?.transferOut || '0',
                        referOut: last7DaysData.patientCensus?.referOut || '0',
                        discharge: last7DaysData.patientCensus?.discharge || '0',
                        dead: last7DaysData.patientCensus?.dead || '0'
                    };
                    
                    // คำนวณยอดรวม
                    const totalAdmitted = parseInt(patientCensusData.newAdmit || '0') + 
                                         parseInt(patientCensusData.transferIn || '0') + 
                                         parseInt(patientCensusData.referIn || '0');
                                         
                    const totalDischarged = parseInt(patientCensusData.transferOut || '0') + 
                                           parseInt(patientCensusData.referOut || '0') + 
                                           parseInt(patientCensusData.discharge || '0') + 
                                           parseInt(patientCensusData.dead || '0');
                                           
                    const patientCensus = totalAdmitted - totalDischarged;
                    
                    // คัดลอกข้อมูลที่จำเป็น
                    const newFormData = {
                        ...last7DaysData,
                        shift: shift,
                        wardId: wardToUse,
                        patientCensus: {
                            ...patientCensusData,
                            total: patientCensus.toString()
                        }
                    };
                    
                    setFormData(newFormData);
                    setIsReadOnly(false);
                    
                    Swal.fire({
                        icon: 'info',
                        title: 'ดึงข้อมูลอัตโนมัติ',
                        text: 'ระบบได้ดึงข้อมูล Patient Census จาก 7 วันย้อนหลังและคำนวณอัตโนมัติ คุณสามารถแก้ไขข้อมูลได้',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    // ไม่พบข้อมูล 7 วันย้อนหลัง เริ่มต้นด้วยค่าว่าง
                    setFormData({
                        patientCensus: {
                            newAdmit: '0',
                            transferIn: '0',
                            referIn: '0',
                            transferOut: '0',
                            referOut: '0',
                            discharge: '0',
                            dead: '0',
                            total: '0'
                        },
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
                    
                    // คำนวณ Overall Data แบบอัตโนมัติจากข้อมูลกะเช้า
                    const patientCensusData = {
                        newAdmit: morningShiftData.patientCensus?.newAdmit || '0',
                        transferIn: morningShiftData.patientCensus?.transferIn || '0',
                        referIn: morningShiftData.patientCensus?.referIn || '0',
                        transferOut: morningShiftData.patientCensus?.transferOut || '0',
                        referOut: morningShiftData.patientCensus?.referOut || '0',
                        discharge: morningShiftData.patientCensus?.discharge || '0',
                        dead: morningShiftData.patientCensus?.dead || '0'
                    };
                    
                    // คำนวณยอดรวม
                    const totalAdmitted = parseInt(patientCensusData.newAdmit || '0') + 
                                         parseInt(patientCensusData.transferIn || '0') + 
                                         parseInt(patientCensusData.referIn || '0');
                                         
                    const totalDischarged = parseInt(patientCensusData.transferOut || '0') + 
                                           parseInt(patientCensusData.referOut || '0') + 
                                           parseInt(patientCensusData.discharge || '0') + 
                                           parseInt(patientCensusData.dead || '0');
                                           
                    const patientCensus = totalAdmitted - totalDischarged;
                    
                    // คัดลอกข้อมูลจากกะเช้ามาใช้
                    const newFormData = {
                        ...morningShiftData,
                        shift: shift,
                        patientCensus: {
                            ...patientCensusData,
                            total: patientCensus.toString()
                        }
                    };
                    
                    setFormData(newFormData);
                    setIsReadOnly(false);
                    
                    Swal.fire({
                        icon: 'info',
                        title: 'ดึงข้อมูลอัตโนมัติ',
                        text: 'ระบบได้ดึงข้อมูล Overall Data จากกะเช้าของวันนี้และคำนวณอัตโนมัติ คุณสามารถแก้ไขข้อมูลได้',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    console.log('No morning shift data found, looking for past data');
                    // ไม่พบข้อมูลกะเช้า ลองหาข้อมูลจาก 7 วันย้อนหลัง
                    const last7DaysData = await fetchLast7DaysData(dateToUse, wardToUse);
                    
                    if (last7DaysData) {
                        console.log('Found data from last 7 days instead:', last7DaysData);
                        
                        // คำนวณ Patient Census แบบอัตโนมัติ
                        const patientCensusData = {
                            newAdmit: last7DaysData.patientCensus?.newAdmit || '0',
                            transferIn: last7DaysData.patientCensus?.transferIn || '0',
                            referIn: last7DaysData.patientCensus?.referIn || '0',
                            transferOut: last7DaysData.patientCensus?.transferOut || '0',
                            referOut: last7DaysData.patientCensus?.referOut || '0',
                            discharge: last7DaysData.patientCensus?.discharge || '0',
                            dead: last7DaysData.patientCensus?.dead || '0'
                        };
                        
                        // คำนวณยอดรวม
                        const totalAdmitted = parseInt(patientCensusData.newAdmit || '0') + 
                                             parseInt(patientCensusData.transferIn || '0') + 
                                             parseInt(patientCensusData.referIn || '0');
                                             
                        const totalDischarged = parseInt(patientCensusData.transferOut || '0') + 
                                               parseInt(patientCensusData.referOut || '0') + 
                                               parseInt(patientCensusData.discharge || '0') + 
                                               parseInt(patientCensusData.dead || '0');
                                               
                        const patientCensus = totalAdmitted - totalDischarged;
                        
                        // คัดลอกข้อมูลที่จำเป็น
                        const newFormData = {
                            ...last7DaysData,
                            shift: shift,
                            wardId: wardToUse,
                            patientCensus: {
                                ...patientCensusData,
                                total: patientCensus.toString()
                            }
                        };
                        
                        setFormData(newFormData);
                        setIsReadOnly(false);
                        
                        Swal.fire({
                            icon: 'info',
                            title: 'ดึงข้อมูลอัตโนมัติ',
                            text: 'ไม่พบข้อมูลกะเช้า ระบบได้ดึงข้อมูล Overall Data จาก 7 วันย้อนหลังและคำนวณอัตโนมัติ คุณสามารถแก้ไขข้อมูลได้',
                            confirmButtonColor: '#0ab4ab'
                        });
                    } else {
                        // ไม่พบข้อมูลใดๆ เริ่มต้นด้วยค่าว่าง
                        setFormData({
                            patientCensus: {
                                newAdmit: '0',
                                transferIn: '0',
                                referIn: '0',
                                transferOut: '0',
                                referOut: '0',
                                discharge: '0',
                                dead: '0',
                                total: '0'
                            },
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

    // บันทึกข้อมูลร่าง
    const onSaveDraft = async () => {
        try {
            setIsSubmitting(true);
            setIsDraftMode(true);
            
            console.log('Saving draft with department:', user?.department);
            
            const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!user?.department || !formattedDate || !selectedShift) {
                const missingFields = [];
                if (!user?.department) missingFields.push('Department');
                if (!formattedDate) missingFields.push('Date');
                if (!selectedShift) missingFields.push('Shift');
                
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: `กรุณากรอกข้อมูล: ${missingFields.join(', ')}`,
                    confirmButtonColor: '#0ab4ab'
                });
                
                setIsSubmitting(false);
                return;
            }
            
            // คำนวณ Patient Census ก่อนการบันทึก
            const newFormData = { ...formData };
            const patientCensus = newFormData.patientCensus;
            
            const newAdmit = parseInt(patientCensus.newAdmit || '0');
            const transferIn = parseInt(patientCensus.transferIn || '0');
            const referIn = parseInt(patientCensus.referIn || '0');
            const transferOut = parseInt(patientCensus.transferOut || '0');
            const referOut = parseInt(patientCensus.referOut || '0');
            const discharge = parseInt(patientCensus.discharge || '0');
            const dead = parseInt(patientCensus.dead || '0');
            
            // คำนวณตามสูตร
            const totalAdmitted = newAdmit + transferIn + referIn;
            const totalDischarged = transferOut + referOut + discharge + dead;
            
            const total = totalAdmitted - totalDischarged;
            newFormData.patientCensus.total = total.toString();
            
            // อัปเดต Overall Data ด้วยค่าเดียวกันเมื่ออยู่ในกะดึก
            if (selectedShift === 'Night (19:00-07:00)') {
                newFormData.overallData = total.toString();
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const draftData = {
                ...newFormData,
                userId: user.uid,
                userName: user.username,
                userRole: user.role,
                userDepartment: user.department,
                date: formattedDate,
                thaiDate: thaiDate,
                shift: selectedShift,
                wardId: user.department,
                isDraft: true,
                timestamp: new Date().toISOString()
            };
            
            // เรียกใช้ฟังก์ชันบันทึกข้อมูลร่าง
            const result = await saveWardDataDraft(draftData);
            
            if (result.success) {
                setHasUnsavedChanges(false);
                setFormData(newFormData); // อัปเดต formData ให้มีค่าล่าสุด
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกร่างสำเร็จ',
                    text: 'ข้อมูลได้รับการบันทึกเป็นฉบับร่างแล้ว',
                    confirmButtonColor: '#0ab4ab'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: result.error || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
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

    // บันทึกข้อมูลฉบับสมบูรณ์
    const onSubmit = async () => {
        try {
            setIsSubmitting(true);
            setIsDraftMode(false);
            
            console.log('Submitting form with department:', user?.department);
            
            const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!user?.department || !formattedDate || !selectedShift) {
                const missingFields = [];
                if (!user?.department) missingFields.push('Department');
                if (!formattedDate) missingFields.push('Date');
                if (!selectedShift) missingFields.push('Shift');
                
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: `กรุณากรอกข้อมูล: ${missingFields.join(', ')}`,
                    confirmButtonColor: '#0ab4ab'
                });
                
                setIsSubmitting(false);
                return;
            }
            
            // ตรวจสอบว่ามีข้อมูลในฟอร์ม
            if (!formData.patientCensus || !formData.staffing) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณากรอกข้อมูลในฟอร์มให้ครบถ้วน',
                    confirmButtonColor: '#0ab4ab'
                });
                
                setIsSubmitting(false);
                return;
            }

            // ตรวจสอบว่าข้อมูลวันและกะนี้ได้เคยบันทึกเป็น Final แล้วหรือไม่
            const docId = `${formattedDate}_${user.department}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists() && docSnap.data().isApproved) {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถบันทึกข้อมูลได้',
                    text: 'ข้อมูลของวันและกะนี้ได้รับการอนุมัติเป็น Final แล้ว ไม่สามารถบันทึกทับได้',
                    confirmButtonColor: '#0ab4ab'
                });
                
                setIsSubmitting(false);
                return;
            }
            
            // คำนวณ Patient Census ก่อนการบันทึก
            const newFormData = { ...formData };
            const patientCensus = newFormData.patientCensus;
            
            const newAdmit = parseInt(patientCensus.newAdmit || '0');
            const transferIn = parseInt(patientCensus.transferIn || '0');
            const referIn = parseInt(patientCensus.referIn || '0');
            const transferOut = parseInt(patientCensus.transferOut || '0');
            const referOut = parseInt(patientCensus.referOut || '0');
            const discharge = parseInt(patientCensus.discharge || '0');
            const dead = parseInt(patientCensus.dead || '0');
            
            // คำนวณตามสูตร
            const totalAdmitted = newAdmit + transferIn + referIn;
            const totalDischarged = transferOut + referOut + discharge + dead;
            
            const total = totalAdmitted - totalDischarged;
            newFormData.patientCensus.total = total.toString();
            
            // อัปเดต Overall Data ด้วยค่าเดียวกันเมื่ออยู่ในกะดึก
            if (selectedShift === 'Night (19:00-07:00)') {
                newFormData.overallData = total.toString();
            }
            
            // ขอคำยืนยันก่อนบันทึก
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการบันทึกข้อมูล',
                text: 'คุณแน่ใจหรือไม่ว่าต้องการบันทึกข้อมูลนี้? หลังจากบันทึกแล้ว จะไม่สามารถแก้ไขได้',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ใช่, บันทึกข้อมูล',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (!confirmResult.isConfirmed) {
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const finalData = {
                ...newFormData,
                userId: user.uid,
                userName: user.username,
                userRole: user.role,
                userDepartment: user.department,
                date: formattedDate,
                thaiDate: thaiDate,
                shift: selectedShift,
                wardId: user.department,
                isDraft: false,
                isApproved: false,
                timestamp: new Date().toISOString()
            };
            
            // บันทึกข้อมูลลง collection wardDataFinal
            await setDoc(doc(db, 'wardDataFinal', docId), finalData);
            
            // บันทึกประวัติการเปลี่ยนแปลง
            await logWardDataHistory(finalData, 'submit_final', user?.uid);
            
            // ลบฉบับร่างที่มีอยู่ (ถ้ามี)
            const drafts = await getUserDrafts(user?.uid, user.department, formattedDate, selectedShift);
            if (drafts && drafts.length > 0) {
                for (const draft of drafts) {
                    await deleteWardDataDraft(draft.id);
                }
            }
            
            // อัปเดต formData เป็นค่าล่าสุด
            setFormData(newFormData);
            
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'ข้อมูลได้รับการบันทึกเป็นฉบับสมบูรณ์แล้ว ไม่สามารถแก้ไขได้อีก',
                confirmButtonColor: '#0ab4ab'
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to save data. Please try again.',
                confirmButtonColor: '#d33'
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
                        selectedWard={selectedWard}
                        formData={formData}
                        setFormData={setFormData}
                        handleLocalDateSelect={handleLocalDateSelect}
                        handleShiftChange={handleLocalShiftChange}
                        thaiDate={thaiDate}
                        setThaiDate={setThaiDate}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
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