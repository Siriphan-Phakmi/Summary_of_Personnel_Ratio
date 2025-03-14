'use client';

import { useAlert } from '../../../utils/alertService';
import { useEffect } from 'react';

/**
 * Component เพื่อแสดงข้อความแจ้งเตือนเกี่ยวกับ Firebase Index
 * @param {Object} props - Component props
 * @param {string} props.errorMessage - ข้อความ error ที่มี URL สำหรับสร้าง index
 * @returns {React.ReactNode} - null (เนื่องจากใช้ context alert)
 */
export const FirebaseIndexErrorHandler = ({ errorMessage }) => {
    const { Swal } = useAlert();
    
    useEffect(() => {
        if (!errorMessage) return;
        
        // ตรวจสอบว่า error message มี URL สำหรับสร้าง index หรือไม่
        if (typeof errorMessage === 'string' && errorMessage.includes('https://console.firebase.google.com')) {
            // แยก URL จาก error message
            const urlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
            if (urlMatch && urlMatch[1]) {
                const indexUrl = urlMatch[1];
                
                // แสดงข้อความแจ้งเตือนและให้ผู้ใช้คลิกลิงก์เพื่อสร้าง index
                Swal.fire({
                    title: 'ต้องสร้าง Index ใน Firebase',
                    html: `
                        <p>ระบบต้องการ index สำหรับการค้นหาข้อมูล</p>
                        <p>กรุณาคลิกปุ่มด้านล่างเพื่อสร้าง index</p>
                        <p><a href="${indexUrl}" target="_blank" rel="noopener noreferrer" style="color: #0ab4ab;">คลิกที่นี่เพื่อสร้าง Index</a></p>
                        <p>หลังจากสร้าง index แล้ว รอสักครู่และรีเฟรชหน้านี้</p>
                    `,
                    type: 'info',
                    confirmText: 'รับทราบ'
                });
                
                // เปิด URL ในแท็บใหม่
                window.open(indexUrl, '_blank');
            }
        }
    }, [errorMessage, Swal]);
    
    return null;
};

/**
 * ฟังก์ชันช่วยนำทางผู้ใช้ไปยังการสร้าง Firebase index
 * @param {string} errorMessage - ข้อความ error ที่มี URL สำหรับสร้าง index
 * @returns {boolean} - true ถ้าสามารถนำทางได้สำเร็จ
 */
export const navigateToCreateIndex = (errorMessage) => {
    // ตรวจสอบว่า error message มี URL สำหรับสร้าง index หรือไม่
    if (typeof errorMessage === 'string' && errorMessage.includes('https://console.firebase.google.com')) {
        // แยก URL จาก error message
        const urlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
        if (urlMatch && urlMatch[1]) {
            const indexUrl = urlMatch[1];
            
            // ไม่สามารถใช้ Swal ได้โดยตรงเพราะไม่ได้อยู่ใน React component
            // แสดงข้อความแจ้งเตือนแบบ native
            console.warn('Firebase index required:', indexUrl);
            const confirmOpen = window.confirm('ต้องสร้าง index ใน Firebase เพื่อให้การค้นหาข้อมูลทำงานได้ ต้องการเปิดหน้าเว็บสำหรับสร้าง index หรือไม่?');
            
            if (confirmOpen) {
                // เปิด URL ในแท็บใหม่
                window.open(indexUrl, '_blank');
                return true;
            }
        }
    }
    return false;
};

/**
 * ฟังก์ชันจัดการ Firebase Error ที่เกี่ยวข้องกับ index
 * @param {Error} error - ข้อผิดพลาดที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าสามารถจัดการข้อผิดพลาดได้สำเร็จ
 */
export const handleFirebaseIndexError = (error) => {
    if (error && error.message && error.message.includes('The query requires an index')) {
        console.log('Detected Firebase Index Error');
        return navigateToCreateIndex(error.message);
    }
    return false;
}; 