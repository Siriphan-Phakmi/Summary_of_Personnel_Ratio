'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftForm from '../forms/ShiftForm/ShiftForm';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../utils/clientLogging';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, limit, getDoc } from 'firebase/firestore';
import { formatThaiDate, getUTCDateString } from '../../utils/dateUtils';
import { SwalAlert } from '../../utils/alertService';

/**
 * Component สำหรับหน้าอนุมัติข้อมูล
 * แสดงข้อมูลทั้ง 2 กะพร้อมกัน (กะเช้าและกะดึก) สำหรับ admin และ supervisor
 * ผู้ใช้ทั่วไปจะเห็นเฉพาะข้อมูลแผนกตนเอง
 */
export default function Approval() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [morningShiftData, setMorningShiftData] = useState(null);
  const [nightShiftData, setNightShiftData] = useState(null);
  const [wardData, setWardData] = useState([]);
  
  const isApprover = user?.role?.toLowerCase() === 'approver' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'supervisor';

  useEffect(() => {
    // Log event เมื่อเข้าถึงหน้าอนุมัติ
    logEvent('approval_page_accessed', {
      userId: user?.uid || 'unknown',
      userRole: user?.role || 'unknown'
    });
    
    if (user) {
      fetchApprovalData();
    } else {
      setLoading(false);
    }
  }, [user, selectedDate]);

  // ฟังก์ชันดึงข้อมูลการอนุมัติ
  const fetchApprovalData = async () => {
    try {
      setLoading(true);
      const formattedDate = getUTCDateString(selectedDate);
      
      // ถ้าเป็น admin หรือ supervisor ดึงข้อมูลทุกแผนก
      if (isApprover) {
        const wardsRef = collection(db, 'wardDailyRecords');
        const q = query(
          wardsRef,
          where('date', '==', formattedDate),
          orderBy('wardId')
        );
        
        const querySnapshot = await getDocs(q);
        const wards = [];
        
        querySnapshot.forEach((doc) => {
          wards.push({ id: doc.id, ...doc.data() });
        });
        
        setWardData(wards);
      } 
      // ถ้าเป็นผู้ใช้ทั่วไปดึงเฉพาะข้อมูลแผนกตนเอง
      else {
        const wardsRef = collection(db, 'wardDailyRecords');
        const q = query(
          wardsRef,
          where('date', '==', formattedDate),
          where('wardId', '==', user.department)
        );
        
        const querySnapshot = await getDocs(q);
        const wards = [];
        
        querySnapshot.forEach((doc) => {
          wards.push({ id: doc.id, ...doc.data() });
        });
        
        setWardData(wards);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching approval data:', error);
    setLoading(false);
      SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        icon: 'error',
        confirmButtonText: 'ตกลง'
      });
    }
  };
  
  // ฟังก์ชันอนุมัติข้อมูล
  const handleApprove = async (wardId, shift) => {
    try {
      const formattedDate = getUTCDateString(selectedDate);
      const docId = `${formattedDate}_${wardId}`;
      const wardRef = doc(db, 'wardDailyRecords', docId);
      
      // อัพเดทสถานะการอนุมัติ
      await updateDoc(wardRef, {
        approvalStatus: 'approved',
        approver: user.email,
        approverName: `${user.firstName} ${user.lastName}`,
        approvalDate: new Date().toISOString()
      });
      
      // แสดงการแจ้งเตือนสำเร็จ
      SwalAlert.fire({
        title: 'อนุมัติสำเร็จ',
        text: `อนุมัติข้อมูลวันที่ ${formatThaiDate(selectedDate)} แผนก ${wardId} กะ ${shift === 'morning' ? 'เช้า' : 'ดึก'} เรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonText: 'ตกลง'
      });
      
      // โหลดข้อมูลใหม่
      fetchApprovalData();
    } catch (error) {
      console.error('Error approving data:', error);
      SwalAlert.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถอนุมัติข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        icon: 'error',
        confirmButtonText: 'ตกลง'
      });
    }
  };
  
  // ฟังก์ชันแก้ไขข้อมูล
  const handleEdit = (wardId, shift) => {
    router.push(`/page/ward-form?ward=${wardId}&date=${getUTCDateString(selectedDate)}&shift=${shift === 'morning' ? 'Morning (07:00-19:00)' : 'Night (19:00-07:00)'}`);
  };
  
  // ฟังก์ชันเปลี่ยนวันที่
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  return (
    <div>
      <div className="bg-yellow-50 p-4 mb-6 rounded-lg border border-yellow-200">
        <h2 className="font-medium text-yellow-700 mb-2">
          {isApprover ? 'หน้าสำหรับการอนุมัติข้อมูล' : 'หน้าแสดงสถานะการอนุมัติข้อมูล'}
        </h2>
        <p className="text-sm text-yellow-600">
          {isApprover 
            ? 'คุณสามารถตรวจสอบและอนุมัติข้อมูลได้ในหน้านี้ ข้อมูลที่อนุมัติแล้วจะไม่สามารถแก้ไขได้อีก'
            : 'คุณสามารถดูสถานะการอนุมัติข้อมูลของแผนกคุณได้ในหน้านี้ แต่ไม่สามารถอนุมัติข้อมูลได้'
          }
        </p>
      </div>
      
      {/* ส่วนเลือกวันที่ */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <label className="font-medium text-gray-700 mr-3">เลือกวันที่:</label>
          <input 
            type="date" 
            value={getUTCDateString(selectedDate)}
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>
        <p className="text-sm text-gray-500">วันที่แสดงข้อมูล: {formatThaiDate(selectedDate)}</p>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {wardData.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">ไม่พบข้อมูลการอนุมัติสำหรับวันที่ {formatThaiDate(selectedDate)}</p>
              <p className="text-sm text-gray-500 mt-2">อาจจะยังไม่มีการบันทึกข้อมูลสำหรับวันที่นี้ หรือข้อมูลถูกอนุมัติไปแล้ว</p>
            </div>
          ) : (
            <div className="space-y-8">
              {wardData.map((ward) => (
                <div key={ward.id} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">แผนก: {ward.wardId}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      ward.approvalStatus === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ward.approvalStatus === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                    {/* กะเช้า */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-700">กะเช้า (07:00-19:00)</h4>
                        {ward.morning && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            มีข้อมูล
                          </span>
                        )}
                      </div>
                      
                      {ward.morning ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded p-3 bg-blue-50">
                              <div className="text-sm text-blue-700 mb-1">Patient Census</div>
                              <div className="font-semibold text-lg">{ward.patientCensus || '-'}</div>
                            </div>
                          </div>
                          
                          {/* ข้อมูลบุคลากร */}
                          <div className="border rounded p-3">
                            <h5 className="font-medium text-gray-700 mb-2">ข้อมูลบุคลากร</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Nurse Manager:</span> {ward.nurseManager?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">RN:</span> {ward.RN?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">PN:</span> {ward.PN?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">WC:</span> {ward.WC?.morning || '-'}
                              </div>
                            </div>
                          </div>
                          
                          {/* ข้อมูลผู้ป่วย */}
                          <div className="border rounded p-3">
                            <h5 className="font-medium text-gray-700 mb-2">ข้อมูลผู้ป่วย</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">New Admit:</span> {ward.newAdmit?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Transfer In:</span> {ward.transferIn?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Refer In:</span> {ward.referIn?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Transfer Out:</span> {ward.transferOut?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Refer Out:</span> {ward.referOut?.morning || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Discharge:</span> {ward.discharge?.morning || '-'}
                              </div>
                            </div>
                          </div>
                          
                          {/* หมายเหตุ */}
                          {ward.comment?.morning && (
                            <div className="border rounded p-3">
                              <h5 className="font-medium text-gray-700 mb-2">หมายเหตุ</h5>
                              <p className="text-sm text-gray-600">{ward.comment.morning}</p>
                            </div>
                          )}
                          
                          {/* ปุ่มสำหรับ Admin และ Supervisor */}
                          {isApprover && (
                            <div className="flex justify-end gap-2 mt-4">
                              <button 
                                type="button"
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                onClick={() => handleEdit(ward.wardId, 'morning')}
                              >
                                แก้ไข
                              </button>
                              {ward.approvalStatus !== 'approved' && (
                                <button 
                                  type="button"
                                  className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  onClick={() => handleApprove(ward.wardId, 'morning')}
                                >
                                  อนุมัติ
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">ไม่พบข้อมูลกะเช้า</div>
                      )}
                    </div>
                    
                    {/* กะดึก */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-indigo-700">กะดึก (19:00-07:00)</h4>
                        {ward.night && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                            มีข้อมูล
                          </span>
                        )}
                      </div>
                      
                      {ward.night ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded p-3 bg-indigo-50">
                              <div className="text-sm text-indigo-700 mb-1">Overall Data</div>
                              <div className="font-semibold text-lg">{ward.overallData || '-'}</div>
                            </div>
                          </div>
                          
                          {/* ข้อมูลบุคลากร */}
                          <div className="border rounded p-3">
                            <h5 className="font-medium text-gray-700 mb-2">ข้อมูลบุคลากร</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Nurse Manager:</span> {ward.nurseManager?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">RN:</span> {ward.RN?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">PN:</span> {ward.PN?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">WC:</span> {ward.WC?.night || '-'}
                              </div>
                            </div>
                          </div>
                          
                          {/* ข้อมูลผู้ป่วย */}
                          <div className="border rounded p-3">
                            <h5 className="font-medium text-gray-700 mb-2">ข้อมูลผู้ป่วย</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">New Admit:</span> {ward.newAdmit?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Transfer In:</span> {ward.transferIn?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Refer In:</span> {ward.referIn?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Transfer Out:</span> {ward.transferOut?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Refer Out:</span> {ward.referOut?.night || '-'}
                              </div>
                              <div>
                                <span className="text-gray-600">Discharge:</span> {ward.discharge?.night || '-'}
                              </div>
                            </div>
                          </div>
                          
                          {/* หมายเหตุ */}
                          {ward.comment?.night && (
                            <div className="border rounded p-3">
                              <h5 className="font-medium text-gray-700 mb-2">หมายเหตุ</h5>
                              <p className="text-sm text-gray-600">{ward.comment.night}</p>
                            </div>
                          )}
                          
                          {/* ปุ่มสำหรับ Admin และ Supervisor */}
                          {isApprover && (
                            <div className="flex justify-end gap-2 mt-4">
                              <button 
                                type="button"
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                                onClick={() => handleEdit(ward.wardId, 'night')}
                              >
                                แก้ไข
                              </button>
                              {ward.approvalStatus !== 'approved' && (
                                <button 
                                  type="button"
                                  className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  onClick={() => handleApprove(ward.wardId, 'night')}
                                >
                                  อนุมัติ
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">ไม่พบข้อมูลกะดึก</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
} 