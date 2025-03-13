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
    LatestRecordButton
} from './WardForm/index';

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
<<<<<<< HEAD
    if (shift === 'เช้า') {
        return (
            <div className="text-sm text-gray-600 mt-1 mb-2 bg-gray-100 p-2 rounded">
                <p>สูตรคำนวณกะเช้า: ข้อมูล Overall Data จากวันก่อนหน้า (จากกะดึก) เป็นค่า Patient Census</p>
                <p>หมายเหตุ: หากไม่มีข้อมูลวันก่อนหน้า ให้กรอกข้อมูลด้วยตนเอง</p>
            </div>
        );
    } else if (shift === 'ดึก') {
        return (
            <div className="text-sm text-gray-600 mt-1 mb-2 bg-gray-100 p-2 rounded">
                <p>สูตรคำนวณกะดึก: newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead = Overall Data</p>
                <p>หมายเหตุ: Overall Data จะถูกใช้เป็น Patient Census ในวันถัดไป (กะเช้า)</p>
            </div>
        );
    }
    return null;
=======
    const formula = "newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead";
    const target = shift === 'เช้า' ? 'Patient Census' : 'Overall Data';
    
    return (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>คำนวณอัตโนมัติ: {formula} = {target}</span>
        </div>
    );
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
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

<<<<<<< HEAD
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

    return newAdmit + transferIn + referIn - transferOut + referOut + discharge + dead;
};

// เพิ่มฟังก์ชันตรวจสอบข้อมูลย้อนหลัง 30 วัน
const checkPast30DaysRecords = async (wardId) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Query เพื่อหาข้อมูลในช่วง 30 วันย้อนหลัง
        const q = query(
            collection(db, 'wardData'),
            where('wardId', '==', wardId),
            where('date', '>=', thirtyDaysAgo),
            orderBy('date', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return {
                noRecentRecords: true,
                message: 'ไม่พบข้อมูลในช่วง 30 วันที่ผ่านมา คุณสามารถเริ่มบันทึกข้อมูลใหม่ได้'
            };
        }
        
        return {
            noRecentRecords: false,
            message: 'พบข้อมูลในช่วง 30 วันที่ผ่านมา'
        };
    } catch (error) {
        console.error('Error checking past 30 days records:', error);
        throw error;
    }
};

// ส่วนแสดงข้อมูลผู้ป่วย
const PatientCensusSection = ({ formData, onInputChange }) => {
    return (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">จำนวนผู้ป่วยวันนี้</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Patient Census</label>
                    <input
                        type="text"
                        name="patientCensus"
                        value={formData.patientCensus}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Overall Data</label>
                    <input
                        type="text"
                        name="overallData"
                        value={formData.overallData}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
            </div>
        </div>
    );
};

// ส่วนการเคลื่อนไหวผู้ป่วย
const PatientMovementSection = ({ formData, onInputChange }) => {
    return (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">การเคลื่อนไหวของผู้ป่วย</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">New Admit</label>
                    <input
                        type="text"
                        name="newAdmit"
                        value={formData.newAdmit}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Transfer In</label>
                    <input
                        type="text"
                        name="transferIn"
                        value={formData.transferIn}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Refer In</label>
                    <input
                        type="text"
                        name="referIn"
                        value={formData.referIn}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Transfer Out</label>
                    <input
                        type="text"
                        name="transferOut"
                        value={formData.transferOut}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Refer Out</label>
                    <input
                        type="text"
                        name="referOut"
                        value={formData.referOut}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Discharge</label>
                    <input
                        type="text"
                        name="discharge"
                        value={formData.discharge}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Dead</label>
                    <input
                        type="text"
                        name="dead"
                        value={formData.dead}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
            </div>
        </div>
    );
};

// ส่วนจำนวนบุคลากร
const StaffSection = ({ formData, onInputChange }) => {
    return (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">จำนวนบุคลากร</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">Nurse Manager</label>
                    <input
                        type="text"
                        name="nurseManager"
                        value={formData.nurseManager}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">RN</label>
                    <input
                        type="text"
                        name="rns"
                        value={formData.rns}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">PN</label>
                    <input
                        type="text"
                        name="pns"
                        value={formData.pns}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
                <div className="mb-2">
                    <label className="block text-gray-700 mb-1">WC</label>
                    <input
                        type="text"
                        name="wc"
                        value={formData.wc}
                        onChange={onInputChange}
                        className="border rounded p-2 w-full"
                    />
                </div>
            </div>
        </div>
    );
};

// ส่วนบันทึกเพิ่มเติม
const NotesSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    return (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">บันทึกเพิ่มเติม</h3>
            <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="border rounded p-2 w-full"
                rows="3"
                placeholder="บันทึกเพิ่มเติม..."
            ></textarea>
        </div>
    );
