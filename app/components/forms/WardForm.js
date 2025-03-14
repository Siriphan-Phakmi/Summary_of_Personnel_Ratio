'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit } from 'firebase/firestore';
import LoadingScreen from '../ui/LoadingScreen';
import { Swal } from '../../utils/alertService';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import CalendarSection from '../common/CalendarSection';
import ShiftSelection from '../common/ShiftSelection';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../utils/clientLogging';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';  // เพิ่ม import format จาก date-fns

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
    PatientCensusSection,
    StaffSection,
    NotesSection
} from './WardForm/index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    getLatestDraft,
    deleteWardDataDraft
} from '../../lib/dataAccess';

// เพิ่มคอมโพเนนต์แสดงสถานะการอนุมัติที่ชัดเจน
const ApprovalStatusIndicator = ({ status }) => {
    if (!status) return null;
    
    let statusText = 'รอการอนุมัติ';
    let bgColor = 'bg-yellow-100';
    let textColor = 'text-yellow-800';
    let icon = (
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
    
    if (status === 'approved' || (typeof status === 'object' && status.status === 'approved')) {
        statusText = 'อนุมัติแล้ว';
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        );
    } else if (status === 'not_recorded' || (typeof status === 'object' && status.status === 'not_recorded')) {
        statusText = 'ยังไม่มีการบันทึก';
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
    } else if (status === 'draft' || (typeof status === 'object' && status.status === 'draft') || isDraftMode) {
        statusText = 'ฉบับร่าง';
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        icon = (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        );
    }
    
    return (
        <div className={`px-3 py-1.5 ${bgColor} ${textColor} rounded-md flex items-center font-medium text-sm`}>
            {icon}
            <span>{statusText}</span>
        </div>
    );
};

// เพิ่มคอมโพเนนต์แสดงวิธีการคำนวณ
const CalculationInfo = ({ shift }) => {
    const formula = "newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead";
    
    if (shift === 'เช้า') {
        return (
            <div className="text-sm text-gray-600 mt-1 mb-2 bg-gray-100 p-2 rounded">
                <p>สูตรคำนวณกะเช้า: ข้อมูล Overall Data จากวันก่อนหน้า (จากกะดึก) เป็นค่า Patient Census</p>
                <p>หมายเหตุ: หากไม่มีข้อมูลวันก่อนหน้า ให้กรอกข้อมูลด้วยตนเอง</p>
                <p>การคำนวณ: {formula} = Overall Data</p>
            </div>
        );
    } else if (shift === 'ดึก') {
        return (
            <div className="text-sm text-gray-600 mt-1 mb-2 bg-gray-100 p-2 rounded">
                <p>สูตรคำนวณกะดึก: {formula} = Overall Data</p>
                <p>หมายเหตุ: Overall Data จะถูกใช้เป็น Patient Census ในวันถัดไป (กะเช้า)</p>
            </div>
        );
    }
    return null;
};

