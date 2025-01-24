'use client';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ShiftForm() { //สร้าง function ชื่อ ShiftForm
    const [formData, setFormData] = useState({ //สร้างตัวแปร formData และ setFormData
        date: '', //เก็บวันที่
        shift: '', //เก็บช่วงเวลา
        wards: { //เก็บข้อมูลของแต่ละวอร์ด
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
        totals: { //เก็บข้อมูลรวม
            nurse: '',
            manager: '',
            RN: '',
            PN: '',
            NA: '',
            admin: ''
        },
        patientStats: { //เก็บข้อมูลสถิติผู้ป่วย
            opdCount: '', //เก็บจำนวนผู้ป่วยนอก
            existingPatients: '', //เก็บจำนวนผู้ป่วยเก่า
            newPatients: '',//เก็บจำนวนผู้ป่วยใหม่
            admitCount: '', //เก็บจำนวนผู้ป่วยที่รับเข้า
        },
        patientMovement: { //เก็บข้อมูลการเคลื่อนไหวของผู้ป่วย
            newAdmissions: '', //ผู้ป่วยใหม่
            transfers: '', //ผู้ป่วยที่ถูกย้าย
            referIn: '', //ผู้ป่วยที่ถูกส่งมา
            transferOut: '', //ผู้ป่วยที่ถูกย้ายออก
            referOut: '', //ผู้ป่วยที่ถูกส่งออก
            discharge: '', //ผู้ป่วยที่จำหน่าย
            deaths: ''//ผู้ป่วยที่เสียชีวิต
        },
        supervisorSignature: ''//เก็บลายเซ็นผู้ควบคุม
});
