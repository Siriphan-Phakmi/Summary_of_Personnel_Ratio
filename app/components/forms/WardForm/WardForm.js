'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import LoadingScreen from '../../ui/LoadingScreen';
import { Swal } from '../../../utils/alertService';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../../utils/dateUtils';
import { getCurrentShift } from '../../../utils/dateHelpers';
import Calendar from '../../ui/Calendar';
import FormDateShiftSelector from '../../common/FormDateShiftSelector';
import { useAuth } from '../../../context/AuthContext';
import { logEvent } from '../../../utils/clientLogging';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

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
    MainFormContent
} from './index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    getLatestDraft,
    deleteWardDataDraft,
    logWardDataHistory
} from '../../../lib/dataAccess';

import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';

const WardForm = ({ wardId }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    
    // State variables
    const [formVisible, setFormVisible] = useState(false);
    const [selectedWard, setSelectedWard] = useState(wardId || '');
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // ใช้ฟังก์ชัน getCurrentShift จาก utils เพื่อกำหนดค่าเริ่มต้นของกะตามเวลาปัจจุบัน
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

    // เพิ่มฟังก์ชันใหม่เพื่อตรวจสอบว่ามีการบันทึกข้อมูลกะเช้าหรือไม่
    const checkMorningShiftDataExists = async (date) => {
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedDate),
                where('shift', '==', '07:00-19:00')
            );
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking morning shift data:', error);
            return false;
        }
    };

    // เพิ่มฟังก์ชันใหม่เพื่อตรวจสอบว่ามีการบันทึกฉบับร่างค้างอยู่หรือไม่
    const checkDraftExists = async () => {
        try {
            if (!user?.uid) return false;
            
            const drafts = await getUserDrafts(user.uid, selectedWard);
            return drafts.length > 0;
        } catch (error) {
            console.error('Error checking draft existence:', error);
            return false;
        }
    };

    // ล้างการตรวจสอบกะอัตโนมัติที่ซับซ้อน และใช้เวลาจริงเท่านั้น
    useEffect(() => {
        if (!selectedWard || !selectedDate) return;
        
        // กำหนดกะเริ่มต้นตามเวลาปัจจุบันเท่านั้น
        const currentShift = getCurrentShift();
        console.log('Setting shift based on current time only:', currentShift);
        setSelectedShift(currentShift);
        
    }, [selectedWard, selectedDate]); // ทำเมื่อมีการเปลี่ยน ward หรือ date

    // เพิ่มฟังก์ชันสำหรับตรวจสอบข้อมูลซ้ำ ก่อนทำการบันทึก
    const checkExistingData = async (shiftType) => {
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedDate),
                where('shift', '==', selectedShift)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                // พบข้อมูลที่ตรงกับวันที่ และกะ ที่กำลังจะบันทึก
                const existingData = snapshot.docs[0].data();
                
                // แสดงหน้าต่างเปรียบเทียบข้อมูล
                const result = await Swal.fire({
                    title: 'พบข้อมูลที่ซ้ำซ้อน',
                    html: `พบข้อมูลของวันที่ ${formatThaiDate(selectedDate)} กะ ${selectedShift} ในระบบแล้ว<br><br>คุณต้องการบันทึกทับข้อมูลเดิมหรือไม่?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'บันทึกทับ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6'
                });
                
                return {
                    exists: true,
                    canOverwrite: result.isConfirmed
                };
            }
            
            return {
                exists: false,
                canOverwrite: true
            };
        } catch (error) {
            console.error('Error checking existing data:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถตรวจสอบข้อมูลเดิมได้',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            
            return {
                exists: false,
                canOverwrite: false
            };
        }
    };

    // เพิ่ม event listener สำหรับ beforeunload เพื่อถามยืนยันทุกครั้งเมื่อ refresh
    useEffect(() => {
        const onBeforeUnload = (e) => {
            // ถามยืนยันทุกครั้ง ไม่ว่าจะมีข้อมูลที่เปลี่ยนแปลงหรือไม่
            e.preventDefault();
            e.returnValue = '';
            const message = hasUnsavedChanges 
                ? 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?'
                : 'คุณแน่ใจหรือไม่ว่าต้องการรีเฟรชหน้านี้? การรีเฟรชจะทำให้ข้อมูลที่กำลังดำเนินการอยู่หายไป';
            return message;
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [hasUnsavedChanges]); // ทำงานใหม่เมื่อ hasUnsavedChanges เปลี่ยนแปลง

    // Initialize data when component mounts
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard || !selectedDate) return;
            
            setIsLoading(true);
            try {
                // Fetch dates with data
                const dates = await fetchDatesWithData(selectedWard);
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

            } catch (error) {
                console.error('Error initializing data:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to initialize data',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab'
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
            
            // ตรวจสอบว่ามีข้อมูลย้อนหลังภายใน 7 วันหรือไม่
            const has7DaysData = await checkLast7DaysData(selectedWard, date);
            
            if (has7DaysData) {
                // ตรวจสอบว่ามีข้อมูลของวันที่เลือกหรือไม่
                const formattedDate = format(date, 'yyyy-MM-dd');
                const q = query(
                    collection(db, 'wardDataFinal'),
                    where('wardId', '==', selectedWard),
                    where('date', '==', formattedDate)
                );
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    // มีข้อมูลของวันที่เลือกอยู่แล้ว ถามว่าต้องการเรียกดูหรือบันทึกทับ
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
                        const data = snapshot.docs[0].data();
                        setFormData(data);
                        setSelectedShift(data.shift || getCurrentShift());
                        setIsReadOnly(true); // กำหนดให้อ่านได้อย่างเดียว
                        
                        Swal.fire({
                            title: 'ดึงข้อมูลสำเร็จ',
                            text: 'แสดงข้อมูลที่บันทึกไว้แล้ว โดยไม่สามารถแก้ไขข้อมูลได้',
                            icon: 'success',
                            confirmButtonColor: '#0ab4ab'
                        });
                    } else if (result.isDenied) {
                        // บันทึกข้อมูลใหม่ทับ
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
                        const hasMorningShift = await checkMorningShiftDataExists(date);
                        setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                        
                        Swal.fire({
                            title: 'เริ่มต้นบันทึกข้อมูลใหม่',
                            text: 'คุณสามารถบันทึกข้อมูลใหม่เพื่อทับข้อมูลเดิมได้',
                            icon: 'info',
                            confirmButtonColor: '#0ab4ab'
                        });
                    }
                    // กรณียกเลิก ไม่ต้องทำอะไร
                } else {
                    // ไม่มีข้อมูลของวันที่เลือก ให้ตรวจสอบกะเช้าและกำหนดค่าเริ่มต้น
                    const hasMorningShift = await checkMorningShiftDataExists(date);
                    setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                    setIsReadOnly(false);
                }
            } else {
                // ไม่มีข้อมูลย้อนหลัง 7 วัน ให้ตรวจสอบกะเช้าและกำหนดค่าเริ่มต้น
                const hasMorningShift = await checkMorningShiftDataExists(date);
                setSelectedShift(hasMorningShift ? '19:00-07:00' : getCurrentShift());
                setIsReadOnly(false);
            }
        } catch (error) {
            console.error('Error handling date selection:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // เพิ่มฟังก์ชันตรวจสอบว่าสามารถเปลี่ยนกะได้หรือไม่
    const canChangeToNightShift = () => {
        // ถ้าเป็น Draft Mode และยังไม่ได้ Submit Final จะไม่ให้เลือกกะดึก
        return !isDraftMode;
    };

    // เพิ่มฟังก์ชันสำหรับตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
    const validateRequiredFields = () => {
        // รายการ fields ที่ต้องตรวจสอบว่ากรอกแล้วหรือไม่
        const requiredFields = [
            { name: 'newAdmit', label: 'New Admit' },
            { name: 'transferIn', label: 'Transfer In' },
            { name: 'referIn', label: 'Refer In' },
            { name: 'transferOut', label: 'Transfer Out' },
            { name: 'referOut', label: 'Refer Out' },
            { name: 'discharge', label: 'Discharge' },
            { name: 'dead', label: 'Dead' },
            { name: 'availableBeds', label: 'Available' },
            { name: 'unavailable', label: 'Unavailable' },
            { name: 'plannedDischarge', label: 'Planned Discharge' },
            { name: 'nurseManager', label: 'Nurse Manager' },
            { name: 'RN', label: 'RN' },
            { name: 'PN', label: 'PN' },
            { name: 'WC', label: 'WC' },
            { name: 'NA', label: 'NA' }
        ];
        
        // ตรวจสอบว่ามีช่องไหนไม่ได้กรอกบ้าง
        const emptyFields = requiredFields.filter(field => 
            !formData[field.name] || formData[field.name] === '' || formData[field.name] === '0'
        );
        
        if (emptyFields.length > 0) {
            // สร้างรายการช่องที่ยังไม่ได้กรอกข้อมูล
            const emptyFieldsList = emptyFields.map(field => 
                `<li class="text-left pl-4 py-1">${field.label}</li>`
            ).join('');
            
            // แสดง Swal แจ้งเตือนพร้อมรายการช่องที่ยังไม่ได้กรอกข้อมูล
            Swal.fire({
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                html: `
                    <div class="text-left mb-3">
                        พบข้อมูลที่จำเป็นยังไม่ได้กรอก:
                    </div>
                    <ul class="text-left mx-auto max-w-xs bg-gray-50 rounded-lg p-2 max-h-60 overflow-y-auto">
                        ${emptyFieldsList}
                    </ul>
                    <div class="mt-3 text-sm text-gray-600">
                        กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึก
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#0ab4ab'
            }).then(() => {
                // โฟกัสไปที่ช่องแรกที่ยังไม่ได้กรอกข้อมูล
                const firstEmptyField = emptyFields[0];
                const inputElement = document.querySelector(`input[name="${firstEmptyField.name}"]`);
                
                if (inputElement) {
                    // เลื่อนไปที่ช่องนั้นและแสดงขอบสีแดง
                    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputElement.focus();
                    inputElement.classList.add('ring-2', 'ring-red-500');
                    
                    // ลบขอบสีแดงหลังจาก 3 วินาที
                    setTimeout(() => {
                        inputElement.classList.remove('ring-2', 'ring-red-500');
                    }, 3000);
                }
            });
            
            return false;
        }
        
        return true;
    };

    // Handle save draft
    const onSaveDraft = async () => {
        if (!user?.uid) {
            Swal.fire({
                title: 'Error',
                text: 'You must be logged in to save drafts',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
        if (!validateRequiredFields()) {
            return;
        }

        // ตรวจสอบข้อมูลซ้ำก่อนบันทึก
        const checkResult = await checkExistingData('draft');
        if (checkResult.exists && !checkResult.canOverwrite) {
            return; // ผู้ใช้ยกเลิกการบันทึกทับ
        }

        // เพิ่ม dialog ยืนยันการบันทึกฉบับร่าง
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการบันทึกฉบับร่าง',
            text: 'คุณต้องการบันทึกข้อมูลเป็นฉบับร่างใช่หรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่, บันทึกฉบับร่าง',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        setIsSubmitting(true);
        try {
            const draftData = {
                ...formData,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                userId: user.uid
            };
            
            const result = await saveWardDataDraft(draftData);

            if (result.success) {
                // บันทึกประวัติการเปลี่ยนแปลงข้อมูล ward
                await logWardDataHistory(
                    draftData,
                    'save_draft',
                    user.uid
                );
                
                setIsDraftMode(true);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'Success',
                    text: 'Draft saved successfully',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to save draft',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle submit
    const onSubmit = async () => {
        if (!user?.uid) {
            Swal.fire({
                title: 'Error',
                text: 'You must be logged in to submit',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
        if (!validateRequiredFields()) {
            return;
        }
        
        // ตรวจสอบข้อมูลซ้ำก่อนบันทึก
        const checkResult = await checkExistingData('final');
        if (checkResult.exists && !checkResult.canOverwrite) {
            return; // ผู้ใช้ยกเลิกการบันทึกทับ
        }

        // เพิ่ม dialog ยืนยันการบันทึกข้อมูล
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล',
            text: 'เมื่อบันทึกแล้ว ข้อมูลจะถูกส่งและไม่สามารถแก้ไขได้อีก ต้องการดำเนินการต่อหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, บันทึกข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        setIsSubmitting(true);
        try {
            const docId = `${selectedWard}_${format(selectedDate, 'yyyyMMdd')}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            
            const finalData = {
                ...formData,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                timestamp: serverTimestamp(),
                userId: user.uid,
                userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            };
            
            await setDoc(docRef, finalData);
            
            // บันทึกประวัติการเปลี่ยนแปลงข้อมูล ward
            await logWardDataHistory(
                finalData,
                'save_final',
                user.uid
            );

            setHasUnsavedChanges(false);
            setIsDraftMode(false);

            // Clear all input fields after Save Final
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

            Swal.fire({
                title: 'บันทึกสำเร็จ',
                text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
        } catch (error) {
            console.error('Error submitting:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // เพิ่มฟังก์ชัน handleShiftChange ที่นี่แทนการ import
    const handleLocalShiftChange = (shift) => {
        // ตรวจสอบกรณีที่เป็นกะดึกและอยู่ใน Draft Mode
        if (shift === 'ดึก' && isDraftMode) {
            Swal.fire({
                title: 'ไม่สามารถเลือกกะดึกได้',
                text: 'คุณต้องบันทึกข้อมูลกะเช้าก่อนจึงจะสามารถทำรายการกะดึกได้',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        // ถามยืนยันก่อนเปลี่ยนกะ
        Swal.fire({
            title: 'ยืนยันการเปลี่ยนกะ',
            html: '<div class="text-left">' +
                  '<p>การเปลี่ยนกะจะทำให้ข้อมูลที่คุณกำลังกรอกอยู่หายไปทั้งหมด</p>' +
                  '<p class="mt-2">คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนกะ?</p>' +
                  '</div>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed && typeof setSelectedShift === 'function') {
                setSelectedShift(shift);
            }
        });
    };

    // ฟังก์ชันเพื่อแสดงชื่อแผนกแบบสวยงาม
    const getDepartmentDisplay = () => {
        if (!selectedWard) return 'กรุณาเลือกแผนก';
        
        // แปลงชื่อแผนกให้อ่านง่ายขึ้น
        const wardMappings = {
            '1C': 'ศัลยกรรมกระดูก (1C)',
            '2C': 'ศัลยกรรมทั่วไป (2C)', 
            '3C': 'อายุรกรรมชาย (3C)',
            '4C': 'อายุรกรรมหญิง (4C)',
            'LR': 'ห้องคลอด (LR)',
            'NICU': 'ทารกแรกเกิดวิกฤต (NICU)',
            'Pediatric': 'กุมารเวชกรรม (Pediatric)',
            'OB-GYN': 'สูติ-นรีเวชกรรม (OB-GYN)',
            'Eye': 'จักษุ (Eye)',
            'OR': 'ห้องผ่าตัด (OR)',
            'ICU': 'ผู้ป่วยวิกฤต (ICU)'
        };
        
        return wardMappings[selectedWard] || selectedWard;
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto px-4">
            {/* เพิ่มส่วนหัวสำหรับแสดงชื่อแผนก */}
            <div className="w-full max-w-4xl mx-auto mt-4 mb-6">
                <div className={`p-6 rounded-xl shadow-lg overflow-hidden relative ${
                    theme === 'dark'
                        ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white'
                        : 'bg-gradient-to-r from-teal-500 to-blue-500 text-white'
                }`}>
                    {/* ลวดลายพื้นหลัง */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-semibold text-white text-center relative z-10">
                        {getDepartmentDisplay()}
                    </h2>
                </div>
            </div>
            
            <div className="w-full max-w-4xl mx-auto">
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
            </div>
        </div>
    );
};

export default WardForm; 