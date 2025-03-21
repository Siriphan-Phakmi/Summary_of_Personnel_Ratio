'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { formatThaiDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { Swal } from '../../utils/alertService';
import LoadingScreen from '../ui/LoadingScreen';
import { wardMapping } from '../../utils/wardConstants';

const ApprovalList = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'ward', 'shift'
  const { user } = useAuth();

  // ดึงข้อมูลที่รอการอนุมัติจาก wardDailyRecords
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      setLoading(true);
      try {
        const wardDailyRecords = collection(db, 'wardDailyRecords');
        let q;
        
        // ตรวจสอบบทบาทของผู้ใช้เพื่อกำหนดการ query
        if (user && user.role === 'admin' || user.role === 'supervisor') {
          // สำหรับ admin หรือ supervisor ดึงข้อมูลทุก ward
          q = query(
            wardDailyRecords, 
            where('approvalStatus', '==', 'pending'),
            orderBy('lastUpdated', 'desc'),
            limit(50)
          );
        } else {
          // สำหรับผู้ใช้ปกติดึงเฉพาะข้อมูลของ ward ตัวเอง
          q = query(
            wardDailyRecords, 
            where('wardId', '==', user.department),
            orderBy('lastUpdated', 'desc'),
            limit(50)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const items = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // ตรวจสอบว่ามีข้อมูลกะเช้าหรือกะดึกหรือไม่
          const hasMorningData = data.morning || false;
          const hasNightData = data.night || false;

          items.push({
            id: doc.id,
            ...data,
            formType: 'ward',
            dateSubmitted: data.timestamp ? new Date(data.timestamp) : new Date(),
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
            hasMorningData,
            hasNightData
          });
        });
        
        setPendingItems(items);
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถดึงข้อมูลรายการที่รออนุมัติได้',
          icon: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingApprovals();
  }, [filter, user]);

  // ฟังก์ชันสำหรับอนุมัติข้อมูล
  const handleApprove = async (item) => {
    try {
      const wardId = item.wardId;
      const date = item.date;
      
      const confirmResult = await Swal.fire({
        title: 'ยืนยันการอนุมัติ',
        html: `คุณต้องการอนุมัติข้อมูล Ward ใช่หรือไม่?<br>
               วันที่: ${formatThaiDate(date)}<br>
               วอร์ด: ${wardMapping[wardId] || wardId}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0ab4ab'
      });
      
      if (!confirmResult.isConfirmed) return;
      
      // อัปเดตสถานะการอนุมัติใน wardDailyRecords
      const wardDailyRef = doc(db, 'wardDailyRecords', item.id);
      await updateDoc(wardDailyRef, {
        approvalStatus: 'approved',
        approvedBy: {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || ''
        },
        approvedAt: new Date()
      });
      
      Swal.fire({
        title: 'อนุมัติสำเร็จ',
        text: `ข้อมูล Ward ${wardMapping[wardId] || wardId} ได้รับการอนุมัติแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // Refresh the list
      setFilter(prev => prev); // ทำให้ useEffect ทำงานอีกครั้ง
    } catch (error) {
      console.error('Error approving item:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถอนุมัติข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    }
  };

  // ฟังก์ชันสำหรับปฏิเสธข้อมูล
  const handleReject = async (item) => {
    try {
      const wardId = item.wardId;
      const date = item.date;
      
      // Get rejection reason
      const reasonResult = await Swal.fire({
        title: 'ปฏิเสธข้อมูล',
        html: `
          <div class="text-left">
            <p class="mb-2">กรุณาระบุเหตุผลในการปฏิเสธข้อมูลของ ${wardMapping[wardId] || wardId}</p>
            <p class="text-sm text-gray-600">วันที่: ${formatThaiDate(date)}</p>
            <textarea id="rejection-reason" class="w-full mt-3 px-3 py-2 border border-gray-300 rounded" rows="3" placeholder="ระบุเหตุผล..."></textarea>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ปฏิเสธ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        preConfirm: () => {
          const reason = document.getElementById('rejection-reason').value;
          if (!reason.trim()) {
            Swal.showValidationMessage('กรุณาระบุเหตุผลในการปฏิเสธ');
          }
          return reason;
        }
      });
      
      if (!reasonResult.isConfirmed) return;
      
      const rejectionReason = reasonResult.value;
      
      // อัปเดตสถานะการปฏิเสธใน wardDailyRecords
      const wardDailyRef = doc(db, 'wardDailyRecords', item.id);
      await updateDoc(wardDailyRef, {
        approvalStatus: 'rejected',
        rejectedBy: {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || ''
        },
        rejectedAt: new Date(),
        rejectionReason: rejectionReason
      });
      
      Swal.fire({
        title: 'ปฏิเสธข้อมูลสำเร็จ',
        text: `ข้อมูล Ward ${wardMapping[wardId] || wardId} ถูกปฏิเสธเรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0ab4ab'
      });
      
      // Refresh the list
      setFilter(prev => prev); // ทำให้ useEffect ทำงานอีกครั้ง
    } catch (error) {
      console.error('Error rejecting item:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถปฏิเสธข้อมูลได้ กรุณาลองอีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    }
  };

  // ฟังก์ชันสำหรับดูรายละเอียด
  const handleViewDetails = async (item) => {
    const wardId = item.wardId;
    const date = item.date;
    
    // สร้าง HTML สำหรับแสดงข้อมูลทั้งกะเช้าและกะดึก
    let detailsHtml = `
      <div class="text-left">
        <p class="font-medium mb-2">ข้อมูล Ward: ${wardMapping[wardId] || wardId}</p>
        <p class="text-sm">วันที่: ${formatThaiDate(date)}</p>
        
        <div class="mt-4 grid grid-cols-2 gap-4">
    `;
    
    // ตรวจสอบและแสดงข้อมูลกะเช้า
    if (item.hasMorningData || item.morning) {
      detailsHtml += `
        <div class="border rounded p-3">
          <p class="font-medium text-blue-600">กะเช้า</p>
          <div class="mt-2 space-y-1 text-sm">
            <p><span class="font-medium">Patient Census:</span> ${item.patientCensus || '-'}</p>
            <p><span class="font-medium">Nurse Manager:</span> ${item.nurseManager?.morning || '-'}</p>
            <p><span class="font-medium">RN:</span> ${item.RN?.morning || '-'}</p>
            <p><span class="font-medium">PN:</span> ${item.PN?.morning || '-'}</p>
            <p><span class="font-medium">WC:</span> ${item.WC?.morning || '-'}</p>
            <p><span class="font-medium">NA:</span> ${item.NA?.morning || '-'}</p>
            <p><span class="font-medium">New Admit:</span> ${item.newAdmit?.morning || '-'}</p>
            <p><span class="font-medium">Transfer In:</span> ${item.transferIn?.morning || '-'}</p>
            <p><span class="font-medium">Refer In:</span> ${item.referIn?.morning || '-'}</p>
            <p><span class="font-medium">Transfer Out:</span> ${item.transferOut?.morning || '-'}</p>
            <p><span class="font-medium">Refer Out:</span> ${item.referOut?.morning || '-'}</p>
            <p><span class="font-medium">Discharge:</span> ${item.discharge?.morning || '-'}</p>
            <p><span class="font-medium">Dead:</span> ${item.dead?.morning || '-'}</p>
            <p><span class="font-medium">Available:</span> ${item.available?.morning || '-'}</p>
            <p><span class="font-medium">Unavailable:</span> ${item.unavailable?.morning || '-'}</p>
            <p><span class="font-medium">Planned Discharge:</span> ${item.plannedDischarge?.morning || '-'}</p>
            <p><span class="font-medium">Comment:</span> ${item.comment?.morning || '-'}</p>
          </div>
        </div>
      `;
    }
    
    // ตรวจสอบและแสดงข้อมูลกะดึก
    if (item.hasNightData || item.night) {
      detailsHtml += `
        <div class="border rounded p-3">
          <p class="font-medium text-purple-600">กะดึก</p>
          <div class="mt-2 space-y-1 text-sm">
            <p><span class="font-medium">Overall Data:</span> ${item.overallData || '-'}</p>
            <p><span class="font-medium">Nurse Manager:</span> ${item.nurseManager?.night || '-'}</p>
            <p><span class="font-medium">RN:</span> ${item.RN?.night || '-'}</p>
            <p><span class="font-medium">PN:</span> ${item.PN?.night || '-'}</p>
            <p><span class="font-medium">WC:</span> ${item.WC?.night || '-'}</p>
            <p><span class="font-medium">NA:</span> ${item.NA?.night || '-'}</p>
            <p><span class="font-medium">New Admit:</span> ${item.newAdmit?.night || '-'}</p>
            <p><span class="font-medium">Transfer In:</span> ${item.transferIn?.night || '-'}</p>
            <p><span class="font-medium">Refer In:</span> ${item.referIn?.night || '-'}</p>
            <p><span class="font-medium">Transfer Out:</span> ${item.transferOut?.night || '-'}</p>
            <p><span class="font-medium">Refer Out:</span> ${item.referOut?.night || '-'}</p>
            <p><span class="font-medium">Discharge:</span> ${item.discharge?.night || '-'}</p>
            <p><span class="font-medium">Dead:</span> ${item.dead?.night || '-'}</p>
            <p><span class="font-medium">Available:</span> ${item.available?.night || '-'}</p>
            <p><span class="font-medium">Unavailable:</span> ${item.unavailable?.night || '-'}</p>
            <p><span class="font-medium">Planned Discharge:</span> ${item.plannedDischarge?.night || '-'}</p>
            <p><span class="font-medium">Comment:</span> ${item.comment?.night || '-'}</p>
          </div>
        </div>
      `;
    }
    
    // แสดงข้อมูลสถานะการอนุมัติ
    detailsHtml += `
        </div>
        
        <div class="mt-4">
          <p class="font-medium">สถานะการอนุมัติ:</p>
          <p class="text-sm">${item.approvalStatus === 'pending' ? 'รออนุมัติ' : 
                              item.approvalStatus === 'approved' ? 'อนุมัติแล้ว' : 
                              'ปฏิเสธ'}</p>
          <p class="font-medium mt-2">เวลาอัพเดทล่าสุด:</p>
          <p class="text-sm">${item.lastUpdated ? item.lastUpdated.toLocaleString('th-TH') : '-'}</p>
        </div>
      </div>
    `;
    
    await Swal.fire({
      title: 'รายละเอียดข้อมูล',
      html: detailsHtml,
      confirmButtonText: 'ปิด',
      confirmButtonColor: '#0ab4ab',
      width: '800px'
    });
  };

  // ฟังก์ชันสำหรับอัปเดทข้อมูลที่แสดงในหน้าอนุมัติ
  const updateApprovalData = async (item) => {
    // ฟังก์ชันนี้สำหรับ admin หรือ supervisor ที่ต้องการแก้ไขข้อมูลก่อนอนุมัติ
    if (!(user.role === 'admin' || user.role === 'supervisor')) {
      Swal.fire({
        title: 'ไม่มีสิทธิ์ในการแก้ไข',
        text: 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูล',
        icon: 'warning',
        confirmButtonColor: '#0ab4ab'
      });
      return;
    }
    
    // ในอนาคตจะเพิ่มฟอร์มแก้ไขข้อมูลที่นี่
    Swal.fire({
      title: 'แก้ไขข้อมูล',
      text: 'ฟังก์ชันนี้อยู่ระหว่างการพัฒนา',
      icon: 'info',
      confirmButtonColor: '#0ab4ab'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-6">รายการรออนุมัติ</h2>
      
      {loading ? (
        <LoadingScreen />
      ) : pendingItems.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-lg text-gray-600">ไม่มีรายการที่รออนุมัติ</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วอร์ด</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กะ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อัพเดทล่าสุด</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {wardMapping[item.wardId] || item.wardId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatThaiDate(item.date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {item.hasMorningData && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          เช้า
                        </span>
                      )}
                      {item.hasNightData && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ดึก
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      รออนุมัติ
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.lastUpdated ? item.lastUpdated.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded-md text-sm"
                      >
                        รายละเอียด
                      </button>
                      {(user.role === 'admin' || user.role === 'supervisor') && (
                        <>
                          <button
                            onClick={() => handleApprove(item)}
                            className="text-green-600 hover:text-green-900 px-2 py-1 rounded-md text-sm"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded-md text-sm"
                          >
                            ปฏิเสธ
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApprovalList; 