=======
// ฟังก์ชันคำนวณ
const calculateValues = (values) => {
    return Object.values(values).reduce((sum, val) => sum + (Number(val) || 0), 0);
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
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
<<<<<<< HEAD
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
=======
    
    const [formData, setFormData] = useState({
        patientCensus: '0',
        overallData: '0',
        newAdmit: '0',
        transferIn: '0',
        referIn: '0',
        transferOut: '0',
        referOut: '0',
        discharge: '0',
        dead: '0',
        rns: '0',
        pns: '0',
        nas: '0',
        aides: '0',
        studentNurses: '0',
        notes: '',
        firstName: '',
        lastName: '',
        comment: '',
        nurseManager: '0',
        RN: '0',
        PN: '0',
        WC: '0',
        availableBeds: '0',
        unavailable: '0',
        plannedDischarge: '0',
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
        isDraft: false
    });

    const [previousDayData, setPreviousDayData] = useState(null);
<<<<<<< HEAD
    const [past30DaysResult, setPast30DaysResult] = useState(null);
    
    // เช็คข้อมูลย้อนหลัง 30 วัน
    useEffect(() => {
        const checkPast30Days = async () => {
            if (!selectedWard) return;
            
            try {
                const result = await checkPast30DaysRecords(selectedWard);
                setPast30DaysResult(result);
                
                // ถ้าไม่มีข้อมูลในช่วง 30 วัน ให้แจ้งเตือนผู้ใช้
                if (result.noRecentRecords) {
                    Swal.fire({
                        title: 'เริ่มบันทึกใหม่',
                        text: result.message,
                        icon: 'info',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
            } catch (error) {
                console.error('Error checking past 30 days records:', error);
            }
        };
        
        checkPast30Days();
    }, [selectedWard]);
    
    // ฟังก์ชันดึงข้อมูลวันก่อนหน้าที่ผ่านการอนุมัติแล้วเท่านั้น
    const fetchPreviousDayData = async () => {
        try {
            if (!selectedWard) return;
=======

    const wards = [
        'Ward6',
        'Ward7',
        'Ward8',
        'Ward9',
        'WardGI',
        'Ward10B',
        'Ward11',
        'Ward12',
        'ICU',
        'CCU',
        'LR',
        'NSY'
    ];

    // ปรับปรุงฟังก์ชัน checkFormChanges
    const checkFormChanges = useCallback(() => {
        if (!selectedWard) return false;
        
        // ตรวจสอบการเปลี่ยนแปลงของข้อมูลที่สำคัญ
        const hasChanges = Object.entries(formData).some(([key, value]) => {
            // ถ้าเป็นฟิลด์ตัวเลข
            if (['patientCensus', 'overallData', 'newAdmit', 'transferIn', 'referIn', 
                 'transferOut', 'referOut', 'discharge', 'dead'].includes(key)) {
                return Number(value) !== 0;
            }
            // ถ้าเป็นฟิลด์ข้อความ
            if (['firstName', 'lastName', 'notes', 'comment'].includes(key)) {
                return value && value.trim() !== '';
            }
            return false;
        });

        return hasChanges;
    }, [formData, selectedWard]);

    // Update hasUnsavedChanges state when form changes
    useEffect(() => {
        setHasUnsavedChanges(checkFormChanges());
    }, [formData, checkFormChanges]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (selectedWard && selectedWard.trim() !== '') {
            console.log('Fetching ward data with params:', { 
                date: selectedDate, 
                ward: selectedWard, 
                shift: selectedShift 
            });
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
            
            // คำนวณวันก่อนหน้า
            const prevDate = new Date(new Date(selectedDate).getTime() - 86400000); // 24 hours in milliseconds
            const formattedPrevDate = format(prevDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลกะดึกของวันก่อนหน้า
            const q = query(
                collection(db, 'wardData'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedPrevDate),
                where('shift', '==', 'ดึก'),
                where('isApproved', '==', true) // เพิ่มเงื่อนไขให้ดึงเฉพาะข้อมูลที่อนุมัติแล้ว
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // ถ้ามีข้อมูลกะดึกของวันก่อนหน้า
                const prevDayData = querySnapshot.docs[0].data();
                setPreviousDayData(prevDayData);
                
                // ถ้าเป็นกะเช้าและยังไม่ได้กรอกข้อมูล ให้นำข้อมูล overallData จากกะดึกของวันก่อนหน้ามาใส่ในช่อง patientCensus
                if (selectedShift === 'เช้า' && (!formData.patientCensus || formData.patientCensus === 'ยังไม่มีข้อมูลจากวันที่ผ่านมา')) {
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: prevDayData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'
                    }));
                    
                    return prevDayData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
                }
                
                return prevDayData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
            } else {
                // ถ้าไม่มีข้อมูลกะดึกของวันก่อนหน้า ให้ตรวจสอบว่ามีข้อมูลที่อนุมัติแล้วหรือไม่ย้อนหลังไป 30 วัน
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const formattedThirtyDaysAgo = format(thirtyDaysAgo, 'yyyy-MM-dd');
                
                const qLastApproved = query(
                    collection(db, 'wardData'),
                    where('wardId', '==', selectedWard),
                    where('date', '>=', formattedThirtyDaysAgo),
                    where('date', '<', formattedPrevDate),
                    where('shift', '==', 'ดึก'),
                    where('isApproved', '==', true),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                
                const lastApprovedSnapshot = await getDocs(qLastApproved);
                
                if (!lastApprovedSnapshot.empty) {
                    const lastApprovedData = lastApprovedSnapshot.docs[0].data();
                    setPreviousDayData(lastApprovedData);
                    
                    if (selectedShift === 'เช้า' && (!formData.patientCensus || formData.patientCensus === 'ยังไม่มีข้อมูลจากวันที่ผ่านมา')) {
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: lastApprovedData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'
                        }));
                        
                        return lastApprovedData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
                    }
                    
                    return lastApprovedData.overallData || 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
                } else {
                    // ถ้าไม่มีข้อมูลที่อนุมัติแล้วในช่วง 30 วัน
                    if (selectedShift === 'เช้า' && (!formData.patientCensus || formData.patientCensus === 'ยังไม่มีข้อมูลจากวันที่ผ่านมา')) {
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: 'ยังไม่มีข้อมูลจากวันที่ผ่านมา'
                        }));
                    }
                    return 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
                }
            }
        } catch (error) {
            console.error('Error fetching previous day data:', error);
            return 'ยังไม่มีข้อมูลจากวันที่ผ่านมา';
        }
    };

    // useEffect สำหรับการคำนวณอัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล
    useEffect(() => {
        // ป้องกันการทำงานซ้ำหรือวนลูปไม่สิ้นสุด
        let isCalculating = false;
        
        const calculateAndUpdateFormData = async () => {
            if (isCalculating) return;
            isCalculating = true;
            
            try {
                // คำนวณค่าเฉพาะเมื่อมีการกรอกข้อมูล
                const hasMovementData = 
                    formData.newAdmit !== '' || 
                    formData.transferIn !== '' || 
                    formData.referIn !== '' || 
                    formData.transferOut !== '' || 
                    formData.referOut !== '' || 
                    formData.discharge !== '' || 
                    formData.dead !== '';
                
                if (selectedShift === 'เช้า') {
                    // สำหรับกะเช้า
                    if (!formData.patientCensus || formData.patientCensus === 'ยังไม่มีข้อมูลจากวันที่ผ่านมา') {
                        const previousOverallData = await fetchPreviousDayData();
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: previousOverallData
                        }));
                    }
                    
                    // คำนวณ Overall Data จากข้อมูลที่กรอก
                    if (hasMovementData) {
                        const calculatedValue = calculatePatientCensus(formData);
                        setFormData(prev => ({
                            ...prev,
                            overallData: calculatedValue.toString()
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            overallData: 'รอผลข้อมูลวันนี้'
                        }));
                    }
                } else if (selectedShift === 'ดึก') {
                    // สำหรับกะดึก
                    // คำนวณ Overall Data จากข้อมูลที่กรอก
                    if (hasMovementData) {
                        const calculatedValue = calculatePatientCensus(formData);
                        setFormData(prev => ({
                            ...prev,
                            overallData: calculatedValue.toString()
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            overallData: 'รอผลข้อมูลวันนี้'
                        }));
                    }
                }
            } finally {
                isCalculating = false;
            }
        };

        calculateAndUpdateFormData();
    }, [
        formData.newAdmit, 
        formData.transferIn, 
        formData.referIn, 
        formData.transferOut, 
        formData.referOut, 
        formData.discharge, 
        formData.dead, 
        selectedShift,
        selectedDate,
        selectedWard
    ]);

    // ฟังก์ชัน handleLocalDateSelect
    const handleLocalDateSelect = async (date) => {
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

        handleDateSelect(date, selectedWard, selectedShift, setSelectedDate, setThaiDate);
        
        // Check approval status
        const newStatus = await checkApprovalStatus(date, selectedWard);
        setApprovalStatus(newStatus);
        
        // ดึงข้อมูลกะก่อนหน้า
        const previousData = await fetchPreviousShiftData(date, selectedWard);
        setPreviousShiftData(previousData);

        // ดึงข้อมูล ward
        const wardData = await safeFetchWardData(date, selectedWard, selectedShift);
        if (wardData) {
            setFormData(wardData);
            setIsDraftMode(wardData.isDraft || false);
        } else {
            // รีเซ็ตฟอร์มถ้าไม่มีข้อมูล
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
            setIsDraftMode(false);
        }
    };

