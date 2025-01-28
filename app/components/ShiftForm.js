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
    const [formData, setFormData] = useState({
        date: '',
        shift: '',
        wards: {
            ward6: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ward7: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ward8: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ward9: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            wardGI: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ward10B: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },

            ward11: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ward12: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            ICU: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            CCU: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            LR: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            },
            NSY: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            }
        },
        totals: {
            numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
            newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
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
        const today = new Date();
        // แปลง Date เป็น YYYY-MM-DD format สำหรับ input
        const isoDate = today.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, date: isoDate }));
        setThaiDate(formatThaiDate(isoDate));
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
            newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
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
                        newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
                    }
                ])
            ),
            totals: {
                numberOfPatients: '', manager: '', RN: '', PN: '', NA: '', admin: '',
                newAdmissions: '', transfers: '', referOut: '', discharge: '', deaths: ''
            }
        });
    };

    // แก้ไขชื่อฟิลด์ของ collection และเพิ่มเงื่อนไขในฟังก์ชัน handleSubmit
    const handleSubmit = async (element) => {
        element.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, 'staffRecords'), formData); // Fix typo in collection name
            alert('บันทึกข้อมูลสำเร็จ');
            resetForm();
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
                value === '' ? '' : Math.max(0, parseInt(value) || 0)
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
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <h1 className="text-xl font-bold text-center text-black mb-4">สรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน</h1>
                {/* สร้างส่วนของฟอร์มที่ใช้ในการเลือกวันที่ */}
                <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-center">
                        <div className="flex items-center gap-4 ">
                            <label className="text-sm font-medium text-black">วันที่</label>
                            <div className="flex gap-2 items-center text-sm">
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={handleDateChange}
                                    required
                                    lang="th-TH"
                                    className="px-2 py-1 border rounded text-black [&::-webkit-calendar-picker-indicator]:bg-inherit [&::-webkit-datetime-edit]:p-0"
                                    style={{
                                        WebkitLocaleDateFormat: 'dd/mm/yyyy',
                                        dateFormat: 'dd/mm/yyyy'
                                    }}
                                />
                                <span className="text-black">{thaiDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* สร้างส่วนของฟอร์มที่ใช้ในการเลือกกะงาน */}
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-black">กะงาน</label>
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
            {/* Desktop View - Table */}
            <div className="hidden md:block w-full overflow-x-auto mt-4">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead className="bg-gray-100">
                        <tr>
                            <th rowSpan="2" className="border border-gray-300 text-black p-2">Ward</th>
                            <th rowSpan="2" className="border border-gray-300 text-black p-2">คงพยาบาล (จำนวนผู้ป่วย)</th>
                            <th colSpan="5" className="border border-gray-300 text-black p-2">อัตรากำลัง</th>
                            <th colSpan="5" className="border border-gray-300 text-black p-2">จำนวนผู้ป่วย</th>
                        </tr>
                        <tr>
                            <th className="border border-gray-300 text-black p-2">ผจก.</th>
                            <th className="border border-gray-300 text-black p-2">RN</th>
                            <th className="border border-gray-300 text-black p-2">PN</th>
                            <th className="border border-gray-300 text-black p-2">NA</th>
                            <th className="border border-gray-300 text-black p-2">ธุรการ</th>
                            <th className="border border-gray-300 text-black p-2">รับใหม่</th>
                            <th className="border border-gray-300 text-black p-2">รับย้าย</th>
                            <th className="border border-gray-300 text-black p-2">Refer Out</th>
                            <th className="border border-gray-300 text-black p-2">กลับบ้าน</th>
                            <th className="border border-gray-300 text-black p-2">dead</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(formData.wards).map(([ward, data]) => (
                            <tr key={ward}>
                                <td className="border border-gray-300 text-center text-black p-2">{ward}</td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.numberOfPatients}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, numberOfPatients: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.manager}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, manager: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.RN}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, RN: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.PN}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, PN: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.NA}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, NA: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.admin}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, admin: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.newAdmissions}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, newAdmissions: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.transfers}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, transfers: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referOut}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, referOut: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.discharge}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, discharge: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.deaths}
                                        onChange={(element) =>
                                            handleInputChange('wards', ward, { ...data, deaths: element.target.value })
                                        }
                                        className="w-full text-center text-black"
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td className="border border-gray-300 text-center text-black p-2">Total</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.numberOfPatients}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.manager}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.RN}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.PN}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.NA}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.admin}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.newAdmissions}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.transfers}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.referOut}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.discharge}</td>
                            <td className="border border-gray-300 p-2 text-center text-black">{formData.totals.deaths}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {/*แสดงผลแบบ Mobile*/}
            <div className="block md:hidden mt-4">
                <div className="grid grid-cols-1 gap-6 mb-6">
                    {Object.entries(formData.wards).map(([ward, data]) => (
                        <div key={ward} className="bg-white rounded-lg shadow-sm p-4 text-center">
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
                                                className="w-full rounded border p-1 text-center"
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
                                                className="w-full rounded border p-1 text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* เพิ่ม loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                        <p className="mt-2">กำลังบันทึกข้อมูล...</p>
                    </div>
                </div>
            )}

            {/* ปุ่ม submit button section */}
            <div className="mt-4 flex justify-end gap-4">
                <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                    ล้างข้อมูล
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                {/* ปุ่มส่งออกไปยัง Excel */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                    {isExporting ? 'กำลัง Export...' : 'Export to Excel'}
                </button>
            </div>
        </form>
    );
};

export default ShiftForm; //ส่ง ShiftForm ออกไปใช้งาน
