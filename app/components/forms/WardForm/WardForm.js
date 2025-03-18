'use client';

// Import components and functions from submodules
import {
    fetchDatesWithData,
    fetchPreviousShiftData,
    fetchApprovalData,
    fetchLatestRecord,
    checkApprovalStatus,
    safeFetchWardData,
    handleInputChange,
    handleShiftChange,
    handleDateSelect,
    handleBeforeUnload,
    handleWardFormSubmit,
    calculateTotal,
    ApprovalDataButton,
    LatestRecordButton,
    checkPast30DaysRecords,
    fetchWardData,
    parseInputValue,
    navigateToCreateIndex,
    MainFormContent,
    checkMorningShiftDataExists,
    fetchLast7DaysData,
    calculatePatientCensus,
    checkFinalApprovalStatus
} from './index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    getLatestDraft,
    deleteWardDataDraft,
    logWardDataHistory
} from '../../../lib/dataAccess';

import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { getThaiDateNow, formatThaiDate, getUTCDateString } from '../../../utils/dateUtils';
import { getCurrentShift } from '../../../utils/dateHelpers';
import { format } from 'date-fns';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';

import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';
import DepartmentStatusCard from '../../common/DepartmentStatusCard';
import FormActions from '../../common/FormActions';
import ApprovalHistory from '../../common/ApprovalHistory';