<<<<<<< HEAD
    // ฟังก์ชัน onShiftChange
    const onShiftChange = async (shift) => {
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนกะหรือไม่?',
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

        handleShiftChange(shift, setSelectedShift);
        
        // Check for previous shift requirements
        const shiftStatus = await checkPreviousShiftStatus(selectedDate, selectedWard, shift);
        if (!shiftStatus.canProceed) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกได้',
                text: shiftStatus.message,
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ถ้าเป็นกะเช้า ดึงข้อมูลวันก่อนหน้า
        if (shift === 'เช้า') {
            const previousOverallData = await fetchPreviousDayData();
            if (previousOverallData) {
                setFormData(prev => ({
                    ...prev,
                    patientCensus: previousOverallData
                }));
            }
        }

        // ดึงข้อมูล ward สำหรับกะที่เลือก
        const wardData = await safeFetchWardData(selectedDate, selectedWard, shift);
        if (wardData) {
            // Check for duplicate data
            if (JSON.stringify(wardData) !== JSON.stringify(formData)) {
                // แจ้งเตือนผู้ใช้ว่ามีข้อมูลเดิมแล้ว
                Swal.fire({
                    title: 'พบข้อมูลซ้ำ',
                    text: 'มีข้อมูลของกะนี้อยู่แล้ว ระบบจะแสดงข้อมูลเดิม',
                    icon: 'info',
                    confirmButtonColor: '#0ab4ab'
                });
                setFormData(wardData);
                setIsDraftMode(wardData.isDraft || false);
            }
        } else {
            // รีเซ็ตฟอร์มถ้าไม่มีข้อมูล
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
            setIsDraftMode(false);
        }
    };

    // ฟังก์ชันจัดการการป้อนข้อมูล
