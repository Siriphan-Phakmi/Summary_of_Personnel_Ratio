'use client';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ShiftForm() {
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
            ward10: { 
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

    const formatThaiDate = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        const thaiYear = parseInt(year) + 543;
        return `${day}/${month}/${thaiYear}`;
    };

    useEffect(() => {
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, date: isoDate }));
        setThaiDate(formatThaiDate(isoDate));
    }, []);

    const handleDateChange = (element) => {
        const newDate = element.target.value;
        setFormData(prev => ({ ...prev, date: newDate }));
        setThaiDate(formatThaiDate(newDate));
    };

    const handkeSubmit = async (element) => {
        element.preventDefault();
        try {
            await addDoc(collection(db, 'staffReacords'), formData);
            alert('บันทึกข้อมูลสำเร็จ');
        } catch (error) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    return (
        <form onSubmit={handkeSubmit} className='shift-form p-4'>
            <div className='flex justify-center items-center space-x-4 text-black p-3'>
                <h1 className="text-lg font-medium whitespace-nowrap">สรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน</h1>
                <div className='flex items-center space-x-2'>
                    <label className="whitespace-nowrap">เลือกวันที่</label>
                    <div className="flex items-center gap-2">
                        <input
                            type='date'
                            value={formData.date}
                            onChange={handleDateChange}
                            required
                            className='px-2 py-1 border rounded text-black'
                        />
                        <span className="text-black">{thaiDate}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <label className='whitespace-nowrap'>กะงาน</label>
                    <div className='flex space-x-4'>
                        <label className='flex items-center space-x-1 cursor-pointer'>
                            <input
                                type='checkbox'
                                name='shift'
                                value='07:00-19:00'
                                checked={formData.shift === '07:00-19:00'}
                                onChange={(element) => {
                                    if (element.target.checked) {
                                        setFormData({ ...formData, shift: "07:00-19:00" });
                                    } else {
                                        setFormData({ ...formData, shift: "" });
                                    }
                                }}
                            />
                            <span className="whitespace-nowrap text-black">เช้า 07:00-19:00น.</span>
                        </label>
                        <label className='flex items-center space-x-1 cursor-pointer'>
                            <input
                                type='checkbox'
                                name='shift'
                                value='19:00-07:00'
                                checked={formData.shift === '19:00-07:00'}
                                onChange={(element) => {
                                    if (element.target.checked) {
                                        setFormData({ ...formData, shift: "19:00-07:00" });
                                    } else {
                                        setFormData({ ...formData, shift: "" });
                                    }
                                }}
                            />
                            <span className="whitespace-nowrap text-black">ดึก 19:00-07:00น.</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className='w-full overflow-x-auto mt-4'>
                <table className='min-w-full bg-white border border-gray-300'>
                    <thead className='bg-gray-100'>
                        <tr>
                            <th rowSpan="2" className='border border-gray-300 text-black p-2'>Ward</th>
                            <th rowSpan="2" className='border border-gray-300 text-black p-2'>คงพยาบาล (จำนวนผู้ป่วย)</th>
                            <th colSpan="5" className='border border-gray-300 text-black p-2'>อัตรากำลัง</th>
                            <th colSpan="5" className='border border-gray-300 text-black p-2'>จำนวนผู้ป่วย</th>
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
                                <td className='border border-gray-300 text-center text-black p-2'>{ward}</td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.numberOfPatients}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, numberOfPatients: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.manager}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, manager: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.RN}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, RN: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.PN}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, PN: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.NA}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, NA: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.admin}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, admin: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.newAdmissions}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, newAdmissions: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.transfers}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, transfers: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.referOut}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, referOut: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.discharge}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, discharge: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                                <td className='border border-gray-300 p-2'>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.deaths}
                                        onChange={(element) => handleInputChange('wards', ward, { ...data, deaths: element.target.value })}
                                        className='w-full text-center text-black'
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td className='border border-gray-300 text-center text-black p-2'>Total</td>
                        </tr>
                    </tbody>
                </table>
            </div>
  
            <div className='mt-4 flex justify-end'>
                <button 
                    type="submit"
                    className='bg-red-500 text-white px-4 py-2 rounded hover:bg-green-600'
                >
                    บันทึกข้อมูล
                </button>
            </div>
        </form>
    );
}
