'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit } from 'firebase/firestore';
import LoadingScreen from '../ui/LoadingScreen';
import Swal from 'sweetalert2';
import { formatThaiDate, getThaiDateNow } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import CalendarSection from '../common/CalendarSection';
import ShiftSelection from '../common/ShiftSelection';

const WardForm = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(getCurrentShift());
    const [thaiDate, setThaiDate] = useState(getThaiDateNow());
    const [showCalendar, setShowCalendar] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [formData, setFormData] = useState({
        patientCensus: '',
        overallData: '',
        nurseManager: '',
        RN: '',
        PN: '',
        WC: '',
        newAdmit: '',
        transferIn: '',
        referIn: '',
        transferOut: '',
        referOut: '',
        discharge: '',
        dead: '',
        available: '',
        unavailable: '',
        plannedDischarge: '',
        comment: '',
        firstName: '',
        lastName: '',
        total: ''
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
            const today = new Date();
            setSelectedDate(today);
            const currentShift = getCurrentShift();
            setSelectedShift(currentShift);
            setThaiDate(formatThaiDate(today));
        }
    }, []);

    useEffect(() => {
        const fetchDatesWithData = async () => {
            try {
                const wardRef = collection(db, 'wardDailyRecords');
                const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
                const endOfYear = new Date(selectedDate.getFullYear(), 11, 31);
                
                const q = query(
                    wardRef,
                    where('date', '>=', startOfYear.toISOString().split('T')[0]),
                    where('date', '<=', endOfYear.toISOString().split('T')[0])
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

        fetchDatesWithData();
    }, [selectedDate]);

    const fetchWardData = async () => {
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

            // ดึงข้อมูลจาก wardDailyRecords
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const wardQuery = query(
                wardDailyRef,
                where('wardId', '==', selectedWard),
                where('date', '==', selectedDate.toISOString().split('T')[0])
            );

            const wardSnapshot = await getDocs(wardQuery);
            console.log('Query results:', wardSnapshot.size, 'documents found');
            
            if (!wardSnapshot.empty) {
                const wardData = wardSnapshot.docs[0].data();
                const shiftData = wardData.shifts?.[selectedShift] || {};

                // อัพเดทฟอร์มด้วยข้อมูลที่มีอยู่
                setFormData(prev => ({
                    ...prev,
                    patientCensus: wardData.patientCensus || '',
                    overallData: wardData.overallData || '',
                    nurseManager: shiftData.nurseManager || '',
                    RN: shiftData.RN || '',
                    PN: shiftData.PN || '',
                    WC: shiftData.WC || '',
                    newAdmit: shiftData.newAdmit || '',
                    transferIn: shiftData.transferIn || '',
                    referIn: shiftData.referIn || '',
                    transferOut: shiftData.transferOut || '',
                    referOut: shiftData.referOut || '',
                    discharge: shiftData.discharge || '',
                    dead: shiftData.dead || '',
                    available: shiftData.available || '',
                    unavailable: shiftData.unavailable || '',
                    plannedDischarge: shiftData.plannedDischarge || '',
                    comment: shiftData.comment || '',
                    firstName: '',
                    lastName: ''
                }));

                await Swal.fire({
                    title: 'ดึงข้อมูลสำเร็จ',
                    html: `
                        <div class="text-left">
                            <p class="mb-2 font-medium">ข้อมูลของ ${selectedWard}</p>
                            <p class="text-sm text-gray-600">วันที่: ${formatThaiDate(selectedDate)}</p>
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
            } else {
                console.log('No data found for ward:', selectedWard);
                // ถ้าไม่พบข้อมูล reset form
                setFormData({
                    patientCensus: '',
                    overallData: '',
                    nurseManager: '',
                    RN: '',
                    PN: '',
                    WC: '',
                    newAdmit: '',
                    transferIn: '',
                    referIn: '',
                    transferOut: '',
                    referOut: '',
                    discharge: '',
                    dead: '',
                    available: '',
                    unavailable: '',
                    plannedDischarge: '',
                    comment: '',
                    firstName: '',
                    lastName: '',
                    total: ''
                });

                await Swal.fire({
                    title: 'ไม่พบข้อมูล',
                    html: `ไม่พบข้อมูลของ ${selectedWard} ในวันที่ ${formatThaiDate(selectedDate)}`,
                    icon: 'info',
                    confirmButtonColor: '#0ab4ab'
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

    const calculateTotal = () => {
        const {
            patientCensus = 0,
            newAdmit = 0,
            transferIn = 0,
            referIn = 0,
            transferOut = 0,
            referOut = 0,
            discharge = 0,
            dead = 0
        } = formData;

        // แปลงค่าเป็นตัวเลขและคำนวณ
        const total = (
            parseInt(patientCensus) +
            parseInt(newAdmit) +
            parseInt(transferIn) +
            parseInt(referIn) -
            parseInt(transferOut) -
            parseInt(referOut) -
            parseInt(discharge) -
            parseInt(dead)
        );

        // ป้องกันค่าติดลบ
        return Math.max(0, total);
    };

    useEffect(() => {
        const total = calculateTotal();
        setFormData(prev => ({
            ...prev,
            total: total.toString()
        }));
    }, [formData.patientCensus, formData.newAdmit, formData.transferIn, formData.referIn, 
        formData.transferOut, formData.referOut, formData.discharge, formData.dead]);

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

            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                throw new Error('กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล');
            }

            // ตรวจสอบข้อมูลซ้ำ
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const q = query(
                wardDailyRef,
                where('wardId', '==', selectedWard),
                where('date', '==', selectedDate.toISOString().split('T')[0])
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

            // คำนวณ Overall Data
            const overallData = calculateTotal().toString();

            // เตรียมข้อมูลสำหรับบันทึก
            const wardData = {
                wardId: selectedWard,
                date: selectedDate.toISOString().split('T')[0],
                patientCensus: formData.patientCensus || '0',
                overallData: overallData,
                lastUpdated: serverTimestamp(),
                shifts: {
                    [selectedShift]: {
                        ...formData,
                        recorderName: `${formData.firstName} ${formData.lastName}`,
                        updatedAt: serverTimestamp()
                    }
                }
            };

            // บันทึกหรืออัพเดทข้อมูล
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                const existingData = querySnapshot.docs[0].data();
                
                await updateDoc(docRef, {
                    patientCensus: formData.patientCensus || '0',
                    overallData: overallData,
                    lastUpdated: serverTimestamp(),
                    shifts: {
                        ...existingData.shifts,
                        [selectedShift]: {
                            ...formData,
                            recorderName: `${formData.firstName} ${formData.lastName}`,
                            updatedAt: serverTimestamp()
                        }
                    }
                });
            } else {
                await addDoc(wardDailyRef, wardData);
            }

            await Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });

            // รีเซ็ตฟอร์ม
            setSelectedWard('');
            setFormData({
                patientCensus: '',
                overallData: '',
                nurseManager: '',
                RN: '',
                PN: '',
                WC: '',
                newAdmit: '',
                transferIn: '',
                referIn: '',
                transferOut: '',
                referOut: '',
                discharge: '',
                dead: '',
                available: '',
                unavailable: '',
                plannedDischarge: '',
                comment: '',
                firstName: '',
                lastName: '',
                total: ''
            });

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleShiftChange = (shift) => {
        setSelectedShift(shift);
    };

    // Add this function to check if a date has data
    const hasDataForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return datesWithData.some(d => d.date === dateStr);
    };

    // เพิ่มฟังก์ชันสำหรับตรวจสอบข้อมูลที่มีอยู่
    const checkExistingData = async (date) => {
        try {
            const wardDailyRef = collection(db, 'wardDailyRecords');
            const q = query(
                wardDailyRef,
                where('date', '==', date.toISOString().split('T')[0]),
                where('wardId', '==', selectedWard)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const wardData = querySnapshot.docs[0].data();
                return {
                    exists: true,
                    data: wardData
                };
            }
            return { exists: false };
        } catch (error) {
            console.error('Error checking existing data:', error);
            return { exists: false, error };
        }
    };

    // ปรับปรุงฟังก์ชัน handleDateSelect
    const handleDateSelect = async (date) => {
        try {
            const result = await checkExistingData(date);
            setSelectedDate(date);
            setThaiDate(formatThaiDate(date));

            if (result.exists) {
                const wardData = result.data;
                await Swal.fire({
                    title: 'พบข้อมูลที่บันทึกไว้',
                    html: `
                        <div class="text-left">
                            <p class="mb-2">วันที่: ${formatThaiDate(date)}</p>
                            <p class="mb-2">วอร์ด: ${selectedWard}</p>
                            <p class="text-sm text-gray-600">Patient Census: ${wardData.patientCensus || '0'}</p>
                            <p class="text-sm text-gray-600">Overall Data: ${wardData.overallData || '0'}</p>
                            ${wardData.shifts?.[selectedShift] ? `
                                <div class="mt-2">
                                    <p class="text-sm font-medium">ข้อมูลบุคลากร</p>
                                    <p class="text-sm text-gray-600">Nurse Manager: ${wardData.shifts[selectedShift].nurseManager || '0'}</p>
                                    <p class="text-sm text-gray-600">RN: ${wardData.shifts[selectedShift].RN || '0'}</p>
                                    <p class="text-sm text-gray-600">PN: ${wardData.shifts[selectedShift].PN || '0'}</p>
                                    <p class="text-sm text-gray-600">WC: ${wardData.shifts[selectedShift].WC || '0'}</p>
                                </div>
                            ` : ''}
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonColor: '#0ab4ab'
                });
            }

            setShowCalendar(false);
            if (selectedWard) {
                fetchWardData();
            }
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

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
                {/* Header Title */}
                <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2">
                        <img src="/images/BPK.jpg" alt="BPK Logo" className="w-8 h-8 object-contain" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[#0ab4ab] to-blue-600 text-transparent bg-clip-text mb-1">
                            Ward Information Form
                </h1>
                    </div>
                    <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-[#0ab4ab] to-blue-600 rounded-full"></div>
                </div>

                {/* Calendar and Shift Section */}
                <div className="bg-gradient-to-br from-[#0ab4ab]/5 via-blue-50 to-purple-50 rounded-2xl p-4 mb-6 shadow-lg">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Calendar Section */}
                            <div className="bg-gradient-to-br from-[#0ab4ab]/5 via-blue-50 to-purple-50 rounded-2xl p-4 mb-3 shadow-lg">
                                <div className="flex flex-col md:flex-row items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendar(!showCalendar)}
                                        className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-[#0ab4ab] to-blue-500 text-white rounded-lg hover:from-[#0ab4ab]/90 hover:to-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 shadow-md text-sm"
                                    >
                                        {showCalendar ? 'ซ่อนปฏิทิน' : 'เลือกวันที่'}
                                    </button>
                                    <div className="text-gray-700 space-y-1.5 text-center md:text-left">
                                        <div className="font-medium text-[#0ab4ab]">
                                            วันที่ปัจจุบัน: {formatThaiDate(new Date())}
                                        </div>
                                        <div className="text-blue-600 font-medium">
                                            วันที่เลือก: {formatThaiDate(selectedDate)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Selection */}
                            <ShiftSelection
                                selectedShift={selectedShift}
                                onShiftChange={handleShiftChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Calendar Modal */}
                {showCalendar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all">
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={handleDateSelect}
                                onClickOutside={() => setShowCalendar(false)}
                                variant="form"
                            />
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="mb-6">
                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                            Select Ward <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedWard}
                            onChange={(e) => setSelectedWard(e.target.value)}
                            className="w-full px-4 py-3 text-[#0ab4ab] border-2 border-[#0ab4ab] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent"
                            required
                        >
                            <option value="">-- Select Ward --</option>
                            {wards.map(ward => (
                                <option key={ward} value={ward}>{ward}</option>
                            ))}
                        </select>
                    </div>

                    {selectedWard && (
                        <div className="space-y-8">
                            {/* Section 1: General Information */}
                            <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-[#0ab4ab]/5 p-6 rounded-xl border border-[#0ab4ab]/20">
                                <h3 className="text-xl font-semibold text-[#0ab4ab] mb-6">General Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Patient Census <span className="text-gray-500">(Read Only)</span>
                                </label>
                                <input
                                    type="number"
                                    name="patientCensus"
                                    value={formData.patientCensus}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                    readOnly
                                />
                            </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Overall Data <span className="text-gray-500">(Read Only)</span>
                                </label>
                                <input
                                    type="number"
                                    name="overallData"
                                    value={formData.overallData}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                    readOnly
                                />
                            </div>
                                </div>
                            </div>

                            {/* Section 2: Staff Information */}
                            <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-[#0ab4ab]/5 p-6 rounded-xl border border-[#0ab4ab]/20">
                                <h3 className="text-xl font-semibold text-[#0ab4ab] mb-6">Staff Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Nurse Manager <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="nurseManager"
                                            value={formData.nurseManager}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            RN <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="RN"
                                            value={formData.RN}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            PN <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="PN"
                                            value={formData.PN}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            WC <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="WC"
                                            value={formData.WC}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Patient Movement */}
                            <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-[#0ab4ab]/5 p-6 rounded-xl border border-[#0ab4ab]/20">
                                <h3 className="text-xl font-semibold text-[#0ab4ab] mb-6">Patient Movement</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            New Admit
                                        </label>
                                        <input
                                            type="number"
                                            name="newAdmit"
                                            value={formData.newAdmit}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Transfer In
                                        </label>
                                        <input
                                            type="number"
                                            name="transferIn"
                                            value={formData.transferIn}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Refer In
                                        </label>
                                        <input
                                            type="number"
                                            name="referIn"
                                            value={formData.referIn}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Transfer Out
                                        </label>
                                        <input
                                            type="number"
                                            name="transferOut"
                                            value={formData.transferOut}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Refer Out
                                        </label>
                                        <input
                                            type="number"
                                            name="referOut"
                                            value={formData.referOut}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                    Discharge
                                </label>
                                <input
                                    type="number"
                                    name="discharge"
                                    value={formData.discharge}
                                    onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                />
                            </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                    Dead
                                </label>
                                <input
                                    type="number"
                                    name="dead"
                                    value={formData.dead}
                                    onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                />
                            </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Total <span className="text-gray-500">(Read-Only)</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="total"
                                            value={formData.total}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Bed Information */}
                            <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-[#0ab4ab]/5 p-6 rounded-xl border border-[#0ab4ab]/20">
                                <h3 className="text-xl font-semibold text-[#0ab4ab] mb-6">Bed Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Available Beds <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="available"
                                    value={formData.available}
                                    onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                            required
                                />
                            </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                    Unavailable Beds
                                </label>
                                <input
                                    type="number"
                                    name="unavailable"
                                    value={formData.unavailable}
                                    onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                />
                            </div>

                            <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                    Planned Discharge
                                </label>
                                <input
                                    type="number"
                                    name="plannedDischarge"
                                    value={formData.plannedDischarge}
                                    onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-2 border-[#0ab4ab]/20 rounded-lg text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Additional Information */}
                            <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-[#0ab4ab]/5 p-6 rounded-xl border border-[#0ab4ab]/20">
                                <h3 className="text-xl font-semibold text-[#0ab4ab] mb-6">Additional Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                            placeholder="Enter first name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            required
                                            placeholder="Enter last name"
                                />
                            </div>

                            <div className="col-span-2">
                                        <label className="block text-lg font-medium text-[#0ab4ab] mb-2">
                                            Comments
                                </label>
                                <textarea
                                    name="comment"
                                    value={formData.comment}
                                    onChange={handleInputChange}
                                    rows="4"
                                            className="w-full px-4 py-3 border-2 border-[#0ab4ab]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:border-transparent text-gray-700"
                                            placeholder="Add your comments here..."
                                />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedWard && (
                        <div className="mt-8">
                            <button
                                type="submit"
                                className="w-full bg-[#0ab4ab] text-white text-lg font-semibold py-3 px-6 rounded-xl hover:bg-[#0ab4ab]/90 focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02]"
                            >
                                Submit
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default WardForm;