const WardForm = ({ selectedWard, ...props }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [initError, setInitError] = useState(null);
    
    // State variables
    const [showForm, setShowForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(() => {
      const currentShift = getCurrentShift();
      console.log('Initial shift set to:', currentShift);
      return currentShift;
    });
    const [thaiDate, setThaiDate] = useState(getThaiDateNow());
    const [showCalendar, setShowCalendar] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [previousShiftData, setPreviousShiftData] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null);
    const [latestRecordDate, setLatestRecordDate] = useState(null);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shiftStatus, setShiftStatus] = useState(null);
    const [approvalPending, setApprovalPending] = useState(false);
    const [supervisorApproved, setSupervisorApproved] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [originalData, setOriginalData] = useState(null);
    
    const [formData, setFormData] = useState({
        patientCensus: '',
        overallData: '',
        newAdmit: '',
        transferIn: '',
        referIn: '',
        transferOut: '',
        referOut: '',
        discharge: '',
        dead: '',
        rns: '',
        pns: '',
        nas: '',
        aides: '',
        studentNurses: '',
        notes: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        isDraft: false
    });

    const [showHistory, setShowHistory] = useState(false);

    // Add timeout for loading state
    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                setInitError('การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
            }
        }, 15000); // 15 seconds timeout

        return () => clearTimeout(loadingTimeout);
    }, [isLoading]);

    // Initialize data when component mounts
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard || !selectedDate) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setInitError(null);
            
            try {
                // Fetch dates with data
                const dates = await Promise.race([
                    fetchDatesWithData(selectedWard),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 10000)
                    )
                ]);
                setDatesWithData(dates);

                // Check approval status
                const status = await checkApprovalStatus(selectedDate, selectedWard);
                setApprovalStatus(status);
                setApprovalPending(status === 'pending');
                setSupervisorApproved(status === 'approved');

                // Fetch ward data
                const data = await fetchWardData(selectedDate, selectedWard, selectedShift);
                if (data) {
                    setFormData(data);
                    setOriginalData(data);
                    setHasUnsavedChanges(false);
                }

                setShowForm(true);

            } catch (error) {
                console.error('Error initializing data:', error);
                setInitError(error.message === 'Timeout' 
                    ? 'การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
                    : 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
                );
                
                Swal.fire({
                    title: 'Error',
                    text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab',
                    showConfirmButton: true,
                    confirmButtonText: 'ลองใหม่',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [selectedWard, selectedDate, selectedShift, user]);

    // Handle local date select
    const handleLocalDateSelect = async (date) => {
        try {
            setIsLoading(true);
            
            // ตั้งค่าวันที่ที่เลือก
            setSelectedDate(date);
            setThaiDate(formatThaiDate(date));
            
            // ตรวจสอบสถานะการอนุมัติ
            const status = await checkApprovalStatus(date, selectedWard);
            setApprovalStatus(status);
            setApprovalPending(status === 'pending');
            setSupervisorApproved(status === 'approved');
            
            // ตรวจสอบว่ามีข้อมูลย้อนหลังภายใน 7 วันหรือไม่
            const has7DaysData = await checkLast7DaysData(selectedWard, date);
            
            // ตรวจสอบว่ามีข้อมูล Save Final ของวันที่เลือกหรือไม่
            const formattedDate = format(date, 'yyyy-MM-dd');
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedDate)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                // พบข้อมูล Save Final ของวันที่เลือก
                const result = await Swal.fire({
                    title: 'พบข้อมูลที่บันทึกไว้แล้ว',
                    html: `มีข้อมูลของวันที่ ${formatThaiDate(date)} ในระบบแล้ว<br>คุณต้องการดำเนินการอย่างไร?`,
                    icon: 'question',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'เรียกดูข้อมูลเดิม',
                    denyButtonText: 'บันทึกข้อมูลใหม่ทับ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#0ab4ab',
                    denyButtonColor: '#d33'
                });
                
                if (result.isConfirmed) {
                    // เรียกดูข้อมูลเดิม
                    const finalData = snapshot.docs[0].data();
                    setFormData(finalData);
                    setSelectedShift(finalData.shift || getCurrentShift());
                    
                    // ถ้าสถานะเป็น pending หรือ rejected ยังสามารถแก้ไขได้
                    const canEdit = ['pending', 'rejected'].includes(finalData.approvalStatus);
                    setIsReadOnly(!canEdit);
                    
                    Swal.fire({
                        title: 'ดึงข้อมูลสำเร็จ',
                        text: canEdit ? 'แสดงข้อมูลที่บันทึกไว้แล้ว คุณสามารถแก้ไขข้อมูลได้' : 'แสดงข้อมูลที่บันทึกไว้แล้ว (ข้อมูลนี้ถูกอนุมัติแล้ว ไม่สามารถแก้ไขได้)',
                        icon: 'success',
                        confirmButtonColor: '#0ab4ab'
                    });
                } else if (result.isDenied) {
                    // บันทึกข้อมูลใหม่ทับ - ถ้าสถานะเป็น approved ไม่สามารถทำได้
                    const docData = snapshot.docs[0].data();
                    if (docData.approvalStatus === 'approved') {
                        Swal.fire({
                            title: 'ไม่สามารถบันทึกทับได้',
                            text: 'ข้อมูลนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขหรือบันทึกทับได้',
                            icon: 'error',
                            confirmButtonColor: '#0ab4ab'
                        });
                        setIsReadOnly(true);
                        setFormData(docData);
                        setSelectedShift(docData.shift || getCurrentShift());
                        return;
                    }
                    
                    // สามารถสร้างข้อมูลใหม่ได้
                    setFormData({
                        patientCensus: '',
                        overallData: '',
                        newAdmit: '',
                        transferIn: '',
                        referIn: '',
                        transferOut: '',
                        referOut: '',
                        discharge: '',
                        dead: '',
                        rns: '',
                        pns: '',
                        nas: '',
                        aides: '',
                        studentNurses: '',
                        notes: '',
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        isDraft: false
                    });
                    setIsReadOnly(false);
                    
                    // ตรวจสอบว่ามีการบันทึกกะเช้าหรือไม่เพื่อกำหนดกะที่เลือก
                    const hasMorningShift = await checkMorningShiftDataExists(date, selectedWard);
                    setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                    
                    Swal.fire({
                        title: 'เริ่มต้นบันทึกข้อมูลใหม่',
                        text: 'คุณสามารถบันทึกข้อมูลใหม่เพื่อทับข้อมูลเดิมได้',
                        icon: 'info',
                        confirmButtonColor: '#0ab4ab'
                    });
                }
                // กรณียกเลิก ไม่ต้องทำอะไร
            } else if (has7DaysData) {
                // ไม่มีข้อมูลของวันที่เลือก แต่มีข้อมูลย้อนหลัง 7 วัน
                // ตรวจสอบว่ามี draft ค้างอยู่หรือไม่
                const hasDraft = await checkDraftExists();
                
                if (hasDraft) {
                    const draftResult = await Swal.fire({
                        title: 'พบข้อมูลฉบับร่าง',
                        html: `พบข้อมูลฉบับร่างของวันและ ward นี้<br>คุณต้องการดำเนินการอย่างไร?`,
                        icon: 'question',
                        showDenyButton: true,
                        confirmButtonText: 'ดึงข้อมูลฉบับร่าง',
                        denyButtonText: 'สร้างข้อมูลใหม่',
                        confirmButtonColor: '#0ab4ab',
                        denyButtonColor: '#d33'
                    });
                    
                    if (draftResult.isConfirmed) {
                        // ดึงข้อมูลฉบับร่างล่าสุด
                        const formattedDate = format(date, 'yyyy-MM-dd');
                        const selectedShiftValue = selectedShift || getCurrentShift();
                        const draftData = await getLatestDraft(user.uid, selectedWard, formattedDate, selectedShiftValue);
                        if (draftData) {
                            setFormData(draftData);
                            setSelectedShift(draftData.shift || getCurrentShift());
                            setIsDraftMode(true);
                            setIsReadOnly(false);
                            
                            Swal.fire({
                                title: 'ดึงข้อมูลฉบับร่างสำเร็จ',
                                text: 'แสดงข้อมูลฉบับร่างล่าสุด คุณสามารถแก้ไขและบันทึกต่อได้',
                                icon: 'success',
                                confirmButtonColor: '#0ab4ab'
                            });
                        }
                    } else {
                        // สร้างข้อมูลใหม่ ตรวจสอบกะเช้าเพื่อกำหนดกะที่เลือก
                        const hasMorningShift = await checkMorningShiftDataExists(date, selectedWard);
                        setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                        setIsDraftMode(false);
                        setIsReadOnly(false);
                        
                        // รีเซ็ตฟอร์ม
                        setFormData({
                            patientCensus: '',
                            overallData: '',
                            newAdmit: '',
                            transferIn: '',
                            referIn: '',
                            transferOut: '',
                            referOut: '',
                            discharge: '',
                            dead: '',
                            rns: '',
                            pns: '',
                            nas: '',
                            aides: '',
                            studentNurses: '',
                            notes: '',
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            isDraft: false
                        });
                    }
                } else {
                    // ไม่มีฉบับร่าง ให้ตรวจสอบกะเช้าและกำหนดค่าเริ่มต้น
                    const hasMorningShift = await checkMorningShiftDataExists(date, selectedWard);
                    setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                    setIsReadOnly(false);
                    setIsDraftMode(false);
                    
                    // รีเซ็ตฟอร์ม
                    setFormData({
                        patientCensus: '',
                        overallData: '',
                        newAdmit: '',
                        transferIn: '',
                        referIn: '',
                        transferOut: '',
                        referOut: '',
                        discharge: '',
                        dead: '',
                        rns: '',
                        pns: '',
                        nas: '',
                        aides: '',
                        studentNurses: '',
                        notes: '',
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        isDraft: false
                    });
                }
            }
        } catch (error) {
            console.error('Error in handleLocalDateSelect:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่มฟังก์ชัน checkDraftExists
    const checkDraftExists = async () => {
        try {
            if (!user?.uid || !selectedWard) return false;
            
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            
            // ดึงข้อมูลฉบับร่างทั้งหมดของผู้ใช้
            const drafts = await getUserDrafts(user.uid, selectedWard);
            
            // ตรวจสอบว่ามีฉบับร่างสำหรับวันที่เลือกหรือไม่
            return drafts && drafts.some(draft => 
                draft.date === formattedDate && 
                (draft.shift === selectedShift || !selectedShift)
            );
        } catch (error) {
            console.error('Error checking drafts:', error);
            return false;
        }
    };

    // แก้ไขฟังก์ชัน handleLocalShiftChange
    const handleLocalShiftChange = async (shift) => {
        console.log(`Shift changed to ${shift}`);
        setSelectedShift(shift);
        
        try {
            // ดึงข้อมูลเดิมก่อน (ถ้ามี)
            const existingData = await fetchWardData(selectedDate, selectedWard, shift);
            
            if (existingData) {
                setFormData(existingData);
            return;
        }

            // กรณีเป็นกะเช้า - ตรวจสอบข้อมูล 7 วันย้อนหลัง
            if (shift === 'เช้า' || shift === '07:00-19:00') {
                console.log('Fetching last 7 days data for morning shift');
                // เรียกใช้ฟังก์ชันดึงข้อมูล 7 วันย้อนหลัง
                const last7DaysData = await fetchLast7DaysData(selectedWard);
                
                if (last7DaysData) {
                    console.log('Found data from past 7 days:', last7DaysData);
                    
                    // คัดลอกข้อมูลที่จำเป็น
                    const newFormData = {
                        rns: last7DaysData.rns || '',
                        pns: last7DaysData.pns || '',
                        nas: last7DaysData.nas || '',
                        aides: last7DaysData.aides || '',
                        studentNurses: last7DaysData.studentNurses || '',
                        newAdmit: '',
                        transferIn: '',
                        referIn: '',
                        transferOut: '',
                        referOut: '',
                        discharge: '', 
                        dead: '',
                        notes: '',
                        date: formatDate(selectedDate),
                        shift: shift,
                        wardId: selectedWard,
                        patientCensus: ''
                    };
                    
                    setFormData(newFormData);
                    
                    // อัพเดทค่า patientCensus ทันที
                    setTimeout(() => {
                        const newAdmit = parseInt(newFormData.newAdmit || '0');
                        const transferIn = parseInt(newFormData.transferIn || '0');
                        const referIn = parseInt(newFormData.referIn || '0');
                        const transferOut = parseInt(newFormData.transferOut || '0');
                        const referOut = parseInt(newFormData.referOut || '0');
                        const discharge = parseInt(newFormData.discharge || '0');
                        const dead = parseInt(newFormData.dead || '0');
                        
                        const calculatedValue = String(
                            (newAdmit + transferIn + referIn) - (transferOut + referOut + discharge + dead)
                        );
                        
                            setFormData(prev => ({
                                ...prev,
                            patientCensus: calculatedValue
                        }));
                    }, 100);
                } else {
                    console.log('No data found from past 7 days');
                    // ไม่พบข้อมูล 7 วันย้อนหลัง เริ่มต้นด้วยค่าว่าง
        setFormData({
                        patientCensus: '',
                        newAdmit: '',
                        transferIn: '',
                        referIn: '',
                        transferOut: '',
                        referOut: '',
                        discharge: '',
                        dead: '',
            rns: '',
            pns: '',
            nas: '',
            aides: '',
            studentNurses: '',
            notes: '',
                        date: formatDate(selectedDate),
                        shift: shift,
                        wardId: selectedWard
                    });
                }
            }
        } catch (error) {
            console.error('Error in handleLocalShiftChange:', error);
            // แจ้งเตือนผู้ใช้
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
            });
        }
    };

    // แก้ไขฟังก์ชัน onSubmit
    const onSubmit = async () => {
        try {
            setIsSubmitting(true);
            
            // ตรวจสอบสถานะการอนุมัติ
            const approvalStatus = await checkApprovalStatus(selectedDate, selectedWard, selectedShift);
            
            if (approvalStatus && approvalStatus.status === 'approved') {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถบันทึกได้',
                    text: 'ข้อมูลนี้ได้รับการอนุมัติเป็น Final แล้ว ไม่สามารถแก้ไขได้'
                });
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึก
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const finalData = {
                ...formData,
                date: formattedDate,
                shift: selectedShift,
                wardId: selectedWard,
                userId: user?.uid,
                userDisplayName: `${user?.firstName || ''} ${user?.lastName || ''}`,
                isApproved: true,
                isDraft: false,
                approvedBy: user?.uid || null,
                approvalDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            
            // บันทึกข้อมูลลง collection wardDataFinal
            const docId = `${formattedDate}_${selectedWard}_${selectedShift}`;
            await setDoc(doc(db, 'wardDataFinal', docId), finalData);
            
            // บันทึกประวัติการเปลี่ยนแปลง
            await logWardDataHistory(finalData, 'submit_final', user?.uid);
            
            // ลบฉบับร่างที่มีอยู่ (ถ้ามี)
            const drafts = await getUserDrafts(user?.uid, selectedWard, formattedDate, selectedShift);
            if (drafts && drafts.length > 0) {
                for (const draft of drafts) {
                    await deleteWardDataDraft(draft.id);
                }
            }
            
            Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลได้รับการบันทึกเป็น Final เรียบร้อยแล้ว',
                confirmButtonColor: '#0ab4ab'
            });
            
            // รีเซ็ตสถานะ
            setHasUnsavedChanges(false);
            setIsDraftMode(false);
        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // แก้ไขฟังก์ชัน onSaveDraft
    const onSaveDraft = async () => {
        try {
            setIsSubmitting(true);
            
            // ตรวจสอบสถานะการอนุมัติ
            const approvalStatus = await checkApprovalStatus(selectedDate, selectedWard, selectedShift);
            
            if (approvalStatus && approvalStatus.status === 'approved') {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่สามารถบันทึกฉบับร่างได้',
                    text: 'ข้อมูลนี้ได้รับการอนุมัติเป็น Final แล้ว ไม่สามารถแก้ไขได้'
                });
                setIsSubmitting(false);
                return;
            }
            
            // เตรียมข้อมูลสำหรับบันทึกฉบับร่าง
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const draftData = {
                ...formData,
                date: formattedDate,
                shift: selectedShift,
                wardId: selectedWard,
                userId: user?.uid,
                userDisplayName: `${user?.firstName || ''} ${user?.lastName || ''}`,
                isDraft: true,
                isApproved: false,
                lastUpdated: new Date().toISOString()
            };
            
            // บันทึกข้อมูลฉบับร่าง
            const result = await saveWardDataDraft(draftData);
            
            if (result.success) {
                // บันทึกประวัติการเปลี่ยนแปลง
                await logWardDataHistory(draftData, 'save_draft', user?.uid);
                
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกฉบับร่างสำเร็จ',
                    text: 'ข้อมูลถูกบันทึกเป็นฉบับร่างเรียบร้อยแล้ว',
                    confirmButtonColor: '#0ab4ab'
                });
                
                // อัพเดทสถานะ
                setHasUnsavedChanges(false);
                setIsDraftMode(true);
            } else {
                throw new Error(result.error || 'เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add error display
    if (initError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                    <h2 className="text-red-700 text-xl font-semibold mb-3">เกิดข้อผิดพลาด</h2>
                    <p className="text-red-600 mb-4">{initError}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                    </div>
                    </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="mb-4">
                        <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                        กำลังโหลดข้อมูล...
                    </p>
                </div>
            ) : (
                <div className="space-y-6 p-4">
                    {console.log('Debug - States:', { 
                        showForm, 
                        selectedWard, 
                        selectedDate, 
                        selectedShift,
                        isLoading,
                        formData
                    })}

                    {/* แสดง MainFormContent ถ้า showForm เป็น true */}
                    {showForm && (
                        <MainFormContent 
                            isLoading={isLoading}
                        selectedDate={selectedDate}
                        selectedShift={selectedShift}
                            selectedWard={selectedWard}
                            formData={formData}
                            setFormData={setFormData}
                            handleLocalDateSelect={handleLocalDateSelect}
                            handleShiftChange={handleLocalShiftChange}
                            thaiDate={thaiDate}
                            setThaiDate={setThaiDate}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
                            datesWithData={datesWithData}
                            theme={theme}
                            approvalStatus={approvalStatus}
                            setHasUnsavedChanges={setHasUnsavedChanges}
                            onSaveDraft={onSaveDraft}
                            onSubmit={onSubmit}
                            isSubmitting={isSubmitting}
                            isDraftMode={isDraftMode}
                        />
                    )}

            <ApprovalHistory
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                        wardId={selectedWard}
                date={selectedDate}
                shift={selectedShift}
            />

                    {/* แสดงสถานะเพื่อ Debug */}
                    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Debug Info:</h3>
                        <p>showForm: {showForm ? 'true' : 'false'}</p>
                        <p>selectedWard: {selectedWard ? JSON.stringify(selectedWard) : 'ไม่มี'}</p>
                        <p>selectedShift: {selectedShift}</p>
                        <p>isLoading: {isLoading ? 'true' : 'false'}</p>
                </div>
            </div>
            )}
        </div>
    );
};

// แก้ไขฟังก์ชัน formatDate
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default WardForm;