=======
        loadInitialData();
    }, [selectedWard, selectedDate, selectedShift]);

    // ฟังก์ชันดึงข้อมูลวันก่อนหน้า
    const fetchPreviousDayOverallData = async () => {
        try {
            const yesterday = new Date(selectedDate);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // ตรวจสอบว่ากะดึกของวันก่อนหน้าได้รับการอนุมัติแล้วหรือไม่
            const approvalStatus = await checkApprovalStatus(yesterday, selectedWard, 'ดึก');
            if (approvalStatus?.status === 'approved') {
                const previousData = await safeFetchWardData(yesterday, selectedWard, 'ดึก');
                if (previousData?.overallData) {
                    return previousData.overallData;
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching previous day data:', error);
            return null;
        }
    };

    // useEffect สำหรับการคำนวณอัตโนมัติ
    useEffect(() => {
        const calculateAndUpdateFormData = async () => {
            try {
                const fieldsToCalculate = {
                    newAdmit: formData.newAdmit,
                    transferIn: formData.transferIn,
                    referIn: formData.referIn,
                    transferOut: -formData.transferOut, // ลบออก
                    referOut: formData.referOut,
                    discharge: formData.discharge,
                    dead: formData.dead
                };

                const calculatedValue = calculateValues(fieldsToCalculate);

                if (selectedShift === 'เช้า') {
                    // สำหรับกะเช้า ดึง Overall Data จากวันก่อนหน้า
                    const previousOverallData = await fetchPreviousDayOverallData();
                    
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: previousOverallData !== null 
                            ? previousOverallData 
                            : 'ยังไม่มีข้อมูลจากวันที่ผ่านมา',
                        overallData: calculatedValue.toString()
                    }));
                    
                    console.log('คำนวณกะเช้า:', {
                        patientCensus: previousOverallData,
                        calculatedValue
                    });
                } else if (selectedShift === 'ดึก') {
                    // สำหรับกะดึก ใช้ค่าที่คำนวณได้เป็น Overall Data
                    setFormData(prev => ({
                        ...prev,
                        overallData: calculatedValue.toString()
                    }));
                    
                    console.log('คำนวณกะดึก:', {
                        calculatedValue
                    });
                }
            } catch (error) {
                console.error('Error calculating values:', error);
            }
        };

        calculateAndUpdateFormData();
    }, [
        formData.newAdmit,
        formData.transferIn,
        formData.referIn,
        formData.transferOut,
        formData.referOut,
        formData.discharge,
        formData.dead,
        selectedShift
    ]);

    // ฟังก์ชัน handleLocalDateSelect
    const handleLocalDateSelect = async (date) => {
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนวันหรือไม่?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ไม่บันทึก'
            });

            if (result.isConfirmed) {
                await onSaveDraft();
            }
        }

        // ตรวจสอบข้อมูลย้อนหลัง 7 วัน
        const past7DaysCheck = await checkPast7DaysData(selectedWard, date);
        if (past7DaysCheck.canStartNew) {
            // แจ้งเตือนผู้ใช้
            await Swal.fire({
                title: 'สามารถเริ่มบันทึกใหม่ได้',
                text: past7DaysCheck.message,
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
        }

        handleDateSelect(
            date, 
            selectedWard, 
            selectedShift, 
            setSelectedDate, 
            setThaiDate,
            setShowCalendar,
            setApprovalStatus,
            setFormData
        );
        
        // ดึงข้อมูลกะก่อนหน้า
        const previousData = await fetchPreviousShiftData(date, selectedWard);
        if (previousData) {
            setPreviousDayData(previousData);
        }

        // ดึงข้อมูล ward
        const wardData = await safeFetchWardData(date, selectedWard, selectedShift);
        if (wardData) {
            setFormData(wardData);
        } else {
            // รีเซ็ตฟอร์มถ้าไม่มีข้อมูล
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
                rns: '',
                pns: '',
                nas: '',
                aides: '',
                studentNurses: '',
                notes: '',
                firstName: '',
                lastName: '',
                isDraft: false
            });
        }
    };

    // ฟังก์ชัน onShiftChange
    const onShiftChange = async (shift) => {
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
                text: 'คุณต้องการบันทึกข้อมูลก่อนเปลี่ยนกะหรือไม่?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ไม่บันทึก'
            });

            if (result.isConfirmed) {
                await onSaveDraft();
            }
        }

        handleShiftChange(shift, setSelectedShift);
        
        // ถ้าเป็นกะเช้า ดึงข้อมูลวันก่อนหน้า
        if (shift === 'เช้า') {
            const previousOverallData = await fetchPreviousDayOverallData();
            if (previousOverallData !== null) {
            setFormData(prev => ({
                ...prev,
                    patientCensus: previousOverallData
                }));
            }
        }

        // ดึงข้อมูล ward สำหรับกะที่เลือก
        const wardData = await safeFetchWardData(selectedDate, selectedWard, shift);
        if (wardData) {
            // ตรวจสอบว่าข้อมูลไม่ซ้ำกับข้อมูลปัจจุบัน
            if (JSON.stringify(wardData) !== JSON.stringify(formData)) {
                setFormData(wardData);
            }
        } else {
            // รีเซ็ตฟอร์มถ้าไม่มีข้อมูล
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
                rns: '',
                pns: '',
                nas: '',
                aides: '',
                studentNurses: '',
                notes: '',
                firstName: '',
                lastName: '',
                isDraft: false
            });
        }
    };

    // เพิ่มฟังก์ชัน validateNameInput เพื่อตรวจสอบการป้อนข้อมูลชื่อและนามสกุล
    const validateNameInput = (e) => {
        // อนุญาตเฉพาะตัวอักษรภาษาไทย ภาษาอังกฤษ และช่องว่างเท่านั้น
        const pattern = /^[ก-๙a-zA-Z\s]*$/;
        if (!pattern.test(e.target.value)) {
            e.target.value = e.target.value.replace(/[^ก-๙a-zA-Z\s]/g, '');
        }
    };

    // แก้ไข onInputChange เพื่อตรวจสอบการป้อนข้อมูลชื่อและนามสกุล
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
    const onInputChange = (e) => {
        // ถ้าเป็น firstName หรือ lastName ให้ตรวจสอบว่าเป็นตัวอักษรเท่านั้น
        if (e.target.name === 'firstName' || e.target.name === 'lastName') {
            validateNameInput(e);
        }
        
        handleInputChange(e, formData, setFormData, setHasUnsavedChanges);
    };
