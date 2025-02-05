'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import Calendar from '@/app/components/ui/Calendar';

//คือส่วนของฟอร์มที่ใช้ในการกรอกข้อมูลของแต่ละวอร์ด
const ShiftForm = () => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [datesWithData, setDatesWithData] = useState([]);
    const [thaiDate, setThaiDate] = useState('');
    const [summaryData, setSummaryData] = useState({
        opdTotal24hr: '', //ยอด OPD 24 hour - รวมผู้ป่วยนอกใน 24 ชั่วโมง
        existingPatients: '', // คนไข้เก่า - จำนวนผู้ป่วยที่รักษาต่อเนื่อง
        newPatients: '', // คนไข้ใหม่ - จำนวนผู้ป่วยที่มารับการรักษาครั้งแรก
        admissions24hr: '',// Admit 24 ชม. - จำนวนผู้ป่วยที่รับไว้ใน 24 ชั่วโมง
        // แยกฟิลด์ชื่อและนามสกุลของ Supervisor
        supervisorFirstName: '',
        supervisorLastName: '',
        // เพิ่มฟิลด์สำหรับผู้บันทึก
        recorderFirstName: '',
        recorderLastName: ''
    });

    // เพิ่มฟิลด์ใหม่ในส่วนของ ward data
    const initialWardData = {
        numberOfPatients: '',
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
        overallData: '',
        availableBeds: '',
        plannedDischarge: '',
        unavailable: '',
        comment: '',
    };

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

    // ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบไทย
    const formatThaiDate = (date) => {
        if (!date) {
            return 'คุณยังไม่ได้เลือกวันที่เพื่อเพิ่มข้อมูล';
        }
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];

        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const day = dateObj.getDate();
        const month = thaiMonths[dateObj.getMonth()];
        const year = dateObj.getFullYear() + 543;
        return `เพิ่มข้อมูล วันที่: ${day} ${month} ${year}`;
    };

    // เพิ่ม Initial Loading Effect
    useEffect(() => {
        setTimeout(() => {
            setIsInitialLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const today = new Date();
            setSelectedDate(today);
            const isoDate = today.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, date: isoDate }));
            setThaiDate(formatThaiDate(today));
        }
    }, []);

    const handleDateChange = (element) => {
        const newDate = element.target.value;
        if (!newDate) {
            setSelectedDate(new Date());
            setFormData(prev => ({ ...prev, date: '' }));
            setThaiDate('คุณยังไม่ได้เลือกวันที่เพื่อเพิ่มข้อมูล');
            return;
        }
        const dateObj = new Date(newDate);
        setSelectedDate(dateObj);
        setFormData(prev => ({ ...prev, date: newDate }));
        setThaiDate(formatThaiDate(dateObj));
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

    const handleInputChange = (section, ward, data) => {
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                key,
                key === 'comment' ? value : (value === '' ? '' : Math.max(0, parseInt(value) || 0).toString())
            ])
        );

        // คำนวณ overallData
        const overallData = (
            parseInt(sanitizedData.numberOfPatients || 0) +
            parseInt(sanitizedData.newAdmit || 0) +
            parseInt(sanitizedData.transferIn || 0) +
            parseInt(sanitizedData.referIn || 0) -
            parseInt(sanitizedData.transferOut || 0) -
            parseInt(sanitizedData.referOut || 0) -
            parseInt(sanitizedData.discharge || 0) -
            parseInt(sanitizedData.dead || 0)
        );

        sanitizedData.overallData = overallData.toString();

        setFormData(prev => {
            const newData = {
                ...prev,
                wards: {
                    ...prev.wards,
                    [ward]: sanitizedData
                }
            };

            // คำนวณ totals ใหม่
            newData.totals = calculateTotals;

            return newData;
        });
    };

    // เพิ่มฟังก์ชันตรวจสอบความสมบูรณ์ของข้อมูล
    const validateFormData = () => {
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
                condition: formData.shift === '19:00-07:00' && isCurrentDate(),
                message: 'กรุณาเลือกวันที่ล่วงหน้าสำหรับกะกลางคืน'
            },
            {
                condition: !hasWardData(),
                message: 'กรุณากรอกข้อมูลอย่างน้อย 1 วอร์ด'
            },
            {
                condition: !summaryData.recorderFirstName?.trim() || !summaryData.recorderLastName?.trim(),
                message: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล'
            },
            {
                condition: !summaryData.supervisorFirstName?.trim() || !summaryData.supervisorLastName?.trim(),
                message: 'กรุณากรอกชื่อและนามสกุลผู้ตรวจการ'
            }
        ];

        for (const check of validationChecks) {
            if (check.condition) {
                alert(check.message);
                return false;
            }
        }

        return true;
    };

    const isCurrentDate = () => {
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        return selectedDate.getTime() === today.getTime();
    };

    const hasWardData = () => {
        return Object.values(formData.wards).some(ward =>
            Object.entries(ward).some(([key, value]) =>
                key !== 'comment' && value !== '' && value !== '0'
            )
        );
    };

    const resetForm = () => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?')) {
            return;
        }

        // Reset all states to initial values
        setFormData({
            date: '',
            shift: '',
            wards: Object.fromEntries(
                Object.keys(formData.wards).map(ward => [
                    ward,
                    { ...initialWardData }
                ])
            ),
            totals: { ...initialWardData }
        });

        setSummaryData({
            opdTotal24hr: '',
            existingPatients: '',
            newPatients: '',
            admissions24hr: '',
            supervisorFirstName: '',
            supervisorLastName: '',
            recorderFirstName: '',
            recorderLastName: ''
        });

        setSelectedDate(new Date());
        setThaiDate('');
        setShowCalendar(false);

        // Force reload the page
        window.location.reload();
    };

    // แก้ไขฟังก์ชัน handleSubmit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateFormData()) return;

        const confirmSubmit = window.confirm(
            'โปรดยืนยันว่าข้อมูลได้รับการตรวจสอบเรียบร้อยแล้วก่อนดำเนินการบันทึก\n\n❌ กด "Cancel" (ต้องการแก้ไขข้อมูลก่อน)\n✅ กด "OK" (ดำเนินการบันทึกข้อมูล)'
        );

        if (!confirmSubmit) return;

        setIsLoading(true);
        try {
            // ตรวจสอบข้อมูลที่มีอยู่
            const q = query(
                collection(db, 'staffRecords'),
                where('date', '==', formData.date),
                where('shift', '==', formData.shift)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const existingDoc = querySnapshot.docs[0].data();
                setExistingData(existingDoc);
                setShowDataComparison(true);
                setIsLoading(false);
                return;
            }

            // ดำเนินการบันทึกข้อมูล
            await saveData();

        } catch (error) {
            console.error('Error:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
            setIsLoading(false);
        }
    };

    // เพิ่มฟังก์ชันใหม่สำหรับการบันทึกข้อมูล
    const saveData = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '');

            const formattedDate = formData.date.replace(/-/g, '');
            const docId = `data_${formattedTime}_${formattedDate}`;

            const finalTotals = calculateTotals;
            const dataToSubmit = {
                date: formData.date,
                shift: formData.shift,
                wards: {},
                totals: finalTotals,
                overallData: finalTotals.overallData
            };

            Object.entries(formData.wards).forEach(([wardName, ward]) => {
                const overallData = (
                    parseInt(ward.numberOfPatients || 0) +
                    parseInt(ward.newAdmit || 0) +
                    parseInt(ward.transferIn || 0) +
                    parseInt(ward.referIn || 0) -
                    parseInt(ward.transferOut || 0) -
                    parseInt(ward.referOut || 0) -
                    parseInt(ward.discharge || 0) -
                    parseInt(ward.dead || 0)
                );

                dataToSubmit.wards[wardName] = {
                    ...ward,
                    overallData: overallData.toString()
                };
            });

            await setDoc(doc(db, 'staffRecords', docId), {
                ...dataToSubmit,
                summaryData,
                timestamp: serverTimestamp(),
                docId: docId
            });

            resetForm();
            alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
            setShowDataComparison(false);
        }
    };

    // อัพเดท DataComparisonModal component
    const DataComparisonModal = () => {
        if (!showDataComparison || !existingData) return null;

        const formatTime = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp.seconds * 1000);
            return date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        const renderWardComparison = (wardName) => {
            const existingWard = existingData.wards[wardName] || {};
            const newWard = formData.wards[wardName] || {};
            const hasChanges = Object.keys(newWard).some(key => newWard[key] !== existingWard[key]);

            if (!hasChanges) return null;

            return (
                <div key={`ward-${wardName}`} className="bg-white/80 p-4 rounded-lg border border-gray-200 mb-4">
                    <h5 className="font-medium text-purple-800 mb-2">{wardName}</h5>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h6 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลเดิม</h6>
                            <div className="space-y-1 text-sm">
                                {Object.entries(existingWard).map(([key, value]) => (
                                    <p key={`old-${wardName}-${key}`} className="grid grid-cols-2">
                                        <span className="text-gray-500">{key}:</span>
                                        <span className="text-purple-700">{value || '0'}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h6 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลใหม่</h6>
                            <div className="space-y-1 text-sm">
                                {Object.entries(newWard).map(([key, value]) => (
                                    <p key={`new-${wardName}-${key}`} className="grid grid-cols-2">
                                        <span className="text-gray-500">{key}:</span>
                                        <span className="text-pink-700">{value || '0'}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8 rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-purple-100">
                    <h3 className="text-2xl font-semibold mb-6 text-purple-800 text-center">เปรียบเทียบข้อมูล</h3>

                    <div className="space-y-6">
                        {/* ข้อมูลทั่วไป */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/80 p-6 rounded-xl shadow-sm border border-purple-100">
                                <div className="mb-4">
                                    <h4 className="text-lg font-medium text-purple-700 mb-2">ข้อมูลเดิม</h4>
                                    <p className="text-sm text-gray-600">
                                        บันทึกเมื่อ: {formatTime(existingData.timestamp)}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-purple-50/50 p-4 rounded-lg">
                                        <h5 className="font-medium text-purple-800 mb-2">ข้อมูลทั่วไป</h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-600">วันที่:</span> <span className="text-purple-900">{existingData.date}</span></p>
                                            <p><span className="text-gray-600">กะ:</span> <span className="text-purple-900">{existingData.shift}</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50/50 p-4 rounded-lg">
                                        <h5 className="font-medium text-purple-800 mb-2">ข้อมูลสรุป 24 ชั่วโมง</h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-600">OPD 24hr:</span> <span className="text-purple-900">{existingData.summaryData?.opdTotal24hr || '0'}</span></p>
                                            <p><span className="text-gray-600">คนไข้เก่า:</span> <span className="text-purple-900">{existingData.summaryData?.existingPatients || '0'}</span></p>
                                            <p><span className="text-gray-600">คนไข้ใหม่:</span> <span className="text-purple-900">{existingData.summaryData?.newPatients || '0'}</span></p>
                                            <p><span className="text-gray-600">Admit 24hr:</span> <span className="text-purple-900">{existingData.summaryData?.admissions24hr || '0'}</span></p>
                                            <p><span className="text-gray-600">ผู้ตรวจการ:</span> <span className="text-purple-900">{existingData.summaryData?.supervisorName || '-'}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/80 p-6 rounded-xl shadow-sm border border-pink-100">
                                <div className="mb-4">
                                    <h4 className="text-lg font-medium text-pink-700 mb-2">ข้อมูลใหม่</h4>
                                    <p className="text-sm text-gray-600">กำลังจะบันทึก</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-pink-50/50 p-4 rounded-lg">
                                        <h5 className="font-medium text-pink-800 mb-2">ข้อมูลทั่วไป</h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-600">วันที่:</span> <span className="text-pink-900">{formData.date}</span></p>
                                            <p><span className="text-gray-600">กะ:</span> <span className="text-pink-900">{formData.shift}</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-pink-50/50 p-4 rounded-lg">
                                        <h5 className="font-medium text-pink-800 mb-2">ข้อมูลสรุป 24 ชั่วโมง</h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-600">OPD 24hr:</span> <span className="text-pink-900">{summaryData.opdTotal24hr || '0'}</span></p>
                                            <p><span className="text-gray-600">คนไข้เก่า:</span> <span className="text-pink-900">{summaryData.existingPatients || '0'}</span></p>
                                            <p><span className="text-gray-600">คนไข้ใหม่:</span> <span className="text-pink-900">{summaryData.newPatients || '0'}</span></p>
                                            <p><span className="text-gray-600">Admit 24hr:</span> <span className="text-pink-900">{summaryData.admissions24hr || '0'}</span></p>
                                            <p><span className="text-gray-600">ผู้ตรวจการ:</span> <span className="text-pink-900">{summaryData.supervisorName || '-'}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ข้อมูลแต่ละวอร์ด */}
                        <div className="mt-6">
                            <h4 className="text-lg font-medium text-purple-800 mb-4">ข้อมูลรายวอร์ด (แสดงเฉพาะที่มีการเปลี่ยนแปลง)</h4>
                            <div className="space-y-4">
                                {Object.keys(formData.wards).map(wardName => renderWardComparison(wardName))}
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => setShowDataComparison(false)}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => {
                                    setShowDataComparison(false);
                                    saveData();
                                }}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 focus:ring-2 focus:ring-purple-300 font-medium transition-all"
                            >
                                บันทึกทับข้อมูลเดิม
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const [currentStep, setCurrentStep] = useState(0);

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
            const datesWithDataInYear = [...new Set(yearSnapshot.docs.map(doc => doc.data().date))];
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

    // Helper function for date formatting
    const getUTCDateString = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-[1400px] mx-auto p-2">
            {/* Initial Loading Screen */}
            {isInitialLoading && (
                <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                    <div className="text-center">
                        <img
                            src="/images/BPK.jpg"
                            alt="BPK Loading"
                            className="w-32 h-32 mx-auto mb-4 animate-pulse"
                        />
                        <p className="text-gray-600">กำลังโหลด...</p>
                    </div>
                </div>
            )}

            {/* เพิ่ม DataComparisonModal ที่นี่ */}
            <DataComparisonModal />

            {/*ส่วน*/}
            <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-6 mb-6">
                <h1 className="text-2xl text-center font-semibold text-[#0ab4ab] mb-6">
                    Daily Patient Census and Staffing
                </h1>
                {/*ส่วนของวันที่และกะงาน*/}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                        <div className="flex flex-col md:flex-row items-center gap-2 whitespace-nowrap text-sm justify-center">
                            <div className="flex flex-col md:flex-row gap-2 items-center w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowCalendar(!showCalendar)}
                                    className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                    {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                                </button>
                                <span className="text-gray-700 font-medium text-center w-full md:w-auto">{thaiDate}</span>
                            </div>
                        </div>
                        {/* สร้างส่วนของฟอร์มที่ใช้ในการเลือกกะงาน */}
                        <div className="flex gap-4 justify-center">
                            <div className="flex gap-4">
                                {['07:00-19:00', '19:00-07:00'].map((shiftTime) => (
                                    <div key={shiftTime} className="flex flex-col items-center md:block">
                                        <span className="text-sm font-medium text-gray-700 mb-1 block md:hidden">
                                            {shiftTime === '07:00-19:00' ? 'Morning' : 'Night'}
                                        </span>
                                        <label className="flex text-black text-sm items-center gap-2">
                                            <input
                                                type="radio"
                                                name="shift"
                                                value={shiftTime}
                                                checked={formData.shift === shiftTime}
                                                onChange={(element) =>
                                                    setFormData({ ...formData, shift: element.target.value })
                                                }
                                                className="rounded"
                                            />
                                            <span>
                                                <span className="hidden md:inline">
                                                    {shiftTime === '07:00-19:00' ? 'Morning' : 'Night'}{' '}
                                                </span>
                                                ({shiftTime})
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <div className="lg:max-w-[1920px] md:max-w-full mx-auto flex justify-center">
                    <table className="w-full table-auto border-collapse border border-gray-200 text-sm shadow-lg bg-gradient-to-r from-pink-50 to-blue-50 rounded-xl">
                        <thead>
                            <tr className="bg-[#0ab4ab] text-white">
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Ward</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Patient Census</th>
                                <th colSpan="4" className="border p-2 text-center whitespace-nowrap">Staff</th>
                                <th colSpan="7" className="border p-2 text-center whitespace-nowrap">Patient Movement</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Overall Data</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Available</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Unavailable</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Plan D/C</th>
                                <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Comment</th>
                            </tr>
                            <tr className="bg-[#0ab4ab] text-white text-sm">
                                <th className="border p-2 text-center whitespace-nowrap">Nurse Manager</th>
                                <th className="border p-2 text-center whitespace-nowrap">RN</th>
                                <th className="border p-2 text-center whitespace-nowrap">PN</th>
                                <th className="border p-2 text-center whitespace-nowrap">WC</th>
                                <th className="border p-2 text-center whitespace-nowrap">New Admit</th>
                                <th className="border p-2 text-center whitespace-nowrap">Transfer In</th>
                                <th className="border p-2 text-center whitespace-nowrap">Refer In</th>
                                <th className="border p-2 text-center whitespace-nowrap">Transfer Out</th>
                                <th className="border p-2 text-center whitespace-nowrap">Refer Out</th>
                                <th className="border p-2 text-center whitespace-nowrap">Discharge</th>
                                <th className="border p-2 text-center whitespace-nowrap">Dead</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(formData.wards).map(([ward, data]) => (
                                <tr key={ward} className="border-b hover:bg-gray-50">
                                    <td className="border border-gray-200 text-center text-black p-2">{ward}</td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.numberOfPatients}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, numberOfPatients: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2 min-w-[80px]">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.nurseManager}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, nurseManager: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 px-2 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2 min-w-[80px]">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.RN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, RN: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 px-2 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2 min-w-[80px]">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.PN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, PN: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 px-2 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2 min-w-[80px]">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.WC}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, WC: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 px-2 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.newAdmit}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, newAdmit: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.transferIn}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, transferIn: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.referIn}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, referIn: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.transferOut}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, transferOut: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.referOut}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, referOut: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.discharge}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, discharge: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.dead}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, dead: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2 bg-gray-100">
                                        <div className="w-full p-1 text-center font-medium text-black">
                                            {data.overallData ? data.overallData : ''}
                                        </div>
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.availableBeds}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, availableBeds: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.unavailable}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, unavailable: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.plannedDischarge}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, plannedDischarge: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                        />
                                    </td>
                                    <td className="border border-gray-200 p-2">
                                        <input
                                            type="text"
                                            value={data.comment}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, comment: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900 text-black"
                                            placeholder="Comment"
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50">
                                <td className="border border-gray-200 text-center text-black p-2 font-semibold">Total</td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.numberOfPatients > 0 ? formData.totals.numberOfPatients : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.nurseManager > 0 ? formData.totals.nurseManager : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.RN > 0 ? formData.totals.RN : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.PN > 0 ? formData.totals.PN : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.WC > 0 ? formData.totals.WC : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.newAdmit > 0 ? formData.totals.newAdmit : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.transferIn > 0 ? formData.totals.transferIn : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.referIn > 0 ? formData.totals.referIn : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.transferOut > 0 ? formData.totals.transferOut : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.referOut > 0 ? formData.totals.referOut : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.discharge > 0 ? formData.totals.discharge : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.dead > 0 ? formData.totals.dead : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.overallData > 0 ? formData.totals.overallData : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.availableBeds > 0 ? formData.totals.availableBeds : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.unavailable > 0 ? formData.totals.unavailable : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.plannedDischarge > 0 ? formData.totals.plannedDischarge : ''}
                                </td>
                                <td className="border border-gray-200 p-2 text-center text-black">
                                    {formData.totals.comment ? formData.totals.comment : ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {/*ส่วนของข้อมูลสรุป 24 ชั่วโมง*/}
                <div className="mt-8 mb-4">
                    <h3 className="text-xl font-semibold mb-4 text-center text-black">24-hour Summary</h3>
                    <div className="grid grid-cols-4 gap-8">
                        <div className="flex flex-col bg-gradient-to-br from-pink-100 to-pink-50 p-4 rounded-lg shadow-lg">
                            <label className="mb-2 text-center font-medium text-black">OPD 24 hour</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.opdTotal24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                                className="w-full text-center border border-gray-200 rounded-lg py-2 text-black bg-white/80"
                            />
                        </div>
                        <div className="flex flex-col bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg shadow-lg">
                            <label className="mb-2 text-center font-medium text-black">Old Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                className="w-full text-center border border-gray-200 rounded-lg py-2 text-black bg-white/80"
                            />
                        </div>
                        <div className="flex flex-col bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-lg shadow-lg">
                            <label className="mb-2 text-center font-medium text-black">New Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                className="w-full text-center border border-gray-200 rounded-lg py-2 text-black bg-white/80"
                            />
                        </div>
                        <div className="flex flex-col bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg shadow-lg">
                            <label className="mb-2 text-center font-medium text-black">Admit 24 Hours</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.admissions24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                className="w-full text-center border border-gray-200 rounded-lg py-2 text-black bg-white/80"
                            />
                        </div>
                    </div>
                </div>
                {/*ส่วนของลงชื่อผู้ตรวจการและผู้บันทึกข้อมูล*/}
                <div className="mt-6 bg-[#0ab4ab]/10 rounded-lg shadow-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ผู้บันทึกข้อมูล */}
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black whitespace-nowrap min-w-[140px]">เจ้าหน้าที่ผู้บันทึกข้อมูล</label>
                            <div className="flex gap-2 flex-1">
                                <input
                                    type="text"
                                    value={summaryData.recorderFirstName}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, recorderFirstName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                    placeholder="ชื่อ"
                                />
                                <input
                                    type="text"
                                    value={summaryData.recorderLastName}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, recorderLastName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                    placeholder="นามสกุล"
                                />
                            </div>
                        </div>
                        {/* Supervisor Signature */}
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black whitespace-nowrap min-w-[140px]">Supervisor Signature</label>
                            <div className="flex gap-2 flex-1">
                                <input
                                    type="text"
                                    value={summaryData.supervisorFirstName}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorFirstName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                    placeholder="ชื่อ"
                                />
                                <input
                                    type="text"
                                    value={summaryData.supervisorLastName}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorLastName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                    placeholder="นามสกุล"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/*แสดงผลแบบ Mobile*/}
            <div className="md:hidden space-y-4">
                {/* Ward Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    {Object.entries(formData.wards).map(([ward, data]) => (
                        <div key={ward} className="mb-6 bg-gradient-to-r from-pink-50 to-blue-50 rounded-xl shadow-lg p-4">
                            <h3 className="text-lg font-semibold mb-3 text-center text-[#0ab4ab] border-b-2 border-[#0ab4ab]/20 pb-2">{ward}</h3>

                            {/* Census and Overall Data */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <label className="block text-sm text-center font-medium text-black mb-1">Patient Census</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.numberOfPatients}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, numberOfPatients: e.target.value })}
                                        className="w-full text-center bg-white border border-gray-200 rounded-md py-1.5 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                    />
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <label className="block text-sm text-center font-medium text-black mb-1">Overall Data</label>
                                    <div className="w-full py-1.5 text-center font-medium text-black">
                                        {data.overallData || '0'}
                                    </div>
                                </div>
                            </div>

                            {/* Staff Section */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-black mb-2 text-center">Staff</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">Nurse Manager</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.nurseManager}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, nurseManager: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">RN</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.RN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, RN: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">PN</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.PN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, PN: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">WC</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.WC}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, WC: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Patient Movement */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-black mb-2 text-center">Patient Movement</h4>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    {[
                                        { label: 'New Admit', value: data.newAdmit, key: 'newAdmit' },
                                        { label: 'Transfer In', value: data.transferIn, key: 'transferIn' },
                                        { label: 'Refer In', value: data.referIn, key: 'referIn' },
                                        { label: 'Transfer Out', value: data.transferOut, key: 'transferOut' },
                                        { label: 'Refer Out', value: data.referOut, key: 'referOut' },
                                        { label: 'Discharge', value: data.discharge, key: 'discharge' },
                                        { label: 'Dead', value: data.dead, key: 'dead' }
                                    ].map((item) => (
                                        <div key={item.key} className="bg-gray-50 rounded-lg p-2">
                                            <label className="block text-xs text-center font-medium text-black mb-1">{item.label}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.value}
                                                onChange={(e) => handleInputChange('wards', ward, { ...data, [item.key]: e.target.value })}
                                                className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bed Management */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-black mb-2 text-center">Bed Management</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">Available</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.availableBeds}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, availableBeds: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">Unavailable</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.unavailable}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, unavailable: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">Plan D/C</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.plannedDischarge}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, plannedDischarge: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <label className="block text-xs text-center font-medium text-black mb-1">Comment</label>
                                        <input
                                            type="text"
                                            value={data.comment}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, comment: e.target.value })}
                                            className="w-full text-center bg-white border border-gray-200 rounded-md py-1 text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 focus:border-[#0ab4ab] text-black"
                                            placeholder="Comment"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* เพิ่มส่วน Supervisor และผู้บันทึกข้อมูลสำหรับ Mobile */}
                <div className="space-y-4 p-4">
                    <div className="bg-[#0ab4ab]/10 rounded-lg p-4">
                        <div className="space-y-4">
                            {/* Supervisor */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-black">Supervisor Signature</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={summaryData.supervisorFirstName}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorFirstName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                        placeholder="ชื่อ"
                                    />
                                    <input
                                        type="text"
                                        value={summaryData.supervisorLastName}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorLastName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                        placeholder="นามสกุล"
                                    />
                                </div>
                            </div>

                            {/* ผู้บันทึกข้อมูล */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-black">ผู้บันทึกข้อมูล</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={summaryData.recorderFirstName}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, recorderFirstName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                        placeholder="ชื่อ"
                                    />
                                    <input
                                        type="text"
                                        value={summaryData.recorderLastName}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, recorderLastName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-purple-500 text-black"
                                        placeholder="นามสกุล"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button - Mobile */}
                <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t border-gray-200">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-[#0ab4ab] text-white rounded-lg py-3 font-medium shadow-md hover:bg-[#0ab4ab]/90 focus:ring-2 focus:ring-[#0ab4ab] focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : 'Save Data'}
                    </button>
                </div>
            </div>

            {/*เพิ่ม loading overlay */}
            {
                isLoading && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                            <p className="mt-2">Saving...</p>
                        </div>
                    </div>
                )
            }

            {/* ปุ่ม submit button section */}
            <div className="mt-4 flex justify-end gap-4">
                <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-400 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                    Clear Data
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                    {isLoading ? 'Saving...' : 'Save Data'}
                </button>
            </div>
        </form>
    );
};

export default ShiftForm;

