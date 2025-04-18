'use client';

import React, { useState, useEffect, useRef } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import { getActiveWards } from '@/app/features/census/forms/services/wardService';
import { toast } from 'react-hot-toast';
import { ShiftType, Ward, FormStatus, WardForm } from '@/app/core/types/ward';
import { formatDateForForm } from '@/app/core/utils/dateUtils';
import { 
  saveMorningShiftFormDraft, 
  finalizeMorningShiftForm,
  saveNightShiftFormDraft,
  finalizeNightShiftForm,
  getWardForm,
  getPreviousNightShiftForm
} from '@/app/features/census/forms/services/wardFormService';
import { parse, format, subDays } from 'date-fns';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/app/core/utils/toastUtils';

export default function DailyCensusForm() {
  // รายการวอร์ด
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ข้อมูลฟอร์ม
  const [selectedDate, setSelectedDate] = useState(formatDateForForm(new Date()));
  const [selectedShift, setSelectedShift] = useState<ShiftType>(ShiftType.MORNING);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  
  // ข้อมูลการนับ
  const [patientCensus, setPatientCensus] = useState<number>(0);
  const [nurseManager, setNurseManager] = useState<number>(0);
  const [rn, setRn] = useState<number>(0);
  const [pn, setPn] = useState<number>(0);
  const [wc, setWc] = useState<number>(0);
  
  // ข้อมูลการรับเข้า
  const [newAdmit, setNewAdmit] = useState<number>(0);
  const [transferIn, setTransferIn] = useState<number>(0);
  const [referIn, setReferIn] = useState<number>(0);
  
  // ข้อมูลการจำหน่าย
  const [transferOut, setTransferOut] = useState<number>(0);
  const [referOut, setReferOut] = useState<number>(0);
  const [discharge, setDischarge] = useState<number>(0);
  const [dead, setDead] = useState<number>(0);
  
  // ข้อมูลเตียง
  const [available, setAvailable] = useState<number>(0);
  const [unavailable, setUnavailable] = useState<number>(0);
  const [plannedDischarge, setPlannedDischarge] = useState<number>(0);
  
  // ข้อมูลเพิ่มเติม
  const [comment, setComment] = useState<string>('');
  
  // ข้อมูลผู้บันทึก
  const { user } = useAuth();
  const [recorderFirstName, setRecorderFirstName] = useState<string>('');
  const [recorderLastName, setRecorderLastName] = useState<string>('');
  
  // เพิ่ม state สำหรับการคำนวณ
  const [existingForm, setExistingForm] = useState<WardForm | null>(null);
  const [previousNightForm, setPreviousNightForm] = useState<WardForm | null>(null);
  const [formStatus, setFormStatus] = useState<FormStatus | ''>('');
  const [censusCalculation, setCensusCalculation] = useState<{
    previousCensus?: number;
    admissions: number;
    discharges: number;
    calculatedCensus?: number;
  }>({
    admissions: 0,
    discharges: 0,
    calculatedCensus: 0,
  });
  
  // เพิ่ม state สำหรับ Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previousFormData, setPreviousFormData] = useState<WardForm | null>(null);
  const [currentFormData, setCurrentFormData] = useState<Partial<WardForm> | null>(null);
  
  // Function to load existing form data - Moved outside useEffect
  const loadExistingFormData = async () => {
    try {
      if (!selectedWard || !selectedDate) return; // Check selectedWard object

      // Validate date format and convert from DD/MM/YYYY to YYYY-MM-DD if needed
      let dateObj;
      if (selectedDate.includes('/')) {
        // Format is DD/MM/YYYY
        const parts = selectedDate.split('/');
        if (parts.length !== 3) {
          console.error('Invalid date format:', selectedDate);
          return;
        }
        // Create date from DD/MM/YYYY format (note: months are 0-indexed in JavaScript)
        dateObj = new Date(
          parseInt(parts[2]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[0]) // Day
        );
      } else if (selectedDate.includes('-')) {
        // Format is already YYYY-MM-DD
        const parts = selectedDate.split('-');
        if (parts.length !== 3) {
          console.error('Invalid date format:', selectedDate);
          return;
        }
        // Create date from YYYY-MM-DD format
        dateObj = new Date(
          parseInt(parts[0]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[2]) // Day
        );
      } else {
        console.error('Invalid date format (need / or -)', selectedDate);
        return;
      }

      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', selectedDate);
        return;
      }

      setLoading(true);

      console.log(`Loading form data for: ${dateObj.toISOString()}, ${selectedShift}, ${selectedWard.wardId}`);

      // Try to load existing form for the selected date, ward, and shift
      const existingFormData = await getWardForm(dateObj, selectedShift, selectedWard.wardId); // Use selectedWard.wardId

      if (existingFormData) {
        setExistingForm(existingFormData);
        setFormStatus(existingFormData.status);

        // Pre-fill the form with existing data
        setPatientCensus(existingFormData.patientCensus || 0);
        setNurseManager(existingFormData.nurseManager || 0);
        setRn(existingFormData.rn || 0);
        setPn(existingFormData.pn || 0);
        setWc(existingFormData.wc || 0);
        setNewAdmit(existingFormData.newAdmit || 0);
        setTransferIn(existingFormData.transferIn || 0);
        setReferIn(existingFormData.referIn || 0);
        setDischarge(existingFormData.discharge || 0);
        setDead(existingFormData.dead || 0);
        setTransferOut(existingFormData.transferOut || 0);
        setReferOut(existingFormData.referOut || 0);
        setAvailable(existingFormData.available || 0);
        setUnavailable(existingFormData.unavailable || 0);
        setPlannedDischarge(existingFormData.plannedDischarge || 0);
        setComment(existingFormData.comment || '');

        // Calculate total patient census
        const totalAdmissions = (existingFormData.newAdmit || 0) + 
                              (existingFormData.transferIn || 0) + 
                              (existingFormData.referIn || 0);
        const totalDischarges = (existingFormData.discharge || 0) + 
                               (existingFormData.dead || 0) + 
                               (existingFormData.transferOut || 0) + 
                               (existingFormData.referOut || 0);
        const calculatedTotal = (existingFormData.patientCensus || 0) + totalAdmissions - totalDischarges;

        // Update census calculation object
        setCensusCalculation({
          previousCensus: existingFormData.patientCensus || 0,
          admissions: totalAdmissions,
          discharges: totalDischarges,
          calculatedCensus: calculatedTotal
        });

        showSuccessToast('โหลดข้อมูลฟอร์มเดิมสำเร็จ');
      } else {
        setExistingForm(null);
        setFormStatus(FormStatus.DRAFT); // Use Enum
        showInfoToast('สร้างฟอร์มใหม่'); // Use custom toast
      }

      // If it's morning shift, try to load previous night's data for census calculation
      if (selectedShift === ShiftType.MORNING) {
        // Calculate previous day
        const prevDate = new Date(dateObj);
        prevDate.setDate(prevDate.getDate() - 1);

        console.log(`Looking for previous night shift data: ${prevDate.toISOString()}, ${selectedWard.wardId}`);

        // Pass Date object instead of string
        const prevNightForm = await getPreviousNightShiftForm(prevDate, selectedWard.wardId); // Use selectedWard.wardId

        if (prevNightForm) {
          setPreviousNightForm(prevNightForm);

          // If no existing form for morning, calculate from previous night
          if (!existingFormData) {
            // Use previous night's end census as starting point
            const prevNightCensus = prevNightForm.patientCensus || 0;
            const prevNightAdmit = (prevNightForm.newAdmit || 0) +
                                  (prevNightForm.transferIn || 0) +
                                  (prevNightForm.referIn || 0);
            const prevNightOut = (prevNightForm.discharge || 0) +
                                (prevNightForm.dead || 0) +
                                (prevNightForm.transferOut || 0) +
                                (prevNightForm.referOut || 0);

            // Calculate morning census based on previous night's data
            const calculatedCensus = prevNightCensus + prevNightAdmit - prevNightOut;
            setPatientCensus(calculatedCensus);

            // Set the census calculation details for display
            setCensusCalculation({
              previousCensus: prevNightCensus,
              admissions: prevNightAdmit,
              discharges: prevNightOut,
              calculatedCensus: calculatedCensus
            });

            showInfoToast('ใช้ข้อมูลเวรดึกก่อนหน้าสำหรับคำนวณยอดผู้ป่วย'); // Use custom toast
          }
        } else {
          setPreviousNightForm(null);
          if (!existingFormData) {
            setPatientCensus(0);
          }
          showErrorToast('ไม่พบข้อมูลเวรดึกก่อนหน้า'); // Use custom toast
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading existing form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLoading(false);
    }
  };

  // โหลดข้อมูลวอร์ด
  useEffect(() => {
    const loadWards = async () => {
      try {
        setLoading(true);
        const wardsData = await getActiveWards();
        setWards(wardsData);

        // ถ้ามีการกำหนด location ให้กับผู้ใช้ ให้เลือกวอร์ดแรกในรายการที่เข้าถึงได้
        if (user?.location && user.location.length > 0 && wardsData.length > 0) {
          const userWards = wardsData.filter(ward =>
            user.location?.includes(ward.wardId) || user.role === 'admin');
          if (userWards.length > 0) {
            // Find the Ward object instead of just the ID
            const initialWard = wardsData.find(ward => ward.wardId === userWards[0].wardId) || null;
            setSelectedWard(initialWard);
          }
        } else if (wardsData.length > 0) {
           // Select the first ward by default if no user preference
           setSelectedWard(wardsData[0]);
        }
      } catch (error) {
        console.error('Error loading wards:', error);
        showErrorToast('ไม่สามารถโหลดข้อมูลวอร์ดได้');
      } finally {
        setLoading(false);
      }
    };

    loadWards();
  }, [user]);

  // โหลดข้อมูลผู้ใช้งาน
  useEffect(() => {
    if (user) {
      setRecorderFirstName(user.firstName || '');
      setRecorderLastName(user.lastName || '');
    }
  }, [user]);

  // โหลดข้อมูลฟอร์มเดิม (ถ้ามี) - useEffect calls the separated function
  useEffect(() => {
    if (selectedWard && selectedDate) {
      loadExistingFormData();
    }
  }, [selectedWard, selectedDate, selectedShift]);
  
  // คำนวณยอดรับเข้าและจำหน่ายตลอดเวลาที่มีการเปลี่ยนแปลงข้อมูล
  useEffect(() => {
    // Calculate total patient census based on inputs
    const totalAdmissions = (newAdmit || 0) + (transferIn || 0) + (referIn || 0);
    const totalDischarges = (discharge || 0) + (dead || 0) + (transferOut || 0) + (referOut || 0);
    
    const calculatedTotal = Math.max(0, (patientCensus || 0) + totalAdmissions - totalDischarges);
    
    // Update census calculation object
    setCensusCalculation({
      previousCensus: patientCensus || 0,
      admissions: totalAdmissions,
      discharges: totalDischarges,
      calculatedCensus: calculatedTotal
    });
  }, [patientCensus, newAdmit, transferIn, referIn, discharge, dead, transferOut, referOut]);
  
  // ปรับปรุงฟังก์ชัน handleSaveDraft
  const handleSaveDraft = async () => {
    try {
      if (!selectedWard || !user?.uid) {
        showErrorToast('กรุณาเลือกหอผู้ป่วยและตรวจสอบข้อมูลผู้ใช้');
        return;
      }

      if (!user) {
        showErrorToast('ไม่พบข้อมูลผู้ใช้');
        return;
      }

      // Convert date string to Date object
      let dateObj: Date;
      if (selectedDate.includes('/')) {
        // Format is DD/MM/YYYY
        const parts = selectedDate.split('/');
        dateObj = new Date(
          parseInt(parts[2]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[0]) // Day
        );
      } else {
        // Format is YYYY-MM-DD
        const parts = selectedDate.split('-');
        dateObj = new Date(
          parseInt(parts[0]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[2]) // Day
        );
      }

      // Calculate total patient census
      const totalAdmissions = (newAdmit || 0) + (transferIn || 0) + (referIn || 0);
      const totalDischarges = (discharge || 0) + (dead || 0) + (transferOut || 0) + (referOut || 0);
      const calculatedTotal = Math.max(0, (patientCensus || 0) + totalAdmissions - totalDischarges);

      // สร้างข้อมูลฟอร์มปัจจุบัน
      const formData: Partial<WardForm> = {
        wardId: selectedWard.wardId,
        wardName: selectedWard.wardName,
        date: dateObj, // Use Date object instead of string
        dateString: format(dateObj, 'yyyy-MM-dd'), // Always store in YYYY-MM-DD format
        shift: selectedShift,
        patientCensus: patientCensus || 0,
        totalPatientCensus: calculatedTotal,
        nurseManager: nurseManager || 0,
        rn: rn || 0,
        pn: pn || 0,
        wc: wc || 0,
        newAdmit: newAdmit || 0,
        transferIn: transferIn || 0,
        referIn: referIn || 0,
        discharge: discharge || 0,
        dead: dead || 0,
        transferOut: transferOut || 0,
        referOut: referOut || 0,
        available: available || 0,
        unavailable: unavailable || 0,
        plannedDischarge: plannedDischarge || 0,
        comment: comment || '',
        recorderFirstName: user.firstName || '',
        recorderLastName: user.lastName || '',
        createdBy: user.uid,
        status: FormStatus.DRAFT,
        isDraft: true
      };

      // ตรวจสอบว่ามีข้อมูลเดิมหรือไม่ 
      if (existingForm && existingForm.status === FormStatus.DRAFT) {
        // ถ้ามีข้อมูลเดิมที่เป็น Draft อยู่แล้ว ให้แสดง Modal เพื่อยืนยัน
        setPreviousFormData(existingForm);
        setCurrentFormData(formData);
        setShowConfirmModal(true);
        return;
      }

      // ถ้าไม่มีข้อมูลเดิม หรือข้อมูลเดิมไม่ใช่ Draft ให้บันทึกเลย
      await saveFormDraft(formData);
      
    } catch (error) {
      console.error('Error saving form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกข้อมูล (update ถ้ามี id, add ถ้าไม่มี)
  const saveFormDraft = async (formData: Partial<WardForm>) => {
    try {
      setLoading(true);
      
      console.log('Saving draft form data:', formData);
      
      if (!user) {
        showErrorToast('ไม่พบข้อมูลผู้ใช้');
        return;
      }

      // ถ้ามี id ของ existingForm ให้ update document เดิม
      const formId = (previousFormData?.id || existingForm?.id) as string | undefined;
      if (formId) {
        // ใช้ updateDoc จาก wardFormService
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/app/core/firebase/firebase');
        const { COLLECTION_WARDFORMS } = await import('@/app/features/census/forms/services/wardFormService');
        await updateDoc(doc(db, COLLECTION_WARDFORMS, formId), {
          ...formData,
          updatedAt: new Date(),
        });
      } else {
        // ถ้าไม่มี id ให้ save แบบปกติ (add ใหม่)
        if (selectedShift === ShiftType.MORNING) {
          await saveMorningShiftFormDraft(formData, user);
        } else {
          await saveNightShiftFormDraft(formData, user);
        }
      }

      showSuccessToast('บันทึกข้อมูลสำเร็จ');
      
      // Reload form data to get updated status and id
      await loadExistingFormData();
      
    } catch (error) {
      console.error('Error saving form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };
  
  const handleSaveFinal = async () => {
    try {
      if (!selectedWard || !user?.uid) {
        showErrorToast('กรุณาเลือกหอผู้ป่วยและตรวจสอบข้อมูลผู้ใช้');
        return;
      }

      if (!user) {
        showErrorToast('ไม่พบข้อมูลผู้ใช้');
        return;
      }

      // Check form validation
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      // Calculate total patient census
      const totalAdmissions = (newAdmit || 0) + (transferIn || 0) + (referIn || 0);
      const totalDischarges = (discharge || 0) + (dead || 0) + (transferOut || 0) + (referOut || 0);
      const calculatedTotal = Math.max(0, (patientCensus || 0) + totalAdmissions - totalDischarges);

      // Convert date string to Date object
      let dateObj: Date;
      if (selectedDate.includes('/')) {
        // Format is DD/MM/YYYY
        const parts = selectedDate.split('/');
        dateObj = new Date(
          parseInt(parts[2]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[0]) // Day
        );
      } else {
        // Format is YYYY-MM-DD
        const parts = selectedDate.split('-');
        dateObj = new Date(
          parseInt(parts[0]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[2]) // Day
        );
      }

      const formData: Partial<WardForm> = {
        wardId: selectedWard.wardId,
        wardName: selectedWard.wardName,
        date: dateObj, // Use Date object instead of string
        dateString: format(dateObj, 'yyyy-MM-dd'), // Always store in YYYY-MM-DD format
        shift: selectedShift,
        patientCensus: patientCensus || 0,
        totalPatientCensus: calculatedTotal,
        nurseManager: nurseManager || 0,
        rn: rn || 0,
        pn: pn || 0,
        wc: wc || 0,
        newAdmit: newAdmit || 0,
        transferIn: transferIn || 0,
        referIn: referIn || 0,
        discharge: discharge || 0,
        dead: dead || 0,
        transferOut: transferOut || 0,
        referOut: referOut || 0,
        available: available || 0,
        unavailable: unavailable || 0,
        plannedDischarge: plannedDischarge || 0,
        comment: comment || '',
        recorderFirstName: user.firstName || '',
        recorderLastName: user.lastName || '',
        createdBy: user.uid,
        status: FormStatus.FINAL,
        isDraft: false
      };

      console.log('Saving final form data:', formData);

      if (selectedShift === ShiftType.MORNING) {
        await finalizeMorningShiftForm(formData, user);
        showSuccessToast('ส่งข้อมูลเวรเช้าสำเร็จ');
      } else {
        await finalizeNightShiftForm(formData, user);
        showSuccessToast('ส่งข้อมูลเวรดึกสำเร็จ');
      }
      
      // Reload form data to get updated status
      await loadExistingFormData();
      
    } catch (error) {
      console.error('Error finalizing form:', error);
      showErrorToast('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setLoading(false);
    }
  };
  
  // ตรวจสอบความถูกต้องของฟอร์ม
  const validateForm = (): boolean => {
    if (!selectedDate) {
      showErrorToast('กรุณาเลือกวันที่');
      return false;
    }
    
    if (!selectedWard) {
      showErrorToast('กรุณาเลือกวอร์ด');
      return false;
    }
    
    if (!recorderFirstName || !recorderLastName) {
      showErrorToast('กรุณาระบุชื่อ-นามสกุลผู้บันทึก');
      return false;
    }
    
    return true;
  };

  // เพิ่ม Component Modal สำหรับยืนยันการบันทึกทับ
  const ConfirmSaveModal = () => {
    if (!showConfirmModal || !previousFormData || !currentFormData) return null;

    // ฟังก์ชันช่วยแปลง timestamp เป็น Date
    const formatTimestamp = (timestamp: any): string => {
      try {
        if (!timestamp) return '-';
        
        // ถ้าเป็น object ที่มี seconds property
        if (typeof timestamp === 'object' && timestamp !== null) {
          if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
            return new Date(timestamp.seconds * 1000).toLocaleString('th-TH');
          }
          // ถ้าเป็น Date object
          if (timestamp instanceof Date) {
            return timestamp.toLocaleString('th-TH');
          }
          // ถ้าเป็น Firebase Timestamp ที่มี toDate method
          if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleString('th-TH');
          }
        }
        return '-';
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        return '-';
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              พบข้อมูลแบบร่างที่บันทึกไว้แล้ว
            </h2>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                มีข้อมูลแบบร่างที่บันทึกไว้แล้ว คุณต้องการดำเนินการอย่างไร?
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3 text-blue-600 dark:text-blue-400">
                    ข้อมูลเดิม (บันทึกเมื่อ {formatTimestamp(previousFormData.updatedAt)})
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">จำนวนผู้ป่วย:</span> {previousFormData.patientCensus || 0}</p>
                    <p><span className="font-medium">ยอดผู้ป่วยหลังคำนวณ:</span> {previousFormData.totalPatientCensus || 0}</p>
                    <p><span className="font-medium">บุคลากร:</span> NM: {previousFormData.nurseManager || 0}, RN: {previousFormData.rn || 0}, PN: {previousFormData.pn || 0}, WC: {previousFormData.wc || 0}</p>
                    <p><span className="font-medium">รับเข้ารวม:</span> {(previousFormData.newAdmit || 0) + (previousFormData.transferIn || 0) + (previousFormData.referIn || 0)}</p>
                    <p><span className="font-medium">จำหน่ายรวม:</span> {(previousFormData.discharge || 0) + (previousFormData.dead || 0) + (previousFormData.transferOut || 0) + (previousFormData.referOut || 0)}</p>
                    <p><span className="font-medium">หมายเหตุ:</span> {previousFormData.comment || '-'}</p>
                  </div>
                </div>
                
                <div className="border border-green-300 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-lg font-medium mb-3 text-green-600 dark:text-green-400">
                    ข้อมูลใหม่
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">จำนวนผู้ป่วย:</span> {currentFormData.patientCensus || 0}</p>
                    <p><span className="font-medium">ยอดผู้ป่วยหลังคำนวณ:</span> {currentFormData.totalPatientCensus || 0}</p>
                    <p><span className="font-medium">บุคลากร:</span> NM: {currentFormData.nurseManager || 0}, RN: {currentFormData.rn || 0}, PN: {currentFormData.pn || 0}, WC: {currentFormData.wc || 0}</p>
                    <p><span className="font-medium">รับเข้ารวม:</span> {(currentFormData.newAdmit || 0) + (currentFormData.transferIn || 0) + (currentFormData.referIn || 0)}</p>
                    <p><span className="font-medium">จำหน่ายรวม:</span> {(currentFormData.discharge || 0) + (currentFormData.dead || 0) + (currentFormData.transferOut || 0) + (currentFormData.referOut || 0)}</p>
                    <p><span className="font-medium">หมายเหตุ:</span> {currentFormData.comment || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button 
                className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 py-2 px-4 rounded transition-colors font-medium text-sm"
                onClick={() => setShowConfirmModal(false)}
              >
                ยกเลิก
              </button>
              <button 
                className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded transition-colors font-medium text-sm"
                onClick={() => {
                  // ใช้ข้อมูลเดิม
                  setShowConfirmModal(false);
                  // โหลดข้อมูลเดิมมาแสดงอีกครั้ง
                  loadExistingFormData();
                  showInfoToast('ใช้ข้อมูลเดิม');
                }}
              >
                ใช้ข้อมูลเดิม
              </button>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors font-medium text-sm"
                onClick={() => {
                  // บันทึกทับข้อมูลเดิม
                  if (currentFormData) {
                    saveFormDraft(currentFormData);
                  }
                }}
              >
                บันทึกทับ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container p-4 mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">แบบฟอร์มบันทึกจำนวนผู้ป่วยและบุคลากรประจำวัน</h1>
          
          {/* แสดง Modal เมื่อต้องการยืนยันการบันทึกทับ */}
          <ConfirmSaveModal />
          
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลทั่วไป</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  วันที่
                </label>
                <input 
                  type="date" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  เวร
                </label>
                <select 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as ShiftType)}
                >
                  <option value={ShiftType.MORNING}>เช้า</option>
                  <option value={ShiftType.NIGHT}>ดึก</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  หอผู้ป่วย
                </label>
                <select 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={selectedWard?.wardId || ''}
                  onChange={(e) => {
                    const wardId = e.target.value;
                    const ward = wards.find(w => w.wardId === wardId) || null;
                    setSelectedWard(ward);
                  }}
                >
                  <option value="">-- เลือกหอผู้ป่วย --</option>
                  {wards.map((ward) => (
                    <option key={ward.wardId} value={ward.wardId}>
                      {ward.wardName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {existingForm && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md mb-6">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
                    กำลังแก้ไขแบบฟอร์มที่บันทึกไว้แล้ว (สถานะ: {
                      formStatus === FormStatus.DRAFT ? 'ฉบับร่าง' : 
                      formStatus === FormStatus.FINAL ? 'รอการอนุมัติ' : 
                      formStatus === FormStatus.APPROVED ? 'อนุมัติแล้ว' : 
                      formStatus === FormStatus.REJECTED ? 'ถูกปฏิเสธ' : 
                      'ไม่ทราบสถานะ'
                    })
                  </p>
                </div>
              </div>
            )}
            
            {/* แสดงข้อมูลการคำนวณ Census */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md mb-6">
              <h3 className="text-base font-medium mb-2 text-gray-800 dark:text-gray-200">ข้อมูลการคำนวณจำนวนผู้ป่วย</h3>
              
              {selectedShift === ShiftType.MORNING ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {previousNightForm ? (
                    <div>
                      <p className="mb-1">• จำนวนผู้ป่วยจากกะดึกวันก่อนหน้า: <span className="font-medium">{censusCalculation.previousCensus || 0}</span> คน</p>
                      <p className="text-blue-600 dark:text-blue-400 text-xs italic">หมายเหตุ: ในกะเช้า จำนวนผู้ป่วยจะใช้ค่าจากกะดึกของวันก่อนหน้า</p>
                    </div>
                  ) : (
                    <p className="text-yellow-600 dark:text-yellow-400">ไม่พบข้อมูลกะดึกวันก่อนหน้า กรุณากรอกจำนวนผู้ป่วยของกะเช้าโดยตรง</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-1">• จำนวนผู้ป่วยจากกะเช้า: <span className="font-medium">{censusCalculation.calculatedCensus || 0}</span> คน</p>
                  {patientCensus !== censusCalculation.calculatedCensus && (
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs italic mt-1">
                      หมายเหตุ: จำนวนผู้ป่วยที่กรอกไม่ตรงกับการคำนวณ กรุณาตรวจสอบความถูกต้อง
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลบุคลากรและผู้ป่วย</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  (Total Patient Census)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={censusCalculation.calculatedCensus || 0}
                  readOnly
                />
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  *ยอดรวมจำนวนผู้ป่วย ไม่สามารถแก้ไขได้
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  จำนวนผู้ป่วยตอนนี้ (Patient Census)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={patientCensus}
                  onChange={(e) => setPatientCensus(Number(e.target.value))}
                  min="0"
                  disabled={previousNightForm !== null && selectedShift === ShiftType.MORNING}
                />
                {previousNightForm !== null && selectedShift === ShiftType.MORNING && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    *ค่านี้ถูกกำหนดจากกะดึกของวันก่อนหน้า
                  </p>
                )}
              </div>
              

              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  หัวหน้าพยาบาล (Nurse Manager)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={nurseManager}
                  onChange={(e) => setNurseManager(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  พยาบาลวิชาชีพ (RN)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={rn}
                  onChange={(e) => setRn(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  พยาบาลเทคนิค (PN)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={pn}
                  onChange={(e) => setPn(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ผู้ช่วยพยาบาล (WC)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={wc}
                  onChange={(e) => setWc(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลการรับเข้า</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  รับใหม่ (New Admit)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={newAdmit}
                  onChange={(e) => setNewAdmit(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ย้ายเข้า (Transfer In)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={transferIn}
                  onChange={(e) => setTransferIn(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ส่งตัวมารักษาต่อ (Refer In)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={referIn}
                  onChange={(e) => setReferIn(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลการจำหน่าย</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ย้ายออก (Transfer Out)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={transferOut}
                  onChange={(e) => setTransferOut(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ส่งไปรักษาต่อ (Refer Out)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={referOut}
                  onChange={(e) => setReferOut(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  จำหน่าย (Discharge)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={discharge}
                  onChange={(e) => setDischarge(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  เสียชีวิต (Dead)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={dead}
                  onChange={(e) => setDead(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลเพิ่มเติม</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  เตียงว่าง (Available)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={available}
                  onChange={(e) => setAvailable(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  เตียงไม่พร้อมใช้ (Unavailable)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={unavailable}
                  onChange={(e) => setUnavailable(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  วางแผนจำหน่าย (Planned Discharge)
                </label>
                <input 
                  type="number" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={plannedDischarge}
                  onChange={(e) => setPlannedDischarge(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                หมายเหตุ (Comment)
              </label>
              <textarea 
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-700 dark:text-white
                dark:focus:border-blue-400 dark:focus:ring-blue-400"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ข้อมูลผู้บันทึก</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  ชื่อ
                </label>
                <input 
                  type="text" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={recorderFirstName}
                  onChange={(e) => setRecorderFirstName(e.target.value)}
                  placeholder="ชื่อผู้บันทึก"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  นามสกุล
                </label>
                <input 
                  type="text" 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  value={recorderLastName}
                  onChange={(e) => setRecorderLastName(e.target.value)}
                  placeholder="นามสกุลผู้บันทึก"
                />
              </div>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button 
                className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 py-2 px-4 rounded transition-colors font-medium text-sm"
                onClick={handleSaveDraft}
                disabled={loading}
              >
                {loading ? 'กำลังบันทึก...' : 'Save Draft'}
              </button>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors font-medium text-sm"
                onClick={handleSaveFinal}
                disabled={loading}
              >
                {loading ? 'กำลังบันทึก...' : 'Save Final'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
