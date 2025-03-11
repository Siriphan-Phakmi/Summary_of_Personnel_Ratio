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
    LatestRecordButton,
    PatientCensusSection,
    PatientMovementSection,
    StaffSection,
    NotesSection
} from './WardForm/index';

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
    
    const [formData, setFormData] = useState({
        patientCensus: '0',
        admissions: '0',
        discharges: '0',
        transfers: '0',
        deaths: '0',
        rns: '0',
        pns: '0',
        nas: '0',
        aides: '0',
        studentNurses: '0',
        notes: '',
        firstName: '',
        lastName: ''
    });

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

    // เล่ม์ก์เช็คการเปลี่ยนแปลง
    const checkFormChanges = useCallback(() => {
        if (!selectedWard) return false;
        
        // ตรวจสอบการเปลี่ยนแปลงของข้อมูล
        return (
            formData.nurseManager !== '0' ||
            formData.RN !== '0' ||
            formData.PN !== '0' ||
            formData.WC !== '0' ||
            formData.newAdmit !== '0' ||
            formData.transferIn !== '0' ||
            formData.referIn !== '0' ||
            formData.transferOut !== '0' ||
            formData.referOut !== '0' ||
            formData.discharge !== '0' ||
            formData.dead !== '0' ||
            formData.availableBeds !== '0' ||
            formData.unavailable !== '0' ||
            formData.plannedDischarge !== '0' ||
            formData.comment.trim() !== ''
        );
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
            
            safeFetchWardData(selectedDate, selectedWard, selectedShift)
                .then(data => {
                    if (data) {
                        console.log('Ward data fetched:', data);
                        // ดำเนินการกับข้อมูลที่ได้
                    }
                })
                .catch(error => {
                    console.error('Error fetching ward data:', error);
                });
        } else {
            console.warn('Cannot fetch ward data: selectedWard is empty or undefined', { selectedWard });
        }
    }, [selectedWard, selectedDate, selectedShift]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Starting with today instead of hardcoded date
            const today = new Date();
            setSelectedDate(today);
            const currentShift = getCurrentShift();
            setSelectedShift(currentShift);
            setThaiDate(formatThaiDate(today));
            
            // Fetch dates with data when component mounts
            fetchDatesWithData();
        }
    }, []);

    // Add beforeunload event listener for unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // คำนวณยอดรวม Total ใหม่เมื่อเปลี่ยนแปลงข้อมูลเกี่ยวข้อง
    useEffect(() => {
        const total = calculateTotal();
        setFormData(prev => ({
            ...prev,
            total: total.toString(),
            overallData: total.toString()  // เดท overallData ด้วย
        }));
    }, [formData.patientCensus, formData.newAdmit, formData.transferIn, formData.referIn, 
        formData.transferOut, formData.referOut, formData.discharge, formData.dead]);

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            
            try {
                // Fetch dates with data
                const dates = await fetchDatesWithData(selectedWard);
                setDatesWithData(dates);
                
                // Fetch previous shift data
                const prevShifts = await fetchPreviousShiftData(selectedDate, selectedWard);
                setPreviousShiftData(prevShifts);
                
                // Fetch approval status
                const status = await fetchApprovalData(selectedDate, selectedWard);
                setApprovalStatus(status);
                
                // Fetch latest record
                const latestDate = await fetchLatestRecord(selectedWard);
                setLatestRecordDate(latestDate);
                
                // Fetch ward data for current selection
                const wardData = await safeFetchWardData(selectedDate, selectedWard, selectedShift);
                
                if (wardData) {
                    setFormData({
                        id: wardData.id,
                        patientCensus: wardData.patientCensus || '0',
                        admissions: wardData.admissions || '0',
                        discharges: wardData.discharges || '0',
                        transfers: wardData.transfers || '0',
                        deaths: wardData.deaths || '0',
                        rns: wardData.rns || '0',
                        pns: wardData.pns || '0',
                        nas: wardData.nas || '0',
                        aides: wardData.aides || '0',
                        studentNurses: wardData.studentNurses || '0',
                        notes: wardData.notes || '',
                        firstName: wardData.firstName || '',
                        lastName: wardData.lastName || ''
                    });
                }
        } catch (error) {
                console.error('Error loading initial data:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsLoading(false);
        }
    };

        loadInitialData();
    }, [selectedWard, selectedDate, selectedShift]);

    // Handle date change
    const handleLocalDateSelect = async (date) => {
        await handleDateSelect(
            date,
            selectedWard,
            selectedShift,
            setSelectedDate,
            setThaiDate,
            setShowCalendar,
            setApprovalStatus,
            setFormData
        );
        
        // Fetch previous shift data after date change
        const prevShifts = await fetchPreviousShiftData(date, selectedWard);
        setPreviousShiftData(prevShifts);
    };
    
    // Handle shift change
    const onShiftChange = (shift) => {
        handleShiftChange(shift, setSelectedShift);
        // Refetch data for new shift
        safeFetchWardData(selectedDate, selectedWard, shift)
            .then(wardData => {
                if (wardData) {
                    setFormData({
                        id: wardData.id,
                        patientCensus: wardData.patientCensus || '0',
                        admissions: wardData.admissions || '0',
                        discharges: wardData.discharges || '0',
                        transfers: wardData.transfers || '0',
                        deaths: wardData.deaths || '0',
                        rns: wardData.rns || '0',
                        pns: wardData.pns || '0',
                        nas: wardData.nas || '0',
                        aides: wardData.aides || '0',
                        studentNurses: wardData.studentNurses || '0',
                        notes: wardData.notes || '',
                        firstName: wardData.firstName || '',
                        lastName: wardData.lastName || ''
                });
            } else {
                    setFormData({
                        patientCensus: '0',
                        admissions: '0',
                        discharges: '0',
                        transfers: '0',
                        deaths: '0',
                        rns: '0',
                        pns: '0',
                        nas: '0',
                        aides: '0',
                        studentNurses: '0',
                        notes: '',
                        firstName: '',
                        lastName: ''
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching ward data for new shift:', error);
            });
    };
    
    // Handle input change
    const onInputChange = (e) => {
        handleInputChange(e, formData, setFormData, setHasUnsavedChanges);
    };
    
    // Handle form submission
    const onSubmit = async (e) => {
        const result = await handleWardFormSubmit(e, formData, selectedWard, selectedDate, selectedShift, user);
        
        if (result.success) {
            setHasUnsavedChanges(false);
            
            // Log event
            logEvent('ward_form_save_success', {
                wardId: selectedWard,
                date: selectedDate.toISOString(),
                shift: selectedShift,
                operation: result.operation
            });
            
            // Show success message
            Swal.fire({
                title: 'สำเร็จ!',
                text: `บันทึกข้อมูลเรียบร้อยแล้ว (${result.operation === 'create' ? 'สร้างใหม่' : 'อัพเดท'})`,
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });

            // Update approval status after submission
            const newStatus = await checkApprovalStatus(selectedDate, selectedWard);
            setApprovalStatus(newStatus);
            } else {
            Swal.fire({
                title: 'Error',
                text: `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${result.error}`,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    useEffect(() => {
        const initialSetup = async () => {
            try {
                if (typeof window !== 'undefined') {
                    console.log('Initial WardForm setup with:', { 
                        wardId,
                        user: user?.department || 'no department', 
                        selectedWard
                    });
                    
                    // ตรวจสอบว่ามีการตั้งค่า selectedWard หรือไม่
                    if (!selectedWard || selectedWard.trim() === '') {
                        console.warn('Initial setup: selectedWard is not set');
                    setIsLoading(false);
                    return;
                    }
                    
                    // ตั้งค่าวันที่และเวร
                    const today = new Date();
                    setSelectedDate(today);
                    
                    const currentShift = getCurrentShift();
                    setSelectedShift(currentShift);
                    
                    // อื่นๆ ตามเดิม...
                }
        } catch (error) {
                console.error('Error in WardForm initialSetup:', error);
        } finally {
                // ตั้งค่า loading เป็น false ไม่ว่าจะเกิดข้อผิดพลาดหรือไม่
            setIsLoading(false);
        }
    };

        initialSetup();
    }, [wardId, user, selectedWard]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className={`max-w-7xl mx-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-6 rounded-xl shadow-lg transition-colors duration-300`}>
            {/* Header Section */}
            <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Ward Form
                </h1>
                <div className={`${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-r from-blue-50 to-teal-50'
                } p-4 rounded-lg ${
                    theme === 'dark' ? 'border-gray-700' : 'border-blue-100'
                } border flex flex-wrap items-center gap-4`}>
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
                    
                    <div className="flex ml-auto gap-2">
                        {approvalStatus && <ApprovalDataButton approvalStatus={approvalStatus} />}
                        {latestRecordDate && <LatestRecordButton latestRecordDate={latestRecordDate} />}
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
                
                <ShiftSelection
                    selectedShift={selectedShift}
                    onShiftChange={onShiftChange}
                />
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
                                />
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
                                />
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
                                onChange={onInputChange}
                                name="comment"
                                rows="3"
                                className={`w-full p-2.5 rounded-lg text-base ${
                                    theme === 'dark'
                                        ? 'bg-gray-800 border-gray-700 text-gray-50'
                                        : 'bg-gray-50 border-gray-300 text-gray-900'
                                } focus:ring-blue-500 focus:border-blue-500`}
                            ></textarea>
                        </div>
                    </div>
                </div>

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
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WardForm;
