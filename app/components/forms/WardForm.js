'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import LoadingScreen from '../ui/LoadingScreen';
import { Swal } from '../../utils/alertService';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import FormDateShiftSelector from '../common/FormDateShiftSelector';
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
    MainFormContent
} from './WardForm/index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    getLatestDraft,
    deleteWardDataDraft
} from '../../lib/dataAccess';

import ApprovalStatusIndicator from '../common/ApprovalStatusIndicator';

// Components and utility functions
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

const calculatePatientCensus = (formData) => {
    // แปลงค่าให้เป็นตัวเลข
    const newAdmit = parseInt(formData.newAdmit) || 0;
    const transferIn = parseInt(formData.transferIn) || 0;
    const referIn = parseInt(formData.referIn) || 0;
    const transferOut = parseInt(formData.transferOut) || 0;
    const referOut = parseInt(formData.referOut) || 0;
    const discharge = parseInt(formData.discharge) || 0;
    const dead = parseInt(formData.dead) || 0;

    // แก้ไขสูตรคำนวณ: New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead
    return newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
};

// Main component
const WardForm = ({ wardId }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    
    // State variables
    const [formVisible, setFormVisible] = useState(false);
    
    const initialWard = useMemo(() => {
        if (wardId && wardId.trim() !== '') {
            return wardId;
        } 
        if (user?.department && user.department.trim() !== '') {
            return user.department;
        }
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
    const [has7DaysData, setHas7DaysData] = useState(true); 
    const [draftsAvailable, setDraftsAvailable] = useState(false);
    
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    
    // Helper functions
    const checkAndSetPopupShown = (key) => {
        const popupShownStatus = sessionStorage.getItem(key);
        return popupShownStatus === 'true';
    };

    const markPopupAsShown = (key) => {
        sessionStorage.setItem(key, 'true');
    };

    // Data fetching functions
    const fetchPreviousDayData = async (shift = selectedShift) => {
        try {
            if (!selectedWard || !selectedDate) return null;
            
            // คำนวณวันก่อนหน้า
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const formattedPrevDate = format(prevDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลจากวันก่อนหน้าและใช้ shift ที่ส่งมา
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedPrevDate),
                where('shift', '==', shift),
                where('isApproved', '==', true),
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                setPreviousDayData(data);
                return data;
            }
            
            // ถ้าไม่มีข้อมูลกะเดียวกันจากวันก่อนหน้า ให้ลองดึงข้อมูลกะอื่น
            const qAnyShift = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedPrevDate),
                where('isApproved', '==', true),
                limit(1)
            );
            
            const anyShiftSnapshot = await getDocs(qAnyShift);
            
            if (!anyShiftSnapshot.empty) {
                const data = anyShiftSnapshot.docs[0].data();
                setPreviousDayData(data);
                return data;
            }
            
            return {overallData: 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'};
            
        } catch (error) {
            console.error('Error fetching previous day data:', error);
            return {overallData: 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'};
        }
    };

    // Effects
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard || !selectedDate) return;
            
                setIsLoading(true);
                
            try {
                // 1. ดึงรายการวันที่มีข้อมูล
                try {
                    const dates = await fetchDatesWithData(selectedWard);
                    setDatesWithData(dates);
                } catch (error) {
                    console.error('Error fetching dates with data:', error);
                }
                
                // 2. ตรวจสอบข้อมูล 7 วันย้อนหลัง - แสดง popup เพียงครั้งเดียว
                try {
                    const checkResult = await checkLast7DaysData(selectedWard, selectedDate);
                    setHas7DaysData(checkResult.hasData);
                    
                    // แสดง popup เตือนเพียงครั้งเดียวต่อการโหลดหน้าแรก (ใช้ key ที่เฉพาะเจาะจงขึ้น)
                    const popupStateKey = `noDataAlert_${selectedWard}_${format(selectedDate, 'yyyy-MM-dd')}_${selectedShift}_WardForm`;
                    const hasShownPopup = checkAndSetPopupShown(popupStateKey);
                    
                    if (!checkResult.hasData && !hasShownPopup) {
                        await Swal.fire({
                            title: 'ไม่พบข้อมูล',
                            text: 'ไม่พบข้อมูลจากวันก่อนหน้า กรุณากรอกข้อมูลใหม่ทั้งหมด',
                            icon: 'info',
                            confirmButtonColor: '#0ab4ab'
                        });
                        markPopupAsShown(popupStateKey);
                    }
                } catch (error) {
                    console.error('Error checking 7 days data:', error);
                }
                
                // 3. ตรวจสอบฉบับร่าง
                    try {
                    if (user && user.uid) {
                        const latestDraft = await getLatestDraft(
                            user.uid, 
                            selectedWard, 
                            format(selectedDate, 'yyyy-MM-dd'), 
                            selectedShift
                        );
                        
                        if (latestDraft) {
                            setDraftsAvailable(true);
                            
                            // แจ้งเตือนผู้ใช้ว่ามีฉบับร่างบันทึกไว้ ยกเว้นกรณีที่เพิ่งบันทึกร่างเอง
                            if (!isDraftMode) {
                                const draftPopupKey = `draftAlert_${selectedWard}_${format(selectedDate, 'yyyy-MM-dd')}_${selectedShift}_WardForm`;
                                const hasShownDraftPopup = checkAndSetPopupShown(draftPopupKey);
                                
                                if (!hasShownDraftPopup) {
                            const draftTime = latestDraft.lastUpdated?.toDate
                                ? new Date(latestDraft.lastUpdated.toDate()).toLocaleString('th-TH')
                                : 'ไม่ระบุเวลา';
                            
                                    const result = await Swal.fire({
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
                                    });
                                    
                                    markPopupAsShown(draftPopupKey);
                                    
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
                                        return; // ไม่ต้องโหลดข้อมูลอื่นๆ เพราะโหลดข้อมูลฉบับร่างแล้ว
                                    }
                                }
                            }
                        } else {
                            setDraftsAvailable(false);
                        }
                        }
                    } catch (error) {
                    console.error('Error checking drafts:', error);
                }
                
                // 4. ตรวจสอบสถานะการอนุมัติ
                try {
                    const status = await checkApprovalStatus(selectedDate, selectedWard);
                    setApprovalStatus(status);
                    if (typeof setApprovalPending === 'function') {
                        setApprovalPending(status === 'pending');
                    }
                    if (typeof setSupervisorApproved === 'function') {
                        setSupervisorApproved(status === 'approved');
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
                }
                
                // 6. ดึงข้อมูลวันก่อนหน้าโดยอิงตาม selectedShift
                const prevData = await fetchPreviousDayData(selectedShift);
                
                // แสดง popup ข้อมูลวันก่อนหน้าถ้ามีข้อมูล (เพียงครั้งเดียว)
                if (prevData && prevData.overallData && prevData.overallData !== 'ยังไม่มีข้อมูลจากวันที่ผ่านมา') {
                    // ตรวจสอบว่าได้แสดง popup แล้วหรือยัง โดยใช้ key ที่เฉพาะเจาะจงขึ้น
                    const prevDataKey = `prevDataShown_${selectedWard}_${format(selectedDate, 'yyyy-MM-dd')}_${selectedShift}_WardForm`;
                    const hasShownPrevDataPopup = checkAndSetPopupShown(prevDataKey);
                    
                    if (!hasShownPrevDataPopup) {
                        // เตรียมข้อมูลสำหรับแสดงใน popup
                        let prevDataHTML = '<div class="text-left p-2">';
                        prevDataHTML += '<h3 class="font-medium mb-2 text-lg">ข้อมูลจากวันก่อนหน้า:</h3>';
                        prevDataHTML += '<table class="w-full text-sm">';
                        
                        // เพิ่มข้อมูลสำคัญลงในตาราง
                        prevDataHTML += `<tr><td class="font-medium pr-4 py-1">Patient Census:</td><td>${prevData.patientCensus || '-'}</td></tr>`;
                        prevDataHTML += `<tr><td class="font-medium pr-4 py-1">Overall Data:</td><td>${prevData.overallData || '-'}</td></tr>`;
                        prevDataHTML += '</table>';
                        
                        // เพิ่มคำแนะนำการใช้ข้อมูล
                        if (selectedShift === 'เช้า') {
                            prevDataHTML += '<p class="mt-2 text-blue-600">ค่า Overall Data จากวันก่อนหน้าจะถูกใช้เป็นค่า Patient Census</p>';
                        }
                        
                        prevDataHTML += '</div>';
                        
                        const result = await Swal.fire({
                            title: 'ข้อมูลจากวันก่อนหน้า',
                            html: prevDataHTML,
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: 'ใช้ข้อมูลนี้',
                            cancelButtonText: 'ไม่ใช้',
                            confirmButtonColor: '#0ab4ab'
                        });
                        
                        // บันทึกว่าได้แสดง popup แล้ว
                        markPopupAsShown(prevDataKey);
                        
                        if (result.isConfirmed && selectedShift === 'เช้า' && prevData.overallData) {
                            // นำข้อมูล Overall Data จากวันก่อนหน้ามาใส่เป็น Patient Census
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: prevData.overallData
                            }));
                            setHasUnsavedChanges(true);
                        }
                    }
                }
                
        } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setIsLoading(false);
        }
    };

        initializeData();
    }, [selectedWard, selectedDate, selectedShift, user, isDraftMode]);

    useEffect(() => {
        if (selectedDate && selectedShift && selectedWard) {
            setFormVisible(true);
        } else {
            setFormVisible(false);
        }
    }, [selectedDate, selectedShift, selectedWard]);

    useEffect(() => {
        // ไม่คำนวณถ้ากำลังโหลดข้อมูล
        if (isLoading) return;
        
        try {
            // คำนวณค่าตามสูตร New Admit + Transfer In + Refer In - Transfer Out - Refer Out - Discharge - Dead
            const calculatedMovement = Number(formData.newAdmit || 0) + 
                                Number(formData.transferIn || 0) + 
                                Number(formData.referIn || 0) - 
                                Number(formData.transferOut || 0) - 
                                Number(formData.referOut || 0) - 
                                Number(formData.discharge || 0) - 
                                Number(formData.dead || 0);
                
            if (selectedShift === 'เช้า') {
                // สำหรับกะเช้า:
                // 1. ถ้ามี previousDayData.overallData และ patientCensus ว่างหรือ 0 ให้ใช้ค่า overallData จากวันก่อน
                // 2. คำนวณ overallData = patientCensus + calculatedMovement
                
                // 1. ถ้ามี previousDayData ใช้เป็นค่าเริ่มต้น patientCensus (จากกะดึกวันก่อนหน้า)
                if (previousDayData?.overallData && (!formData.patientCensus || formData.patientCensus === '0')) {
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: previousDayData.overallData.toString()
                    }));
                    console.log('นำค่า Overall Data จากวันก่อนมาใช้เป็น Patient Census:', previousDayData.overallData);
                }
                
                // 2. คำนวณ overallData จาก patientCensus และ movement
                const patientCensus = Number(formData.patientCensus || 0);
                const newOverallData = patientCensus + calculatedMovement;
                
                if (newOverallData.toString() !== formData.overallData) {
                    setFormData(prev => ({
                        ...prev,
                        overallData: newOverallData.toString()
                    }));
                    console.log('คำนวณ Overall Data สำหรับกะเช้า:', newOverallData);
                }
            } else if (selectedShift === 'ดึก') {
                // สำหรับกะดึก: 
                // 1. ดึงข้อมูลจากกะเช้าของวันเดียวกัน
                // 2. คำนวณ overallData = patientCensus + calculatedMovement
                
                // Use patientCensus from morning if possible
                const morningShiftData = formData.morningShiftData;
                if (morningShiftData?.overallData && (!formData.patientCensus || formData.patientCensus === '0')) {
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: morningShiftData.overallData.toString()
                    }));
                }
                
                // Calculate overall data
                const patientCensus = Number(formData.patientCensus || 0);
                const newOverallData = patientCensus + calculatedMovement;
                
                if (newOverallData.toString() !== formData.overallData) {
                    setFormData(prev => ({
                        ...prev,
                        overallData: newOverallData.toString()
                    }));
                    console.log('คำนวณ Overall Data สำหรับกะดึก:', newOverallData);
                }
            }
        } catch (error) {
            console.error('Error calculating values:', error);
        }
    }, [
        formData.patientCensus,
        formData.newAdmit,
        formData.transferIn,
        formData.referIn,
        formData.transferOut,
        formData.referOut,
        formData.discharge,
        formData.dead,
        selectedShift,
        isLoading,
        previousDayData
    ]);

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

        // ตรวจสอบ Ward 
        if (!selectedWard) {
            Swal.fire({
                title: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
                text: 'กรุณาเลือกวอร์ดก่อนบันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        // ตรวจสอบชื่อและนามสกุล Recording Officer
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
            Swal.fire({
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                text: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล (Recording Officer)',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        // ตรวจสอบข้อมูลที่จำเป็น
        const requiredFields = [
            { field: 'nurseManager', label: 'Nurse Manager' },
            { field: 'RN', label: 'RN' },
            { field: 'PN', label: 'PN' },
            { field: 'WC', label: 'WC' },
            { field: 'newAdmit', label: 'New Admit' },
            { field: 'transferIn', label: 'Transfer In' },
            { field: 'referIn', label: 'Refer In' },
            { field: 'transferOut', label: 'Transfer Out' },
            { field: 'referOut', label: 'Refer Out' },
            { field: 'discharge', label: 'Discharge' },
            { field: 'dead', label: 'Dead' },
            { field: 'availableBeds', label: 'Available' },
            { field: 'unavailable', label: 'Unavailable' },
            { field: 'plannedDischarge', label: 'Planned Discharge' }
        ];

        // ตรวจสอบว่ามีการกรอกข้อมูลอย่างน้อย 1 ฟิลด์
        const hasAnyValue = requiredFields.some(({ field }) => {
            const value = formData[field];
            return value !== undefined && value !== null && value !== '';
        });

        if (!hasAnyValue) {
            Swal.fire({
                title: 'กรุณากรอกข้อมูล',
                html: 'กรุณากรอกข้อมูลอย่างน้อย 1 รายการจากรายการต่อไปนี้:<br><br>' +
                      requiredFields.map(f => f.label).join('<br>'),
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        // ตรวจสอบว่าข้อมูลที่กรอกเป็นตัวเลขที่ถูกต้อง
        const invalidFields = requiredFields.filter(({ field }) => {
            const value = formData[field];
            if (value === undefined || value === null || value === '') {
                return false; // ข้ามการตรวจสอบถ้าไม่ได้กรอกข้อมูล
            }
            return isNaN(Number(value)) || Number(value) < 0;
        });

        if (invalidFields.length > 0) {
            Swal.fire({
                title: 'ข้อมูลไม่ถูกต้อง',
                html: 'กรุณากรอกตัวเลขที่มีค่ามากกว่าหรือเท่ากับ 0 ในฟิลด์ต่อไปนี้:<br><br>' +
                      invalidFields.map(f => f.label).join('<br>'),
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        return true;
    };

    // เพิ่มฟังก์ชัน onSaveDraft - ปรับปรุงให้ทำงานได้อย่างถูกต้อง
    const onSaveDraft = async (e) => {
        if (e) e.preventDefault();
        
        // ตรวจสอบว่าเลือกวันที่และกะหรือยัง
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกฉบับร่างได้',
                text: 'กรุณาเลือกวันที่และกะก่อนบันทึกฉบับร่าง',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return { success: false, error: 'วันที่หรือกะไม่ถูกเลือก' };
        }

        // ตรวจสอบว่าเลือกวอร์ดหรือยัง
        if (!selectedWard) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกฉบับร่างได้',
                text: 'กรุณาเลือกวอร์ดก่อนบันทึกฉบับร่าง',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return { success: false, error: 'วอร์ดไม่ถูกเลือก' };
        }
        
        // ตรวจสอบว่าเป็นผู้ใช้ที่ login แล้วหรือไม่
        if (!user || !user.uid) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกฉบับร่างได้',
                text: 'กรุณาเข้าสู่ระบบก่อนบันทึกฉบับร่าง',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return { success: false, error: 'ผู้ใช้ไม่ได้เข้าสู่ระบบ' };
        }
        
            setIsSubmitting(true);
            
        try {
            // คำนวณค่าตัวเลขก่อนบันทึก
            const calculatedMovement = 
                Number(formData.newAdmit || 0) + 
                Number(formData.transferIn || 0) + 
                Number(formData.referIn || 0) - 
                Number(formData.transferOut || 0) - 
                Number(formData.referOut || 0) - 
                Number(formData.discharge || 0) - 
                Number(formData.dead || 0);
            
            // อัพเดตค่า Overall Data 
            const patientCensus = Number(formData.patientCensus || 0);
            const overallData = patientCensus + calculatedMovement;
            
            // จัดเตรียมข้อมูลสำหรับบันทึกฉบับร่าง
            const draftData = {
                ...formData,
                overallData: overallData.toString(),
                isDraft: true,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                userId: user.uid,
                saveDraftTime: new Date().toISOString()
            };
            
            // บันทึกฉบับร่าง
            const result = await saveWardDataDraft(draftData);

            if (result.success) {
                // อัพเดทสถานะการบันทึกฉบับร่าง
                setIsDraftMode(true);
                setDraftsAvailable(true);
                setHasUnsavedChanges(false);
                
                // แสดงข้อความสำเร็จ
                await Swal.fire({
                    title: 'บันทึกฉบับร่างสำเร็จ',
                    text: 'ข้อมูลถูกบันทึกเป็นฉบับร่างเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
                
                return { success: true };
            } else {
                throw new Error(result.error || 'เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            
            return { success: false, error: error.message };
        } finally {
            setIsSubmitting(false);
        }
    };

    // เพิ่มฟังก์ชัน onSubmit สำหรับการบันทึกข้อมูลฉบับสมบูรณ์
    const onSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // ตรวจสอบว่าเลือกวันที่และกะหรือยัง
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกข้อมูลได้',
                text: 'กรุณาเลือกวันที่และกะก่อนบันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ตรวจสอบข้อมูลด้วยฟังก์ชัน validateForm
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // คำนวณค่าตัวเลขก่อนบันทึก
            const calculatedMovement = 
                Number(formData.newAdmit || 0) + 
                Number(formData.transferIn || 0) + 
                Number(formData.referIn || 0) - 
                Number(formData.transferOut || 0) - 
                Number(formData.referOut || 0) - 
                Number(formData.discharge || 0) - 
                Number(formData.dead || 0);
            
            // อัพเดตค่า Overall Data 
            const patientCensus = Number(formData.patientCensus || 0);
            const updatedOverallData = patientCensus + calculatedMovement;
            
            // อัพเดทข้อมูลก่อนบันทึก
            const updatedFormData = {
                ...formData,
                overallData: updatedOverallData.toString()
            };
            
            // เตรียมข้อมูลสำหรับบันทึก
            const dataToSave = {
                ...updatedFormData,
                isDraft: false,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                timestamp: new Date().toISOString(),
                userId: user?.uid || null,
                userDisplayName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                department: user?.department || null
            };
            
            // สร้าง docId ที่เฉพาะเจาะจง
            const docId = `${selectedWard}_${format(selectedDate, 'yyyyMMdd')}_${selectedShift}`;
            
            // บันทึกข้อมูลลง Firestore
            const docRef = doc(db, 'wardDataFinal', docId);
            await setDoc(docRef, dataToSave);
            
            // ถ้ามีฉบับร่าง ให้ลบออกหลังจากบันทึกข้อมูลหลักสำเร็จแล้ว
            if (isDraftMode && user?.uid) {
                try {
                    const drafts = await getUserDrafts(
                        user.uid, 
                        selectedWard, 
                        format(selectedDate, 'yyyy-MM-dd'), 
                        selectedShift
                    );
                    
                    if (drafts.length > 0) {
                        await Promise.all(drafts.map(draft => deleteWardDataDraft(draft.id)));
                        console.log('Deleted all drafts for this record');
                    }
                } catch (draftError) {
                    console.error('Error deleting drafts:', draftError);
                }
            }
            
            // บันทึกประวัติการแก้ไข
            try {
                // สร้าง history record
                const historyData = {
                    ...dataToSave,
                    originalDocId: docId,
                    timestamp: serverTimestamp(),
                    lastUpdatedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                };
                
                await addDoc(collection(db, 'wardDataHistory'), historyData);
            } catch (historyError) {
                console.error('Error saving history record:', historyError);
            }
            
            // แสดงข้อความสำเร็จ
            await Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
            
            // รีเซ็ตค่าต่างๆ
            setHasUnsavedChanges(false);
            setIsDraftMode(false);
            
            // โหลดข้อมูลใหม่
            const updatedData = await fetchWardData(selectedDate, selectedWard, selectedShift);
            if (updatedData) {
                setFormData(updatedData);
                setOriginalData(updatedData);
            }
        } catch (submitError) {
            console.error('Error submitting data:', submitError);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: submitError.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่มฟังก์ชัน handleLocalDateSelect
    const handleLocalDateSelect = async (date) => {
        try {
            if (hasUnsavedChanges) {
                const result = await Swal.fire({
                    title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                    text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนวันหรือไม่?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'บันทึกฉบับร่าง',
                    cancelButtonText: 'ไม่บันทึก',
                    confirmButtonColor: '#0ab4ab'
                });

                if (result.isConfirmed) {
                    await onSaveDraft();
                }
            }

            // อัพเดตวันที่ที่เลือก
            setSelectedDate(date);
            setThaiDate(formatThaiDate(date));

            // ตรวจสอบข้อมูล 7 วันย้อนหลัง
            try {
                const checkResult = await checkLast7DaysData(selectedWard, date);
                setHas7DaysData(checkResult.hasData);
                
                // แสดง notification เมื่อมีข้อมูล 7 วันย้อนหลัง
                if (checkResult.hasData) {
                    await Swal.fire({
                        title: 'พบข้อมูลย้อนหลัง',
                        text: 'พบข้อมูลย้อนหลัง 7 วัน',
                        icon: 'info',
                        confirmButtonColor: '#0ab4ab',
                        timer: 2000,
                        timerProgressBar: true
                    });
                }
            } catch (error) {
                console.error('Error checking 7 days data:', error);
            }

        } catch (error) {
            console.error('Error in handleLocalDateSelect:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเลือกวันที่ได้',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    // handleShiftChange function
    const handleShiftChange = async (newShift) => {
        // ถ้าเป็นกะเดิมไม่ต้องทำอะไร
        if (newShift === selectedShift) return;
        
        // ตรวจสอบว่ามีข้อมูลที่ยังไม่ได้บันทึกหรือไม่
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนกะหรือไม่?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'บันทึกฉบับร่าง',
                cancelButtonText: 'ไม่บันทึก',
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                reverseButtons: true
            });
            
            if (result.isConfirmed) {
                const draftResult = await onSaveDraft();
                if (!draftResult.success) {
                    return;
                }
            }
        }

        setIsLoading(true);
        
        try {
            // ตรวจสอบฉบับร่าง
            let shouldLoadDraft = false;
            if (user?.uid) {
                const latestDraft = await getLatestDraft(
                    user.uid,
                    selectedWard,
                    format(selectedDate, 'yyyy-MM-dd'),
                    newShift
                );
                
                if (latestDraft) {
                    const result = await Swal.fire({
                        title: 'พบฉบับร่าง',
                        html: `พบฉบับร่างของกะ ${newShift} วันที่ ${format(selectedDate, 'dd/MM/yyyy')} ต้องการโหลดข้อมูลหรือไม่?`,
                        icon: 'info',
                        showCancelButton: true,
                        confirmButtonText: 'โหลดข้อมูล',
                        cancelButtonText: 'ไม่ต้องการ',
                        confirmButtonColor: '#0ab4ab'
                    });
                    
                    if (result.isConfirmed) {
                        setFormData({
                            ...latestDraft,
                            firstName: latestDraft.firstName || user?.firstName || '',
                            lastName: latestDraft.lastName || user?.lastName || ''
                        });
                        setIsDraftMode(true);
                        shouldLoadDraft = true;
                    }
                }
            }

            // ถ้าไม่ได้โหลดฉบับร่าง ให้ดำเนินการตามกะที่เลือก
            if (!shouldLoadDraft) {
                if (newShift === 'เช้า') {
                    // สำหรับกะเช้า: ดึงข้อมูล Overall Data จากกะดึกของวันก่อนหน้า
                    const prevNightData = await fetchPreviousDayData('ดึก');
                    if (prevNightData && prevNightData.overallData !== 'ยังไม่มีข้อมูลจากวันที่ผ่านมา') {
                        const result = await Swal.fire({
                            title: 'พบข้อมูลกะดึกวันก่อนหน้า',
                            html: `ต้องการดึงข้อมูลจากกะดึกวันก่อนหน้ามาใช้หรือไม่?<br>
                                  <small>Overall Data จะถูกใช้เป็น Patient Census</small>`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'ใช้ข้อมูล',
                            cancelButtonText: 'ไม่ใช้',
                            confirmButtonColor: '#0ab4ab'
                        });

                        if (result.isConfirmed) {
                            // Set data for morning shift based on previous night data
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: prevNightData.overallData,
                                newAdmit: '',
                                transferIn: '',
                                referIn: '',
                                transferOut: '',
                                referOut: '',
                                discharge: '',
                                dead: '',
                                overallData: prevNightData.overallData // Initial value same as patientCensus
                            }));
                        } else {
                            // If user doesn't want to use previous data, still need to set a default patientCensus
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: prev.patientCensus || '0',
                                newAdmit: '',
                                transferIn: '',
                                referIn: '',
                                transferOut: '',
                                referOut: '',
                                discharge: '',
                                dead: '',
                                overallData: ''
                            }));
                        }
                    } else {
                        // No previous data available
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: '0',
                            newAdmit: '',
                            transferIn: '',
                            referIn: '',
                            transferOut: '',
                            referOut: '',
                            discharge: '',
                            dead: '',
                            overallData: '0'
                        }));
                    }
                } else if (newShift === 'ดึก') {
                    // สำหรับกะดึก: ดึงข้อมูลจากกะเช้าของวันเดียวกันเพื่อนำมาเป็นค่าเริ่มต้น
                    const morningData = await fetchWardData(selectedDate, selectedWard, 'เช้า');
                    if (morningData) {
                        const result = await Swal.fire({
                            title: 'พบข้อมูลกะเช้า',
                            html: `ต้องการดึงข้อมูลจากกะเช้ามาใช้หรือไม่?<br>
                                  <small>Overall Data จากกะเช้าจะถูกใช้เป็น Patient Census</small>`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'ใช้ข้อมูล',
                            cancelButtonText: 'ไม่ใช้',
                            confirmButtonColor: '#0ab4ab'
                        });

                        if (result.isConfirmed) {
                            // Use morning shift's overall data as night shift's patient census
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: morningData.overallData,
                                morningShiftData: morningData, // Store morning data for reference
                                newAdmit: '',
                                transferIn: '',
                                referIn: '',
                                transferOut: '',
                                referOut: '',
                                discharge: '',
                                dead: '',
                                overallData: morningData.overallData // Initial value same as patientCensus
                            }));
                        } else {
                            // If user doesn't want to use morning data
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: prev.patientCensus || '0',
                                newAdmit: '',
                                transferIn: '',
                                referIn: '',
                                transferOut: '',
                                referOut: '',
                                discharge: '',
                                dead: '',
                                overallData: ''
                            }));
                        }
                    } else {
                        // No morning data available
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: '0',
                            newAdmit: '',
                            transferIn: '',
                            referIn: '',
                            transferOut: '',
                            referOut: '',
                            discharge: '',
                            dead: '',
                            overallData: '0'
                        }));
                    }
                }
            }

            // อัพเดทกะที่เลือก
            setSelectedShift(newShift);
            setHasUnsavedChanges(false);
            
        } catch (shiftError) {
            console.error('Error in handleShiftChange:', shiftError);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: `ไม่สามารถเปลี่ยนกะได้: ${shiftError.message}`,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainFormContent
            isLoading={isLoading}
            selectedDate={selectedDate}
            selectedShift={selectedShift}
            selectedWard={selectedWard}
            formData={formData}
            setFormData={(updatedData) => {
                // Ensure numeric fields only contain numbers
                const numericFields = [
                    'nurseManager', 'RN', 'PN', 'WC', 'NA', 
                    'newAdmit', 'transferIn', 'referIn', 
                    'transferOut', 'referOut', 'discharge', 'dead',
                    'availableBeds', 'unavailable', 'plannedDischarge'
                ];
                
                const sanitizedData = { ...updatedData };
                
                // Process each numeric field to ensure it only contains numbers
                numericFields.forEach(field => {
                    if (sanitizedData[field] !== undefined && sanitizedData[field] !== '') {
                        // Replace any non-numeric characters with empty string
                        sanitizedData[field] = sanitizedData[field].toString().replace(/[^0-9]/g, '');
                    }
                });
                
                setFormData(sanitizedData);
                setHasUnsavedChanges(true);
            }}
            handleLocalDateSelect={handleLocalDateSelect}
            handleShiftChange={handleShiftChange}
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
        />
    );
};

export default WardForm;