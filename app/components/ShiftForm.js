'use client';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import { fetchStaffRecords, formatDataForExcel, exportToExcel } from '../lib/exportData';

//คือส่วนของฟอร์มที่ใช้ในการกรอกข้อมูลของแต่ละวอร์ด
const ShiftForm = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [thaiDate, setThaiDate] = useState('');
    const [summaryData, setSummaryData] = useState({
        opdTotal24hr: '', //ยอด OPD 24 hour - รวมผู้ป่วยนอกใน 24 ชั่วโมง
        existingPatients: '', // คนไข้เก่า - จำนวนผู้ป่วยที่รักษาต่อเนื่อง
        newPatients: '', // คนไข้ใหม่ - จำนวนผู้ป่วยที่มารับการรักษาครั้งแรก
        admissions24hr: '',// Admit 24 ชม. - จำนวนผู้ป่วยที่รับไว้ใน 24 ชั่วโมง
        supervisorName: '', // ลงชื่อผู้ตรวจการ - ชื่อผู้รับผิดชอบประจำกะ
    });
    const [formData, setFormData] = useState({
        date: '',
        shift: '',
        wards: {
            Ward6: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            Ward7: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            Ward8: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            Ward9: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            WardGI: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            Ward10B: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },

            Ward11: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            Ward12: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            ICU: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            CCU: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            LR: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            },
            NSY: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
                currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
            }
        },
        totals: {
            numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
            newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: '',
            currentPatients: '', availableBeds: '', plannedDischarge: '', maintainanceRooms: '', remarks: ''
        }
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

    const calculateTotals = () => {
        const totals = Object.values(formData.wards).reduce((acc, ward) => {
            Object.keys(ward).forEach(key => {
                const value = parseInt(ward[key]) || 0;
                // ถ้าทุกค่าเป็นค่าว่าง ให้ acc[key] เป็นค่าว่าง
                if (value === 0 && acc[key] === 0) {
                    acc[key] = '';
                } else {
                    acc[key] = (parseInt(acc[key]) || 0) + value;
                }
            });
            return acc;
        }, {
            numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
            newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: ''
        });
        setFormData(prev => ({ ...prev, totals }));
    };

    const validateForm = () => {
        if (!formData.date || !formData.shift) {
            alert('กรุณากรอกวันที่และกะงาน');
            return false;
        }
        const hasData = Object.values(formData.wards).some(ward =>
            Object.values(ward).some(value => value !== '')
        );
        if (!hasData) {
            alert('กรุณากรอกข้อมูลอย่างน้อย 1 Ward');
            return false;
        }
        return true;
    };

    const resetForm = () => {
        // Add confirmation dialog
        if (!confirm('คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?')) {
            return; // If user clicks Cancel, exit the function
        }

        setFormData({
            date: '',
            shift: '',
            wards: Object.fromEntries(
                Object.keys(formData.wards).map(ward => [
                    ward,
                    {
                        numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                        newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: ''
                    }
                ])
            ),
            totals: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referIn: '', referOut: '', discharge: '', deaths: ''
            }
        });
    };

    // แก้ไขชื่อฟิลด์ของ collection และเพิ่มเงื่อนไขในฟังก์ชัน handleSubmit
    const handleSubmit = async (element) => {
        element.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Include summaryData in the submission
            const dataToSubmit = {
                ...formData,
                summaryData,
                timestamp: serverTimestamp()
            };
            
            await addDoc(collection(db, 'staffRecords'), dataToSubmit);
            alert('บันทึกข้อมูลสำเร็จ');
            resetForm();
            // Reset summaryData after successful submission
            setSummaryData({
                opdTotal24hr: '',
                existingPatients: '',
                newPatients: '',
                admissions24hr: '',
                supervisorName: ''
            });
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
                key === 'remarks' ? value : (value === '' ? '' : Math.max(0, parseInt(value) || 0))
            ])
        );
        setFormData(prev => ({
            ...prev,
            wards: {
                ...prev.wards,
                [ward]: sanitizedData
            }
        }));
    };
    // สร้างฟังก์ชัน handleExport สำหรับส่งข้อมูลไปยัง Excel
    const handleExport = async () => {
        if (!formData.date || !formData.shift) {
            alert('กรุณาเลือกวันที่และกะงานก่อน Export');
            return;
        }
        setIsExporting(true);
        try {
            const records = await fetchStaffRecords();
            if (records.length === 0) {
                alert('ไม่พบข้อมูลที่จะส่งออก');
                return;
            }
            const formattedData = formatDataForExcel(records);
            const fileName = `staff-records-${formData.date}-${formData.shift}`;
            exportToExcel(formattedData, fileName);
        } catch (error) {
            console.error('Export error:', error);
            alert(`เกิดข้อผิดพลาดในการส่งออกข้อมูล: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-4 text-center">
            {/*ส่วน*/}
            <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-6 mb-6">
                <h1 className="text-2xl font-semibold text-[#0ab4ab] mb-6">
                    สรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน
                </h1>
                {/*ส่วนของวันที่และกะงาน*/}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                        <div className="flex items-center gap-4 justify-center">
                            <label className="text-sm font-medium text-gray-700">วันที่</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={handleDateChange}
                                    required
                                    className="px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab]"
                                />
                                <span className="text-gray-700 font-medium">{thaiDate}</span>
                            </div>
                        </div>
                        {/* สร้างส่วนของฟอร์มที่ใช้ในการเลือกกะงาน */}
                        <div className="flex items-center gap-4 justify-center">
                            <div className="flex gap-4">
                                {['07:00-19:00', '19:00-07:00'].map((shiftTime) => (
                                    <label
                                        key={shiftTime}
                                        className="flex text-black text-sm items-center gap-2"
                                    >
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
                                        <span>{shiftTime === '07:00-19:00' ? 'เช้า' : 'ดึก'} ({shiftTime})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block w-full overflow-x-auto mt-4">
                <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-lg">
                    <thead>
                        <tr className="bg-[#0ab4ab] text-white">
                            <th rowSpan="2" className="border  p-3">Ward</th>
                            <th rowSpan="2" className="border  p-3">คงพยาบาล (จำนวนผู้ป่วย)</th>
                            <th colSpan="5" className="border  p-3">อัตรากำลัง</th>
                            <th colSpan="6" className="border  p-3">จำนวนผู้ป่วย</th>
                            <th rowSpan="2" className="border  p-3">คงพยาบาล</th>
                            <th rowSpan="2" className="border  p-3">ห้องว่าง</th>
                            <th rowSpan="2" className="border  p-3">Plan D/C</th>
                            <th rowSpan="2" className="border  p-3">ห้องชำรุด</th>
                            <th rowSpan="2" className="border  p-10">หมายเหตุ</th>
                        </tr>
                        <tr className="bg-[#0ab4ab] text-white">
                            <th className="border p-3">ผจก.</th>
                            <th className="border p-3">RN</th>
                            <th className="border  p-3">PN</th>
                            <th className="border  p-3">NA</th>
                            <th className="border  p-3">ธุรการ</th>
                            <th className="border  p-3">รับใหม่</th>
                            <th className="border  p-3">Refer In</th>
                            <th className="border  p-3">รับย้าย</th>
                            <th className="border  p-3">Refer Out</th>
                            <th className="border  p-3">กลับบ้าน</th>
                            <th className="border  p-3">dead</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(formData.wards).map(([ward, data]) => (
                            <tr key={ward}>
                                <td className="border border-gray-200 text-center text-black p-2">{ward}</td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.numberOfPatients}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, numberOfPatients: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.manager}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, manager: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.RN}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, RN: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.PN}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, PN: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.NA}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, NA: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.admin}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, admin: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.newAdmissions}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, newAdmissions: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.transfers}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, transfers: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referIn}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, referIn: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referOut}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, referOut: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.discharge}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, discharge: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.deaths}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, deaths: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.currentPatients}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, currentPatients: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.availableBeds}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, availableBeds: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.plannedDischarge}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, plannedDischarge: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.maintainanceRooms}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, maintainanceRooms: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                    />
                                </td>
                                <td className="border border-gray-200 p-2">
                                    <input
                                        type="text"
                                        value={data.remarks}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, remarks: element.target.value })
                                        }
                                        className="w-full text-center text-black focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] rounded-md"
                                        placeholder="หมายเหตุ"
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td className="border border-gray-200 text-center text-black p-2">Total</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.numberOfPatients}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.manager}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.RN}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.PN}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.NA}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.admin}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.newAdmissions}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.transfers}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.referIn}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.referOut}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.discharge}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.deaths}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.currentPatients}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.availableBeds}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.plannedDischarge}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.maintainanceRooms}</td>
                            <td className="border border-gray-200 p-2 text-center text-black">{formData.totals.remarks}</td>
                        </tr>
                    </tbody>
                </table>
                {/*ส่วนของข้อมูลสรุป 24 ชั่วโมง*/}
                <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
                    <h1 className="text-lg font-semibold text-[#0ab4ab] mt-1">ข้อมูลสรุป 24 ชั่วโมง</h1>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black gap-4">ยอด OPD 24 hour</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.opdTotal24hr}
                                onChange={(element) => setSummaryData(prev => ({ ...prev, opdTotal24hr: element.target.value }))}
                                className="flex-1 px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] text-black bg-white"
                                placeholder="ยอดรวม"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black gap-4">คนไข้เก่า</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.existingPatients}
                                onChange={(element) => setSummaryData(prev => ({ ...prev, existingPatients: element.target.value }))}
                                className="flex-1 px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] text-black bg-white"
                                placeholder="ยอดรวม"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black gap-4">คนไข้ใหม่</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.newPatients}
                                onChange={(element) => setSummaryData(prev => ({ ...prev, newPatients: element.target.value }))}
                                className="flex-1 px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] text-black bg-white"
                                placeholder="ยอดรวม"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-black gap-4">Admit 24 ชม.</label>
                            <input
                                type="number"
                                min="0"
                                value={summaryData.admissions24hr}
                                onChange={(element) => setSummaryData(prev => ({ ...prev, admissions24hr: element.target.value }))}
                                className="flex-1 px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] text-black bg-white"
                                placeholder="ยอดรวม"
                            />
                        </div>
                    </div>
                </div>
                {/*ส่วนของลงชื่อผู้ตรวจการ*/}
                <div className="mt-6 bg-[#0ab4ab]/50 rounded-lg shadow-lg p-4">
                    <div className="flex justify-end"> {/* Changed: Added flex and justify-end */}
                        <div className="w-fit"> {/* Changed: Added fixed width */}
                            <div className="flex items-center gap-4"> {/* Changed: Added flex layout */}
                                <label className="text-sm font-medium text-black whitespace-nowrap">ลงชื่อผู้ตรวจการ</label>
                                <input
                                    type="text"
                                    value={summaryData.supervisorName}
                                    onChange={(element) => setSummaryData(prev => ({ ...prev, supervisorName: element.target.value }))}
                                    className="w-64 px-3 py-2 border border-[#0ab4ab]/30 rounded-md focus:ring-2 focus:ring-[#0ab4ab]/50 focus:border-[#0ab4ab] text-black bg-white" /* Changed: Added fixed width */
                                    placeholder="ชื่อ-นามสกุล : ผู้ตรวจการ"
                                />
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            {/*แสดงผลแบบ Mobile*/}
            <div className="md:hidden space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {Object.entries(formData.wards).map(([ward, data]) => (
                        <div key={ward} className="bg-white rounded-lg shadow-lg p-4 border border-[#0ab4ab]/10">
                            <h3 className="text-lg font-semibold mb-4 text-center text-black border-b pb-2">{ward}</h3>
                            {/* Staff Section */}
                            <div className="space-y-4 mb-6">
                                <h4 className="font-medium text-black text-center">อัตรากำลัง</h4>
                                <div className="grid grid-cols-2 text-black gap-3">
                                    {[
                                        { key: 'numberOfPatients', label: 'คงพยาบาล(จำนวนผู้ป่วย)' },
                                        { key: 'manager', label: 'ผจก.' },
                                        { key: 'RN', label: 'RN' },
                                        { key: 'PN', label: 'PN' },
                                        { key: 'NA', label: 'NA' },
                                        { key: 'admin', label: 'ธุรการ' }
                                    ].map((field) => (
                                        <div key={field.key} className="text-center">
                                            <label className="block text-sm">{field.label}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={data[field.key]}
                                                onChange={(e) =>
                                                    handleInputChange('wards', ward, { ...data, [field.key]: e.target.value })
                                                }
                                                className="w-full rounded border p-1 text-center text-black"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Patient Movement Section */}
                            <div className="space-y-4">
                                <h4 className="font-medium text-black text-center">การเคลื่อนย้ายผู้ป่วย</h4>
                                <div className="grid grid-cols-2 text-black gap-3">
                                    {[
                                        { key: 'newAdmissions', label: 'รับใหม่' },
                                        { key: 'referIn', label: 'Refer In' },
                                        { key: 'transfers', label: 'รับย้าย' },
                                        { key: 'referOut', label: 'Refer Out' },
                                        { key: 'discharge', label: 'กลับบ้าน' },
                                        { key: 'deaths', label: 'เสียชีวิต' }
                                    ].map((field) => (
                                        <div key={field.key} className="text-center">
                                            <label className="block text-sm">{field.label}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={data[field.key]}
                                                onChange={(e) =>
                                                    handleInputChange('wards', ward, { ...data, [field.key]: e.target.value })
                                                }
                                                className="w-full rounded border p-1 text-center text-black"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Information Section */}
                            <div className="space-y-4 mt-6">
                                <h4 className="font-medium text-black text-center">ข้อมูลเพิ่มเติม</h4>
                                <div className="grid grid-cols-2 text-black gap-3">
                                    {[
                                        { key: 'currentPatients', label: 'คงพยาบาล' },
                                        { key: 'availableBeds', label: 'ห้องว่าง' },
                                        { key: 'plannedDischarge', label: 'Plan D/C' },
                                        { key: 'maintainanceRooms', label: 'ห้องชำรุด' }
                                    ].map((field) => (
                                        <div key={field.key} className="text-center">
                                            <label className="block text-sm">{field.label}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={data[field.key]}
                                                onChange={(e) =>
                                                    handleInputChange('wards', ward, { ...data, [field.key]: e.target.value })
                                                }
                                                className="w-full rounded border p-1 text-center text-black"
                                            />
                                        </div>
                                    ))}
                                    {/* Remarks field - full width */}
                                    <div className="col-span-2 text-center mt-2">
                                        <label className="block text-sm">หมายเหตุ</label>
                                        <input
                                            type="text"
                                            value={data.remarks}
                                            onChange={(e) =>
                                                handleInputChange('wards', ward, { ...data, remarks: e.target.value })
                                            }
                                            className="w-full rounded border p-1 text-center text-black"
                                            placeholder="หมายเหตุ"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 24 Hour Summary Section - Mobile */}
                <div className="bg-white rounded-lg shadow-lg p-4 mt-6">
                    <h4 className="font-medium text-black text-center mb-4">ข้อมูลสรุป 24 ชั่วโมง</h4>
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { key: 'opdTotal24hr', label: 'ยอด OPD 24 hour' },
                            { key: 'existingPatients', label: 'คนไข้เก่า' },
                            { key: 'newPatients', label: 'คนไข้ใหม่' },
                            { key: 'admissions24hr', label: 'Admit 24 ชม.' }
                        ].map((field) => (
                            <div key={field.key} className="flex items-center justify-between">
                                <label className="text-sm font-medium text-black">{field.label}</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={summaryData[field.key]}
                                    onChange={(e) => setSummaryData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-1/2 px-3 py-2 border border-[#0ab4ab]/30 rounded-md text-black"
                                    placeholder="ยอดรวม"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Supervisor Section - Mobile */}
                <div className="bg-[#0ab4ab]/50 rounded-lg shadow-lg p-4 mt-4 mb-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-black">ลงชื่อผู้ตรวจการ</label>
                        <input
                            type="text"
                            value={summaryData.supervisorName}
                            onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorName: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#0ab4ab]/30 rounded-md text-black bg-white"
                            placeholder="ชื่อ-นามสกุล : ผู้ตรวจการ"
                        />
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
                    ล้างข้อมูล
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                {/* ปุ่มส่งออกไปยัง Excel */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-teal-500 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                    {isExporting ? 'กำลัง Export...' : 'Export to Excel'}
                </button>
            </div>
        </form >
    );
};

export default ShiftForm; //ส่ง ShiftForm ออกไปใช้งาน
