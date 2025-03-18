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

  // ดึงข้อมูลที่รอการอนุมัติจาก wardDailyRecords แทน approvalQueue
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      setLoading(true);
      try {
        const wardDailyRecords = collection(db, 'wardDailyRecords');
        let q = query(
          wardDailyRecords, 
          where('approvalStatus', '==', 'pending'),
          orderBy('lastUpdated', 'desc'),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const items = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
            formType: 'ward', // ทุกรายการเป็นประเภท ward เพราะมาจาก wardDailyRecords
            dateSubmitted: data.dateSubmitted?.toDate() || new Date(),
            lastUpdated: data.lastUpdated?.toDate() || new Date()
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
  }, [filter]);

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
      fetchPendingApprovals();
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
      fetchPendingApprovals();
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
    
    let detailsHtml = `
      <div class="text-left">
        <p class="font-medium mb-2">ข้อมูล Ward: ${wardMapping[wardId] || wardId}</p>
        <p class="text-sm">วันที่: ${formatThaiDate(date)}</p>
        
        <div class="mt-4">
          <p class="font-medium">ข้อมูลกะ:</p>
          <ul class="text-sm mt-1 space-y-1">
    `;
    
    // แสดงข้อมูลของแต่ละกะที่มีในข้อมูล
    if (item.shifts) {
      Object.entries(item.shifts).forEach(([shiftName, shiftData]) => {
        detailsHtml += `<li class="pl-2 border-l-2 border-gray-300">${shiftName}</li>`;
      });
    }
    
    detailsHtml += `
          </ul>
        </div>
        
        <div class="mt-4">
          <p class="font-medium">ผู้บันทึกข้อมูล:</p>
          <p class="text-sm">${item.submittedBy?.displayName || '-'}</p>
        </div>
        
        <div class="mt-4">
          <p class="font-medium">เวลาบันทึก:</p>
          <p class="text-sm">${item.dateSubmitted ? new Date(item.dateSubmitted).toLocaleString('th-TH') : '-'}</p>
        </div>
      </div>
    `;
    
    await Swal.fire({
      title: 'รายละเอียดข้อมูล',
      html: detailsHtml,
      confirmButtonText: 'ปิด',
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้บันทึก</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่บันทึก</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {wardMapping[item.wardId] || item.wardId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatThaiDate(item.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.shifts ? Object.keys(item.shifts).join(', ') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.submittedBy?.displayName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.dateSubmitted ? new Date(item.dateSubmitted).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        ดูข้อมูล
                      </button>
                      <button
                        onClick={() => handleApprove(item)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleReject(item)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        ปฏิเสธ
                      </button>
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