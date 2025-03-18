// ... existing code ...

<<<<<<< HEAD
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
    checkMorningShiftDataExists
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
import DepartmentStatusCard from '../../common/DepartmentStatusCard';
import FormActions from '../../common/FormActions';
import ApprovalHistory from '../../common/ApprovalHistory';

=======
>>>>>>> 4456bda67646dcd07804bcc5d5184807fa8b9df7
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
<<<<<<< HEAD
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

    // ใช้ฟังก์ชัน getCurrentShift จาก utils เพื่อกำหนดค่าเริ่มต้นของกะตามเวลาปัจจุบัน
    useEffect(() => {
        if (!selectedWard || !selectedDate) return;
        
        // กำหนดกะเริ่มต้นตามเวลาปัจจุบันเท่านั้น
        const currentShift = getCurrentShift();
        console.log('Setting shift based on current time only:', currentShift);
        setSelectedShift(currentShift);
        
    }, [selectedWard, selectedDate]); // ทำเมื่อมีการเปลี่ยน ward หรือ date
=======

    // ... existing state declarations ...

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
>>>>>>> 4456bda67646dcd07804bcc5d5184807fa8b9df7

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

<<<<<<< HEAD
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

    // เพิ่มฟังก์ชัน checkFinalDataExists เพื่อให้คืนค่า false เมื่อไม่มีข้อมูลใน database
    const checkFinalDataExists = async (shiftValue) => {
        try {
            // ถ้าไม่มี user หรือไม่ได้เลือก ward จะไม่สามารถบันทึกได้อยู่แล้ว
            if (!user?.uid || !selectedWard) return false;
            
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', selectedWard),
                where('date', '==', formattedDate),
                where('shift', '==', shiftValue || selectedShift)
            );
            
            try {
                const snapshot = await getDocs(q);
                return !snapshot.empty;
            } catch (queryError) {
                // กรณีเกิด error จาก query เช่น missing index ให้ถือว่าไม่มีข้อมูล
                console.warn('Query error in checkFinalDataExists, assuming no data exists:', queryError);
                return false;
            }
        } catch (error) {
            console.error('Error checking final data existence:', error);
            // กรณีเกิด error อื่นๆ ให้ถือว่าไม่มีข้อมูล เพื่อให้สามารถบันทึกได้
            return false;
        }
    };

    // เพิ่มฟังก์ชัน checkApprovalStatusLocal เพื่อให้คืนค่า false เมื่อไม่มีข้อมูลใน database
    const checkApprovalStatusLocal = async (date, ward) => {
        try {
            // ถ้าไม่ได้เลือก ward จะไม่สามารถบันทึกได้อยู่แล้ว
            if (!ward) return false;
            
            const formattedDate = format(date, 'yyyy-MM-dd');
            const q = query(
                collection(db, 'wardDataFinal'),
                where('wardId', '==', ward),
                where('date', '==', formattedDate)
            );
            
            try {
                const snapshot = await getDocs(q);
                if (snapshot.empty) return false;
                
                // ตรวจสอบว่ามีข้อมูลที่มีสถานะ pending หรือไม่
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (data.approvalStatus === 'pending') {
                        return true;
                    }
                }
                
                return false;
            } catch (queryError) {
                // กรณีเกิด error จาก query เช่น missing index ให้ถือว่าไม่มีข้อมูล
                console.warn('Query error in checkApprovalStatusLocal, assuming no approval pending:', queryError);
                return false;
            }
        } catch (error) {
            console.error('Error checking approval status:', error);
            // กรณีเกิด error อื่นๆ ให้ถือว่าไม่มีข้อมูลรออนุมัติ เพื่อให้สามารถบันทึกได้
            return false;
        }
    };

    // เพิ่มฟังก์ชัน handleLocalShiftChange หลังฟังก์ชัน checkApprovalStatusLocal
    const handleLocalShiftChange = async (shift) => {
        // ตรวจสอบว่ามีสถานะ pending อยู่หรือไม่
        if (approvalPending) {
            Swal.fire({
                title: 'ไม่สามารถเปลี่ยนกะได้',
                text: 'ข้อมูลของวันนี้กำลังรออนุมัติจาก Supervisor ไม่สามารถเปลี่ยนกะได้',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
        // ตรวจสอบว่ามีการบันทึก final ไปแล้วหรือไม่
        const hasFinalData = await checkFinalDataExists(shift);
        if (hasFinalData) {
            Swal.fire({
                title: 'ไม่สามารถเปลี่ยนกะได้',
                text: 'ข้อมูลของวันและกะนี้ได้ถูกบันทึก Final ไปแล้ว ไม่สามารถเปลี่ยนกะได้อีก',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }
        
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

        // ตรวจสอบว่ามีข้อมูล Draft สำหรับกะที่เลือกหรือไม่
        let hasDraft = false;
        let hasShiftFinalData = false;
        
        try {
            // ตรวจสอบว่ามีการบันทึก final สำหรับกะที่เลือกแล้วหรือไม่
            hasShiftFinalData = await checkFinalDataExists(shift);
            
            // ถ้ามีการบันทึก final แล้ว ไม่สนใจว่ามี draft หรือไม่
            if (!hasShiftFinalData) {
                const drafts = await getUserDrafts(user?.uid, selectedWard);
                hasDraft = drafts.some(draft => draft.shift === shift);
            }
        } catch (error) {
            console.error('Error checking draft for shift:', error);
        }

        // ถ้ามีการบันทึก final แล้ว ไม่สามารถเปลี่ยนกะได้
        if (hasShiftFinalData) {
            Swal.fire({
                title: 'ไม่สามารถเปลี่ยนกะได้',
                text: 'ข้อมูลของกะนี้ได้ถูกบันทึก Final ไปแล้ว ไม่สามารถเข้าถึงได้อีก',
                icon: 'warning',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        // ถามยืนยันก่อนเปลี่ยนกะ
        const confirmText = hasDraft 
            ? 'การเปลี่ยนกะจะทำให้ข้อมูลที่คุณกำลังกรอกอยู่หายไปทั้งหมด<br>พบข้อมูลฉบับร่างของกะนี้ คุณต้องการโหลดข้อมูลฉบับร่างหรือไม่?'
            : 'การเปลี่ยนกะจะทำให้ข้อมูลที่คุณกำลังกรอกอยู่หายไปทั้งหมด<br>คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนกะ?';
        
        const confirmOptions = hasDraft 
            ? {
                title: 'ยืนยันการเปลี่ยนกะ',
                html: `<div class="text-left">${confirmText}</div>`,
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'ใช้ข้อมูลฉบับร่าง',
                denyButtonText: 'สร้างใหม่',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#0ab4ab',
                denyButtonColor: '#d33'
            }
            : {
                title: 'ยืนยันการเปลี่ยนกะ',
                html: `<div class="text-left">${confirmText}</div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#0ab4ab',
                cancelButtonColor: '#d33',
                reverseButtons: true
            };
        
        const result = await Swal.fire(confirmOptions);
        
        if (hasDraft) {
            if (result.isConfirmed) {
                // ใช้ข้อมูลฉบับร่าง
                try {
                    const drafts = await getUserDrafts(user?.uid, selectedWard);
                    const draftForShift = drafts.find(draft => draft.shift === shift);
                    
                    if (draftForShift) {
                        // ตรวจสอบอีกครั้งว่ามีการบันทึก final สำหรับกะนี้แล้วหรือไม่
                        const finalExists = await checkFinalDataExists(shift);
                        if (finalExists) {
                            Swal.fire({
                                title: 'ไม่สามารถใช้ข้อมูลฉบับร่างได้',
                                text: 'ข้อมูลของกะนี้ได้ถูกบันทึก Final ไปแล้ว ไม่สามารถใช้ข้อมูลฉบับร่างได้อีก',
                                icon: 'warning',
                                confirmButtonColor: '#0ab4ab'
                            });
                            return;
                        }
                        
                        setFormData(draftForShift);
                        setSelectedShift(shift);
                        setIsDraftMode(true);
                        
                        Swal.fire({
                            title: 'โหลดข้อมูลฉบับร่างสำเร็จ',
                            text: `โหลดข้อมูลฉบับร่างของกะ ${shift} สำเร็จแล้ว`,
                            icon: 'success',
                            confirmButtonColor: '#0ab4ab'
                        });
                    } else {
                        // ไม่พบฉบับร่างของกะที่เลือก ใช้ข้อมูลว่าง
                        resetForm();
                        setSelectedShift(shift);
                        setIsDraftMode(false);
                    }
                } catch (error) {
                    console.error('Error loading draft for shift:', error);
                    // หากเกิดข้อผิดพลาด ให้ใช้ข้อมูลว่าง
                    resetForm();
                    setSelectedShift(shift);
                    setIsDraftMode(false);
                }
            } else if (result.isDenied) {
                // สร้างใหม่
                resetForm();
                setSelectedShift(shift);
                setIsDraftMode(false);
            }
            // ถ้ากด cancel ไม่ต้องทำอะไร
        } else if (result.isConfirmed) {
            // ยืนยันการเปลี่ยนกะ (กรณีไม่มีฉบับร่าง)
            resetForm();
            setSelectedShift(shift);
            setIsDraftMode(false);
            
            // หลังจากเปลี่ยนกะ ให้คำนวณค่าอัตโนมัติ
            const calculateAutoValues = async () => {
                try {
                    const previousData = await fetchPreviousData(selectedDate, selectedWard, shift);
                    if (previousData) {
                        // คำนวณค่าตามกะที่เลือก
                        if (shift === 'เช้า') {
                            const censusValue = previousData.overallData || previousData.patientCensus || '0';
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: censusValue
                            }));
                        } else if (shift === 'ดึก') {
                            const censusValue = previousData.overallData || previousData.patientCensus || '0';
                            setFormData(prev => ({
                                ...prev,
                                patientCensus: censusValue,
                                overallData: calculatePatientCensus({
                                    ...prev,
                                    patientCensus: censusValue
                                })
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error calculating auto values after shift change:', error);
                }
            };
            
            calculateAutoValues();
        }
    };

    // เพิ่มฟังก์ชัน resetForm เพื่อรีเซ็ตฟอร์ม
    const resetForm = () => {
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
    };

    // เพิ่มฟังก์ชันคำนวณยอดรวมสำหรับ Patient Census และ Overall Data
    const calculatePatientCensus = (formData) => {
        if (!formData) return '0';
        
        // แปลงค่าเป็นตัวเลข
        const censusBefore = parseInt(formData.patientCensus || '0', 10);
        const newAdmit = parseInt(formData.newAdmit || '0', 10);
        const transferIn = parseInt(formData.transferIn || '0', 10);
        const referIn = parseInt(formData.referIn || '0', 10);
        const transferOut = parseInt(formData.transferOut || '0', 10);
        const referOut = parseInt(formData.referOut || '0', 10);
        const discharge = parseInt(formData.discharge || '0', 10);
        const dead = parseInt(formData.dead || '0', 10);
        
        // คำนวณตามสูตร: censusBefore + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead
        let newCensus = censusBefore + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead;
        
        // ป้องกันการคำนวณที่ทำให้ได้ค่าติดลบ
        if (newCensus < 0) newCensus = 0;
        
        return newCensus.toString();
    };

    // เพิ่มฟังก์ชันดึงข้อมูลจากกะก่อนหน้า หรือย้อนหลัง 7 วัน
    const fetchPreviousData = async (date, ward, shift) => {
        try {
            console.log('Fetching previous data for:', { date, ward, shift });
            let previousData = null;
            
            // กรณีเป็นกะเช้า ให้ดึงข้อมูลจากวันก่อนหน้า กะดึก
            if (shift === 'เช้า') {
                const yesterday = new Date(date);
                yesterday.setDate(yesterday.getDate() - 1);
                
                // ลองหาข้อมูลจากกะดึกของวันก่อนหน้า
                previousData = await fetchWardData(yesterday, ward, 'ดึก');
                console.log('Previous data from night shift:', previousData);
                
                if (!previousData) {
                    // ถ้าไม่มีข้อมูลกะดึกของวันก่อนหน้า ให้ตรวจสอบข้อมูลย้อนหลัง 7 วัน
                    const last7DaysData = await checkLast7DaysData(ward);
                    console.log('Last 7 days data:', last7DaysData);
                    if (last7DaysData && last7DaysData.length > 0) {
                        // ใช้ข้อมูลล่าสุดจาก 7 วันย้อนหลัง
                        previousData = last7DaysData[0];
                    }
                }
            } 
            // กรณีเป็นกะดึก ให้ดึงข้อมูลจากกะเช้าของวันเดียวกัน
            else if (shift === 'ดึก') {
                previousData = await fetchWardData(date, ward, 'เช้า');
                console.log('Previous data from morning shift:', previousData);
                
                if (!previousData) {
                    // ถ้าไม่มีข้อมูลกะเช้า ให้ตรวจสอบข้อมูลย้อนหลัง 7 วัน
                    const last7DaysData = await checkLast7DaysData(ward);
                    console.log('Last 7 days data:', last7DaysData);
                    if (last7DaysData && last7DaysData.length > 0) {
                        // ใช้ข้อมูลล่าสุดจาก 7 วันย้อนหลัง
                        previousData = last7DaysData[0];
                    }
                }
            }
            
            return previousData;
        } catch (error) {
            console.error('Error fetching previous data:', error);
            return null;
        }
    };

    // แก้ไขฟังก์ชัน useEffect เพื่อให้มีการคำนวณข้อมูลอัตโนมัติเมื่อเลือกกะหรือวันที่
    useEffect(() => {
        if (!selectedWard || !selectedDate || !selectedShift || !user) return;
        
        const calculateAutoValues = async () => {
            try {
                console.log('Calculating auto values for shift:', selectedShift);
                
                // ดึงข้อมูลจากกะก่อนหน้า
                const previousData = await fetchPreviousData(selectedDate, selectedWard, selectedShift);
                
                if (!previousData) {
                    console.log('No previous data found, cannot auto calculate');
                    return;
                }
                
                // สำหรับกะเช้า ให้คำนวณและแสดงค่า Patient Census
                if (selectedShift === 'เช้า') {
                    // ถ้าไม่มีการป้อนค่าในฟอร์มเอง ให้ใช้ค่าจากกะก่อนหน้า
                    if (!formData.patientCensus || formData.patientCensus === '0') {
                        // ใช้ overall data จากกะดึกของวันก่อนหน้า หรือค่าล่าสุดที่หาได้
                        const censusValue = previousData.overallData || previousData.patientCensus || '0';
                        
                        // อัปเดตค่าใน form data
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: censusValue,
                            // ถ้ามีข้อมูลการเคลื่อนไหวผู้ป่วย ให้คำนวณค่า overall data ด้วย
                            overallData: calculatePatientCensus({
                                ...prev,
                                patientCensus: censusValue
                            })
                        }));
                        
                        console.log('Auto-calculated Patient Census for morning shift:', censusValue);
                    }
                } 
                // สำหรับกะดึก ให้คำนวณและแสดงค่า Overall Data
                else if (selectedShift === 'ดึก') {
                    // ถ้าไม่มีการป้อนค่าในฟอร์มเอง ให้ใช้ค่าจากกะก่อนหน้า
                    if (!formData.patientCensus || formData.patientCensus === '0') {
                        // ใช้ค่าจากกะเช้าของวันเดียวกัน หรือค่าล่าสุดที่หาได้
                        const censusValue = previousData.overallData || previousData.patientCensus || '0';
                        
                        // อัปเดตค่าใน form data
                        setFormData(prev => ({
                            ...prev,
                            patientCensus: censusValue
                        }));
                        
                        console.log('Auto-calculated Patient Census for night shift:', censusValue);
                    }
                    
                    // คำนวณ overall data อัตโนมัติจาก patient census และข้อมูลการเคลื่อนไหวผู้ป่วย
                    setFormData(prev => ({
                        ...prev,
                        overallData: calculatePatientCensus(prev)
                    }));
                    
                    console.log('Auto-calculated Overall Data for night shift');
                }
            } catch (error) {
                console.error('Error calculating auto values:', error);
            }
        };
        
        // เรียกใช้ฟังก์ชันคำนวณค่าอัตโนมัติ
        calculateAutoValues();
        
    }, [selectedWard, selectedDate, selectedShift, user]);

    // เพิ่มฟังก์ชัน handleInputChange เพื่อให้คำนวณค่า overallData อัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล
    const handleLocalInputChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            // ถ้าเป็นข้อมูลที่เกี่ยวข้องกับการเคลื่อนไหวของผู้ป่วย ให้คำนวณ overall data ใหม่
            if (['patientCensus', 'newAdmit', 'transferIn', 'referIn', 'transferOut', 'referOut', 'discharge', 'dead'].includes(name)) {
                // สำหรับกะดึก ให้คำนวณ overall data ทันที
                if (selectedShift === 'ดึก') {
                    newData.overallData = calculatePatientCensus(newData);
                    console.log('Auto-updated Overall Data after input change:', newData.overallData);
                }
            }
            
            return newData;
        });
        
        setHasUnsavedChanges(true);
    };

    // เพิ่มฟังก์ชัน onSaveDraft กลับมา
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
        
        try {
            // ตรวจสอบว่ามีข้อมูล final ของวันนี้และวอร์ดนี้หรือไม่
            const hasFinalData = await checkFinalDataExists();
            if (hasFinalData) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกฉบับร่างได้',
                    text: 'ข้อมูลของวันและกะนี้ได้ถูกบันทึก Final ไปแล้ว ไม่สามารถบันทึกฉบับร่างได้อีก',
                    icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
            
            // ตรวจสอบว่าข้อมูลของวันนี้และวอร์ดนี้กำลังรอการอนุมัติหรือไม่
            const status = await checkApprovalStatusLocal(selectedDate, selectedWard);
            if (status) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกฉบับร่างได้',
                    text: 'ข้อมูลของวันนี้มีการบันทึก Final ไปแล้ว โปรดรอการอนุมัติก่อนทำการบันทึกข้อมูลใหม่',
                    icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
        } catch (error) {
            console.warn('Error checking existing data, proceeding with save:', error);
            // กรณีไม่มีข้อมูลหรือเกิดข้อผิดพลาดในการตรวจสอบ จะดำเนินการต่อไป
        }

        // ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
        if (!validateRequiredFields()) {
            return;
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
                userId: user.uid,
                timestamp: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            const result = await saveWardDataDraft(draftData);

            if (result.success) {
                // บันทึกประวัติการเปลี่ยนแปลงข้อมูล ward
                try {
                    await logWardDataHistory(
                        draftData,
                        'save_draft',
                        user.uid
                    );
                } catch (logError) {
                    console.warn('Error logging ward data history:', logError);
                    // ไม่ต้องหยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
                }
                
                setIsDraftMode(true);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'บันทึกฉบับร่างสำเร็จ',
                    html: `
                        <div class="text-center">
                            <p class="mb-2">ข้อมูลถูกบันทึกเป็นฉบับร่างเรียบร้อยแล้ว</p>
                            <p class="text-sm text-gray-600">คุณสามารถกลับมาแก้ไขและบันทึกต่อได้ในภายหลัง</p>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองอีกครั้ง',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // แก้ไขฟังก์ชัน onSubmit 
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
        
        try {
            // ตรวจสอบว่ามีข้อมูล final ของวันนี้และวอร์ดนี้หรือไม่
            const hasFinalData = await checkFinalDataExists();
            if (hasFinalData) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกข้อมูลได้',
                    text: 'ข้อมูลของวันและกะนี้ได้ถูกบันทึก Final ไปแล้ว ไม่สามารถบันทึกข้อมูลซ้ำได้อีก',
                    icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
            
            // ตรวจสอบว่าข้อมูลของวันนี้และวอร์ดนี้กำลังรอการอนุมัติหรือไม่
            const status = await checkApprovalStatusLocal(selectedDate, selectedWard);
            if (status) {
                Swal.fire({
                    title: 'ไม่สามารถบันทึกข้อมูลได้',
                    text: 'ข้อมูลของวันนี้มีการบันทึก Final ไปแล้ว โปรดรอการอนุมัติก่อนทำการบันทึกข้อมูลใหม่',
                    icon: 'warning',
                    confirmButtonColor: '#0ab4ab'
                });
                return;
            }
        } catch (error) {
            console.warn('Error checking existing data, proceeding with save:', error);
            // กรณีไม่มีข้อมูลหรือเกิดข้อผิดพลาดในการตรวจสอบ จะดำเนินการต่อไป
        }
        
        // ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
        if (!validateRequiredFields()) {
            return;
        }

        // เพิ่ม dialog ยืนยันการบันทึกข้อมูล
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล',
            text: 'เมื่อบันทึกแล้ว ข้อมูลจะถูกส่งเพื่อรออนุมัติจาก Supervisor และไม่สามารถแก้ไขได้อีก ต้องการดำเนินการต่อหรือไม่?',
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
                userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                approvalStatus: 'pending', // เพิ่มสถานะการอนุมัติเป็น pending
                submittedAt: new Date().toISOString(),
                docId: docId // เพิ่ม docId เพื่อให้เข้าถึงข้อมูลได้ง่ายขึ้น
            };
            
            await setDoc(docRef, finalData);
            
            // บันทึกประวัติการเปลี่ยนแปลงข้อมูล ward
            try {
                await logWardDataHistory(
                    finalData,
                    'save_final',
                    user.uid
                );
            } catch (logError) {
                console.warn('Error logging ward data history:', logError);
                // ไม่ต้องหยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
            }

            // ไม่บันทึกข้อมูลลงใน wardDailyRecords ตอนนี้ รอให้ผ่านการอนุมัติจาก Supervisor ก่อน

            // ลบ draft หลังจากบันทึก final
            try {
                if (isDraftMode) {
                    await deleteWardDataDraft(user.uid, selectedWard);
                    setIsDraftMode(false);
                }
            } catch (draftError) {
                console.error('Error deleting draft:', draftError);
            }

            setHasUnsavedChanges(false);
            setIsDraftMode(false);
            setApprovalPending(true);

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
                html: `
                    <div class="text-center">
                        <p class="mb-2">ข้อมูลถูกบันทึกและส่งเพื่อรออนุมัติจาก Supervisor เรียบร้อยแล้ว</p>
                        <p class="text-sm text-gray-600">คุณจะสามารถบันทึกข้อมูลกะต่อไปได้หลังจากข้อมูลนี้ได้รับการอนุมัติแล้ว</p>
                    </div>
                `,
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

    return (
        <div className="relative">
            {isLoading && <LoadingScreen />}
            
            {!isLoading && !showForm && (
                <DepartmentStatusCard 
                    ward={selectedWard} 
                    onFormOpen={() => setShowForm(true)} 
                />
            )}
            
            {!isLoading && showForm && (
                <div className="animate-fade-in relative">
                    <div className="p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-100/60 backdrop-blur-sm rounded-xl">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <span className="text-[#0ab4ab]">🏥</span> 
                            {selectedWard.name}
                        </h2>
                        <button 
                            onClick={() => setShowForm(false)}
                            className="w-full md:w-auto px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm flex items-center justify-center gap-1"
                        >
                            <span>←</span> กลับไปหน้าแผนก
                        </button>
                    </div>
                    
                    <FormDateShiftSelector 
                        selectedDate={selectedDate}
                        selectedShift={selectedShift}
                        onDateSelect={handleLocalDateSelect}
                        onShiftChange={handleLocalShiftChange}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
                        datesWithData={datesWithData || []}
                        thaiDate={thaiDate}
                    />
                    
                    <div className="space-y-5">
                        <MainFormContent 
                            formData={formData}
                            handleInputChange={handleLocalInputChange}
                            handleBlur={handleBlur}
                            selectedShift={selectedShift}
                            validationErrors={validationErrors}
                        />
                        
                        <FormActions 
                            onSaveDraft={onSaveDraft}
                            onSubmit={onSubmit}
                            isSubmitting={isSubmitting}
                            isSaving={isSaving}
                            date={selectedDate}
                            shift={selectedShift}
                            ward={selectedWard}
                            hasErrors={Object.keys(validationErrors).length > 0}
                        />
                    </div>
                </div>
            )}
            
            {/* Bottom Sheet for showing approval history */}
            <ApprovalHistory
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                ward={selectedWard}
                date={selectedDate}
                shift={selectedShift}
            />
        </div>
=======
    // ... rest of the component code ...

    // Add error display
    if (initError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-red-800 font-semibold text-lg mb-2">เกิดข้อผิดพลาด</h3>
                    <p className="text-red-600">{initError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {isLoading && <LoadingScreen />}
            {showForm && (
                // ... existing JSX ...
            )}
        </>
>>>>>>> 4456bda67646dcd07804bcc5d5184807fa8b9df7
    );
};

export default WardForm;