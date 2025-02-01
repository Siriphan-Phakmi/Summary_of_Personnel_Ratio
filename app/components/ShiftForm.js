'use client';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';

//คือส่วนของฟอร์มที่ใช้ในการกรอกข้อมูลของแต่ละวอร์ด
const ShiftForm = () => {
    const [isLoading, setIsLoading] = useState(false);
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
        newCase: '', 
        transferIn: '', 
        referIn: '', 
        referOut: '', 
        planDC: '', 
        dead: '', 
        availableBeds: '', 
        plannedDischarge: '', 
        unavailable: '', // แก้ไขตัวแปร maintainanceRooms เป็น unavailable
        comment: ''
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

    // ฟังก์ชันสำหรับจัดรูปแบบวันที่เป็น dd/mm/yyyy โดยไม่สนใจ locale ของ browser
    const formatThaiDate = (isoDate) => {
        if (!isoDate) return '';
        // แยกส่วนประกอบของวันที่จาก ISO string
        const [year, month, day] = isoDate.split('-').map(Number);
        // จัดรูปแบบให้เป็น dd/mm/yyyy
        const formattedDay = String(day).padStart(2, '0'); // ใส่ 0 ข้างหน้าถ้าเป็นเลขเดียว
        const formattedMonth = String(month).padStart(2, '0');
        const thaiYear = year + 543;
        // ส่งคืนในรูปแบบ dd/mm/yyyy
        return `${formattedDay}/${formattedMonth}/${thaiYear}`;
    };

    useEffect(() => {
        if (typeof window !== 'undefined') { // เช็คว่าอยู่ฝั่ง client
            const today = new Date();
            const isoDate = today.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, date: isoDate }));
            setThaiDate(formatThaiDate(isoDate));
        }
    }, []);

    // Add useEffect for automatic total calculation
    useEffect(() => {
        calculateTotals();
    }, [formData.wards]);

    const handleDateChange = (element) => {
        const newDate = element.target.value;
        setFormData(prev => ({ ...prev, date: newDate }));
        setThaiDate(formatThaiDate(newDate));
    };

    // ปรับปรุงฟังก์ชัน calculateTotals
    const calculateTotals = () => {
        const totals = Object.values(formData.wards).reduce((acc, ward) => {
            Object.keys(ward).forEach(key => {
                if (key !== 'comment') {  // ไม่รวมช่องหมายเหตุในการคำนวณ
                    const value = parseInt(ward[key]) || 0;
                    acc[key] = (parseInt(acc[key]) || 0) + value;
                }
            });
            return acc;
        }, { ...initialWardData });
        setFormData(prev => ({ ...prev, totals }));
    };

    const validateForm = () => {
        if (!formData.date || !formData.shift) {
            alert('กรุณาเลือกวันที่และกะงาน');
            return false;
        }
        const hasData = Object.values(formData.wards).some(ward =>
            Object.values(ward).some(value => value !== '')
        );
        if (!hasData) {
            alert('กรุณากรอกข้อมูลอย่างน้อย 1 Ward');
            return false;
        }
        if (!summaryData.supervisorName.trim()) {
            alert('กรุณาลงชื่อผู้ตรวจการก่อนบันทึกข้อมูล');
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
            alert('ไม่มีข้อมูลให้เคลียร์');
            return;
        }

        // Show confirmation dialog if there is data
        if (!confirm('คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?')) {
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
    const handleSubmit = async (element) => {
        element.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // เพิ่มเวลาปัจจุบันในรูปแบบที่อ่านได้
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Include summaryData and time in the submission
            const dataToSubmit = {
                ...formData,
                summaryData,
                timestamp: serverTimestamp(),
                recordedTime: formattedTime, // เวลาที่บันทึก
                recordedDate: now.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };

            await addDoc(collection(db, 'staffRecords'), dataToSubmit);

            // รีเซ็ตข้อมูลทั้งหมด
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

            alert('บันทึกข้อมูลสำเร็จ');
        } catch (error) {
            console.error('Error:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // แก้ไขฟังก์ชัน handleInputChange ให้สามารถรับค่าที่เป็นเลขที่มากกว่าหรือเท่ากับ 0
    const handleInputChange = (section, ward, data) => {
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                key,
                // Special handling for remarks field
                key === 'comment' ? value : (value === '' ? '' : Math.max(0, parseInt(value) || 0).toString())
            ])
        );

        // Calculate currentPatients based on the formula
        const numberOfPatients = parseInt(sanitizedData.numberOfPatients) || 0;
        const newCase = parseInt(sanitizedData.newCase) || 0;
        const referIn = parseInt(sanitizedData.referIn) || 0;
        const transferIn = parseInt(sanitizedData.transferIn) || 0;
        const referOut = parseInt(sanitizedData.referOut) || 0;
        const planDC = parseInt(sanitizedData.planDC) || 0;
        const dead = parseInt(sanitizedData.dead) || 0;

        // จำนวนผู้ป่วย + รับใหม่ + Refer In + รับย้าย - Refer Out - กลับบ้าน - เสียชีวิต
        sanitizedData.currentPatients = (numberOfPatients + newCase + referIn + transferIn - referOut - planDC - dead).toString();

        setFormData(prev => ({
            ...prev,
            wards: {
                ...prev.wards,
                [ward]: sanitizedData
            }
        }));
    };

    return (

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-2 text-center">
            {/*ส่วน*/}
            <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-6 mb-6">
                <h1 className="text-2xl font-semibold text-[#0ab4ab] mb-6">
                    Daily Patient Census and Staffing
                </h1>
                {/*ส่วนของวันที่และกะงาน*/}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm justify-center">
                            <label className="font-medium text-gray-700 whitespace-nowrap ">Date</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={handleDateChange}
                                    required
                                    className="px-2 py-1 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab]"
                                />
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

            {/* Desktop View - Table */}
            <div className="hidden md:block w-full max-w-screen-xl mx-auto overflow-x-auto mt-4">
                <table className="w-full bg-white rounded-lg overflow-hidden shadow-lg">
                    <thead>
                        <tr className="bg-[#0ab4ab] text-white">
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Ward</th>
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Patient Census</th>
                            <th colSpan="4" className="border p-2 text-center whitespace-nowrap">Staff</th>
                            <th colSpan="6" className="border p-2 text-center whitespace-nowrap">Patient Census</th>
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Available</th>
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Plan D/C</th>
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap">Unavailable</th>
                            <th rowSpan="2" className="border p-2 text-center whitespace-nowrap w-40">Comment</th>
                        </tr>
                        <tr className="bg-[#0ab4ab] text-white text-sm">
                            <th className="border p-2 text-center whitespace-nowrap">Nurse Manager</th>
                            <th className="border p-2 text-center whitespace-nowrap">RN</th>
                            <th className="border p-2 text-center whitespace-nowrap">PN</th>
                            <th className="border p-2 text-center whitespace-nowrap">WC</th>
                            <th className="border p-2 text-center whitespace-nowrap">New Case</th>
                            <th className="border p-2 text-center whitespace-nowrap">Refer In</th>
                            <th className="border p-2 text-center whitespace-nowrap">Transfer In</th>
                            <th className="border p-2 text-center whitespace-nowrap">Refer Out</th>
                            <th className="border p-2 text-center whitespace-nowrap">Plan D/C</th>
                            <th className="border p-2 text-center whitespace-nowrap">Dead</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(formData.wards).map(([ward, data]) => (
                            <tr key={ward} className="border-b hover:bg-gray-50">
                                <td className="border p-2 text-black text-center">{ward}</td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.numberOfPatients}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, numberOfPatients: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.nurseManager}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, nurseManager: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.RN}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, RN: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.PN}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, PN: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.WC}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, WC: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.newCase}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, newCase: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.transferIn}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, transferIn: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referIn}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, referIn: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referOut}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, referOut: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.planDC}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, planDC: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.dead}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, dead: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.availableBeds}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, availableBeds: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.plannedDischarge}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, plannedDischarge: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.unavailable}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, unavailable: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="text"
                                        value={data.comment}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, comment: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        placeholder="Comment"
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50">
                            <td className="border border-gray-200 text-center text-black p-2 font-semibold">Total</td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.numberOfPatients > 0 ? formData.totals.numberOfPatients : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.nurseManager > 0 ? formData.totals.nurseManager : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.RN > 0 ? formData.totals.RN : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.PN > 0 ? formData.totals.PN : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.WC > 0 ? formData.totals.WC : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.newCase > 0 ? formData.totals.newCase : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.transferIn > 0 ? formData.totals.transferIn : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.referIn > 0 ? formData.totals.referIn : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.referOut > 0 ? formData.totals.referOut : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.planDC > 0 ? formData.totals.planDC : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.dead > 0 ? formData.totals.dead : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.availableBeds > 0 ? formData.totals.availableBeds : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.plannedDischarge > 0 ? formData.totals.plannedDischarge : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.unavailable > 0 ? formData.totals.unavailable : '-'}
                            </td>
                            <td className="border border-gray-200 p-2 text-center text-black">
                                {formData.totals.comment ? formData.totals.comment : '-'}
                            </td>
                        </tr>
                    </tbody>
                </table>
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
                                className="p-2 border rounded text-center text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">Old Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                className="p-2 border rounded text-center text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">New Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                className="p-2 border rounded text-center text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 text-center font-medium text-black">Admit 24 Hours</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.admissions24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                className="p-2 border rounded text-center text-black"
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
                                    onChange={(element) => setSummaryData(prev => ({ ...prev, supervisorName: element.target.value }))}
                                    className="w-64 px-3 py-2 border border-[#0ab4ab]/30 rounded-md text-black bg-white text-gray-900" /* Changed: Added fixed width */
                                    placeholder="Name - Surname : Supervisor"
                                />
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            {/*แสดงผลแบบ Mobile*/}
            <div className="md:hidden space-y-3 px-2">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(formData.wards).map(([ward, data]) => (
                        <div key={ward} className="bg-white rounded-lg text-black shadow p-3 border border-[#0ab4ab]/10">
                            <h3 className="text-base font-semibold mb-2 text-center border-b pb-1">{ward}</h3>
                            
                            {/* Staff Section */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <label className="block text-gray-600">Census</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.numberOfPatients}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, numberOfPatients: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600">Nurse Manager</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.nurseManager}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, nurseManager: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-1 text-xs">
                                    <div>
                                        <label className="block text-gray-600">RN</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.RN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, RN: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600">PN</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.PN}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, PN: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600">WC</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.WC}
                                            onChange={(e) => handleInputChange('wards', ward, { ...data, WC: e.target.value })}
                                            className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Patient Movement */}
                            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                <div>
                                    <label className="block text-gray-600">New Case</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.newCase}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, newCase: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-600">Transfer</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.transferIn}
                                        onChange={(e) => handleInputChange('wards', ward, { ...data, transferIn: e.target.value })}
                                        className="w-full text-center border-0 focus:ring-0 text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Comment */}
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={data.comment}
                                    onChange={(e) => handleInputChange('wards', ward, { ...data, comment: e.target.value })}
                                    className="w-full rounded border p-1 text-xs text-gray-900"
                                    placeholder="Comment..."
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 24 Hour Summary - Mobile */}
                <div className="bg-white rounded-lg shadow p-3">
                    <h3 className="text-base font-semibold mb-2 text-black text-center border-b pb-1">24-hour Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <label className="block text-gray-600">OPD 24hr</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.opdTotal24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                                className="w-full rounded border p-1 text-center text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-600">Old Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                className="w-full rounded border p-1 text-center text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-600">New Patient</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                className="w-full rounded border p-1 text-center text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-600">Admit 24 Hours</label>
                            <input
                                type="text"
                                value={summaryData.admissions24hr}
                                onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                className="w-full rounded border p-1 text-center text-gray-900"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* เพิ่ม loading overlay */}
            {
                isLoading && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                            <p className="mt-2">กำลังบันทึกข้อมูล...</p>
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
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </form >
    );
};

export default ShiftForm; 