<<<<<<< HEAD

    // ฟังก์ชันตรวจสอบการป้อนข้อมูลชื่อ (รับได้เฉพาะตัวอักษรเท่านั้น)
    const validateNameInput = (e) => {
        const input = e.target;
        const value = input.value;
        const regex = /^[ก-๙a-zA-Z\s]*$/;
        
        if (!regex.test(value)) {
            input.setCustomValidity('กรุณากรอกเฉพาะตัวอักษรเท่านั้น');
        } else {
            input.setCustomValidity('');
        }
    };

    // Save draft function
    const onSaveDraft = async (e) => {
        if (e) e.preventDefault();
        
        // ตรวจสอบว่ามีการเลือกวันที่และกะหรือไม่
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกได้',
=======
    
    // ปรับปรุงฟังก์ชัน onSaveDraft
    const onSaveDraft = async (event) => {
        if (event) event.preventDefault();
        
        try {
            // Validation
            if (!validateForm()) {
                return false;
            }

            // ... existing draft save logic ...

            return true;
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'Error',
                text: 'เกิดข้อผิดพลาดในการบันทึกฉบับร่าง',
                icon: 'error',
                        confirmButtonColor: '#0ab4ab'
                    });
            return false;
        }
    };

    // เพิ่มฟังก์ชัน validateForm
    const validateForm = () => {
        // ตรวจสอบวันที่และกะ
        if (!selectedDate || !selectedShift) {
            Swal.fire({
                title: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
                text: 'กรุณาเลือกวันที่และกะก่อนบันทึกข้อมูล',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
<<<<<<< HEAD
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
            
            // บันทึกข้อมูลพร้อมสถานะ Draft
            updatedFormData.isDraft = true;
            const success = await handleWardFormSubmit(
                selectedDate,
                selectedWard,
                selectedShift,
                updatedFormData,
                user,
                true // isDraft = true
            );

            if (success) {
                setFormData(updatedFormData);
                setIsDraftMode(true);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'บันทึกสำเร็จ',
                    text: 'บันทึกข้อมูลเป็นฉบับร่างเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'Error',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
=======
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

    // ปรับปรุงฟังก์ชัน onSubmit
    const onSubmit = async (e) => {
        e.preventDefault();

        // ปิดปุ่มบันทึกระหว่างการตรวจสอบ
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        
        try {
            // Validation
            if (!validateForm()) {
                submitButton.disabled = false;
                return;
            }

            // ตรวจสอบเงื่อนไขกะก่อนหน้า
            const shiftStatus = await checkPreviousShiftStatus(selectedDate, selectedWard, selectedShift);
            if (!shiftStatus.canProceed) {
            Swal.fire({
                    title: 'ไม่สามารถบันทึกได้',
                    text: shiftStatus.message,
                icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
            });
                submitButton.disabled = false;
            return;
        }

            // บันทึกข้อมูล
            const result = await handleWardFormSubmit(formData, selectedWard, selectedDate, selectedShift, user);
            
            if (result.success) {
                Swal.fire({
                    title: 'บันทึกข้อมูลสำเร็จ',
                    text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
                setHasUnsavedChanges(false);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            submitButton.disabled = false;
        }
    };

    // Function to check approval status
    const checkApprovalStatus = async (date, ward) => {
        try {
            const approvalData = await fetchApprovalData(date, ward);
            return approvalData;
        } catch (error) {
            console.error('Error checking approval status:', error);
            return null;
        }
    };

    // Function to check previous shift status
    const checkPreviousShiftStatus = async (date, ward, currentShift) => {
        try {
            // ถ้าเป็นกะดึก ต้องตรวจสอบกะเช้าของวันเดียวกัน
            if (currentShift === 'ดึก') {
                const morningShiftStatus = await fetchApprovalData(date, ward, 'เช้า');
                if (!morningShiftStatus || !morningShiftStatus.approved) {
                    return {
                        canProceed: false,
                        message: 'กรุณาบันทึกและรอการอนุมัติข้อมูลกะเช้าก่อนหน้า'
                    };
                }
            }
            
            // ตรวจสอบกะดึกของวันก่อนหน้า
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayNightShift = await fetchApprovalData(yesterday, ward, 'ดึก');
            
            if (!yesterdayNightShift || !yesterdayNightShift.approved) {
                return {
                    canProceed: false,
                    message: 'กรุณาบันทึกและรอการอนุมัติข้อมูลกะดึกของวันที่ผ่านมาก่อน'
                };
            }
            
            return { canProceed: true };
        } catch (error) {
            console.error('Error checking previous shift status:', error);
            return {
                canProceed: true, // Allow to proceed if there's an error to prevent blocking
                message: 'มีข้อผิดพลาดในการตรวจสอบสถานะกะก่อนหน้า'
            };
        }
    };

    // Function to compare data to check duplicates
    const showComparisonModal = (existingData) => {
        let comparisonHTML = '<div class="text-left space-y-3">';
        comparisonHTML += '<h3 class="font-bold text-lg mb-2">ข้อมูลที่มีอยู่แล้ว:</h3>';
        
        // Create a comparison table
        comparisonHTML += '<table class="w-full border-collapse">';
        comparisonHTML += '<tr><th class="border px-2 py-1 bg-gray-100">ฟิลด์</th><th class="border px-2 py-1 bg-gray-100">ค่าที่มีอยู่</th></tr>';
        
        for (const [key, value] of Object.entries(existingData)) {
            if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
                comparisonHTML += `<tr>
                    <td class="border px-2 py-1 font-medium">${key}</td>
                    <td class="border px-2 py-1">${value}</td>
                </tr>`;
            }
        }
        
        comparisonHTML += '</table>';
        comparisonHTML += '</div>';
        
        Swal.fire({
            title: 'ข้อมูลเปรียบเทียบ',
            html: comparisonHTML,
            width: 600,
                confirmButtonColor: '#0ab4ab'
        });
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

    // เพิ่ม state สำหรับการดูประวัติ
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    
    // เพิ่มฟังก์ชันดึงข้อมูลประวัติ
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

    // แสดงข้อมูลเปรียบเทียบฉบับปัจจุบันกับประวัติ
    const showHistoryComparison = () => {
        if (historyData.length === 0) {
            Swal.fire({
                title: 'ไม่พบข้อมูลประวัติ',
                text: 'ไม่พบข้อมูลประวัติการแก้ไขสำหรับวันและกะที่เลือก',
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
                    return;
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
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

<<<<<<< HEAD
    // ฟังก์ชันบันทึกข้อมูลจริง (Save Final)
    const onSubmit = async (e) => {
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
        
        // ตรวจสอบว่ามีการกรอกข้อมูลอย่างน้อย 1 ฟิลด์
        const hasData = 
            formData.patientCensus || 
            formData.overallData || 
            formData.newAdmit || 
            formData.transferIn || 
            formData.referIn || 
            formData.transferOut || 
            formData.referOut || 
            formData.discharge || 
            formData.dead ||
            formData.rns ||
            formData.pns ||
            formData.nas ||
            formData.aides ||
            formData.studentNurses;
        
        if (!hasData) {
            Swal.fire({
                title: 'ไม่สามารถบันทึกได้',
                text: 'กรุณากรอกข้อมูลอย่างน้อย 1 ฟิลด์',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        // ตรวจสอบว่ามีการบันทึกกะเช้าแล้วหรือไม่ หากต้องการบันทึกกะดึก
        if (selectedShift === 'ดึก') {
            const morningShiftExists = await checkMorningShiftExists(selectedDate, selectedWard);
            if (!morningShiftExists) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกได้',
                    text: 'ไม่พบข้อมูลกะเช้าของวันที่นี้ กรุณาบันทึกข้อมูลกะเช้าก่อน',
                    icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
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
                } else {
                    // ถ้าไม่มีข้อมูลการเคลื่อนไหวของผู้ป่วย ให้ใช้ค่า patientCensus เป็น overallData
                    updatedFormData.overallData = updatedFormData.patientCensus;
                }
            } else if (selectedShift === 'ดึก') {
                // คำนวณค่า overallData
                if (updatedFormData.newAdmit || updatedFormData.transferIn || updatedFormData.referIn || 
                    updatedFormData.transferOut || updatedFormData.referOut || updatedFormData.discharge || 
                    updatedFormData.dead) {
                    const calculatedValue = calculatePatientCensus(updatedFormData);
                    updatedFormData.overallData = calculatedValue.toString();
                }

                // ดึงข้อมูลกะเช้าเพื่อนำมาเป็นฐานในการคำนวณ
                const morningShiftData = await fetchMorningShiftData(selectedDate, selectedWard);
                if (morningShiftData && morningShiftData.overallData) {
                    // ใช้ overallData จากกะเช้าเป็นค่า patientCensus ของกะดึก
                    updatedFormData.patientCensus = morningShiftData.overallData;
                    
                    // คำนวณ overallData ใหม่โดยใช้ patientCensus ที่อัปเดต
                    if (updatedFormData.newAdmit || updatedFormData.transferIn || updatedFormData.referIn || 
                        updatedFormData.transferOut || updatedFormData.referOut || updatedFormData.discharge || 
                        updatedFormData.dead) {
                        const calculatedValue = calculatePatientCensus(updatedFormData);
                        updatedFormData.overallData = calculatedValue.toString();
                    } else {
                        // ถ้าไม่มีข้อมูลการเคลื่อนไหวของผู้ป่วย ให้ใช้ค่า patientCensus เป็น overallData
                        updatedFormData.overallData = updatedFormData.patientCensus;
                    }
                }
            }
            
            // บันทึกข้อมูลจริง (ไม่ใช่ Draft)
            updatedFormData.isDraft = false;
            // เมื่อบันทึก isApproved จะเป็น false รอการอนุมัติจาก Supervisor
            updatedFormData.isApproved = false;
            
            const success = await handleWardFormSubmit(
                selectedDate,
                selectedWard,
                selectedShift,
                updatedFormData,
                user,
                false // isDraft = false
            );

            if (success) {
                setFormData(updatedFormData);
                setIsDraftMode(false);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'บันทึกสำเร็จ',
                    text: 'บันทึกข้อมูลเรียบร้อยแล้ว ข้อมูลจะถูกส่งไปยังหน้าอนุมัติ',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                }).then(() => {
                    // ดึงข้อมูลวันที่มีการบันทึกข้อมูลใหม่
                    fetchDatesWithData(selectedWard);
                    
                    // เช็คสถานะการอนุมัติใหม่
                    checkApprovalStatus(selectedDate, selectedWard).then(newStatus => {
                        setApprovalStatus(newStatus);
                    });
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                title: 'Error',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ฟังก์ชันตรวจสอบว่ามีการบันทึกข้อมูลกะเช้าแล้วหรือไม่
    const checkMorningShiftExists = async (date, wardId) => {
        try {
            const q = query(
                collection(db, 'wardData'),
                where('date', '==', date),
                where('wardId', '==', wardId),
                where('shift', '==', 'เช้า')
            );
            
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking morning shift:', error);
            return false;
        }
    };

    // ฟังก์ชันดึงข้อมูลกะเช้าของวันเดียวกัน
    const fetchMorningShiftData = async (date, wardId) => {
        try {
            const q = query(
                collection(db, 'wardData'),
                where('date', '==', date),
                where('wardId', '==', wardId),
                where('shift', '==', 'เช้า')
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching morning shift data:', error);
            return null;
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* ... existing UI code ... */}
            
            {/* แสดงผลการตรวจสอบข้อมูลย้อนหลัง 30 วัน */}
            {past30DaysResult?.noRecentRecords && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
                    <p className="font-semibold">ข้อมูลย้อนหลัง 30 วัน:</p>
                    <p>{past30DaysResult.message}</p>
                </div>
            )}
            
            {/* เพิ่มคอมโพเนนต์แสดงข้อมูลเกี่ยวกับการคำนวณ */}
            <CalculationInfo shift={selectedShift} />
            
            {/* ส่วนข้อมูลผู้ป่วย */}
            <div className="mb-6">
                <PatientCensusSection 
                    formData={formData}
                    onInputChange={onInputChange}
=======
    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className={`max-w-7xl mx-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-6 rounded-xl shadow-lg transition-colors duration-300`}>
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
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
                />
                
                <PatientMovementSection
                    formData={formData}
                    onInputChange={onInputChange}
                />
<<<<<<< HEAD
                
                <StaffSection
                    formData={formData}
                    onInputChange={onInputChange}
                />
                
                <NotesSection
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />
                
                {/* ส่วนชื่อผู้บันทึก */}
                <div className="bg-white shadow rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">เจ้าหน้าที่ผู้บันทึกข้อมูล</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="mb-2">
                            <label className="block text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
=======
            </div>

            {/* Main Form */}
            <form onSubmit={onSubmit} className="space-y-8">
                <div className={`${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                } p-6 rounded-xl border ${
                    theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                } shadow-sm`}>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Patient Census & Overall Data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Patient Census</label>
                                <input
                                    type="number"
                                    value={formData.patientCensus}
                                    onChange={onInputChange}
                                    name="patientCensus"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                    readOnly={selectedShift === 'เช้า'} // ถ้าเป็นกะเช้า จะคำนวณอัตโนมัติ
                                />
                                {selectedShift === 'เช้า' && <CalculationInfo shift="เช้า" />}
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Overall Data</label>
                                <input
                                    type="number"
                                    value={formData.overallData}
                                    onChange={onInputChange}
                                    name="overallData"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                    readOnly={selectedShift === 'ดึก'} // ถ้าเป็นกะดึก จะคำนวณอัตโนมัติ
                                />
                                {selectedShift === 'ดึก' && <CalculationInfo shift="ดึก" />}
                            </div>
                        </div>
                        
                        {/* Staff Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Nurse Manager</label>
                                <input
                                    type="number"
                                    value={formData.nurseManager}
                                    onChange={onInputChange}
                                    name="nurseManager"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>RN</label>
                                <input
                                    type="number"
                                    value={formData.RN}
                                    onChange={onInputChange}
                                    name="RN"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            </div>
                            
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>PN</label>
                                <input
                                    type="number"
                                    value={formData.PN}
                                    onChange={onInputChange}
                                    name="PN"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>WC</label>
                                <input
                                    type="number"
                                    value={formData.WC}
                                    onChange={onInputChange}
                                    name="WC"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Patient Movement */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>New Admit</label>
                                <input
                                    type="number"
                                    value={formData.newAdmit}
                                    onChange={onInputChange}
                                    name="newAdmit"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Transfer In</label>
                                <input
                                    type="number"
                                    value={formData.transferIn}
                                    onChange={onInputChange}
                                    name="transferIn"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            </div>
                            
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Refer In</label>
                                <input
                                    type="number"
                                    value={formData.referIn}
                                    onChange={onInputChange}
                                    name="referIn"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Transfer Out</label>
                                <input
                                    type="number"
                                    value={formData.transferOut}
                                    onChange={onInputChange}
                                    name="transferOut"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Refer Out</label>
                                <input
                                    type="number"
                                    value={formData.referOut}
                                    onChange={onInputChange}
                                    name="referOut"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Discharge</label>
                                <input
                                    type="number"
                                    value={formData.discharge}
                                    onChange={onInputChange}
                                    name="discharge"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                        </div>
                    </div>
                    
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Dead</label>
                                <input
                                    type="number"
                                    value={formData.dead}
                                    onChange={onInputChange}
                                    name="dead"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Available</label>
                                <input
                                    type="number"
                                    value={formData.availableBeds}
                                    onChange={onInputChange}
                                    name="availableBeds"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            </div>
                            
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Unavailable</label>
                                <input
                                    type="number"
                                    value={formData.unavailable}
                                    onChange={onInputChange}
                                    name="unavailable"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={`block mb-2 text-base font-medium ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                }`}>Planned Discharge</label>
                                <input
                                    type="number"
                                    value={formData.plannedDischarge}
                                    onChange={onInputChange}
                                    name="plannedDischarge"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    min="0"
                                />
                        </div>
                    </div>
                    
                        {/* Staff Recording Information */}
                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>เจ้าหน้าที่ผู้บันทึก</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block mb-2 text-base font-medium ${
                                        theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                    }`}>First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={onInputChange}
                                    name="firstName"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="ชื่อ"
                                    required
                                    pattern="[ก-๙a-zA-Z\s]+"
                                    title="กรุณากรอกเฉพาะตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น"
                                />
                            </div>
                                <div>
                                    <label className={`block mb-2 text-base font-medium ${
                                        theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                    }`}>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={onInputChange}
                                    name="lastName"
                                    className={`w-full p-2.5 rounded-lg text-base ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700 text-gray-50'
                                            : 'bg-gray-50 border-gray-300 text-gray-900'
                                    } focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="นามสกุล"
                                    required
                                    pattern="[ก-๙a-zA-Z\s]+"
                                    title="กรุณากรอกเฉพาะตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น"
                                />
                            </div>
                        </div>
                    </div>
                    
                        {/* Comment Section */}
                        <div>
                            <label className={`block mb-2 text-base font-medium ${
                                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                            }`}>Comment</label>
                            <textarea
                                value={formData.comment}
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
                                onChange={onInputChange}
                                onInput={validateNameInput}
                                className="border rounded p-2 w-full"
                                pattern="[ก-๙a-zA-Z\s]*"
                                title="กรุณากรอกเฉพาะตัวอักษรเท่านั้น"
                                required
                            />
                        </div>
                        <div className="mb-2">
                            <label className="block text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                            <input
                                type="text" 
                                name="lastName"
                                value={formData.lastName}
                                onChange={onInputChange}
                                onInput={validateNameInput}
                                className="border rounded p-2 w-full"
                                pattern="[ก-๙a-zA-Z\s]*"
                                title="กรุณากรอกเฉพาะตัวอักษรเท่านั้น"
                                required
                            />
                        </div>
                    </div>
                </div>
<<<<<<< HEAD
                
                {/* ปุ่มบันทึก */}
                <div className="flex justify-end space-x-2 mt-4">
                    <button
                        onClick={onSaveDraft}
                        disabled={isSubmitting}
                        className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </div>
            
            {/* ... existing UI code ... */}
=======

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
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            บันทึกฉบับร่าง
                        </button>
                        <button
                            type="submit"
                            className={`inline-flex items-center px-6 py-3 ${
                                theme === 'dark'
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-[#0ab4ab] hover:bg-[#0ab4ab]/90'
                            } text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ab4ab]`}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            บันทึกข้อมูลสมบูรณ์
                        </button>
                    </div>
                    </div>
                </form>
>>>>>>> 02d4cb446626ef2454bf39f07af13f3101dc7804
        </div>
    );
};

export default WardForm;
