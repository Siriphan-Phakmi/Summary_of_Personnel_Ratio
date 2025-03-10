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
        notes: ''
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
                        notes: wardData.notes || ''
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
                        notes: wardData.notes || ''
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
                        notes: ''
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
        <div className="p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">แบบฟอร์มบันทึกข้อมูล Ward</h1>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 flex flex-wrap items-center gap-2">
                    <div>
                        <span className="font-semibold">Ward:</span> {selectedWard}
                    </div>
                    <div className="mx-4">
                        <span className="font-semibold">วันที่:</span> {thaiDate}
                        <button
                            type="button"
                            className="ml-2 text-primary hover:text-primary-dark"
                            onClick={() => setShowCalendar(!showCalendar)}
                        >
                            📅
                        </button>
                    </div>
                    <div>
                        <span className="font-semibold">กะ:</span> {selectedShift}
                    </div>
                    
                    <div className="flex ml-auto gap-2">
                        {approvalStatus && <ApprovalDataButton approvalStatus={approvalStatus} />}
                        {latestRecordDate && <LatestRecordButton latestRecordDate={latestRecordDate} />}
                    </div>
                </div>
            </div>
            
            {showCalendar && (
                <div className="mb-6">
                    <CalendarSection
                        selectedDate={selectedDate}
                        onDateSelect={handleLocalDateSelect}
                        datesWithData={datesWithData}
                    />
                </div>
            )}
            
            <div className="mb-6">
                <ShiftSelection 
                    selectedShift={selectedShift}
                    onChange={onShiftChange}
                />
            </div>
            
            <form onSubmit={onSubmit}>
                <PatientCensusSection 
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />
                
                <PatientMovementSection 
                    formData={formData}
                    setFormData={setFormData}
                    setHasUnsavedChanges={setHasUnsavedChanges}
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
                
                <div className="flex justify-between items-center mt-6">
                    <div>
                        {hasUnsavedChanges && (
                            <span className="text-yellow-600 font-medium">
                                ⚠️ คุณมีข้อมูลที่ยังไม่ได้บันทึก
                            </span>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary-dark text-white py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition duration-200"
                    >
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WardForm;
