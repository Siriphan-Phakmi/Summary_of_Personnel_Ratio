'use client';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ShiftForm() {
    // เพิ่ม state สำหรับเก็บวันที่แบบไทย
    const [thaiDate, setThaiDate] = useState('');

    // สร้าง state สำหรับเก็บข้อมูลฟอร์ม
    const [formData, setFormData] = useState({
        date: '',
        shift: '',
        wards: {
            ward6: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward7: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward8: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward9: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward10: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward11: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ward12: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            ICU: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            CCU: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            LR: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' },
            NSY: { nurse: '', manager: '', RN: '', PN: '', NA: '', admin: '' }
        },
        totals: {
            nurse: '',
            manager: '',
            RN: '',
            PN: '',
            NA: '',
            admin: ''
        },
        patientStats: {
            opdCount: '',
            existingPatients: '',
            newPatients: '',
            admitCount: '',
        },
        patientMovement: {
            newAdmissions: '',
            transfers: '',
            referIn: '',
            transferOut: '',
            referOut: '',
            discharge: '',
            deaths: ''
        },
        supervisorSignature: ''
    });
    const formatThaiDate = (isoDate) => {     // ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
        if (!isoDate) return '';// ถ้าไม่มีวันที่ให้คืนค่าว่าง
        const [year, month, day] = isoDate.split('-');// แยกปี เดือน วัน ออกจากวันที่
        const thaiYear = parseInt(year) + 543;// นำปีไทยมาเพิ่ม 543 ปี
        return `${day}/${month}/${thaiYear}`;// คืนค่าวันที่ในรูปแบบไทย
    };// สร้างฟังก์ชันแปลงวันที่เป็นรูปแบบไทย

    useEffect(() => { // ฟังก์ชันจัดการการเปลี่ยนแปลงวันที่
        const today = new Date();// อ่านวันที่ปัจจุบัน
        const isoDate = today.toISOString().split('T')[0];// แปลงวันที่เป็นรูปแบบ ISO
        setFormData(prev => ({ ...prev, date: isoDate }));// บันทึกวันที่ปัจจุบัน
        setThaiDate(formatThaiDate(isoDate));// แปลงวันที่เป็นรูปแบบไทย
    }, []);// สั่งให้ฟังก์ชันทำงานครั้งเดียวเมื่อคอมโพเนนต์ถูกสร้าง
    
    const handleDateChange = (element) => { // ฟังก์ชันจัดการการเปลี่ยนแปลงวันที่
        const newDate = element.target.value;// อ่านค่าวันที่ใหม่จากอิลิเมนต์
        setFormData(prev => ({ ...prev, date: newDate }));// บันทึกวันที่ใหม่
        setThaiDate(formatThaiDate(newDate));// แปลงวันที่เป็นรูปแบบไทย
    };// สร้างฟังก์ชันจัดการการเปลี่ยนแปลงวันที่

    // ฟังก์ชันสำหรับบันทึกข้อมูลลง Firebase
    const handkeSubmit = async (element) => {
        element.preventDefault();
        try {
            await addDoc(collection(db, 'staffReacords'), formData);
            alert('บันทึกข้อมูลสำเร็จ')
        } catch (error) {
            alert('เกิดข้อผิดพลาด')
        }
    };

    // ฟังก์ชันจัดการการเปลี่ยนแปลงข้อมูลในฟอร์ม
    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } })); // บันทึกข้อมูลใหม่
    }; 

    return (
        <form onSubmit={handkeSubmit} className='shift-form p-4'> {/* ส่วนฟอร์ม */}   
            <div className='flex justify-center items-center space-x-4 text-white p-3'> {/* ส่วนหัวฟอร์ม */}
                <h1 className="text-lg font-medium whitespace-nowrap">สรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน</h1> {/* ข้อความหัวฟอร์ม */}
                <div className='flex items-center space-x-2'> {/* ส่วนปุ่มบันทึก */}
                    <label className="whitespace-nowrap">วันที่</label>  {/* ส่วนเลือกวันที่ */}
                    <div className="flex items-center gap-2"> {/* ส่วนเลือกวันที่ */}
                        <input // อิลิเมนต์เลือกวันที่
                            type='date' // ประเภทของอิลิเมนต์
                            value={formData.date} // ค่าของอิลิเมนต์
                            onChange={handleDateChange} // ฟังก์ชันที่จะทำงานเมื่อมีการเปลี่ยนแปลง
                            required // บังคับให้กรอกข้อมูล
                            className='px-2 py-1 border rounded text-black' // รูปแบบของอิลิเมนต์
                        />
                        <span className="text-white">{thaiDate}</span> {/* แสดงวันที่ในรูปแบบไทย */}
                    </div> 
                </div>
                {/* ส่วนเลือกกะงาน */}
                <div className="flex items-center space-x-2"> 
                    <label className='whitespace-nowrap'>กะงาน</label> {/* ข้อความเลือกกะงาน */}
                    <div className='flex space-x-4'> {/* ตัวเลือกกะงาน */}
                        <label className='flex items-center space-x-1 cursor-pointer'> 
                            <input // อิลิเมนต์เลือกกะเช้า
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
                            <span className="whitespace-nowrap text-white">เช้า 07:00-19:00น.</span>
                        </label>
                        {/* ตัวเลือกกะดึก */}
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
                            <span className="whitespace-nowrap text-white">ดึก 19:00-07:00น.</span>
                        </label>
                    </div>
                </div>
            </div>
        </form>
    );
}
