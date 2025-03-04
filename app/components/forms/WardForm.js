'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit } from 'firebase/firestore';
import LoadingScreen from '../ui/LoadingScreen';
import Swal from 'sweetalert2';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import CalendarSection from '../common/CalendarSection';
import ShiftSelection from '../common/ShiftSelection';
import { useAuth } from '../../context/AuthContext';

const WardForm = ({ wardId }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWard, setSelectedWard] = useState(wardId || '');
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
        overallData: '0',
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
        comment: '',
        total: '0'
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

    // เพิ่มฟังก์ชันเช็คการเปลี่ยนแปลง
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
        if (selectedWard) {
            fetchWardData();
        }
    }, [selectedWard]);

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

    // คำนวณยอดรวม Total ใหม่เมื่อมีการเปลี่ยนแปลงข้อมูลที่เกี่ยวข้อง
    useEffect(() => {
        const total = calculateTotal();
        setFormData(prev => ({
            ...prev,
            total: total.toString(),
            overallData: total.toString()  // อัพเดท overallData ด้วย
        }));
    }, [formData.patientCensus, formData.newAdmit, formData.transferIn, formData.referIn, 
        formData.transferOut, formData.referOut, formData.discharge, formData.dead]);

    const fetchDatesWithData = async () => {
        try {
            const wardRef = collection(db, 'wardDailyRecords');
            // Pull data for current year
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);
            
            const q = query(
                wardRef,
                where('date', '>=', getUTCDateString(startOfYear)),
                where('date', '<=', getUTCDateString(endOfYear))
            );
            
            const querySnapshot = await getDocs(q);
            const dateMap = new Map();
            
            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data.date) return;
                
                const dateStr = data.date;
                const shifts = data.shifts || {};
                
                if (!dateMap.has(dateStr)) {
                    dateMap.set(dateStr, { 
                        shifts: new Set(),
                        wards: new Set()
                    });
                }
                
                // เก็บข้อมูลกะและวอร์ด
                Object.keys(shifts).forEach(shift => {
                    dateMap.get(dateStr).shifts.add(shift);
                });
                dateMap.get(dateStr).wards.add(data.wardId);
            });
            
            const datesWithDataArray = Array.from(dateMap.entries()).map(([date, data]) => ({
                date,
                isComplete: data.shifts.size >= 2,
                shifts: Array.from(data.shifts),
                wards: Array.from(data.wards),
                hasData: true
            }));
            
            setDatesWithData(datesWithDataArray);
            console.log('Dates with data:', datesWithDataArray);
        } catch (error) {
            console.error('Error fetching dates with data:', error);
            setDatesWithData([]);
        }
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูล Patient Census จากกะก่อนหน้า
    const fetchPreviousShiftData = async (date, targetWard) => {
        if (!targetWard) return;
        
        try {
            setIsLoading(true);
            
            // ค้นหาข้อมูลกะก่อนหน้า
            const wardDailyRef = collection(db, 'wardDailyRecords');
            let queryDate = new Date(date);
            let queryShift = '';

            // กำหนดวันที่และกะที่จะค้นหา
            if (selectedShift === '19:00-07:00') {
                // ถ้าเป็นกะดึก ให้ดึงข้อมูลจากกะเช้าของวันเดียวกัน
                queryShift = '07:00-19:00';
            } else {
                // ถ้าเป็นกะเช้า ให้ดึงข้อมูลจากกะดึกของวันก่อนหน้า
                queryDate.setDate(queryDate.getDate() - 1);
                queryShift = '19:00-07:00';
            }

            const formattedQueryDate = getUTCDateString(queryDate);
            
            // ดึงข้อมูลจาก wardDailyRecords
            const q = query(
                wardDailyRef,
                where('date', '==', formattedQueryDate),
                where('wardId', '==', targetWard)
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const wardData = querySnapshot.docs[0].data();
                
                if (wardData.shifts && wardData.shifts[queryShift]) {
                    const shiftData = wardData.shifts[queryShift];
                    
                    // นำข้อมูล Patient Census และ Overall Data มาใช้
                    setPreviousShiftData({
                        patientCensus: wardData.overallData || '0',
                        overallData: wardData.overallData || '0',
                        date: formattedQueryDate,
                        shift: queryShift
                    });
                    
                    // อัพเดทฟอร์ม
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: wardData.overallData || '0',
                        overallData: wardData.overallData || '0'
                    }));
                    
                    return {
                        success: true,
                        data: {
                            patientCensus: wardData.overallData || '0',
                            overallData: wardData.overallData || '0'
                        }
                    };
                }
            }
            
            // วิธีแก้ไขชั่วคราว: ดึงข้อมูลทั้งหมดแล้วค่อยกรองและเรียงลำดับในโค้ด
            const simpleQuery = query(
                wardDailyRef,
                where('wardId', '==', targetWard)
            );

            const allRecords = await getDocs(simpleQuery);
            
            // กรองและเรียงลำดับข้อมูลในโค้ด JavaScript
            const filteredRecords = allRecords.docs
                .map(doc => ({id: doc.id, ...doc.data()}))
                .filter(record => record.date <= formattedQueryDate)
                .sort((a, b) => b.date.localeCompare(a.date)); // เรียงจากใหม่ไปเก่า
            
            const latestData = filteredRecords[0]; // เลือกข้อมูลล่าสุด
            
            if (latestData) {
                // นำข้อมูล Patient Census และ Overall Data ล่าสุดมาใช้
                setPreviousShiftData({
                    patientCensus: latestData.overallData || '0',
                    overallData: latestData.overallData || '0',
                    date: latestData.date,
                    shift: Object.keys(latestData.shifts || {})[0] || ''
                });
                
                // อัพเดทฟอร์ม
                setFormData(prev => ({
                    ...prev,
                    patientCensus: latestData.overallData || '0',
                    overallData: latestData.overallData || '0' 
                }));
                
                return {
                    success: true,
                    data: {
                        patientCensus: latestData.overallData || '0',
                        overallData: latestData.overallData || '0'
                    }
                };
            }
            
            // ถ้าไม่พบข้อมูลใดๆ ให้ใช้ค่าเริ่มต้น
            setPreviousShiftData(null);
            setFormData(prev => ({
                ...prev,
                patientCensus: '0',
                overallData: '0'
            }));
            
            return {
                success: false,
                message: 'ไม่พบข้อมูลก่อนหน้า'
            };
            
        } catch (error) {
            console.error('Error fetching previous shift data:', error);
            return {
                success: false,
                error
            };
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่ม state สำหรับเก็บข้อมูลจากหน้า Approval
    const [approvalData, setApprovalData] = useState(null);
    const [isUsingApprovalData, setIsUsingApprovalData] = useState(false);

    // เพิ่มฟังก์ชันดึงข้อมูลจากหน้า Approval
    const fetchApprovalData = async () => {
        try {
            setIsLoading(true);
            
            // แสดง loading message
            Swal.fire({
                title: 'กำลังโหลดข้อมูลจากระบบ Approval',
                text: 'กรุณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // ดึงข้อมูลจาก staffRecords (ที่ใช้ในหน้า Approval)
            const staffRecordsRef = collection(db, 'staffRecords');
            const q = query(
                staffRecordsRef,
                where('date', '==', getUTCDateString(selectedDate))
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // เราพบข้อมูลในระบบ staffRecords
                const docData = querySnapshot.docs[0].data();
                
                // ตรวจสอบว่ามีข้อมูลของ ward ที่เลือกหรือไม่
                if (docData.wards && docData.wards[selectedWard]) {
                    const wardData = docData.wards[selectedWard];
                    
                    // นำข้อมูลจาก approval มาเก็บไว้ใน state
                    setApprovalData(wardData);
                    setIsUsingApprovalData(true);
                    
                    // อัพเดทฟอร์มด้วยข้อมูลจาก approval
                    setFormData(prev => ({
                        ...prev,
                        patientCensus: wardData.numberOfPatients || '0',
                        overallData: wardData.overallData || '0',
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
                        comment: wardData.comment || '',
                        total: wardData.overallData || '0'
                    }));
                    
                    await Swal.fire({
                        title: 'ดึงข้อมูลสำเร็จ',
                        html: `
                            <div class="text-left">
                                <p class="mb-2 font-medium">ดึงข้อมูลจากระบบ Approval สำเร็จ</p>
                                <p class="text-sm text-gray-600">วันที่: ${formatThaiDate(selectedDate)}</p>
                                <p class="text-sm text-gray-600">Ward: ${selectedWard}</p>
                                <p class="text-sm text-gray-600">Patient Census: ${wardData.numberOfPatients || '0'}</p>
                                <p class="text-sm text-gray-600">Overall Data: ${wardData.overallData || '0'}</p>
                            </div>
                        `,
                        icon: 'success',
                        confirmButtonColor: '#0ab4ab'
                    });
                    
                    return true;
                }
            }
            
            // ถ้าไม่พบข้อมูลหรือมีข้อผิดพลาดระหว่างการดึงข้อมูล
            await Swal.fire({
                title: 'ไม่พบข้อมูล',
                text: `ไม่พบข้อมูลของ ${selectedWard} ในวันที่ ${formatThaiDate(selectedDate)} ในระบบ Approval`,
                icon: 'info',
                confirmButtonColor: '#0ab4ab'
            });
            
            return false;
        } catch (error) {
            console.error('Error fetching approval data:', error);
            
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดึงข้อมูลจากระบบ Approval ได้',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่ม function สำหรับแปลงค่า input
    const parseInputValue = (value) => {
        // ถ้า value เป็น null หรือ undefined ให้คืนค่า '0'
        if (value === null || value === undefined) return '0';
        // ถ้า value เป็น number ให้แปลงเป็น string
        if (typeof value === 'number') return value.toString();
        // ถ้าเป็น string อยู่แล้ว ให้คืนค่าเดิม
        if (typeof value === 'string') return value;
        // กรณีอื่นๆ ให้คืนค่า '0'
        return '0';
    };

    // ฟังก์ชันสำหรับตรวจสอบสถานะการ approve
    const checkApprovalStatus = async (date, targetWard) => {
        try {
            // ตรวจสอบว่ามีการบันทึกข้อมูลใน wardDailyRecords แล้วหรือไม่
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const wardQuery = query(
                wardDailyRef,
                where('wardId', '==', targetWard),
                where('date', '==', getUTCDateString(date))
            );
            
            const wardSnapshot = await getDocs(wardQuery);
            
            if (!wardSnapshot.empty) {
                const wardData = wardSnapshot.docs[0].data();
                
                // ตรวจสอบสถานะการอนุมัติ
                if (wardData.approvalStatus) {
                    setApprovalStatus(wardData.approvalStatus);
                } else {
                    setApprovalStatus('pending');
                }
            } else {
                setApprovalStatus(null);
            }
        } catch (error) {
            console.error('Error checking approval status:', error);
            setApprovalStatus(null);
        }
    };

    // เพิ่มฟังก์ชันใหม่สำหรับดึงข้อมูลล่าสุด
    const fetchLatestRecord = async () => {
        if (!selectedWard) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือก Ward ก่อน',
                text: 'โปรดเลือก Ward เพื่อดึงข้อมูลล่าสุด',
                confirmButtonColor: '#3D6CB9',
            });
            return;
        }

        try {
            setIsLoading(true);
            
            const wardRef = collection(db, 'wardDailyRecords');
            const q = query(
                wardRef,
                where('wardId', '==', selectedWard),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const latestData = querySnapshot.docs[0].data();
                const latestDate = latestData.date ? new Date(latestData.date) : new Date();
                
                setLatestRecordDate(latestDate);
                setSelectedDate(latestDate);
                setThaiDate(formatThaiDate(latestDate));
                
                // ดึงข้อมูลตามวันที่ล่าสุด
                await fetchWardData(latestDate);
                
                Swal.fire({
                    icon: 'success',
                    title: 'ดึงข้อมูลล่าสุดสำเร็จ',
                    text: `ข้อมูลล่าสุดวันที่ ${formatThaiDate(latestDate)}`,
                    confirmButtonColor: '#3D6CB9',
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'ไม่พบข้อมูล',
                    text: 'ไม่พบข้อมูลสำหรับ Ward นี้',
                    confirmButtonColor: '#3D6CB9',
                });
            }
        } catch (error) {
            console.error('Error fetching latest record:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดึงข้อมูลล่าสุดได้',
                confirmButtonColor: '#3D6CB9',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // แก้ไขฟังก์ชัน fetchWardData เพื่อรองรับการส่งวันที่เข้ามา
    const fetchWardData = async (date = selectedDate) => {
        try {
            // แสดง loading message
            Swal.fire({
                title: 'กำลังโหลดข้อมูล',
                text: `กำลังดึงข้อมูลของ ${selectedWard}`,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const result = await fetchPreviousShiftData(date, selectedWard);
            await checkApprovalStatus(date, selectedWard);

            // ดึงข้อมูลจาก wardDailyRecords
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const wardQuery = query(
                wardDailyRef,
                where('wardId', '==', selectedWard),
                where('date', '==', getUTCDateString(date))
            );

            const wardSnapshot = await getDocs(wardQuery);
            console.log('Query results:', wardSnapshot.size, 'documents found');
            
            if (!wardSnapshot.empty) {
                const wardData = wardSnapshot.docs[0].data();
                const shiftData = wardData.shifts?.[selectedShift] || {};

                // อัพเดทฟอร์มด้วยข้อมูลที่มีอยู่
                setFormData(prev => ({
                    ...prev,
                    patientCensus: parseInputValue(wardData.patientCensus || prev.patientCensus),
                    overallData: parseInputValue(wardData.overallData || prev.overallData),
                    nurseManager: parseInputValue(shiftData.nurseManager),
                    RN: parseInputValue(shiftData.RN),
                    PN: parseInputValue(shiftData.PN),
                    WC: parseInputValue(shiftData.WC),
                    newAdmit: parseInputValue(shiftData.newAdmit),
                    transferIn: parseInputValue(shiftData.transferIn),
                    referIn: parseInputValue(shiftData.referIn),
                    transferOut: parseInputValue(shiftData.transferOut),
                    referOut: parseInputValue(shiftData.referOut),
                    discharge: parseInputValue(shiftData.discharge),
                    dead: parseInputValue(shiftData.dead),
                    availableBeds: parseInputValue(shiftData.availableBeds),
                    unavailable: parseInputValue(shiftData.unavailable),
                    plannedDischarge: parseInputValue(shiftData.plannedDischarge),
                    comment: parseInputValue(shiftData.comment),
                    total: calculateTotal({
                        patientCensus: wardData.patientCensus || prev.patientCensus || '0',
                        newAdmit: shiftData.newAdmit || '0',
                        transferIn: shiftData.transferIn || '0',
                        referIn: shiftData.referIn || '0',
                        transferOut: shiftData.transferOut || '0',
                        referOut: shiftData.referOut || '0',
                        discharge: shiftData.discharge || '0',
                        dead: shiftData.dead || '0'
                    }).toString()
                }));

                await Swal.fire({
                    title: 'ดึงข้อมูลสำเร็จ',
                    html: `
                        <div class="text-left">
                            <p class="mb-2 font-medium">ข้อมูลของ ${selectedWard}</p>
                            <p class="text-sm text-gray-600">วันที่: ${formatThaiDate(date)}</p>
                            <p class="text-sm text-gray-600">Patient Census: ${wardData.patientCensus || '0'}</p>
                            <p class="text-sm text-gray-600">Overall Data: ${wardData.overallData || '0'}</p>
                            ${shiftData.nurseManager ? `
                                <div class="mt-2">
                                    <p class="text-sm font-medium">ข้อมูลบุคลากร</p>
                                    <p class="text-sm text-gray-600">Nurse Manager: ${shiftData.nurseManager}</p>
                                    <p class="text-sm text-gray-600">RN: ${shiftData.RN}</p>
                                    <p class="text-sm text-gray-600">PN: ${shiftData.PN}</p>
                                    <p class="text-sm text-gray-600">WC: ${shiftData.WC}</p>
                                </div>
                            ` : ''}
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });

                // กำหนดให้ไม่ใช้ข้อมูลจาก Approval
                setIsUsingApprovalData(false);
            } else {
                console.log('No data found in wardDailyRecords');
                
                // ใช้ข้อมูล Patient Census และ Overall Data จากกะก่อนหน้า
                const patientCensus = previousShiftData?.patientCensus || '0';
                const overallData = previousShiftData?.overallData || '0';
                
                // Reset the form with the data from previous shift
                setFormData(prev => ({
                    ...prev,
                    patientCensus: patientCensus,
                    overallData: overallData,
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
                    comment: '',
                    total: patientCensus
                }));
                
                // กำหนดให้ไม่ใช้ข้อมูลจาก Approval
                setIsUsingApprovalData(false);

                let infoMessage = `ไม่พบข้อมูลของ ${selectedWard} ในวันที่ ${formatThaiDate(date)}`;
                
                // หากมีข้อมูลจาก shift ก่อนหน้า ให้แสดงที่มา
                if (previousShiftData) {
                    const prevShiftDate = formatThaiDate(new Date(previousShiftData.date));
                    infoMessage += `<br><br>ข้อมูล Patient Census ล่าสุดถูกดึงมาจาก:<br>วันที่ ${prevShiftDate} กะ ${previousShiftData.shift}`;
                }
                
                // แสดงปุ่มให้เลือกดึงข้อมูลจาก Approval
                await Swal.fire({
                    title: 'ข้อมูลเริ่มต้น',
                    html: `
                        ${infoMessage}
                        <div class="mt-4 text-left">
                            <p class="text-sm text-gray-600">คุณสามารถดึงข้อมูลจากระบบ Approval ได้โดยคลิกที่ปุ่มด้านล่าง</p>
                        </div>
                    `,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'ดึงข้อมูลจากระบบ Approval',
                    cancelButtonText: 'ใช้ข้อมูลเริ่มต้น',
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#0ab4ab'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // ถ้าผู้ใช้เลือกที่จะดึงข้อมูลจาก Approval
                        fetchApprovalData();
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching ward data:', error);
            
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถดึงข้อมูลหอผู้ป่วยได้',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    // เพิ่มปุ่มสำหรับดึงข้อมูลจากระบบ Approval
    const ApprovalDataButton = () => {
        if (!selectedWard) return null;
        
        return (
            <div className="mt-4 flex flex-col items-center">
                <button
                    type="button"
                    onClick={fetchApprovalData}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md text-sm"
                >
                    ดึงข้อมูลจากระบบ Approval
                </button>
                <p className="text-xs text-gray-500 mt-1">ใช้เมื่อต้องการดึงข้อมูลบุคลากรจากระบบ Approval โดยตรง</p>
            </div>
        );
    };

    // เพิ่มปุ่มดึงข้อมูลล่าสุด
    const LatestRecordButton = () => {
        return (
            <div className="mb-4 flex justify-center">
                <button
                    type="button"
                    onClick={fetchLatestRecord}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 shadow-sm flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    ดึงข้อมูลล่าสุด
                </button>
            </div>
        );
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            let newValue = value;
            
            // แปลงค่าว่างเป็น 0 สำหรับฟิลด์ตัวเลข
            if (name !== 'comment' && value === '') {
                newValue = '0';
            }
            
            // สร้าง object ใหม่พร้อมค่าที่อัพเดท
            const updatedForm = {
                ...prev,
                [name]: newValue
            };
            
            // คำนวณ total และ overallData เมื่อมีการเปลี่ยนแปลงข้อมูลที่เกี่ยวข้อง
            if ([
                'patientCensus', 'newAdmit', 'transferIn', 'referIn',
                'transferOut', 'referOut', 'discharge', 'dead'
            ].includes(name)) {
                const total = calculateTotal(updatedForm);
                updatedForm.total = total.toString();
                updatedForm.overallData = total.toString();
            }
            
            return updatedForm;
        });
    };

    const handleShiftChange = (shift) => {
        setSelectedShift(shift);
    };

    // แก้ไขฟังก์ชัน handleDateSelect เพื่อตรวจสอบข้อมูลซ้ำ
    const handleDateSelect = async (date) => {
        try {
            const newDate = new Date(date);
            
            // ถ้ามีการเลือก ward แล้ว ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
            if (selectedWard) {
                // Check if data already exists for this date, ward, and shift
                const wardDailyRef = collection(db, 'wardDailyRecords');
                const dateStr = getUTCDateString(newDate);
                
                const q = query(
                    wardDailyRef,
                    where('date', '==', dateStr),
                    where('wardId', '==', selectedWard)
                );
                
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    // Find if there's data for the selected shift
                    const docData = querySnapshot.docs[0].data();
                    const hasDataForShift = docData.shifts && docData.shifts[selectedShift];
                    
                    if (hasDataForShift) {
                        // Show warning with more details about existing data
                        const result = await Swal.fire({
                            title: 'พบข้อมูลที่มีอยู่แล้ว',
                            html: `
                                <div class="text-left">
                                    <p class="mb-2">ข้อมูลของ <b>${selectedWard}</b> ในวันที่ <b>${formatThaiDate(newDate)}</b> กะ <b>${selectedShift}</b> มีอยู่ในระบบแล้ว</p>
                                    <p class="mb-4">คุณต้องการดำเนินการอย่างไร?</p>
                                    <ul class="list-disc pl-5 text-sm text-gray-600">
                                        <li>ดึงข้อมูลเดิม: จะโหลดข้อมูลที่บันทึกไว้ก่อนหน้า</li>
                                        <li>สร้างข้อมูลใหม่: จะล้างค่าทั้งหมดและให้กรอกใหม่</li>
                                        <li>ยกเลิก: จะยกเลิกการเปลี่ยนวันที่</li>
                                    </ul>
                                </div>
                            `,
                            icon: 'warning',
                            showDenyButton: true,
                            showCancelButton: true,
                            confirmButtonText: 'ดึงข้อมูลเดิม',
                            denyButtonText: 'สร้างข้อมูลใหม่',
                            cancelButtonText: 'ยกเลิก',
                            confirmButtonColor: '#0ab4ab',
                            denyButtonColor: '#3085d6',
                            cancelButtonColor: '#d33'
                        });
                        
                        if (result.isConfirmed) {
                            // Load existing data
                            setSelectedDate(newDate);
                            setThaiDate(formatThaiDate(newDate));
                            await fetchPreviousShiftData(newDate, selectedWard);
                            await fetchWardData();
                        } else if (result.isDenied) {
                            // Reset form and set new date
                            setSelectedDate(newDate);
                            setThaiDate(formatThaiDate(newDate));
                            setFormData({
                                patientCensus: '0',
                                overallData: '0',
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
                                comment: '',
                                total: '0'
                            });
                            // Still fetch previous shift data for Patient Census
                            await fetchPreviousShiftData(newDate, selectedWard);
                        } else {
                            // Cancel date change
                            return;
                        }
                    } else {
                        // No data for selected shift, proceed normally
                        setSelectedDate(newDate);
                        setThaiDate(formatThaiDate(newDate));
                        await fetchPreviousShiftData(newDate, selectedWard);
                        await fetchWardData();
                    }
                } else {
                    // No data for this date and ward, proceed normally
                    setSelectedDate(newDate);
                    setThaiDate(formatThaiDate(newDate));
                    await fetchPreviousShiftData(newDate, selectedWard);
                    await fetchWardData();
                }
            } else {
                // Just update the date if no ward is selected yet
                setSelectedDate(newDate);
                setThaiDate(formatThaiDate(newDate));
            }
            
            setShowCalendar(false);
        } catch (error) {
            console.error('Error in handleDateSelect:', error);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!selectedWard) {
                throw new Error('กรุณาเลือกวอร์ด');
            }

            if (!selectedDate) {
                throw new Error('กรุณาเลือกวันที่');
            }

            if (!selectedShift) {
                throw new Error('กรุณาเลือกกะการทำงาน');
            }

            // ตรวจสอบข้อมูลซ้ำ
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const q = query(
                wardDailyRef,
                where('wardId', '==', selectedWard),
                where('date', '==', getUTCDateString(selectedDate))
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const result = await Swal.fire({
                    title: 'พบข้อมูลซ้ำ',
                    html: `
                        <div class="text-left">
                            <p class="mb-2">พบข้อมูลของ ${selectedWard}</p>
                            <p class="mb-2">วันที่: ${formatThaiDate(selectedDate)}</p>
                            <p class="text-sm text-gray-600">ต้องการบันทึกทับข้อมูลเดิมหรือไม่?</p>
                        </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'บันทึกทับ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#0ab4ab',
                    cancelButtonColor: '#d33'
                });

                if (!result.isConfirmed) {
                    setIsLoading(false);
                    return;
                }
            }

            // คำนวณ Overall Data และ Total
            const totalValue = calculateTotal();
            const overallDataValue = totalValue.toString();

            // Get user info from authContext
            const username = user?.username || 'Unknown User';

            // เตรียมข้อมูลสำหรับบันทึก
            const wardData = {
                wardId: selectedWard,
                date: getUTCDateString(selectedDate),
                patientCensus: formData.patientCensus || '0',
                overallData: overallDataValue,
                lastUpdated: serverTimestamp(),
                approvalStatus: 'pending', // Mark as pending approval
                shifts: {
                    [selectedShift]: {
                        nurseManager: formData.nurseManager,
                        RN: formData.RN,
                        PN: formData.PN,
                        WC: formData.WC,
                        newAdmit: formData.newAdmit,
                        transferIn: formData.transferIn,
                        referIn: formData.referIn,
                        transferOut: formData.transferOut,
                        referOut: formData.referOut,
                        discharge: formData.discharge,
                        dead: formData.dead,
                        availableBeds: formData.availableBeds,
                        unavailable: formData.unavailable,
                        plannedDischarge: formData.plannedDischarge,
                        comment: formData.comment,
                        recorderName: username,
                        updatedAt: serverTimestamp()
                    }
                },
                // เพิ่มฟิลด์เพื่อระบุว่าข้อมูลนี้มาจากระบบ Approval
                sourceFromApproval: isUsingApprovalData,
                approvalDataId: approvalData?.id || null
            };

            // บันทึกหรืออัพเดทข้อมูล
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                const existingData = querySnapshot.docs[0].data();
                
                await updateDoc(docRef, {
                    patientCensus: formData.patientCensus || '0',
                    overallData: overallDataValue,
                    lastUpdated: serverTimestamp(),
                    approvalStatus: 'pending', // Mark as pending approval
                    shifts: {
                        ...existingData.shifts,
                        [selectedShift]: {
                            nurseManager: formData.nurseManager,
                            RN: formData.RN,
                            PN: formData.PN,
                            WC: formData.WC,
                            newAdmit: formData.newAdmit,
                            transferIn: formData.transferIn,
                            referIn: formData.referIn,
                            transferOut: formData.transferOut,
                            referOut: formData.referOut,
                            discharge: formData.discharge,
                            dead: formData.dead,
                            availableBeds: formData.availableBeds,
                            unavailable: formData.unavailable,
                            plannedDischarge: formData.plannedDischarge,
                            comment: formData.comment,
                            recorderName: username,
                            updatedAt: serverTimestamp()
                        }
                    }
                });
            } else {
                await addDoc(wardDailyRef, wardData);
            }

            setHasUnsavedChanges(false);
            setApprovalStatus('pending');

            await Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                html: `
                    <div>
                        <p>ข้อมูลถูกบันทึกเรียบร้อยแล้ว</p>
                        <p class="text-sm text-blue-600 mt-2">รอการ Approval จาก Supervisor</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });

            // Reset form fields but keep the current ward selected
            const currentWard = selectedWard;
            setPreviousShiftData(null);
            setFormData({
                patientCensus: '0',
                overallData: '0',
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
                comment: '',
                total: '0'
            });
            // Re-fetch the data to show updated status
            await fetchWardData();

        } catch (error) {
            console.error('Error saving ward data:', error);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotal = (data = formData) => {
        const {
            patientCensus = 0,
            newAdmit = 0,
            transferIn = 0,
            referIn = 0,
            transferOut = 0,
            referOut = 0,
            discharge = 0,
            dead = 0
        } = data;

        // แปลงค่าเป็นตัวเลขและคำนวณ
        const total = (
            parseInt(patientCensus) +
            parseInt(newAdmit) +
            parseInt(transferIn) +
            parseInt(referIn) +
            parseInt(transferOut) -
            parseInt(referOut) -
            parseInt(discharge) -
            parseInt(dead) 
        );

        // ป้องกันค่าติดลบ
        return Math.max(0, total);
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-blue-50 to-teal-50">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-blue-100">
                {/* Header Title */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2">
                        <img src="/images/BPK.jpg" alt="BPK Logo" className="w-10 h-10 object-contain" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-teal-500 text-transparent bg-clip-text mb-1">
                            Daily Patient Census and Staffing
                        </h1>
                    </div>
                </div>
                
                {/* Ward Selection */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">เลือก Ward:</label>
                    <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                        disabled={!!wardId}
                    >
                        <option value="">-- เลือก Ward --</option>
                        {wards.map((ward) => (
                            <option key={ward} value={ward}>
                                {ward}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date and Shift Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">วันที่:</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={thaiDate}
                                readOnly
                                className="w-full border border-blue-200 rounded-lg px-4 py-2 cursor-pointer bg-blue-50"
                                onClick={() => setShowCalendar(!showCalendar)}
                            />
                            {showCalendar && (
                                <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-lg p-2 border border-blue-200">
                                    <Calendar
                                        selectedDate={selectedDate}
                                        onDateSelect={handleDateSelect}
                                        datesWithData={datesWithData}
                                    />
                                    <button
                                        className="mt-2 w-full py-1 bg-blue-100 rounded-md text-sm text-blue-700 hover:bg-blue-200"
                                        onClick={() => setShowCalendar(false)}
                                    >
                                        ปิด
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">กะ:</label>
                        <ShiftSelection
                            selectedShift={selectedShift}
                            onShiftChange={handleShiftChange}
                        />
                    </div>
                </div>

                {/* Display Latest Record Date if available */}
                {latestRecordDate && (
                    <div className="mb-4 p-3 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                        <p className="font-medium text-center">
                            ข้อมูลล่าสุด: {formatThaiDate(latestRecordDate)}
                        </p>
                    </div>
                )}

                {/* Display Approval Status if available */}
                {approvalStatus && (
                    <div className={`mb-4 p-3 rounded-lg ${
                        approvalStatus === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                        approvalStatus === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                        <p className="font-medium text-center">
                            {approvalStatus === 'approved' ? 'ได้รับการอนุมัติแล้ว' : 
                            approvalStatus === 'rejected' ? 'ถูกปฏิเสธ' : 
                            'รอการอนุมัติ'}
                        </p>
                    </div>
                )}

                {/* Add buttons for fetching data */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                    <LatestRecordButton />
                    <ApprovalDataButton />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 mb-6 shadow-sm">
                        <h2 className="text-lg font-medium mb-4 text-blue-700">ข้อมูลผู้ป่วย</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Patient Census (จากกะก่อนหน้า):
                                </label>
                                <input
                                    type="number"
                                    name="patientCensus"
                                    value={formData.patientCensus}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    จำนวนผู้ป่วยปัจจุบัน (คำนวณอัตโนมัติ):
                                </label>
                                <input
                                    type="text"
                                    value={formData.total}
                                    readOnly
                                    className="w-full border border-teal-200 bg-teal-50 rounded-lg px-4 py-2 shadow-sm text-teal-700 font-medium"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    New Admit:
                                </label>
                                <input
                                    type="number"
                                    name="newAdmit"
                                    value={formData.newAdmit}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Transfer In:
                                </label>
                                <input
                                    type="number"
                                    name="transferIn"
                                    value={formData.transferIn}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Refer In:
                                </label>
                                <input
                                    type="number"
                                    name="referIn"
                                    value={formData.referIn}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Planned Discharge:
                                </label>
                                <input
                                    type="number"
                                    name="plannedDischarge"
                                    value={formData.plannedDischarge}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Transfer Out:
                                </label>
                                <input
                                    type="number"
                                    name="transferOut"
                                    value={formData.transferOut}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Refer Out:
                                </label>
                                <input
                                    type="number"
                                    name="referOut"
                                    value={formData.referOut}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Discharge:
                                </label>
                                <input
                                    type="number"
                                    name="discharge"
                                    value={formData.discharge}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Dead:
                                </label>
                                <input
                                    type="number"
                                    name="dead"
                                    value={formData.dead}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Available Beds:
                                </label>
                                <input
                                    type="number"
                                    name="availableBeds"
                                    value={formData.availableBeds}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Unavailable:
                                </label>
                                <input
                                    type="number"
                                    name="unavailable"
                                    value={formData.unavailable}
                                    onChange={handleInputChange}
                                    className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-teal-50 p-5 rounded-lg border border-teal-200 mb-6 shadow-sm">
                        <h2 className="text-lg font-medium mb-4 text-teal-700">ข้อมูลบุคลากร</h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    Nurse Manager:
                                </label>
                                <input
                                    type="number"
                                    name="nurseManager"
                                    value={formData.nurseManager}
                                    onChange={handleInputChange}
                                    className="w-full border border-teal-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    RN:
                                </label>
                                <input
                                    type="number"
                                    name="RN"
                                    value={formData.RN}
                                    onChange={handleInputChange}
                                    className="w-full border border-teal-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    PN:
                                </label>
                                <input
                                    type="number"
                                    name="PN"
                                    value={formData.PN}
                                    onChange={handleInputChange}
                                    className="w-full border border-teal-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-1">
                                    WC:
                                </label>
                                <input
                                    type="number"
                                    name="WC"
                                    value={formData.WC}
                                    onChange={handleInputChange}
                                    className="w-full border border-teal-300 rounded-lg px-4 py-2 bg-white shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2">
                            หมายเหตุ:
                        </label>
                        <textarea
                            name="comment"
                            value={formData.comment}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 min-h-[100px] bg-white shadow-sm"
                            placeholder="ระบุหมายเหตุหรือข้อมูลเพิ่มเติม (ถ้ามี)"
                        ></textarea>
                    </div>
                    
                    {/* เจ้าหน้าที่ผู้บันทึกข้อมูล */}
                    <div className="mb-6 bg-blue-50/80 rounded-xl p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4 bg-white/50 py-2 px-4 rounded-lg text-center shadow-sm">
                            เจ้าหน้าที่ผู้บันทึกข้อมูล
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-blue-700">First Name</label>
                                <input
                                    type="text"
                                    name="recorderFirstName"
                                    value={user?.username || ''}
                                    readOnly
                                    className="w-full text-black px-3 py-2 border border-blue-200 rounded-lg bg-white/70"
                                    placeholder="ชื่อ"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-blue-700">Department</label>
                                <input
                                    type="text"
                                    value={user?.department || ''}
                                    readOnly
                                    className="w-full text-black px-3 py-2 border border-blue-200 rounded-lg bg-white/70"
                                    placeholder="แผนก"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 shadow-md"
                            disabled={!selectedWard}
                        >
                            บันทึกข้อมูล
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WardForm;
