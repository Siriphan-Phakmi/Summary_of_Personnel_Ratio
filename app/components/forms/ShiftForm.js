'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import React from 'react';
import { DataTable } from './ShiftForm/DataTable';
import DataComparisonModal from './ShiftForm/DataComparisonModal';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../utils/dateUtils';
import { wardMapping, WARD_ORDER, initialWardData } from '../../utils/wardConstants';
import { getCurrentShift, isCurrentDate, isPastDate, isFutureDateMoreThanOneDay } from '../../utils/dateHelpers';
import SignatureSection from './SignatureSection';
import SummarySection from './SummarySection';
import CalendarSection from './CalendarSection';
import { Swal } from '../../utils/alertService';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const ShiftForm = ({ isApprovalMode = false }) => {
    const router = useRouter();
    const { user } = useAuth();
    // 1. State declarations
    const [currentStep, setCurrentStep] = useState(0);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [datesWithData, setDatesWithData] = useState([]);
    const [thaiDate, setThaiDate] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [summaryData, setSummaryData] = useState({
        opdTotal24hr: '',
        existingPatients: '',
        newPatients: '',
        admissions24hr: '',
        supervisorFirstName: '',
        supervisorLastName: ''
    });

    // ปรับปรุง formData state
    const [formData, setFormData] = useState({
        date: '',
        shift: '',
        wards: {
            Ward6: { ...initialWardData },
            Ward7: { ...initialWardData },
            Ward8: { ...initialWardData },
            Ward9: { ...initialWardData },
            WardGI: { ...initialWardData },
            Ward10B: { ...initialWardData },
            Ward11: { ...initialWardData },
            Ward12: { ...initialWardData },
            ICU: { ...initialWardData },
            CCU: { ...initialWardData },
            LR: { ...initialWardData },
            NSY: { ...initialWardData }
        },
        totals: { ...initialWardData }
    });

    const [showDataComparison, setShowDataComparison] = useState(false);
    const [existingData, setExistingData] = useState(null);

    // เพิ่ม state สำหรับจัดการ loading states
    const [loadingStates, setLoadingStates] = useState({
        initialLoading: true,
        savingData: false,
        checkingDuplicates: false,
        fetchingDates: false
    });

    const [loadingMessage, setLoadingMessage] = useState('');

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Add mobile warning state
    const [showMobileWarning, setShowMobileWarning] = useState(false);
    const [approvalStatuses, setApprovalStatuses] = useState({});

    // Check if device is mobile on component mount
    useEffect(() => {
        const checkMobile = () => {
            return window.innerWidth < 768; // md breakpoint in Tailwind
        };

        const handleResize = () => {
            setShowMobileWarning(checkMobile());
        };

        // Initial check
        setShowMobileWarning(checkMobile());

        // Add resize listener
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // เพิ่ม Initial Loading Effect
    useEffect(() => {
        setTimeout(() => {
            setIsInitialLoading(false);
        }, 1000);
    }, []);

    // Function to fetch approval statuses for all wards
    const fetchApprovalStatuses = async (date) => {
        try {
            if (!date) return;
            
            const dateString = getUTCDateString(new Date(date));
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const statuses = {};
            
            // Fetch approval status for each ward
            for (const ward of WARD_ORDER) {
                const q = query(
                    wardDailyRef,
                    where('date', '==', dateString),
                    where('wardId', '==', ward)
                );
                
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const wardData = querySnapshot.docs[0].data();
                    statuses[ward] = wardData.approvalStatus || 'pending';
                } else {
                    statuses[ward] = null; // No data exists for this ward
                }
            }
            
            setApprovalStatuses(statuses);
            console.log('Fetched approval statuses:', statuses);
        } catch (error) {
            console.error('Error fetching approval statuses:', error);
        }
    };

    // อัพเดท useEffect สำหรับการโหลดครั้งแรก
    useEffect(() => {
        // Log mode for debugging
        console.log(`ShiftForm running in ${isApprovalMode ? 'approval' : 'normal'} mode`);
        
        // Additional logic for approval mode if needed
        if (isApprovalMode) {
            setIsReadOnly(true); // Set form to read-only in approval mode
        }
        
        if (typeof window !== 'undefined') {
            const today = new Date();
            setSelectedDate(today);
            const isoDate = today.toISOString().split('T')[0];
            
            const currentShift = getCurrentShift();
            
            setFormData(prev => ({
                ...prev,
                date: isoDate,
                shift: currentShift
            }));
            
            setThaiDate(formatThaiDate(today));
            
            // เรียกฟังก์ชันโหลดข้อมูลแค่บางฟังก์ชัน ไม่รวม fetchLatestData
            checkMorningShiftExists(isoDate);
            checkPreviousNightShift(isoDate);
            fetchDatesWithData();
            fetchApprovalStatuses(isoDate);
            
            // TODO: ปิดฟังก์ชัน fetchLatestData ไว้ก่อนเพื่อแก้ปัญหา Alert ซ้ำซ้อน
            // ถ้าต้องการเปิดใช้งานอีกครั้ง ให้แก้ไขฟังก์ชันให้จัดการการแสดง Alert อย่างเหมาะสม
            // fetchLatestData();
        }
    }, [isApprovalMode]);

    const [hasExistingMorningShift, setHasExistingMorningShift] = useState(false);
    const [hasPreviousNightShift, setHasPreviousNightShift] = useState(false);

    // เพิ่มฟังก์ชันใหม่สำหรับตรวจสอบข้อมูลกะเช้า
    const checkMorningShiftExists = async (date) => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const q = query(
                recordsRef,
                where('date', '==', date),
                where('shift', '==', '07:00-19:00')
            );

            const querySnapshot = await getDocs(q);
            const exists = !querySnapshot.empty;
            setHasExistingMorningShift(exists);
            return exists;
        } catch (error) {
            console.error('Error checking morning shift data:', error);
            setHasExistingMorningShift(false);
            return false;
        }
    };

    // เพิ่มฟังก์ชันใหม่สำหรับตรวจสอบข้อมูลกะดึกของวันก่อนหน้า
    const checkPreviousNightShift = async (date) => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const previousDate = new Date(date);
            previousDate.setDate(previousDate.getDate() - 1);
            const formattedPreviousDate = previousDate.toISOString().split('T')[0];

            const q = query(
                recordsRef,
                where('date', '==', formattedPreviousDate),
                where('shift', '==', '19:00-07:00')
            );

            const querySnapshot = await getDocs(q);
            const exists = !querySnapshot.empty;
            setHasPreviousNightShift(exists);
            return exists;
        } catch (error) {
            console.error('Error checking previous night shift data:', error);
            setHasPreviousNightShift(false);
            return false;
        }
    };

    // เพิ่มฟังก์ชันใหม่สำหรับตรวจสอบว่าวันที่ระบุมีการบันทึกกะครบหรือไม่
    const checkDateHasCompletedShifts = async (date) => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const q = query(
                recordsRef,
                where('date', '==', date)
            );

            const querySnapshot = await getDocs(q);
            const shifts = new Set(querySnapshot.docs.map(doc => doc.data().shift));
            return {
                hasMorningShift: shifts.has('07:00-19:00'),
                hasNightShift: shifts.has('19:00-07:00')
            };
        } catch (error) {
            console.error('Error checking date shifts:', error);
            return {
                hasMorningShift: false,
                hasNightShift: false
            };
        }
    };

    // อัพเดทฟังก์ชัน handleDateChange
    const handleDateChange = async (element) => {
        const newDate = element.target.value;
        if (!newDate) {
            const today = new Date();
            setSelectedDate(today);
            setFormData(prev => ({ ...prev, date: today.toISOString().split('T')[0] }));
            setThaiDate(formatThaiDate(today));
            return;
        }

        const dateObj = new Date(newDate);
        setSelectedDate(dateObj);

        // ตรวจสอบวันก่อนหน้า
        const previousDate = new Date(dateObj);
        previousDate.setDate(previousDate.getDate() - 1);
        const formattedPreviousDate = previousDate.toISOString().split('T')[0];
        
        // ตรวจสอบการบันทึกกะของวันก่อนหน้า
        const previousDateShifts = await checkDateHasCompletedShifts(formattedPreviousDate);
        
        if (!previousDateShifts.hasNightShift && previousDateShifts.hasMorningShift) {
            // ถ้าวันก่อนหน้ามีแค่กะเช้า แต่ยังไม่มีกะดึก
            await Swal.fire({
                title: 'แจ้งเตือน',
                html: `วันที่ ${formatThaiDate(previousDate)} ยังไม่ได้บันทึกข้อมูลกะดึก<br>กรุณาบันทึกข้อมูลกะดึกของวันที่ ${formatThaiDate(previousDate)} ก่อน`,
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            
            // Reset date selection
            setSelectedDate(previousDate);
            setFormData(prev => ({
                ...prev,
                date: formattedPreviousDate,
                shift: '19:00-07:00' // Set shift to night shift
            }));
            setThaiDate(formatThaiDate(previousDate));
            return;
        }

        // ถ้าผ่านการตรวจสอบ อัพเดทข้อมูลตามปกติ
        setFormData(prev => ({
            ...prev,
            date: newDate
        }));
        setThaiDate(formatThaiDate(dateObj));
        
        // Fetch approval statuses for the new date
        fetchApprovalStatuses(newDate);
    };

    // เพิ่มฟังก์ชันคำนวณ totals
    const calculateTotals = useMemo(() => {
        return Object.values(formData.wards).reduce((totals, ward) => ({
            numberOfPatients: totals.numberOfPatients + (Number(ward.numberOfPatients) || 0),
            nurseManager: totals.nurseManager + (Number(ward.nurseManager) || 0),
            RN: totals.RN + (Number(ward.RN) || 0),
            PN: totals.PN + (Number(ward.PN) || 0),
            WC: totals.WC + (Number(ward.WC) || 0),
            newAdmit: totals.newAdmit + (Number(ward.newAdmit) || 0),
            transferIn: totals.transferIn + (Number(ward.transferIn) || 0),
            referIn: totals.referIn + (Number(ward.referIn) || 0),
            transferOut: totals.transferOut + (Number(ward.transferOut) || 0),
            referOut: totals.referOut + (Number(ward.referOut) || 0),
            discharge: totals.discharge + (Number(ward.discharge) || 0),
            dead: totals.dead + (Number(ward.dead) || 0),
            overallData: totals.overallData + (Number(ward.overallData) || 0),
            availableBeds: totals.availableBeds + (Number(ward.availableBeds) || 0),
            unavailable: totals.unavailable + (Number(ward.unavailable) || 0),
            plannedDischarge: totals.plannedDischarge + (Number(ward.plannedDischarge) || 0)
        }), {
            numberOfPatients: 0,
            nurseManager: 0,
            RN: 0,
            PN: 0,
            WC: 0,
            newAdmit: 0,
            transferIn: 0,
            referIn: 0,
            transferOut: 0,
            referOut: 0,
            discharge: 0,
            dead: 0,
            overallData: 0,
            availableBeds: 0,
            unavailable: 0,
            plannedDischarge: 0
        });
    }, [formData.wards]);

    // Add useEffect for automatic total calculation
    useEffect(() => {
        setFormData(prev => ({ ...prev, totals: calculateTotals }));
    }, [calculateTotals]);

    // เพิ่มฟังก์ชันตรวจสอบความสัมพันธ์ของจำนวนเตียง
    const validateBedCapacity = (wardData) => {
        return []; // ยังไม่มีการตรวจสอบเงื่อนไขเตียง
    };

    // เพิ่มฟังก์ชัน filterWardsByUser
    const filterWardsByUser = useCallback(() => {
        if (!user) return WARD_ORDER;
        
        // ถ้าเป็น admin หรือ approver ให้แสดงทั้งหมด
        if (user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'approver') {
            return WARD_ORDER;
        }
        
        // ถ้าเป็น user ปกติให้แสดงเฉพาะ ward ของตัวเอง
        const userDepartment = user.department;
        if (userDepartment && WARD_ORDER.includes(userDepartment)) {
            return [userDepartment];
        }
        
        // ถ้าไม่มีข้อมูล department หรือ department ไม่ตรงกับ ward ใดๆ ให้แสดงทั้งหมด
        return WARD_ORDER;
    }, [user]);

    // กำหนด ward ที่จะแสดง
    const displayWards = useMemo(() => filterWardsByUser(), [filterWardsByUser]);
    
    // ฟังก์ชันสำหรับแสดงค่า
    const displayValue = (value) => {
        return value === undefined || value === null || value === '' ? '0' : value;
    };
    
    // แก้ไขฟังก์ชัน handleInputChange ให้เป็นแบบดูอย่างเดียว
    const handleInputChange = useCallback((type, ward, data) => {
        // ถ้าเป็น user ปกติ ไม่ให้แก้ไขข้อมูล
        if (user?.role?.toLowerCase() === 'user') {
            console.log('View only mode: Changes are disabled');
            return;
        }
        
        // โค้ดส่วนนี้จะทำงานเฉพาะเมื่อเป็น admin เท่านั้น
        // ... โค้ดเดิมในฟังก์ชัน handleInputChange ...
    }, [formData, setFormData, user]);
    
    // แก้ไขฟังก์ชัน handleSubmit ให้เป็นแบบดูอย่างเดียว
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // ถ้าเป็นโหมดอ่านอย่างเดียว ไม่ให้บันทึกข้อมูล
        if (isReadOnly) {
            Swal.fire({
                title: 'โหมดดูข้อมูลเท่านั้น',
                text: 'ข้อมูลอยู่ในโหมดดูอย่างเดียว ไม่สามารถบันทึกได้',
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ถ้าเป็น user ปกติ ไม่ให้บันทึกข้อมูล
        if (user?.role?.toLowerCase() === 'user') {
            Swal.fire({
                title: 'โหมดดูข้อมูลเท่านั้น',
                text: 'คุณไม่มีสิทธิ์บันทึกข้อมูล กรุณาติดต่อผู้ดูแลระบบ',
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ... โค้ดเดิมในฟังก์ชัน handleSubmit ...
    };

    // เพิ่มฟังก์ชันเช็ควันที่ปัจจุบัน
    const isCurrentDate = useCallback(() => {
        const today = new Date();
        const selected = new Date(selectedDate);
        return (
            today.getDate() === selected.getDate() &&
            today.getMonth() === selected.getMonth() &&
            today.getFullYear() === selected.getFullYear()
        );
    }, [selectedDate]);

    const isPastDate = () => {
        if (!formData.date) return false;
        const selected = new Date(formData.date);
        const today = new Date();

        // Reset time to midnight for accurate date comparison
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        // Allow saving data for current date and future dates (within 1 day)
        return selected < today;
    };

    const isFutureDateMoreThanOneDay = () => {
        if (!formData.date) return false;
        const selected = new Date(formData.date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset time to midnight for accurate date comparison
        selected.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);

        return selected > tomorrow;
    };

    // Move hasWardData function here, before validateFormData
    const hasWardData = useCallback(() => {
        return Object.values(formData.wards).some(ward =>
            Object.entries(ward).some(([key, value]) =>
                key !== 'comment' && value !== '' && value !== '0'
            )
        );
    }, [formData.wards]);

    // เพิ่มฟังก์ชันตรวจสอบการเปลี่ยนแปลงข้อมูล
    const hasDataChanges = useCallback(() => {
        let changes = {
            staff: false,
            movement: false,
            additional: false
        };

        Object.values(formData.wards).forEach(ward => {
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Staff
            if (ward.nurseManager !== '0' || ward.RN !== '0' || ward.PN !== '0' || ward.WC !== '0') {
                changes.staff = true;
            }
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Patient Movement
            if (ward.newAdmit !== '0' || ward.transferIn !== '0' || ward.referIn !== '0' ||
                ward.transferOut !== '0' || ward.referOut !== '0' || ward.discharge !== '0' || ward.dead !== '0') {
                changes.movement = true;
            }
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Additional Information
            if (ward.availableBeds !== '0' || ward.unavailable !== '0' || ward.plannedDischarge !== '0' || ward.comment.trim() !== '') {
                changes.additional = true;
            }
        });

        return changes;
    }, [formData.wards]);

    // เพิ่มฟังก์ชันตรวจสอบการเปลี่ยนแปลง
    const checkFormChanges = useCallback(() => {
        const changes = hasDataChanges(formData);
        return changes.staff || changes.movement || changes.additional;
    }, [formData]);

    // ตรวจจับการเปลี่ยนแปลงของฟอร์ม
    useEffect(() => {
        const hasChanges = checkFormChanges();
        setHasUnsavedChanges(hasChanges);
    }, [formData, checkFormChanges]);

    // เพิ่ม event listener สำหรับ beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // เพิ่มการตรวจสอบการนำทาง
    useEffect(() => {
        const handleRouteChange = async () => {
            if (hasUnsavedChanges) {
                const result = await Swal.fire({
                    title: 'แจ้งเตือนการออกจากหน้าบันทึกข้อมูล',
                    html: `
                        <div class="text-left">
                            <p class="font-semibold">ท่านกำลังดำเนินการบันทึกข้อมูลอยู่</p>
                            <div class="mt-4 space-y-2">
                                <p class="text-gray-600">การออกจากหน้านี้จะส่งผลให้:</p>
                                <ul class="list-disc pl-5 text-sm text-gray-600">
                                    <li>ข้อมูลที่กำลังบันทึกจะถูกรีเซ็ตทั้งหมด</li>
                                    <li>ท่านจะต้องเริ่มกรอกข้อมูลใหม่เมื่อกลับมาที่หน้านี้</li>
                                </ul>
                            </div>
                            <p class="mt-4 text-sm font-medium text-gray-700">โปรดยืนยันการดำเนินการ</p>
                        </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'ยืนยันการออกจากหน้านี้',
                    cancelButtonText: 'ยกเลิกและกลับไปบันทึกข้อมูล',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#0ab4ab',
                    reverseButtons: true
                });

                if (!result.isConfirmed) {
                    throw 'Route Cancelled';
                }
            }
        };

        // Add router event listeners
        router.events?.on('routeChangeStart', handleRouteChange);
        return () => {
            router.events?.off('routeChangeStart', handleRouteChange);
        };
    }, [hasUnsavedChanges, router]);

    // แก้ไข validateFormData
    const validateFormData = useCallback(async () => {
        console.log('Validating form data...', formData);

        // ตรวจสอบวันก่อนหน้า
        const currentDate = new Date(formData.date);
        const previousDate = new Date(currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const formattedPreviousDate = previousDate.toISOString().split('T')[0];
        
        // ตรวจสอบการบันทึกกะของวันก่อนหน้า
        const previousDateShifts = await checkDateHasCompletedShifts(formattedPreviousDate);
        
        if (!previousDateShifts.hasNightShift && previousDateShifts.hasMorningShift) {
            await Swal.fire({
                title: 'ไม่สามารถบันทึกข้อมูลได้',
                html: `วันที่ ${formatThaiDate(previousDate)} ยังไม่ได้บันทึกข้อมูลกะดึก<br>กรุณาบันทึกข้อมูลกะดึกของวันที่ ${formatThaiDate(previousDate)} ก่อน`,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return false;
        }

        const validationChecks = [
            {
                condition: !formData.date || formData.date.trim() === '',
                message: 'กรุณาเลือกวันที่ก่อนดำเนินการต่อ'
            },
            {
                condition: !formData.shift || formData.shift.trim() === '',
                message: 'กรุณาเลือกกะการทำงาน'
            },
            {
                condition: isFutureDateMoreThanOneDay(),
                message: 'ไม่สามารถบันทึกข้อมูลล่วงหน้าเกิน 1 วันได้'
            },
            {
                condition: formData.shift === '19:00-07:00' && !hasExistingMorningShift,
                message: 'ไม่สามารถบันทึกข้อมูลกะดึกได้ เนื่องจากยังไม่มีการบันทึกข้อมูลกะเช้าก่อน'
            },
            {
                condition: !summaryData.supervisorFirstName?.trim() || !summaryData.supervisorLastName?.trim(),
                message: 'กรุณากรอกชื่อและนามสกุลผู้ตรวจการ'
            }
        ];

        for (const check of validationChecks) {
            if (check.condition) {
                console.log('Validation failed:', check.message);
                if (check.message) alert(check.message);
                return false;
            }
        }

        return true;
    }, [formData, summaryData, isFutureDateMoreThanOneDay, hasExistingMorningShift]);

    const resetForm = () => {
        Swal.fire({
            title: 'ล้างข้อมูล?',
            text: 'คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, ล้างข้อมูล',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                // Reset specific fields while keeping Patient Census and Overall Data
                setFormData(prev => {
                    const resetWards = {};
                    Object.entries(prev.wards).forEach(([ward, data]) => {
                        resetWards[ward] = {
                            ...data,
                            nurseManager: '0',
                            RN: '0',
                            PN: '0',
                            WC: '0',
                            newAdmit: '0',
                            transferIn: '0',
                            referIn: '0',
                            transferOut: '0',
                            referOut: '0',
                            discharge: '0',
                            dead: '0',
                            availableBeds: '0',
                            unavailable: '0',
                            plannedDischarge: '0',
                            comment: ''
                        };
                    });

                    return {
                        ...prev,
                        wards: resetWards
                    };
                });

                // Reset summary data
        setSummaryData({
            opdTotal24hr: '',
            existingPatients: '',
            newPatients: '',
            admissions24hr: '',
            supervisorFirstName: '',
            supervisorLastName: ''
        });

                setHasUnsavedChanges(false); // รีเซ็ตสถานะหลังล้างข้อมูล

                Swal.fire({
                    title: 'ล้างข้อมูลสำเร็จ',
                    text: 'กรุณาเลือกวันที่อีกครั้ง หรือตรวจสอบข้อมูลโดยรวมในหน้า Dashboard',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        });
    };

    // เพิ่มฟังก์ชันใหม่สำหรับตรวจสอบข้อมูลซ้ำเมื่อเลือกวันที่
    const checkExistingData = async (date, shift) => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const q = query(
                recordsRef,
                where('date', '==', date),
                where('shift', '==', shift)
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                await Swal.fire({
                    title: 'แจ้งเตือน',
                    html: `มีข้อมูลของวันที่ ${formatThaiDate(date)} กะ ${shift} ในระบบแล้ว<br><br>หากต้องการแก้ไขข้อมูล กรุณาดำเนินการบันทึกข้อมูลใหม่`,
                    icon: 'info',
                    confirmButtonColor: '#0ab4ab'
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking existing data:', error);
            return false;
        }
    };

    const saveData = async (overwrite = false) => {
        setLoadingStates(prev => ({ ...prev, savingData: true }));
        setLoadingMessage('กำลังบันทึกข้อมูล...');

        try {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '');

            const formattedDate = formData.date.replace(/-/g, '');
            const docId = overwrite && existingData
                ? existingData.id
                : `data_${formattedTime}_${formattedDate}`;

            console.log('Saving data with ID:', docId);

            // Sanitize data before saving
            const sanitizedData = {
                date: formData.date,
                shift: formData.shift,
                wards: Object.fromEntries(
                    Object.entries(formData.wards).map(([wardName, wardData]) => [
                        wardName,
                        {
                            numberOfPatients: wardData.numberOfPatients || '0',       // Patient Census
                            nurseManager: wardData.nurseManager || '0',               // Nurse Manager
                            RN: wardData.RN || '0',                                  // RN
                            PN: wardData.PN || '0',                                  // PN
                            WC: wardData.WC || '0',                                  // WC
                            newAdmit: wardData.newAdmit || '0',                      // New Admit
                            transferIn: wardData.transferIn || '0',                   // Transfer In
                            referIn: wardData.referIn || '0',                        // Refer In
                            transferOut: wardData.transferOut || '0',                 // Transfer Out
                            referOut: wardData.referOut || '0',                      // Refer Out
                            discharge: wardData.discharge || '0',                     // Discharge
                            dead: wardData.dead || '0',                              // Dead
                            overallData: wardData.overallData || '0',                // Overall Data
                            availableBeds: wardData.availableBeds || '0',            // Available Beds
                            plannedDischarge: wardData.plannedDischarge || '0',      // Plan D/C
                            unavailable: wardData.unavailable || '0',                 // Unavailable
                            comment: wardData.comment || ''                          // Comment
                        }
                    ])
                ),
                summaryData: {
                    opdTotal24hr: summaryData.opdTotal24hr || '',
                    existingPatients: summaryData.existingPatients || '',
                    newPatients: summaryData.newPatients || '',
                    admissions24hr: summaryData.admissions24hr || '',
                    supervisorFirstName: summaryData.supervisorFirstName || '',
                    supervisorLastName: summaryData.supervisorLastName || ''
                },
                timestamp: serverTimestamp(),
                lastModified: serverTimestamp()
            };

            console.log('Saving sanitized data:', sanitizedData);
            await setDoc(doc(db, 'staffRecords', docId), sanitizedData);

            // Also create/update wardDailyRecords for each ward with pending approval status
            const wardDailyPromises = Object.entries(formData.wards).map(async ([wardId, wardData]) => {
                if (Object.values(wardData).some(value => value !== '0' && value !== '')) {
                    const wardDailyRef = doc(db, 'wardDailyRecords', `${formData.date}_${wardId}`);
                    
                    try {
                        await setDoc(wardDailyRef, {
                            wardId,
                            date: formData.date,
                            patientCensus: wardData.numberOfPatients || '0',
                            overallData: wardData.overallData || '0',
                            approvalStatus: 'pending',
                            lastUpdated: serverTimestamp(),
                            shifts: {
                                [formData.shift]: {
                                    nurseManager: wardData.nurseManager || '0',
                                    RN: wardData.RN || '0',
                                    PN: wardData.PN || '0',
                                    WC: wardData.WC || '0',
                                    newAdmit: wardData.newAdmit || '0',
                                    transferIn: wardData.transferIn || '0',
                                    referIn: wardData.referIn || '0',
                                    transferOut: wardData.transferOut || '0',
                                    referOut: wardData.referOut || '0',
                                    discharge: wardData.discharge || '0',
                                    dead: wardData.dead || '0',
                                    availableBeds: wardData.availableBeds || '0',
                                    unavailable: wardData.unavailable || '0',
                                    plannedDischarge: wardData.plannedDischarge || '0',
                                    comment: wardData.comment || ''
                                }
                            }
                        }, { merge: true });
                    } catch (error) {
                        console.error(`Error saving wardDailyRecord for ${wardId}:`, error);
                    }
                }
            });
            
            await Promise.all(wardDailyPromises);
            
            // Update approval statuses
            await fetchApprovalStatuses(formData.date);

            setLoadingMessage('บันทึกข้อมูลสำเร็จ กำลังรีเซ็ตฟอร์ม...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Data saved successfully');
            resetForm();
            Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            }).then(() => {
                window.location.reload();
            });
        } catch (error) {
            console.error('Error saving data:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setLoadingStates(prev => ({
                ...prev,
                savingData: false,
                checkingDuplicates: false
            }));
            setLoadingMessage('');
            setShowDataComparison(false);
        }
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูลวันที่มีการบันทึก
    const fetchDatesWithData = async () => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const endOfYear = new Date(new Date().getFullYear(), 11, 31);

            const yearQuery = query(recordsRef,
                where('date', '>=', getUTCDateString(startOfYear)),
                where('date', '<=', getUTCDateString(endOfYear))
            );

            const yearSnapshot = await getDocs(yearQuery);
            
            // Create a map to store dates and their shifts
            const dateShiftMap = {};
            yearSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!dateShiftMap[data.date]) {
                    dateShiftMap[data.date] = new Set();
                }
                dateShiftMap[data.date].add(data.shift);
            });

            // Convert to array with shift information
            const datesWithDataInYear = Object.entries(dateShiftMap).map(([date, shifts]) => ({
                date,
                shifts: Array.from(shifts),
                isComplete: shifts.size === 2 // true if both shifts are recorded
            }));

            setDatesWithData(datesWithDataInYear);
        } catch (error) {
            console.error('Error fetching dates with data:', error);
            setDatesWithData([]);
        }
    };

    // เพิ่ม useEffect เพื่อดึงข้อมูลเมื่อ component โหลด
    useEffect(() => {
        fetchDatesWithData();
    }, []);

    // เพิ่ม cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup resources when component unmounts
            setIsInitialLoading(false);
            setIsLoading(false);
            setShowCalendar(false);
        };
    }, []);

    // Update the handleShiftChange function
    const handleShiftChange = (shift) => {
        setFormData(prev => ({ ...prev, shift }));
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูล Overall Data จากกะก่อนหน้า
    const fetchPreviousShiftData = async (selectedDate, selectedShift) => {
        try {
            setLoadingMessage('กำลังดึงข้อมูลจากระบบ');
            const wardDailyRef = collection(db, 'wardDailyRecords');
            let queryDate = new Date(selectedDate);
            let queryShift = '';

            // กำหนดวันที่และกะที่จะค้นหา
            if (selectedShift === '19:00-07:00') {
                // ถ้าเป็นกะดึก ให้ดึงข้อมูลจากกะเช้าของวันเดียวกัน
                queryShift = '07:00-19:00';
                setLoadingMessage(`กำลังดึงข้อมูลจากกะเช้า-บ่าย (${queryShift})`);
            } else {
                // ถ้าเป็นกะเช้า ให้ดึงข้อมูลจากกะดึกของวันก่อนหน้า
                queryDate.setDate(queryDate.getDate() - 1);
                queryShift = '19:00-07:00';
                setLoadingMessage(`กำลังดึงข้อมูลจากกะดึกของวันก่อนหน้า (${queryShift})`);
            }

            const formattedQueryDate = getUTCDateString(queryDate);
            const thaiQueryDate = formatThaiDate(queryDate).replace('เพิ่มข้อมูล วันที่: ', '');

            setLoadingMessage(`กำลังดึงข้อมูล Overall Data\nจากวันที่ ${thaiQueryDate}\nกะ ${queryShift}`);

            // ดึงข้อมูลจาก wardDailyRecords
            const q = query(
                wardDailyRef,
                where('date', '==', formattedQueryDate)
            );

            const querySnapshot = await getDocs(q);
            const updatedWards = { ...formData.wards };

            if (!querySnapshot.empty) {
                // Process each ward's data
                querySnapshot.docs.forEach(doc => {
                    const wardData = doc.data();
                    const wardId = wardData.wardId;
                    
                    if (wardData.shifts && wardData.shifts[queryShift]) {
                        const shiftData = wardData.shifts[queryShift];
                        
                        // Update ward data with previous shift's data
                        updatedWards[wardId] = {
                            ...formData.wards[wardId],
                            numberOfPatients: wardData.overallData || '0',
                            overallData: wardData.overallData || '0'
                        };
                    }
                });

                setFormData(prev => ({
                    ...prev,
                    wards: updatedWards
                }));

                setLoadingMessage(`ดึงข้อมูลสำเร็จ\nจากวันที่ ${thaiQueryDate}\nกะ ${queryShift}`);
                setTimeout(() => setLoadingMessage(''), 2000);
            } else {
                // ถ้าไม่พบข้อมูลกะก่อนหน้า ให้ค้นหาข้อมูลล่าสุด
                setLoadingMessage('กำลังค้นหาข้อมูลล่าสุด...');
                
                const latestDataQuery = query(
                    wardDailyRef,
                    where('date', '<=', formattedQueryDate),
                    orderBy('date', 'desc'),
                    limit(1)
                );

                const latestSnapshot = await getDocs(latestDataQuery);
                if (!latestSnapshot.empty) {
                    const latestData = latestSnapshot.docs[0].data();
                    const latestDate = formatThaiDate(new Date(latestData.date)).replace('เพิ่มข้อมูล วันที่: ', '');

                    setLoadingMessage(`พบข้อมูลล่าสุดจาก\nวันที่ ${latestDate}`);

                    // Update all wards with the latest data
                    Object.keys(formData.wards).forEach(wardId => {
                        const wardLatestData = querySnapshot.docs.find(doc => doc.data().wardId === wardId)?.data();
                        if (wardLatestData) {
                            updatedWards[wardId] = {
                                ...formData.wards[wardId],
                                numberOfPatients: wardLatestData.overallData || '0',
                                overallData: wardLatestData.overallData || '0'
                            };
                        }
                    });

                    setFormData(prev => ({
                        ...prev,
                        wards: updatedWards
                    }));

                    setTimeout(() => setLoadingMessage(''), 2000);
                } else {
                    setLoadingMessage('ไม่พบข้อมูลก่อนหน้า');
                    setTimeout(() => setLoadingMessage(''), 2000);
                }
            }
        } catch (error) {
            console.error('Error fetching previous shift data:', error);
            setLoadingMessage(`เกิดข้อผิดพลาด: ${error.message}`);
            setTimeout(() => setLoadingMessage(''), 3000);
        }
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูลล่าสุด
    const fetchLatestData = async () => {
        try {
            // เก็บ reference ของ loading alert
            const loadingAlert = Swal.fire({
                title: 'กำลังโหลดข้อมูล...',
                text: 'กรุณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const recordsRef = collection(db, 'staffRecords');
            const latestDataQuery = query(
                recordsRef,
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            const latestSnapshot = await getDocs(latestDataQuery);
            
            // ปิด loading alert ก่อนแสดง alert อื่น
            Swal.close();
            
            if (!latestSnapshot.empty) {
                const latestData = latestSnapshot.docs[0].data();
                const latestDate = formatThaiDate(new Date(latestData.date));

                Swal.fire({
                    title: 'โหลดข้อมูลสำเร็จ',
                    text: `ดึงข้อมูลล่าสุดจากวันที่ ${latestDate} กะ ${latestData.shift}`,
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });

                // อัพเดทข้อมูลทุก ward
                const updatedWards = {};
                Object.entries(latestData.wards || {}).forEach(([wardName, wardData]) => {
                    updatedWards[wardName] = {
                        ...initialWardData, // ใช้ค่าเริ่มต้นเป็นพื้นฐาน
                        ...wardData, // อัพเดทด้วยข้อมูลจาก Firebase
                        // แปลงค่าเป็น string และกำหนดค่าเริ่มต้นเป็น '0' ถ้าไม่มีข้อมูล
                        numberOfPatients: (wardData?.numberOfPatients || '0').toString(),
                        nurseManager: (wardData?.nurseManager || '0').toString(),
                        RN: (wardData?.RN || '0').toString(),
                        PN: (wardData?.PN || '0').toString(),
                        WC: (wardData?.WC || '0').toString(),
                        newAdmit: (wardData?.newAdmit || '0').toString(),
                        transferIn: (wardData?.transferIn || '0').toString(),
                        referIn: (wardData?.referIn || '0').toString(),
                        transferOut: (wardData?.transferOut || '0').toString(),
                        referOut: (wardData?.referOut || '0').toString(),
                        discharge: (wardData?.discharge || '0').toString(),
                        dead: (wardData?.dead || '0').toString(),
                        overallData: (wardData?.overallData || '0').toString(),
                        availableBeds: (wardData?.availableBeds || '0').toString(),
                        unavailable: (wardData?.unavailable || '0').toString(),
                        plannedDischarge: (wardData?.plannedDischarge || '0').toString(),
                        comment: wardData?.comment || ''
                    };
                });

                // อัพเดท formData
                setFormData(prev => ({
                    ...prev,
                    date: latestData.date || new Date().toISOString().split('T')[0],
                    shift: latestData.shift || '',
                    wards: {
                        ...prev.wards,
                        ...updatedWards
                    }
                }));

                // อัพเดท summaryData
                if (latestData.summaryData) {
                    setSummaryData(prev => ({
                        ...prev,
                        opdTotal24hr: latestData.summaryData.opdTotal24hr || '',
                        existingPatients: latestData.summaryData.existingPatients || '',
                        newPatients: latestData.summaryData.newPatients || '',
                        admissions24hr: latestData.summaryData.admissions24hr || '',
                        supervisorFirstName: latestData.summaryData.supervisorFirstName || '',
                        supervisorLastName: latestData.summaryData.supervisorLastName || ''
                    }));
                }

                // อัพเดทวันที่และการแสดงผล
                const dateObj = new Date(latestData.date);
                setSelectedDate(dateObj);
                setThaiDate(formatThaiDate(dateObj));

                console.log('Data loaded successfully:', updatedWards);
            } else {
                console.log('No data found');
                // แสดง alert ไม่พบข้อมูลหลังจากปิด loading alert แล้ว
                Swal.fire({
                    title: 'ไม่พบข้อมูล',
                    text: 'ไม่พบข้อมูลการบันทึกล่าสุด',
                    icon: 'info',
                    confirmButtonColor: '#0ab4ab'
                });
            }

        } catch (error) {
            console.error('Error fetching latest data:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message,
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setTimeout(() => {
                setLoadingMessage('');
            }, 2000);
        }
    };

    // ปรับปรุงฟังก์ชันตรวจสอบการเปลี่ยนแปลง
    const hasFormChanges = useCallback(() => {
        // ตรวจสอบการเปลี่ยนแปลงใน wards
        const hasWardChanges = Object.values(formData.wards).some(ward => {
        return (
                ward.nurseManager !== '0' ||
                ward.RN !== '0' ||
                ward.PN !== '0' ||
                ward.WC !== '0' ||
                ward.newAdmit !== '0' ||
                ward.transferIn !== '0' ||
                ward.referIn !== '0' ||
                ward.transferOut !== '0' ||
                ward.referOut !== '0' ||
                ward.discharge !== '0' ||
                ward.dead !== '0' ||
                ward.availableBeds !== '0' ||
                ward.unavailable !== '0' ||
                ward.plannedDischarge !== '0' ||
                ward.comment.trim() !== ''
            );
        });

        // ตรวจสอบการเปลี่ยนแปลงใน summaryData
        const hasSummaryChanges = 
            summaryData.opdTotal24hr !== '' ||
            summaryData.existingPatients !== '' ||
            summaryData.newPatients !== '' ||
            summaryData.admissions24hr !== '' ||
            summaryData.supervisorFirstName !== '' ||
            summaryData.supervisorLastName !== '';

        return hasWardChanges || hasSummaryChanges;
    }, [formData.wards, summaryData]);

    // อัพเดท useEffect สำหรับตรวจจับการเปลี่ยนแปลง
    useEffect(() => {
        setHasUnsavedChanges(hasFormChanges());
    }, [formData, summaryData, hasFormChanges]);

    // ปรับปรุงฟังก์ชัน handleDashboardClick
    const handleDashboardClick = async () => {
        if (hasUnsavedChanges) {
            const result = await Swal.fire({
                title: 'แจ้งเตือนการเปลี่ยนหน้า',
                html: `
                    <div class="text-left">
                        <p class="font-semibold text-red-600">ข้อควรระวัง: พบข้อมูลที่ยังไม่ได้บันทึก</p>
                        <div class="mt-4 space-y-2">
                            <p class="text-gray-700">การเปลี่ยนไปยังหน้า Dashboard จะส่งผลดังนี้:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li class="text-gray-600">ข้อมูลที่ท่านกรอกจะไม่ถูกบันทึก</li>
                                <li class="text-gray-600">ข้อมูลทั้งหมดในแบบฟอร์มจะถูกรีเซ็ต</li>
                                <li class="text-gray-600">ท่านจะต้องเริ่มกรอกข้อมูลใหม่เมื่อกลับมายังหน้านี้</li>
                            </ul>
                            <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-700">
                                    <span class="font-medium">คำแนะนำ:</span> กรุณาบันทึกข้อมูลให้เรียบร้อยก่อนออกจากหน้านี้
                                </p>
                                        </div>
                                        </div>
                                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันการเปลี่ยนหน้า',
                cancelButtonText: 'ยกเลิกและกลับไปบันทึกข้อมูล',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#0ab4ab',
                reverseButtons: true
            });

            if (result.isConfirmed) {
                router.push('/dashboard');
            }
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="w-full px-2 py-2">
            {/* Mobile Warning Popup */}
            {showMobileWarning && (
                <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0ab4ab]/95 to-blue-600/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
                        <img src="/images/BPK.jpg" alt="BPK Logo" className="w-24 h-24 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-2xl font-bold text-[#0ab4ab]">แจ้งเตือนการใช้งาน</h2>
                        <div className="space-y-3 text-gray-600">
                            <p className="font-medium">ระบบอยู่ระหว่างการพัฒนาสำหรับอุปกรณ์มือถือ</p>
                            <div className="bg-yellow-50 p-4 rounded-xl">
                                <p className="text-sm">เพื่อประสิทธิภาพในการใช้งานสูงสุด กรุณาใช้งานผ่าน:</p>
                                <ul className="text-sm mt-2 space-y-1">
                                    <li>• คอมพิวเตอร์ตั้งโต๊ะ (Desktop)</li>
                                    <li>• คอมพิวเตอร์พกพา (Laptop)</li>
                                </ul>
                            </div>
                            <p className="text-xs text-gray-500">หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full mx-auto">
                {isInitialLoading && (
                    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                        <div className="text-center">
                            <img src="/images/BPK.jpg" alt="BPK Loading" className="w-32 h-32 mx-auto mb-4 animate-pulse" />
                            <p className="text-gray-600">กำลังโหลด...</p>
                        </div>
                    </div>
                )}

                <DataComparisonModal
                    showDataComparison={showDataComparison}
                    existingData={existingData}
                    formData={formData}
                    summaryData={summaryData}
                    setShowDataComparison={setShowDataComparison}
                    saveData={saveData}
                    WARD_ORDER={WARD_ORDER}
                />

                <CalendarSection 
                    showCalendar={showCalendar}
                    setShowCalendar={setShowCalendar}
                                selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    formData={formData}
                    setFormData={setFormData}
                    thaiDate={thaiDate}
                    setThaiDate={setThaiDate}
                    fetchPreviousShiftData={fetchPreviousShiftData}
                    handleShiftChange={handleShiftChange}
                                datesWithData={datesWithData}
                    checkExistingData={checkExistingData}
                    setSummaryData={setSummaryData}
                            />

                {/* Desktop View */}
                <div className="hidden md:block w-full">
                    {/* Main Container Box */}
                    <div className="w-full mx-auto p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="bg-gradient-to-r from-pink-400/20 to-white p-2 rounded-lg">
                            <h2 className="text-lg font-bold text-pink-600 text-center mb-1">Form</h2>
                        </div>
                        <DataTable
                            WARD_ORDER={displayWards}
                            formData={formData}
                            handleInputChange={handleInputChange}
                            displayValue={displayValue}
                            approvalStatuses={approvalStatuses}
                            selectedDate={selectedDate}
                            readOnly={user?.role?.toLowerCase() === 'user'}
                        />
                    </div>
                </div>

                {/* Summary Data and Signature Section - Desktop */}
                <div className="hidden md:block mt-8">
                    <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-white rounded-xl shadow-lg p-6">
                        <SummarySection 
                            summaryData={summaryData}
                            setSummaryData={setSummaryData}
                        />
                        <SignatureSection 
                            summaryData={summaryData}
                            setSummaryData={setSummaryData}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-center p-6 bg-gradient-to-r from-[#0ab4ab]/10 to-white rounded-xl shadow-lg">
                    {user?.role?.toLowerCase() === 'user' ? (
                        <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
                            <div className="text-gray-700 font-medium mb-2">โหมดดูข้อมูลเท่านั้น</div>
                            <p className="text-sm text-gray-500">คุณสามารถดูข้อมูลได้ แต่ไม่สามารถแก้ไขหรือบันทึกข้อมูลได้</p>
                            <p className="text-sm text-gray-500 mt-1">ข้อมูลที่แสดงเฉพาะ ward ของคุณเท่านั้น</p>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={isLoading || isReadOnly}
                            className="px-12 py-4 bg-gradient-to-r from-[#0ab4ab] to-blue-400 text-white text-lg font-bold rounded-xl shadow-lg hover:from-[#0ab4ab] hover:to-blue-500 transition-all transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 font-THSarabun"
                        >
                            {isLoading ? 'Saving...' : (isReadOnly ? 'View Only Mode' : 'Save Data')}
                        </button>
                    )}
                </div>

                <button
                    onClick={handleDashboardClick}
                    className="px-4 py-2 rounded-lg text-white hover:bg-[#0ab4ab]/80"
                >
                    Dashboard
                </button>
            </form>
        </div>
    );
};

export default ShiftForm;
