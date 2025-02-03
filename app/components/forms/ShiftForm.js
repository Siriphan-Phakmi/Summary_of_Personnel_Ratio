'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import Calendar from '@/app/components/ui/Calendar';

//คือส่วนของฟอร์มที่ใช้ในการกรอกข้อมูลของแต่ละวอร์ด
const ShiftForm = () => {
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
        supervisorName: '', // ลงชื่อผู้ตรวจการ - ชื่อผู้รับผิดชอบประจำกะ
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

    // ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบไทย
    const formatThaiDate = (date) => {
        if (!date) return '';
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        // ถ้า date เป็น string (ISO format) แปลงเป็น Date object
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        const day = dateObj.getDate();
        const month = thaiMonths[dateObj.getMonth()];
        const year = dateObj.getFullYear() + 543;
        return `วันที่: ${day} ${month} ${year}`;
    };

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

    const validateForm = () => {
        if (!formData.date || !formData.shift) {
            alert('Please select a date and shift');
            return false;
        }
        const hasData = Object.values(formData.wards).some(ward =>
            Object.values(ward).some(value => value !== '')
        );
        if (!hasData) {
            alert('Please enter data for at least 1 Ward');
            return false;
        }
        if (!summaryData.supervisorName.trim()) {
            alert('Please sign the supervisor before saving the data');
            return false;
        }

        return true;
    };

    const resetForm = () => {
        // Check if there's any data in the form
        const hasWardData = Object.values(formData.wards).some(ward =>
            Object.values(ward).some(value => value !== '')
        );

        const hasSummaryData = Object.values(summaryData).some(value => value !== '');

        const hasAnyData = hasWardData || hasSummaryData || formData.date !== '' || formData.shift !== '';

        if (!hasAnyData) {
            alert('No data to clear');
            return;
        }

        // Show confirmation dialog if there is data
        if (!confirm('Are you sure you want to clear all data?')) {
            return;
        }

        // Reset all form data
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

        // Reset summary data
        setSummaryData({
            opdTotal24hr: '',
            existingPatients: '',
            newPatients: '',
            admissions24hr: '',
            supervisorName: ''
        });
    };

    // แก้ไขชื่อฟิลด์ของ collection และเพิ่มเงื่อนไขในฟังก์ชัน handleSubmit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Check if data already exists for this date and shift
            const q = query(
                collection(db, 'staffRecords'),
                where('date', '==', formData.date),
                where('shift', '==', formData.shift)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const confirmOverwrite = window.confirm(
                    'ข้อมูลของวันที่และกะนี้มีอยู่แล้ว ต้องการบันทึกทับข้อมูลเดิมหรือไม่?'
                );
                if (!confirmOverwrite) {
                    setIsLoading(false);
                    return;
                }
            }

            const now = new Date();
            const formattedTime = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '');

            const formattedDate = formData.date.replace(/-/g, '');
            const docId = `data_${formattedTime}_${formattedDate}`;

            // คำนวณ totals ล่าสุดก่อนส่งข้อมูล
            const finalTotals = calculateTotals;

            // เตรียมข้อมูลสำหรับส่งไป Firebase
            const dataToSubmit = {
                date: formData.date,
                shift: formData.shift,
                wards: {},
                totals: finalTotals,
                overallData: finalTotals.overallData // เพิ่มฟิลด์นี้
            };

            // เพิ่ม overallData ในแต่ละ ward
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

            // บันทึกข้อมูลลง Firebase
            await setDoc(doc(db, 'staffRecords', docId), {
                ...dataToSubmit,
                summaryData,
                timestamp: serverTimestamp(),
                docId: docId
            });

            // รีเซ็ตฟอร์มหลังจากบันทึกสำเร็จ
            setFormData({
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

            setSummaryData({
                opdTotal24hr: '',
                existingPatients: '',
                newPatients: '',
                admissions24hr: '',
                supervisorName: ''
            });

            alert('Saved successfully');
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const [currentStep, setCurrentStep] = useState(0);

    return (
        <form onSubmit={handleSubmit} className="max-w-[1400px] mx-auto p-2">
            {/*ส่วน*/}
            <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-6 mb-6">
                <h1 className="text-2xl text-center font-semibold text-[#0ab4ab] mb-6">
                    Daily Patient Census and Staffing
                </h1>
                {/*ส่วนของวันที่และกะงาน*/}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm justify-center">                            
                            <div className="flex gap-2 items-center">                                
                                <button
                                    type="button"
                                    onClick={() => setShowCalendar(!showCalendar)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                    {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                                </button>
                                {showCalendar && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                                        <div className="relative">
                                            <Calendar
                                                selectedDate={selectedDate}
                                                onDateSelect={(date) => {
                                                    setSelectedDate(date);
                                                    const isoDate = date.toISOString().split('T')[0];
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        date: isoDate
                                                    }));
                                                    setThaiDate(formatThaiDate(date));
                                                    setShowCalendar(false);
                                                }}
                                                onClickOutside={() => setShowCalendar(false)}
                                                datesWithData={datesWithData}
                                                variant="form"
                                            />
                                        </div>
                                    </div>
                                )}
                                <span className="text-gray-700 font-medium">{thaiDate}</span>
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
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">OPD 24 hour</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.opdTotal24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                                className="w-full text-center border-0 focus:ring-0 text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">Old Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                className="w-full text-center border-0 focus:ring-0 text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">New Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                className="w-full text-center border-0 focus:ring-0 text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">Admit 24 Hours</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.admissions24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                className="w-full text-center border-0 focus:ring-0 text-black"
                            />
                        </div>
                    </div>
                </div>
                {/*ส่วนของลงชื่อผู้ตรวจการ*/}
                <div className="mt-6 bg-[#0ab4ab]/50 rounded-lg shadow-lg p-4">
                    <div className="flex justify-end"> {/* Changed: Added flex and justify-end */}
                        <div className="w-fit"> {/* Changed: Added fixed width */}
                            <div className="flex items-center gap-4"> {/* Changed: Added flex layout */}
                                <label className="text-sm font-medium text-black whitespace-nowrap">Supervisor Signature</label>
                                <input
                                    type="text"
                                    value={summaryData.supervisorName}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:ring-offset-2 text-black"
                                    placeholder="Name - Surname : Supervisor"
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

                {/* 24 Hour Summary */}
                <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-4 rounded-xl shadow-lg mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-center text-black">24-hour Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 rounded-lg p-2">
                            <label className="block text-sm font-medium text-black mb-1 text-center">OPD 24hr</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.opdTotal24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                                className="w-full text-center bg-white border border-gray-200 rounded-md py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-black"
                            />
                        </div>
                        <div className="bg-white/50 rounded-lg p-2">
                            <label className="block text-sm font-medium text-black mb-1 text-center">Old Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                className="w-full text-center bg-white border border-gray-200 rounded-md py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-black"
                            />
                        </div>
                        <div className="bg-white/50 rounded-lg p-2">
                            <label className="block text-sm font-medium text-black mb-1 text-center">New Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                className="w-full text-center bg-white border border-gray-200 rounded-md py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-black"
                            />
                        </div>
                        <div className="bg-white/50 rounded-lg p-2">
                            <label className="block text-sm font-medium text-black mb-1 text-center">Admit 24 Hours</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.admissions24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                className="w-full text-center bg-white border border-gray-200 rounded-md py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-black"
                            />
                        </div>
                    </div>
                </div>

                {/* Supervisor Signature */}
                <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-4 rounded-xl shadow-lg mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-center text-black">Supervisor Signature</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={summaryData.supervisorName}
                            onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-black"
                            placeholder="Name - Surname"
                        />
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
        </form >
    );
};

export default ShiftForm; 
