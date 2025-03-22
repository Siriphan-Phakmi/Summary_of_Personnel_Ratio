'use client';
import React from 'react';
import { useState } from 'react';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SwalAlert } from '../../../utils/alertService';
import { logEvent } from '../../../utils/clientLogging';
import { useAuth } from '../../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logWardDataHistory } from '../../../utils/clientLogging';

const ApprovalButton = ({ wardId, date, status = 'pending' }) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { user } = useAuth();
  
  // ตรวจสอบว่าผู้ใช้มีสิทธิ์เป็น supervisor หรือ admin หรือไม่
  const canApprove = user?.role === 'supervisor' || user?.role === 'admin';
  
  // ฟังก์ชันสำหรับขอลายเซ็น Supervisor
  const promptForSignature = async (defaultSignature = null) => {
    const { firstName = '', lastName = '' } = defaultSignature || user || {};
    
    const signatureResult = await SwalAlert.fire({
      title: 'ลงชื่อผู้อนุมัติ',
      html: `
        <div class="text-left">
          <p class="mb-2 font-medium">กรุณากรอกชื่อผู้อนุมัติ (Supervisor)</p>
          <div class="mb-3">
            <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input type="text" id="firstName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ชื่อ" value="${firstName}">
          </div>
          <div class="mb-3">
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
            <input type="text" id="lastName" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="นามสกุล" value="${lastName}">
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0ab4ab',
      cancelButtonColor: '#d33',
      preConfirm: () => {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        
        if (!firstName.trim()) {
          SwalAlert.showValidationMessage('กรุณากรอกชื่อ');
          return false;
        }
        
        if (!lastName.trim()) {
          SwalAlert.showValidationMessage('กรุณากรอกนามสกุล');
          return false;
        }
        
        return { firstName, lastName };
      }
    });
    
    if (!signatureResult.isConfirmed) {
      return [false, null];
    }
    
    return [true, signatureResult.value];
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      // เรียกใช้ฟังก์ชันขอลายเซ็น Supervisor
      const [isConfirmed, signature] = await promptForSignature();
      
      if (!isConfirmed || !signature) {
        setIsApproving(false);
        return;
      }
      
      const { firstName, lastName } = signature;
      
      // ยืนยันการอนุมัติ
      const confirmResult = await SwalAlert.fire({
        title: 'อนุมัติข้อมูล Ward',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">คุณต้องการอนุมัติข้อมูลของ ${wardId} ใช่หรือไม่?</p>
            <p class="text-sm text-gray-600">วันที่: ${date}</p>
            <p class="text-sm text-gray-600">ผู้อนุมัติ: ${firstName} ${lastName}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33'
      });
      
      if (!confirmResult.isConfirmed) {
        setIsApproving(false);
        return;
      }
      
      // ค้นหาข้อมูลใน wardDataFinal ที่รอการอนุมัติ
      const finalDataRef = collection(db, 'wardDataFinal');
      const q = query(
        finalDataRef,
        where('wardId', '==', wardId),
        where('date', '==', date),
        where('approvalStatus', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await SwalAlert.fire({
          title: 'ไม่พบข้อมูลที่รอการอนุมัติ',
          text: 'ไม่พบข้อมูลที่รอการอนุมัติของแผนกและวันที่ที่เลือก',
          icon: 'warning',
          confirmButtonColor: '#0ab4ab'
        });
        setIsApproving(false);
        return;
      }
      
      // อัปเดตสถานะการอนุมัติในทุกกะที่รอการอนุมัติ
      for (const docSnapshot of snapshot.docs) {
        const finalData = docSnapshot.data();
        const finalDocRef = doc(db, 'wardDataFinal', docSnapshot.id);
        
        // อัปเดตสถานะใน wardDataFinal
        await updateDoc(finalDocRef, {
          approvalStatus: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: user?.uid || '',
          approvedByName: `${firstName} ${lastName}`,
          supervisorSignature: {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            uid: user?.uid || ''
          }
        });
        
        // บันทึกข้อมูลลงใน wardDailyRecords
        const wardDailyRef = doc(db, 'wardDailyRecords', `${date}_${wardId}`);
        await setDoc(wardDailyRef, {
          wardId: wardId,
          date: date,
          patientCensus: finalData.patientCensus || '0',
          overallData: finalData.overallData || '0',
          approvalStatus: 'approved',
          lastUpdated: serverTimestamp(),
          shifts: {
            [finalData.shift]: {
              nurseManager: finalData.nurseManager || '0',
              rns: finalData.rns || '0',
              pns: finalData.pns || '0',
              nas: finalData.nas || '0',
              newAdmit: finalData.newAdmit || '0',
              transferIn: finalData.transferIn || '0',
              referIn: finalData.referIn || '0',
              transferOut: finalData.transferOut || '0',
              referOut: finalData.referOut || '0',
              discharge: finalData.discharge || '0',
              dead: finalData.dead || '0',
              patientCensus: finalData.patientCensus || '0',
              overallData: finalData.overallData || '0',
              submittedBy: finalData.userId || '',
              submittedByName: finalData.userDisplayName || '',
              approvedBy: user?.uid || '',
              approvedByName: `${firstName} ${lastName}`,
              approvedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
        
        // บันทึกประวัติการเปลี่ยนแปลงข้อมูล
        try {
          await logWardDataHistory(
            {
              ...finalData,
              approvalStatus: 'approved',
              approvedAt: new Date().toISOString(),
              approvedBy: user?.uid || '',
              approvedByName: `${firstName} ${lastName}`
            },
            'approve',
            user?.uid || ''
          );
        } catch (logError) {
          console.error('Error logging approval history:', logError);
          // ไม่หยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
        }
      }
      
      // แสดงข้อความสำเร็จ
      await SwalAlert.fire({
        title: 'อนุมัติสำเร็จ',
        text: `ข้อมูลของ ${wardId} ได้รับการอนุมัติแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // โหลดหน้าใหม่เพื่อแสดงสถานะที่อัปเดต
      window.location.reload();
    } catch (error) {
      console.error('Error approving ward data:', error);
      
      await SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถอนุมัติข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      
      // ขอเหตุผลในการปฏิเสธ
      const { value: rejectReason } = await SwalAlert.fire({
        title: 'ระบุเหตุผลในการปฏิเสธ',
        input: 'textarea',
        inputPlaceholder: 'กรุณาระบุเหตุผลในการปฏิเสธข้อมูลนี้...',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        inputValidator: (value) => {
          if (!value) {
            return 'กรุณาระบุเหตุผลในการปฏิเสธ';
          }
        }
      });
      
      if (!rejectReason) {
        setIsRejecting(false);
        return; // ผู้ใช้ยกเลิกการปฏิเสธ
      }
      
      // เรียกใช้ฟังก์ชันขอลายเซ็น Supervisor
      const [isConfirmed, signature] = await promptForSignature();
      
      if (!isConfirmed || !signature) {
        setIsRejecting(false);
        return;
      }
      
      const { firstName, lastName } = signature;
      
      // ยืนยันการปฏิเสธ
      const confirmResult = await SwalAlert.fire({
        title: 'ปฏิเสธข้อมูล Ward',
        html: `
          <div class="text-left">
            <p class="mb-2 font-medium">คุณต้องการปฏิเสธข้อมูลของ ${wardId} ใช่หรือไม่?</p>
            <p class="text-sm text-gray-600">วันที่: ${date}</p>
            <p class="text-sm text-gray-600">ผู้ปฏิเสธ: ${firstName} ${lastName}</p>
            <p class="text-sm text-gray-600">เหตุผล: ${rejectReason}</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ปฏิเสธ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
      });
      
      if (!confirmResult.isConfirmed) {
        setIsRejecting(false);
        return;
      }
      
      // ค้นหาข้อมูลใน wardDataFinal ที่รอการอนุมัติ
      const finalDataRef = collection(db, 'wardDataFinal');
      const q = query(
        finalDataRef,
        where('wardId', '==', wardId),
        where('date', '==', date),
        where('approvalStatus', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await SwalAlert.fire({
          title: 'ไม่พบข้อมูลที่รอการอนุมัติ',
          text: 'ไม่พบข้อมูลที่รอการอนุมัติของแผนกและวันที่ที่เลือก',
          icon: 'warning',
          confirmButtonColor: '#0ab4ab'
        });
        setIsRejecting(false);
        return;
      }
      
      // อัปเดตสถานะการปฏิเสธในทุกกะที่รอการอนุมัติ
      for (const docSnapshot of snapshot.docs) {
        const finalData = docSnapshot.data();
        const finalDocRef = doc(db, 'wardDataFinal', docSnapshot.id);
        
        // อัปเดตสถานะใน wardDataFinal
        await updateDoc(finalDocRef, {
          approvalStatus: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: user?.uid || '',
          rejectedByName: `${firstName} ${lastName}`,
          rejectReason: rejectReason,
          supervisorSignature: {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            uid: user?.uid || ''
          }
        });
        
        // ไม่บันทึกข้อมูลลงใน wardDailyRecords เพราะถูกปฏิเสธ
        
        // บันทึกประวัติการเปลี่ยนแปลงข้อมูล
        try {
          await logWardDataHistory(
            {
              ...finalData,
              approvalStatus: 'rejected',
              rejectedAt: new Date().toISOString(),
              rejectedBy: user?.uid || '',
              rejectedByName: `${firstName} ${lastName}`,
              rejectReason: rejectReason
            },
            'reject',
            user?.uid || ''
          );
        } catch (logError) {
          console.error('Error logging rejection history:', logError);
          // ไม่หยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
        }
      }
      
      // แสดงข้อความสำเร็จ
      await SwalAlert.fire({
        title: 'ปฏิเสธสำเร็จ',
        text: `ข้อมูลของ ${wardId} ถูกปฏิเสธเรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // โหลดหน้าใหม่เพื่อแสดงสถานะที่อัปเดต
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting ward data:', error);
      
      await SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถปฏิเสธข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // ถ้าไม่มีสิทธิ์อนุมัติและสถานะยังไม่ได้อนุมัติหรือปฏิเสธ ให้แสดงแค่สถานะ
  if (!canApprove && status === 'pending') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <span className="mr-1">⏳</span>
        รออนุมัติ
      </div>
    );
  }

  // Display approved badge if already approved
  if (status === 'approved') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span className="mr-1">✅</span>
        อนุมัติแล้ว
      </div>
    );
  }

  // Display rejected badge if rejected
  if (status === 'rejected') {
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <span className="mr-1">❌</span>
        ปฏิเสธแล้ว
      </div>
    );
  }

  // ถ้าเป็นผู้มีสิทธิ์อนุมัติและสถานะยังเป็น pending แสดงปุ่ม approve และ reject
  if (canApprove && status === 'pending') {
    return (
      <div className="flex space-x-2">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <>
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> กำลังอนุมัติ...
            </>
          ) : (
            <>
              <span className="mr-1">✅</span> อนุมัติ
            </>
          )}
        </button>
        <button
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejecting ? (
            <>
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> กำลังปฏิเสธ...
            </>
          ) : (
            <>
              <span className="mr-1">❌</span> ปฏิเสธ
            </>
          )}
        </button>
      </div>
    );
  }

  // แสดงสถานะ pending สำหรับกรณีอื่นๆ
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <span className="mr-1">⏳</span>
      รออนุมัติ
    </div>
  );
};

export default ApprovalButton;