// เพิ่มคอมโพเนนต์สำหรับติดต่อ Supervisor
const ContactSupervisorButton = ({ approvalStatus, wardId, thaiDate, shift }) => {
    const needsContact = approvalStatus && 
        (approvalStatus === 'pending' || 
         (typeof approvalStatus === 'object' && approvalStatus.status === 'pending_approval'));
    
    if (!needsContact) return null;
    
    const handleContact = () => {
        // เพิ่มฟังก์ชันสำหรับติดต่อ Supervisor ผ่านอีเมลหรือแชท
        const supervisorEmail = 'supervisor@hospital.org';
        const subject = `ขอการอนุมัติข้อมูล Ward ${wardId} วันที่ ${thaiDate}`;
        const body = `เรียน Supervisor,\n\nกรุณาอนุมัติข้อมูล Ward ${wardId} วันที่ ${thaiDate} กะ ${shift}\n\nขอบคุณครับ/ค่ะ`;
        
        window.open(`mailto:${supervisorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };
    
    return (
        <button
            type="button"
            onClick={handleContact}
            className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200 transition-colors"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>ติดต่อ Supervisor</span>
        </button>
    );
};

// เพิ่มฟังก์ชันคำนวณ Patient Census และ Overall Data
const calculatePatientCensus = (formData) => {
    // แปลงค่าให้เป็นตัวเลข
    const newAdmit = parseInt(formData.newAdmit) || 0;
    const transferIn = parseInt(formData.transferIn) || 0;
    const referIn = parseInt(formData.referIn) || 0;
    const transferOut = parseInt(formData.transferOut) || 0;
    const referOut = parseInt(formData.referOut) || 0;
    const discharge = parseInt(formData.discharge) || 0;
    const dead = parseInt(formData.dead) || 0;

    return newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
};

const WardForm = ({ wardId }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    
    // ตรวจสอบให้แน่ใจว่ามีค่าที่ถูกต้องสำหรับ selectedWard
    const initialWard = useMemo(() => {
        if (wardId && wardId.trim() !== '') {
            return wardId;
        } 
        if (user?.department && user.department.trim() !== '') {
            return user.department;
        }
        // ถ้าไม่มีค่าใดๆ ให้เป็นสตริงว่าง หรือค่าเริ่มต้นอื่นๆ
        return '';
    }, [wardId, user]);
    
    const [selectedWard, setSelectedWard] = useState(initialWard);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(getCurrentShift());
    const [thaiDate, setThaiDate] = useState(getThaiDateNow());
    const [showCalendar, setShowCalendar] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [previousShiftData, setPreviousShiftData] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null);
    const [latestRecordDate, setLatestRecordDate] = useState(null);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shiftStatus, setShiftStatus] = useState(null);
    const [approvalPending, setApprovalPending] = useState(false);
    const [supervisorApproved, setSupervisorApproved] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [originalData, setOriginalData] = useState(null);
    
    const [formData, setFormData] = useState({
        patientCensus: '',
        overallData: '',
        newAdmit: '',
        transferIn: '',
        referIn: '',
        transferOut: '',
        referOut: '',
        discharge: '',
        dead: '',
        rns: '',
        pns: '',
        nas: '',
        aides: '',
        studentNurses: '',
        notes: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        isDraft: false
    });

    const [previousDayData, setPreviousDayData] = useState(null);
    const [past30DaysResult, setPast30DaysResult] = useState(null);
    const [has7DaysData, setHas7DaysData] = useState(true); // สถานะการตรวจสอบข้อมูล 7 วัน
    const [draftsAvailable, setDraftsAvailable] = useState(false); // สถานะการมีข้อมูลฉบับร่าง
    
    // เพิ่ม state สำหรับการดูประวัติ
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    
    // เพิ่ม useEffect ใหม่เพื่อจัดการการโหลดข้อมูลทั้งหมดเมื่อเริ่มต้น
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard) return;
            
            try {
                setIsLoading(true);
                
                // นำเข้าฟังก์ชันจาก firebase-index-manager
                const { handleIndexError } = await import('../../utils/firebase-index-manager');
                
                // 1. ตรวจสอบข้อมูลย้อนหลัง 7 วัน
                try {
                    const sevenDaysCheck = await checkLast7DaysData(selectedWard, selectedDate);
                    setHas7DaysData(sevenDaysCheck.hasData);
                    
                    // ถ้าไม่มีข้อมูลย้อนหลัง 7 วัน ให้แจ้งเตือนผู้ใช้
                    if (!sevenDaysCheck.hasData) {
                        Swal.fire({
                            title: 'ไม่พบข้อมูลย้อนหลัง',
                            text: sevenDaysCheck.message,
                            icon: 'warning',
                            confirmButtonColor: '#0ab4ab'
                        });
                    }
                } catch (error) {
                    console.error('Error checking 7 days data:', error);
                }
                
                // 2. ตรวจสอบว่ามีฉบับร่างของผู้ใช้หรือไม่
                if (user && user.uid) {
                    try {
                        const latestDraft = await getLatestDraft(
                            user.uid, 
                            selectedWard, 
                            format(selectedDate, 'yyyy-MM-dd'), 
                            selectedShift
                        );
                        
                        if (latestDraft) {
                            setDraftsAvailable(true);
                            
                            // แจ้งเตือนผู้ใช้ว่ามีฉบับร่างบันทึกไว้
                            const draftTime = latestDraft.lastUpdated?.toDate
                                ? new Date(latestDraft.lastUpdated.toDate()).toLocaleString('th-TH')
                                : 'ไม่ระบุเวลา';
                            
                            Swal.fire({
                                title: 'พบข้อมูลฉบับร่างที่บันทึกไว้',
                                html: `
                                    <div class="text-left">
                                        <p>คุณมีข้อมูลฉบับร่างที่บันทึกไว้เมื่อ ${draftTime}</p>
                                        <p>ต้องการโหลดข้อมูลฉบับร่างนี้หรือไม่?</p>
                                    </div>
                                `,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'โหลดข้อมูลฉบับร่าง',
                                cancelButtonText: 'ไม่ต้องการ',
                                confirmButtonColor: '#0ab4ab'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    // โหลดข้อมูลฉบับร่าง
                                    setFormData({
                                        ...latestDraft,
                                        // ไม่รวม field ที่ไม่ต้องการ
                                        id: undefined,
                                        lastUpdated: undefined
                                    });
                                    setHasUnsavedChanges(false);
                                    setIsDraftMode(true);
                                    
                                    Swal.fire({
                                        title: 'โหลดข้อมูลสำเร็จ',
                                        text: 'โหลดข้อมูลฉบับร่างเรียบร้อยแล้ว',
                                        icon: 'success',
                                        confirmButtonColor: '#0ab4ab'
                                    });
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Error checking drafts:', error);
                    }
                }
                
                // 3. ดึงข้อมูลของวันก่อนหน้าสำหรับกะเช้า (ยังใช้โค้ดเดิม)
                if (selectedDate && selectedShift === 'เช้า') {
                    try {
                        const previousDayData = await fetchPreviousDayData();
                        if (previousDayData) {
                            setFormData(prevData => ({
                                ...prevData,
                                patientCensus: previousDayData.overallData?.numberOfPatients || ''
                            }));
                        }
                    } catch (error) {
                        console.error('Error fetching previous day data:', error);
                        if (handleIndexError && error.message && error.message.includes('index')) {
                            handleIndexError(error);
                        }
                    }
                }
                
                // 4. ตรวจสอบสถานะการอนุมัติ
                try {
                    const status = await checkApprovalStatus(selectedDate, selectedWard, selectedShift);
                    setShiftStatus(status);
                    
                    if (status && status !== 'loading') {
                        if (status.status === 'approved') {
                            setIsReadOnly(true);
                        } else {
                            setIsReadOnly(false);
                        }
                    }
                } catch (error) {
                    console.error('Error checking approval status:', error);
                }
                
                // 5. ดึงข้อมูล ward data
                try {
                    const data = await fetchWardData(selectedDate, selectedWard, selectedShift);
                    if (data) {
                        setFormData(data);
                        setOriginalData(data);
                        setHasUnsavedChanges(false);
                    }
                } catch (error) {
                    console.error('Error fetching ward data:', error);
                    if (handleIndexError && error.message && error.message.includes('index')) {
                        handleIndexError(error);
                    }
                }
                
            } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        initializeData();
    }, [selectedWard, selectedDate, selectedShift, user]);
    
    // ฟังก์ชันดึงข้อมูลวันก่อนหน้าที่ผ่านการอนุมัติแล้วเท่านั้น
    const fetchPreviousDayData = async () => {
        try {
            if (!selectedWard) return null;
            
            // คำนวณวันก่อนหน้า
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const formattedPrevDate = format(prevDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลกะดึกของวันก่อนหน้า (เฉพาะที่อนุมัติแล้ว)
            const q = query(
                collection(db, 'wardData'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedPrevDate),
                where('shift', '==', 'ดึก')
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // กรองเอาเฉพาะข้อมูลที่อนุมัติแล้ว
                const approvedData = querySnapshot.docs
                    .filter(doc => doc.data().isApproved === true)
                    .map(doc => ({id: doc.id, ...doc.data()}));
                
                if (approvedData.length > 0) {
                    const prevDayData = approvedData[0];
                    setPreviousDayData(prevDayData);
                    return prevDayData;
                }
            }
            
            // ถ้าไม่มีข้อมูลกะดึกของวันก่อนหน้า ให้ตรวจสอบว่ามีข้อมูลที่อนุมัติแล้วหรือไม่ย้อนหลังไป 30 วัน
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const formattedThirtyDaysAgo = format(thirtyDaysAgo, 'yyyy-MM-dd');
            
            // ดึงข้อมูลทั้งหมดในช่วง 30 วันก่อนหน้า
            const qLastThirtyDays = query(
                collection(db, 'wardData'),
                where('wardId', '==', selectedWard),
                where('shift', '==', 'ดึก')
            );
            
            const thirtyDaysSnapshot = await getDocs(qLastThirtyDays);
            
            if (!thirtyDaysSnapshot.empty) {
                // กรองและจัดเรียงข้อมูลด้วย JavaScript แทนการใช้ query
                const filteredData = thirtyDaysSnapshot.docs
                    .map(doc => ({id: doc.id, ...doc.data()}))
                    .filter(doc => 
                        doc.date >= formattedThirtyDaysAgo && 
                        doc.date < formattedPrevDate && 
                        doc.isApproved === true
                    )
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                if (filteredData.length > 0) {
                    const lastApprovedData = filteredData[0];
                    setPreviousDayData(lastApprovedData);
                    return lastApprovedData;
                }
            }
            
            return {overallData: 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'};
            
        } catch (error) {
            console.error('Error fetching previous day data:', error);
            return {overallData: 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'};
        }
    };

    // Calculate values based on formulas
    useEffect(() => {
        // ไม่คำนวณถ้ากำลังโหลดข้อมูล
        if (isLoading) return;
        
        try {
            // คำนวณตามสูตร
            if (selectedShift === 'เช้า') {
                // สูตรกะเช้า = newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead
                const calculated = Number(formData.newAdmit || 0) + 
                                Number(formData.transferIn || 0) + 
                                Number(formData.referIn || 0) - 
                                Number(formData.transferOut || 0) + 
                                Number(formData.referOut || 0) + 
                                Number(formData.discharge || 0) + 
                                Number(formData.dead || 0);
                
                // อัปเดต patientCensus อัตโนมัติ
                if (calculated !== Number(formData.patientCensus)) {
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: calculated.toString()
                    }));
                    console.log('คำนวณ Patient Census:', calculated);
                }
            } else if (selectedShift === 'ดึก') {
                // สูตรกะดึก = newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead
                const calculated = Number(formData.newAdmit || 0) + 
                                Number(formData.transferIn || 0) + 
                                Number(formData.referIn || 0) - 
                                Number(formData.transferOut || 0) + 
                                Number(formData.referOut || 0) + 
                                Number(formData.discharge || 0) + 
                                Number(formData.dead || 0);
                
                // อัปเดต overallData อัตโนมัติ
                if (calculated !== Number(formData.overallData)) {
                    setFormData(prev => ({
                        ...prev,
                        overallData: calculated.toString()
                    }));
                    console.log('คำนวณ Overall Data:', calculated);
                }
            }
        } catch (error) {
            console.error('Error calculating values:', error);
        }
    }, [
        formData.newAdmit,
        formData.transferIn,
        formData.referIn,
        formData.transferOut,
        formData.referOut,
        formData.discharge,
        formData.dead,
        selectedShift,
        isLoading
    ]);

    // เพิ่มฟังก์ชัน handleLocalDateSelect
    const handleLocalDateSelect = async (date) => {
        try {
            if (hasUnsavedChanges) {
                const result = await Swal.fire({
                    title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                    text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนวันหรือไม่?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'บันทึก',
                    cancelButtonText: 'ไม่บันทึก',
                    confirmButtonColor: '#0ab4ab'
                });

                if (result.isConfirmed) {
                    await onSaveDraft();
                }
            }

            // ตรวจสอบข้อมูลย้อนหลัง 7 วัน
            try {
                const sevenDaysCheck = await checkLast7DaysData(selectedWard, date);
                setHas7DaysData(sevenDaysCheck.hasData);
                
                // ถ้าไม่มีข้อมูลย้อนหลัง 7 วัน ให้แจ้งเตือนผู้ใช้
                if (!sevenDaysCheck.hasData) {
                    Swal.fire({
                        title: 'ไม่พบข้อมูลย้อนหลัง',
                        text: sevenDaysCheck.message,
                        icon: 'warning',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
            } catch (error) {
                console.error('Error checking 7 days data:', error);
            }

            // ตรวจสอบข้อมูลที่มีอยู่แล้ว
            const existingData = await safeFetchWardData(date, selectedWard, selectedShift);
            if (existingData) {
                // สร้าง HTML สำหรับแสดงข้อมูลเดิม
                let existingDataHTML = '<div class="text-left max-h-60 overflow-y-auto p-2">';
                existingDataHTML += '<h3 class="font-medium mb-2 text-lg">ข้อมูลที่มีอยู่แล้ว:</h3>';
                existingDataHTML += '<table class="w-full text-sm">';
                
                // แสดงข้อมูลที่สำคัญและเข้าใจง่าย
                const keyMapping = {
                    patientCensus: 'Patient Census',
                    newAdmit: 'New Admit',
                    transferIn: 'Transfer In',
                    transferOut: 'Transfer Out',
                    discharge: 'Discharge',
                    RN: 'RN',
                    PN: 'PN',
                    WC: 'WC',
                    firstName: 'ผู้บันทึก (ชื่อ)',
                    lastName: 'ผู้บันทึก (นามสกุล)',
                    timestamp: 'เวลาบันทึก'
                };
                
                for (const [key, label] of Object.entries(keyMapping)) {
                    if (existingData[key] !== undefined) {
                        const value = key === 'timestamp' && existingData[key] ? 
                            new Date(existingData[key].seconds * 1000).toLocaleString('th-TH') : 
                            existingData[key];
                            
                        existingDataHTML += `
                            <tr>
                                <td class="pr-4 py-1 font-medium">${label}</td>
                                <td class="py-1">${value}</td>
                            </tr>`;
                    }
                }
                
                existingDataHTML += '</table></div>';

                const result = await Swal.fire({
                    title: 'พบข้อมูลที่มีอยู่แล้ว',
                    html: existingDataHTML,
                    icon: 'warning',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'บันทึกใหม่',
                    denyButtonText: 'โหลดข้อมูลเดิม',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#0ab4ab',
                    denyButtonColor: '#3085d6'
                });

                if (result.isConfirmed) {
                    // เลือกบันทึกใหม่ - ล้างข้อมูลฟอร์ม
                    setFormData({
                        patientCensus: '',
                        overallData: '',
                        newAdmit: '',
                        transferIn: '',
                        referIn: '',
                        transferOut: '',
                        referOut: '',
                        discharge: '',
                        dead: '',
                        nurseManager: '',
                        RN: '',
                        PN: '',
                        WC: '',
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        isDraft: false,
                        availableBeds: '',
                        unavailable: '',
                        plannedDischarge: '',
                        comment: '',
                        nas: ''
                    });
                } else if (result.isDenied) {
                    // เลือกโหลดข้อมูลเดิม
                    setFormData(existingData);
                    setHasUnsavedChanges(false);
                    
                    Swal.fire({
                        title: 'โหลดข้อมูลเดิมเรียบร้อย',
                        text: 'สามารถแก้ไขข้อมูลได้ตามต้องการ',
                        icon: 'success',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else {
                    // ยกเลิกการเปลี่ยนวันที่
                    return;
                }
            }

            // ตรวจสอบฉบับร่าง
            if (user && user.uid) {
                try {
                    const latestDraft = await getLatestDraft(
                        user.uid, 
                        selectedWard, 
                        format(date, 'yyyy-MM-dd'), 
                        selectedShift
                    );
                    
                    if (latestDraft) {
                        setDraftsAvailable(true);
                        
                        // แจ้งเตือนผู้ใช้ว่ามีฉบับร่างบันทึกไว้
                        const draftTime = latestDraft.lastUpdated?.toDate
                            ? new Date(latestDraft.lastUpdated.toDate()).toLocaleString('th-TH')
                            : 'ไม่ระบุเวลา';
                        
                        Swal.fire({
                            title: 'พบข้อมูลฉบับร่างที่บันทึกไว้',
                            html: `
                                <div class="text-left">
                                    <p>คุณมีข้อมูลฉบับร่างที่บันทึกไว้เมื่อ ${draftTime}</p>
                                    <p>ต้องการโหลดข้อมูลฉบับร่างนี้หรือไม่?</p>
                                </div>
                            `,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'โหลดข้อมูลฉบับร่าง',
                            cancelButtonText: 'ไม่ต้องการ',
                            confirmButtonColor: '#0ab4ab'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                // โหลดข้อมูลฉบับร่าง
                                setFormData({
                                    ...latestDraft,
                                    // ไม่รวม field ที่ไม่ต้องการ
                                    id: undefined,
                                    lastUpdated: undefined
                                });
                                setHasUnsavedChanges(false);
                                setIsDraftMode(true);
                                
                                Swal.fire({
                                    title: 'โหลดข้อมูลสำเร็จ',
                                    text: 'โหลดข้อมูลฉบับร่างเรียบร้อยแล้ว',
                                    icon: 'success',
                                    confirmButtonColor: '#0ab4ab'
                                });
                            }
                        });
                    } else {
                        setDraftsAvailable(false);
                    }
                } catch (error) {
                    console.error('Error checking drafts:', error);
                }
            }

            // ใช้ฟังก์ชัน handleDateSelect จาก import
            handleDateSelect(date, selectedWard, selectedShift, setSelectedDate, setThaiDate);
            
            // ตรวจสอบสถานะการอนุมัติ
            try {
                const newStatus = await checkApprovalStatus(date, selectedWard);
                setApprovalStatus(newStatus);
                // ตรวจสอบว่า setApprovalPending และ setSupervisorApproved มีการกำหนดค่าแล้วหรือไม่
                if (typeof setApprovalPending === 'function') {
                    setApprovalPending(newStatus === 'pending');
                }
                if (typeof setSupervisorApproved === 'function') {
                    setSupervisorApproved(newStatus === 'approved');
                }
            } catch (error) {
                console.error('Error checking approval status:', error);
            }
            
            // ดึงข้อมูลวันก่อนหน้า
            await fetchPreviousDayData();
        } catch (error) {
            console.error('Error in handleLocalDateSelect:', error);
            
            // ตรวจสอบว่าเป็น Firebase Index Error หรือไม่
            if (error.message && error.message.includes('requires an index')) {
                // ใช้ฟังก์ชัน navigateToCreateIndex เพื่อช่วยสร้าง index
                navigateToCreateIndex(error.message);
            } else {
                // แสดงข้อความผิดพลาดทั่วไป
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถเลือกวันที่ได้',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        }
    };

    // เพิ่มฟังก์ชัน fetchHistoryData
    const fetchHistoryData = async () => {
        try {
            // ดึงข้อมูลประวัติการแก้ไข
            const history = await fetchWardHistory(selectedWard, selectedDate, selectedShift);
            setHistoryData(history || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Error fetching history data:', error);
            Swal.fire({
                title: 'Error',
                text: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    // เพิ่มฟังก์ชัน showHistoryComparison
    const showHistoryComparison = () => {
        if (historyData.length === 0) {
            Swal.fire({
                title: 'ไม่พบข้อมูลประวัติ',
                text: 'ไม่พบข้อมูลประวัติการแก้ไขสำหรับวันและกะที่เลือก',
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        let comparisonHTML = '<div class="text-left space-y-3">';
        comparisonHTML += '<h3 class="font-bold text-lg mb-2">ประวัติการแก้ไข:</h3>';
        
        // Create a comparison table
        comparisonHTML += '<table class="w-full border-collapse">';
        comparisonHTML += '<tr><th class="border px-2 py-1 bg-gray-100">วันที่แก้ไข</th><th class="border px-2 py-1 bg-gray-100">แก้ไขโดย</th><th class="border px-2 py-1 bg-gray-100">สถานะ</th></tr>';
        
        historyData.forEach((item, index) => {
            const date = new Date(item.timestamp?.toDate() || item.timestamp);
            const formattedDate = date.toLocaleString('th-TH');
            
            comparisonHTML += `<tr>
                <td class="border px-2 py-1">${formattedDate}</td>
                <td class="border px-2 py-1">${item.lastUpdatedBy || 'ไม่ระบุ'}</td>
                <td class="border px-2 py-1">${item.isDraft ? 'ฉบับร่าง' : (item.isApproved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ')}</td>
            </tr>`;
        });
        
        comparisonHTML += '</table>';
        comparisonHTML += '</div>';
        
        Swal.fire({
            title: 'ประวัติการแก้ไข',
            html: comparisonHTML,
            width: 600,
            confirmButtonColor: '#0ab4ab'
        });
    };

    // เพิ่มฟังก์ชัน fetchWardHistory
    const fetchWardHistory = async (wardId, date, shift) => {
        try {
            // ใช้ safeQuery แทน query โดยตรง เพื่อป้องกัน index error
            const { safeQuery } = await import('../../utils/firebase-index-manager');
            
            const formattedDate = format(date, 'yyyy-MM-dd');
            
            const result = await safeQuery(
                'wardDataHistory',
                [
                    { field: 'wardId', operator: '==', value: wardId },
                    { field: 'date', operator: '==', value: formattedDate }, 
                    { field: 'shift', operator: '==', value: shift }
                ],
                [{ field: 'timestamp', direction: 'desc' }]
            );
            
            if (!result.success) {
                // จัดการ error และแสดงข้อความแจ้งเตือน
                console.error('Error fetching ward history:', result.error);
                
                if (result.isIndexError) {
                    Swal.fire({
                        title: 'ต้องสร้าง Index ใน Firebase',
                        text: 'ไม่สามารถดึงข้อมูลประวัติได้ กรุณาสร้าง index ก่อน',
                        icon: 'warning',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
                
                return [];
            }
            
            if (result.data.length === 0) {
                return [];
            }
            
            return result.data;
        } catch (error) {
            console.error('Error fetching ward history:', error);
            
            // นำเข้าฟังก์ชัน handleIndexError และใช้ในการจัดการ error
            const { handleIndexError } = await import('../../utils/firebase-index-manager');
            const isIndexError = await handleIndexError(error);
            
            if (!isIndexError) {
                // กรณีเป็น error อื่นๆ แสดงข้อความทั่วไป
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถดึงข้อมูลประวัติได้',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab'
                });
            }
            
            return [];
        }
    };

    // เพิ่มฟังก์ชัน validateForm
    const validateForm = () => {
        // ตรวจสอบวันที่และกะ
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
                text: 'กรุณาเลือกวันที่และกะก่อนบันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        // ตรวจสอบชื่อและนามสกุล
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
            Swal.fire({
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                text: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        // ตรวจสอบความถูกต้องของตัวเลข
        const numericFields = [
            'newAdmit', 'transferIn', 'referIn', 'transferOut', 
            'referOut', 'discharge', 'dead'
        ];
        
        const hasValue = numericFields.some(field => {
            const value = Number(formData[field]);
            return !isNaN(value) && value !== 0;
        });

        if (!hasValue) {
            Swal.fire({
                title: 'กรุณากรอกข้อมูล',
                text: 'กรุณากรอกข้อมูลอย่างน้อย 1 รายการก่อนบันทึก',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        return true;
    };

    // แก้ไขฟังก์ชัน onSaveDraft
    const onSaveDraft = async (e) => {
        if (e) e.preventDefault();
        
        // ตรวจสอบว่ามีการเลือกวันที่และกะหรือไม่
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกได้',
                text: 'กรุณาเลือกวันที่และกะก่อนบันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        // ป้องกันการบันทึกโดยไม่มีชื่อผู้บันทึก
        if (!formData.firstName || !formData.lastName) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกได้',
                text: 'กรุณากรอกชื่อ-นามสกุลผู้บันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            
            // ทำการคำนวณค่าก่อนบันทึก
            let updatedFormData = { ...formData };
            if (selectedShift === 'เช้า') {
                // ถ้าเป็นกะเช้าและไม่มีข้อมูลในช่อง patientCensus
                if (!updatedFormData.patientCensus || updatedFormData.patientCensus === 'ยังไม่มีข้อมูลจากวันที่ผ่านมา') {
                    const previousOverallData = await fetchPreviousDayData();
                    updatedFormData.patientCensus = previousOverallData;
                }
                
                // คำนวณค่า overallData
                if (updatedFormData.newAdmit || updatedFormData.transferIn || updatedFormData.referIn || 
                    updatedFormData.transferOut || updatedFormData.referOut || updatedFormData.discharge || 
                    updatedFormData.dead) {
                    const calculatedValue = calculatePatientCensus(updatedFormData);
                    updatedFormData.overallData = calculatedValue.toString();
                }
            } else if (selectedShift === 'ดึก') {
                // คำนวณค่า overallData
                if (updatedFormData.newAdmit || updatedFormData.transferIn || updatedFormData.referIn || 
                    updatedFormData.transferOut || updatedFormData.referOut || updatedFormData.discharge || 
                    updatedFormData.dead) {
                    const calculatedValue = calculatePatientCensus(updatedFormData);
                    updatedFormData.overallData = calculatedValue.toString();
                }
            }
            
            // เพิ่มข้อมูลเพิ่มเติมสำหรับฉบับร่าง
            const draftData = {
                ...updatedFormData,
                isDraft: true,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                userId: user?.uid,
                userDisplayName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                saveDraftTime: new Date().toISOString()
            };
            
            // บันทึกข้อมูลฉบับร่างลงใน collection แยกต่างหาก
            const result = await saveWardDataDraft(draftData);

            if (result.success) {
                setFormData(updatedFormData);
                setIsDraftMode(true);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'บันทึกฉบับร่างสำเร็จ',
                    text: 'บันทึกข้อมูลเป็นฉบับร่างเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            } else {
                throw new Error(result.error || 'บันทึกฉบับร่างไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลฉบับร่าง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // เพิ่มฟังก์ชัน checkPreviousShiftStatus
    const checkPreviousShiftStatus = async (date, wardId, shift) => {
        try {
            // ไม่ต้องตรวจสอบกะเช้า
            if (shift === 'เช้า') {
                return { canProceed: true };
            }
            
            // สำหรับกะดึก ต้องมีการบันทึกข้อมูลกะเช้าแล้ว
            if (shift === 'ดึก') {
                const previousShift = 'เช้า';
                const data = await safeFetchWardData(date, wardId, previousShift);
                
                if (!data) {
                    return {
                        canProceed: false,
                        message: 'กรุณาบันทึกข้อมูลกะเช้าก่อนบันทึกข้อมูลกะดึก'
                    };
                }
            }
            
            return { canProceed: true };
        } catch (error) {
            console.error('Error checking previous shift status:', error);
            return {
                canProceed: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลกะก่อนหน้า'
            };
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className={`max-w-7xl mx-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-6 rounded-xl shadow-lg transition-colors duration-300`}>
            {/* แสดงแจ้งเตือนถ้าไม่มีข้อมูลย้อนหลัง 7 วัน */}
            {!has7DaysData && (
                <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="font-medium">ไม่พบข้อมูลย้อนหลัง 7 วันที่ผ่านมา ไม่สามารถบันทึกข้อมูลได้</p>
                    </div>
                    <p className="ml-7 mt-1">กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ</p>
                </div>
            )}
            
            {/* Header Section */}
            <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center justify-between`}>
                    <span>Ward Form</span>
                    
                    {/* Draft Status Badge */}
                    {isDraftMode && (
                        <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">ฉบับร่าง</span>
                    )}
                        </h1>
                <div className={`${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-r from-blue-50 to-teal-50'
                } p-4 rounded-lg ${
                    theme === 'dark' ? 'border-gray-700' : 'border-blue-100'
                } border`}>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                            <span className={`text-base font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Ward:</span>
                            <span className={`ml-2 text-base font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>{selectedWard}</span>
                    </div>
                        <div className="flex items-center">
                            <span className={`text-base font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>วันที่:</span>
                            <span className={`ml-2 text-base font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>{thaiDate}</span>
                                    <button
                                type="button"
                                className={`ml-2 p-1.5 ${
                                    theme === 'dark' 
                                        ? 'text-blue-300 hover:text-blue-200 hover:bg-gray-700' 
                                        : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                                } rounded-full transition-all`}
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                📅
                                    </button>
                                </div>
                        <div className="flex items-center">
                            <span className={`text-base font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>กะ:</span>
                            <span className={`ml-2 text-base font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>{selectedShift}</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between mt-3">
                        <div className="flex items-center space-x-2">
                            <ApprovalStatusIndicator status={approvalStatus} />
                            {/* เพิ่มปุ่มดูประวัติ */}
                            <button
                                type="button"
                                onClick={showHistoryComparison}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>ดูประวัติ</span>
                            </button>
                            <ContactSupervisorButton 
                                approvalStatus={approvalStatus} 
                                wardId={selectedWard} 
                                thaiDate={thaiDate} 
                                shift={selectedShift} 
                            />
                </div>

                        <div className="flex gap-2">
                            {approvalStatus && <ApprovalDataButton approvalStatus={approvalStatus} />}
                            {latestRecordDate && <LatestRecordButton latestRecordDate={latestRecordDate} />}
                    </div>
                    </div>
                </div>
                </div>

            {/* Calendar and Shift Selection */}
            <div className="space-y-6 mb-8">
                <CalendarSection
                    selectedDate={selectedDate}
                    onDateSelect={handleLocalDateSelect}
                    datesWithData={datesWithData}
                    showCalendar={showCalendar}
                    setShowCalendar={setShowCalendar}
                    thaiDate={thaiDate}
                />
                
                {/* แทนที่ PatientMovementSection ด้วย PatientCensusSection จาก WardSections.js */}
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
            </div>

            {/* Submit Button Section */}
            <form onSubmit={onSubmit} className="space-y-8">
                {/* Submit Button Section */}
                <div className={`flex justify-between items-center pt-6 border-t ${
                    theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                }`}>
                    <div>
                        {hasUnsavedChanges && (
                            <div className="flex items-center text-yellow-400">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-base">คุณมีข้อมูลที่ยังไม่ได้บันทึก</span>
                            </div>
                        )}
                        {draftsAvailable && !isDraftMode && (
                            <div className="flex items-center text-blue-400 mt-2">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-6 8v4h6v-4H7z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-base">มีฉบับร่างที่บันทึกไว้</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            className={`inline-flex items-center px-6 py-3 ${
                                theme === 'dark'
                                    ? 'bg-gray-600 hover:bg-gray-700'
                                    : 'bg-gray-500 hover:bg-gray-600'
                            } text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                            disabled={!has7DaysData}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Save Draft
                        </button>
                        <button
                            type="submit"
                            className={`inline-flex items-center px-6 py-3 ${
                                !has7DaysData ? 
                                'bg-gray-400 cursor-not-allowed' : 
                                theme === 'dark'
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-[#0ab4ab] hover:bg-[#0ab4ab]/90'
                            } text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ab4ab]`}
                            disabled={!has7DaysData || isSubmitting}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Save Final
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default WardForm;
