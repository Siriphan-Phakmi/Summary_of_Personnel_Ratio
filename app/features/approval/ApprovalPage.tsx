'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { useAuth } from '@/app/features/auth';
import Button from '@/app/core/ui/Button';
import { UserRole } from '@/app/core/types/user';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { getPendingForms, getApprovalHistoryByFormId } from '@/app/features/ward-form/services/approvalServices/approvalQueries';
import { approveWardForm, rejectWardForm, getApprovalsByUserPermission } from '@/app/features/ward-form/services/approvalService';
import { formatTimestamp } from '@/app/core/utils/dateUtils';
import { showErrorToast, showSuccessToast } from '@/app/core/utils/toastUtils';
import Modal from '@/app/core/ui/Modal';
import { ApprovalHistoryRecord } from '@/app/core/types/approval';
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';
import { handleIndexError } from '@/app/core/firebase/indexDetector';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';

interface FormDetailsModalProps {
  form: WardForm | null;
  isOpen: boolean;
  onClose: () => void;
}

const FormDetailsModal: React.FC<FormDetailsModalProps> = ({ form, isOpen, onClose }) => {
  const [history, setHistory] = useState<ApprovalHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isIndexError, setIsIndexError] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !form || !form.id) {
        setHistory([]);
        return;
      }
      
      setHistoryLoading(true);
      setHistoryError(null);
      setIsIndexError(false);
      try {
        const fetchedHistory = await getApprovalHistoryByFormId(form.id);
        setHistory(fetchedHistory);
      } catch (err) {
        console.error('Error fetching approval history:', err);
        
        // ตรวจสอบว่าเป็น index error หรือไม่
        if (handleIndexError(err, 'ApprovalPage.FormDetailsModal')) {
          setIsIndexError(true);
          setHistoryError('ไม่สามารถโหลดประวัติได้เนื่องจากขาด Firestore Index');
        } else {
        setHistoryError('ไม่สามารถโหลดประวัติการดำเนินการได้');
        }
        
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, form]);

  if (!form) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดแบบฟอร์ม" size="3xl">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">วันที่:</h4>
            <p className="text-gray-900 dark:text-gray-100">{formatTimestamp(form.date, 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">กะ:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">หอผู้ป่วย:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.wardName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">ผู้บันทึก:</h4>
            <p className="text-gray-900 dark:text-gray-100">{form.recorderFirstName} {form.recorderLastName}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">สถานะปัจจุบัน:</h4>
            <p className="text-gray-900 dark:text-gray-100">
              <ApprovalStatusBadge status={form.status} />
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4 border-b pb-4 dark:border-gray-700">
            <div>
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Patient Census:</h4>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{form.patientCensus || 0}</p>
                
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Nursing Staff:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Manager:</span> <span className="text-gray-900 dark:text-gray-100">{form.nurseManager || 0}</span></div>
                  <div><span className="text-gray-500">RN:</span> <span className="text-gray-900 dark:text-gray-100">{form.rn || 0}</span></div>
                  <div><span className="text-gray-500">PN:</span> <span className="text-gray-900 dark:text-gray-100">{form.pn || 0}</span></div>
                  <div><span className="text-gray-500">WC:</span> <span className="text-gray-900 dark:text-gray-100">{form.wc || 0}</span></div>
                </div>
            </div>

            <div>
                 <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Movements:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div><span className="text-gray-500">New Admit:</span> <span className="text-gray-900 dark:text-gray-100">{form.newAdmit || 0}</span></div>
                    <div><span className="text-gray-500">Transfer In:</span> <span className="text-gray-900 dark:text-gray-100">{form.transferIn || 0}</span></div>
                    <div><span className="text-gray-500">Refer In:</span> <span className="text-gray-900 dark:text-gray-100">{form.referIn || 0}</span></div>
                    <div><span className="text-gray-500">Discharge:</span> <span className="text-gray-900 dark:text-gray-100">{form.discharge || 0}</span></div>
                    <div><span className="text-gray-500">Transfer Out:</span> <span className="text-gray-900 dark:text-gray-100">{form.transferOut || 0}</span></div>
                    <div><span className="text-gray-500">Refer Out:</span> <span className="text-gray-900 dark:text-gray-100">{form.referOut || 0}</span></div>
                    <div><span className="text-gray-500">Dead:</span> <span className="text-gray-900 dark:text-gray-100">{form.dead || 0}</span></div>
                </div>
                
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Bed Status:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Available:</span> <span className="text-gray-900 dark:text-gray-100">{form.available || 0}</span></div>
                  <div><span className="text-gray-500">Unavailable:</span> <span className="text-gray-900 dark:text-gray-100">{form.unavailable || 0}</span></div>
                  <div><span className="text-gray-500">Planned Disc:</span> <span className="text-gray-900 dark:text-gray-100">{form.plannedDischarge || 0}</span></div>
                </div>
            </div>
        </div>
                
        {form.comment && (
          <div className="mb-4 border-b pb-4 dark:border-gray-700">
            <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Comment:</h4>
            <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{form.comment}</p>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">ประวัติการดำเนินการ</h4>
          {historyLoading && (
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <FiLoader className="animate-spin h-5 w-5 mr-2" />
              กำลังโหลดประวัติ...
            </div>
          )}
          
          {isIndexError && (
            <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-md">
              <FiAlertTriangle className="mt-1 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">พบปัญหา Firestore Index</p>
                <p className="text-sm">ไม่สามารถโหลดประวัติได้เนื่องจากขาด Index ที่จำเป็น กรุณาแจ้งผู้ดูแลระบบ</p>
              </div>
            </div>
          )}
          
          {historyError && !isIndexError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{historyError}</p>
          )}
          
          {!historyLoading && !historyError && !isIndexError && history.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">ยังไม่มีประวัติการดำเนินการ</p>
          )}
          
          {!historyLoading && !historyError && history.length > 0 && (
            <ul className="space-y-3">
              {history.map((record) => (
                <li key={record.id} className="flex items-start space-x-3 text-sm">
                  <div className={`mt-1 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${record.action === 'APPROVED' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    {record.action === 'APPROVED' ? (
                      <FiCheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <FiXCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{record.actorName || 'N/A'}</span>
                      {record.action === 'APPROVED' ? ' อนุมัติ' : ' ปฏิเสธ'}
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({formatTimestamp(record.timestamp, 'dd/MM/yyyy HH:mm')})
                      </span>
                    </p>
                    {record.action === 'REJECTED' && record.reason && (
                      <p className="mt-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs italic">เหตุผล: {record.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </Modal>
  );
};

const ApprovalStatusBadge: React.FC<{ status: FormStatus | string }> = ({ status }) => {
     const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium";
     if (status === FormStatus.APPROVED) {
       return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}>อนุมัติแล้ว</span>;
     } else if (status === FormStatus.REJECTED) {
       return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>ปฏิเสธ</span>;
     } else if (status === FormStatus.DRAFT) {
       return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`}>ร่าง</span>;
     } else if (status === FormStatus.FINAL) {
       return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}>รออนุมัติ</span>;
     }
     return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>{status}</span>;
};

/**
 * ฟังก์ชันสำหรับดึง URL สำหรับสร้าง Index จาก error message
 * @param error Error object จาก Firebase
 * @returns URL สำหรับสร้าง Index หรือ null ถ้าไม่พบ
 */
const extractIndexUrl = (error: unknown): string | null => {
  try {
    const errorMessage = (error as any)?.message || '';
    const urlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
    return urlMatch ? urlMatch[0] : null;
  } catch (e) {
    console.error('Error extracting index URL:', e);
    return null;
  }
};

/**
 * Component สำหรับแสดงข้อความแจ้งเตือนเมื่อเกิด Firestore Index Error
 */
const IndexErrorMessage = ({ error }: { error?: unknown }) => {
  const indexUrl = error ? extractIndexUrl(error) : null;
  
  return (
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-lg flex items-start">
      <FiAlertTriangle className="text-yellow-600 mr-3 mt-1 flex-shrink0 h-6 w-6" />
      <div>
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 text-lg">ไม่สามารถค้นหาข้อมูลได้</h3>
        <p className="mt-2 text-yellow-700 dark:text-yellow-400">
          ระบบไม่สามารถแสดงข้อมูลได้เนื่องจากขาด Firestore Index ที่จำเป็น กรุณาแจ้งผู้ดูแลระบบเพื่อสร้าง Index ตามคำแนะนำด้านล่าง
        </p>
        
        {indexUrl && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-900">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">สร้าง Index โดยตรง:</p>
            <a 
              href={indexUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700"
            >
              คลิกเพื่อสร้าง Index ที่ขาด <FiExternalLink className="ml-2 h-4 w-4" />
            </a>
          </div>
        )}
        
        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-yellow-200 dark:border-yellow-900">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">คำแนะนำสำหรับผู้ดูแลระบบ:</p>
          <ol className="text-sm text-yellow-700 dark:text-yellow-400 list-decimal pl-5 space-y-1">
            <li>เข้าไปที่ Firebase Console และสร้าง Index ที่จำเป็น</li>
            <li>หรือใช้ Firebase CLI สั่ง <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">firebase deploy --only firestore:indexes</code></li>
            <li>ดูวิธีการแก้ไขเพิ่มเติมได้ที่ <a href="/admin/dev-tools" className="text-blue-600 dark:text-blue-400 underline">Dev-Tools</a></li>
          </ol>
        </div>
        <p className="mt-3 text-sm italic text-yellow-600 dark:text-yellow-500">
          ในระหว่างนี้ กรุณาลองใช้การกรองข้อมูลแบบอื่นหรือลองค้นหาด้วยเงื่อนไขที่น้อยลง
        </p>
      </div>
    </div>
  );
};

/**
 * แปลงค่าเวลาให้เป็น timestamp มิลลิวินาทีสำหรับเปรียบเทียบ
 * @param time เวลาในรูปแบบต่างๆ
 * @returns timestamp เป็นมิลลิวินาทีเพื่อใช้เปรียบเทียบ
 */
const getComparisonTimestamp = (time: any): number => {
  try {
    // กรณีเป็น Firestore Timestamp (มี seconds และ nanoseconds)
    if (time && typeof time === 'object' && 'seconds' in time) {
      return time.seconds * 1000 + (time.nanoseconds ? time.nanoseconds / 1000000 : 0);
    }
    
    // กรณีเป็น JavaScript Date object
    if (time instanceof Date) {
      return time.getTime();
    }
    
    // กรณีเป็น string (ISO date) พยายามแปลงเป็น Date
    if (typeof time === 'string') {
      const dateObj = new Date(time);
      return isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
    }
    
    // กรณีอื่นๆ ที่ไม่รู้จัก
    return 0;
  } catch (err) {
    console.error("Error converting time to timestamp:", err);
    return 0;
  }
};

/**
 * หน้าสำหรับการอนุมัติแบบฟอร์ม
 */
export default function ApprovalPage() {
  const { user } = useAuth();
  const [searchDate, setSearchDate] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [forms, setForms] = useState<WardForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexError, setIsIndexError] = useState(false);
  const [selectedForm, setSelectedForm] = useState<WardForm | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // แสดงทั้งหมดเป็นค่าเริ่มต้น
  const [itemsPerPage, setItemsPerPage] = useState<number>(20); // จำนวนรายการที่แสดงต่อหน้า ค่าเริ่มต้นคือ 20
  const statusRef = useRef<HTMLSelectElement>(null);
  const rejectionTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus textarea when reject modal opens
  useEffect(() => {
    if (showRejectModal) {
      setTimeout(() => rejectionTextareaRef.current?.focus(), 0);
    }
  }, [showRejectModal]);

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user, selectedStatus, searchDate, wardFilter]);

  // ปรับปรุงฟังก์ชันดึงข้อมูลเพื่อใช้ตามสิทธิ์ผู้ใช้
  const fetchForms = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);
    setIsIndexError(false);
    
    try {
      // สร้าง filter ตามสิทธิ์ของผู้ใช้
      const filter: any = {
        status: selectedStatus === 'all' ? undefined : selectedStatus as FormStatus | undefined,
        startDate: searchDate ? new Date(searchDate) : undefined,
      };
      
      let fetchedForms: WardForm[] = [];
      
      // ผู้ใช้ระดับ Admin, Super Admin หรือ Developer เห็นทั้งหมด
      if (
        user.role === UserRole.ADMIN || 
        user.role === UserRole.SUPER_ADMIN || 
        user.role === UserRole.DEVELOPER
      ) {
        // Admin เห็นทั้งหมด สามารถกรองตาม wardFilter ได้
        filter.wardId = wardFilter || undefined;
        fetchedForms = await getApprovalsByUserPermission(user, filter);
        
        // เรียงลำดับตามเวลาล่าสุด (อัพเดทล่าสุดหรือสร้างล่าสุด)
        fetchedForms.sort((a, b) => {
          // ใช้เวลาที่มีการอัพเดทล่าสุดก่อน
          const aTime = a.updatedAt || a.finalizedAt || a.createdAt;
          const bTime = b.updatedAt || b.finalizedAt || b.createdAt;
          
          // ถ้าไม่มีเวลา ให้ถือว่าเก่ากว่า
          if (!aTime) return 1;
          if (!bTime) return -1;
          
          // แปลงเป็น timestamp มิลลิวินาที เพื่อเปรียบเทียบ
          const aTimestamp = getComparisonTimestamp(aTime);
          const bTimestamp = getComparisonTimestamp(bTime);
          
          // เรียงจากใหม่ไปเก่า
          return bTimestamp - aTimestamp;
        });
        
        setForms(fetchedForms);
      }
      // ผู้อนุมัติเห็นเฉพาะแผนกที่มีสิทธิ์
      else if (user.role === UserRole.APPROVER) {
        // Approver ใช้ wardFilter เมื่อกรอง แต่ตัว service จะจำกัดเฉพาะแผนกที่มีสิทธิ์
        filter.wardId = wardFilter || undefined;
        fetchedForms = await getApprovalsByUserPermission(user, filter);
        
        // เรียงลำดับตามเวลาล่าสุด (อัพเดทล่าสุดหรือสร้างล่าสุด)
        fetchedForms.sort((a, b) => {
          // ใช้เวลาที่มีการอัพเดทล่าสุดก่อน
          const aTime = a.updatedAt || a.finalizedAt || a.createdAt;
          const bTime = b.updatedAt || b.finalizedAt || b.createdAt;
          
          // ถ้าไม่มีเวลา ให้ถือว่าเก่ากว่า
          if (!aTime) return 1;
          if (!bTime) return -1;
          
          // แปลงเป็น timestamp มิลลิวินาที เพื่อเปรียบเทียบ
          const aTimestamp = getComparisonTimestamp(aTime);
          const bTimestamp = getComparisonTimestamp(bTime);
          
          // เรียงจากใหม่ไปเก่า
          return bTimestamp - aTimestamp;
        });
        
        setForms(fetchedForms);
      }
      // ผู้ใช้ทั่วไป (NURSE/VIEWER) เห็นเฉพาะแบบฟอร์มของตนเองและเฉพาะแผนกของตนเอง
      else if (user.role === UserRole.NURSE || user.role === UserRole.VIEWER) {
        if (!user.floor) {
          setError('ไม่พบข้อมูลแผนกที่สังกัด กรุณาติดต่อผู้ดูแลระบบ');
          setForms([]);
          setLoading(false);
          return;
        }
        
        try {
          // ดึงตาม wardId และ createdBy เพื่อให้เห็นเฉพาะของแผนกตัวเองและสร้างโดยตัวเอง
          // โดยใช้ IN clause แทนการใช้ compound query เพื่อหลีกเลี่ยงความจำเป็นที่ต้องใช้ complex index
          const simpleFilter = {
            wardId: user.floor.toUpperCase(),
            createdBy: user.uid // เพิ่มเงื่อนไขให้ดึงเฉพาะฟอร์มที่สร้างโดยผู้ใช้คนปัจจุบัน
          };
          
          try {
            // ลองใช้วิธีง่ายกว่าเพื่อหลีกเลี่ยง index error
            // 1. ดึงเฉพาะตาม wardId ก่อน โดยไม่ใช้ orderBy
            const formsRef = collection(db, COLLECTION_WARDFORMS);
            const wardQuery = query(
              formsRef,
              where('wardId', '==', user.floor.toUpperCase())
            );
            
            const querySnapshot = await getDocs(wardQuery);
            let userForms: WardForm[] = [];
          
            // 2. กรองข้อมูลที่ได้แบบ client-side
            querySnapshot.forEach(doc => {
              const formData = doc.data() as WardForm;
              // แก้ไขเงื่อนไข: ให้แสดงทุกฟอร์มในแผนกของผู้ใช้ (user.floor)
              // โดยไม่ต้องตรวจสอบว่าผู้ใช้เป็นคนสร้างฟอร์มนั้นหรือไม่ (ลบ `formData.createdBy === user.uid`)
              // ที่จริงแล้ว querySnapshot ที่ได้มาก็คือข้อมูลทั้งหมดของ user.floor อยู่แล้ว จึงไม่จำเป็นต้องกรองซ้ำ
              // สามารถ push ข้อมูลเข้า userForms ได้เลย
                userForms.push({
                  ...formData,
                  id: doc.id
                });
            });
            
            // 3. กรอง status ถ้าจำเป็น
          if (selectedStatus !== 'all') {
            userForms = userForms.filter(form => form.status === selectedStatus);
          }
          
            // 4. เรียงข้อมูลหลังจากกรอง
          userForms.sort((a, b) => {
              // ใช้เวลาที่มีการอัพเดทล่าสุดก่อน ถ้าไม่มีให้ใช้ timestamp อื่นๆ ตามลำดับความสำคัญ
              const aTime = a.updatedAt || a.finalizedAt || a.createdAt;
              const bTime = b.updatedAt || b.finalizedAt || b.createdAt;
              
              // ถ้าไม่มีเวลา ให้ใช้ dateString แทน
              if (!aTime && !bTime) {
            if (!a.dateString || !b.dateString) return 0;
            return b.dateString.localeCompare(a.dateString); // เรียงจากวันล่าสุด
              }
              
              // ถ้าไม่มีเวลา ให้ถือว่าเก่ากว่า
              if (!aTime) return 1;
              if (!bTime) return -1;
              
              // แปลงเป็น timestamp มิลลิวินาที เพื่อเปรียบเทียบ
              const aTimestamp = getComparisonTimestamp(aTime);
              const bTimestamp = getComparisonTimestamp(bTime);
              
              // เรียงจากใหม่ไปเก่า
              return bTimestamp - aTimestamp;
          });
          
          setForms(userForms);
          } catch (err) {
            console.error('Error in simplified query:', err);
            
            // ถ้ายังมี error ลองใช้การ query แบบง่ายขึ้นไปอีก (เฉพาะ wardId)
            try {
              const formsRef = collection(db, COLLECTION_WARDFORMS);
              const simpleQuery = query(
                formsRef,
                where('wardId', '==', user.floor.toUpperCase())
              );
              
              const querySnapshot = await getDocs(simpleQuery);
              let userForms: WardForm[] = [];
              
              querySnapshot.forEach(doc => {
                userForms.push({
                  ...(doc.data() as WardForm),
                  id: doc.id
                });
              });
              
              // กรองด้วยตัวเอง
              // userForms = userForms.filter(form => form.createdBy === user.uid); // ลบ dòng นี้ออก
              
              if (selectedStatus !== 'all') {
                userForms = userForms.filter(form => form.status === selectedStatus);
              }
              
              // เรียงข้อมูลหลังจากกรอง
              userForms.sort((a, b) => {
                // ใช้เวลาที่มีการอัพเดทล่าสุดก่อน
                const aTime = a.updatedAt || a.finalizedAt || a.createdAt;
                const bTime = b.updatedAt || b.finalizedAt || b.createdAt;
                
                // ถ้าไม่มีเวลา ให้ใช้ dateString แทน
                if (!aTime && !bTime) {
                if (!a.dateString || !b.dateString) return 0;
                  return b.dateString.localeCompare(a.dateString); // เรียงจากวันล่าสุด
                }
                
                // ถ้าไม่มีเวลา ให้ถือว่าเก่ากว่า
                if (!aTime) return 1;
                if (!bTime) return -1;
                
                // แปลงเป็น timestamp มิลลิวินาที เพื่อเปรียบเทียบ
                const aTimestamp = getComparisonTimestamp(aTime);
                const bTimestamp = getComparisonTimestamp(bTime);
                
                // เรียงจากใหม่ไปเก่า
                return bTimestamp - aTimestamp;
              });
              
              setForms(userForms);
            } catch (fallbackErr) {
              console.error('Error in fallback query:', fallbackErr);
              setError('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
              setForms([]);
            }
          }
        } catch (err) {
          console.error('Error in simplified query:', err);
          setError('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
          setForms([]);
        }
      } else {
        // กรณีอื่นๆ ที่ไม่ได้กำหนดไว้ข้างต้น
        setForms([]);
      }
    } catch (err) {
      console.error('Error fetching forms:', err);
      
      // ตรวจสอบว่าเป็น index error หรือไม่
      if (handleIndexError(err, 'ApprovalPage')) {
        setIsIndexError(true);
        setError('ไม่สามารถโหลดข้อมูลได้เนื่องจากขาด Firestore Index');
      } else {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      }
      
      // ในกรณีเกิดข้อผิด ให้ล้างข้อมูลเก่า
      setForms([]);
      } finally {
        setLoading(false);
      }
    };

  const openDetailsModal = (form: WardForm) => {
    setSelectedForm(form);
    setShowDetailsModal(true);
  };
  
  const openApproveModal = (form: WardForm) => {
    setSelectedForm(form);
    setShowApproveModal(true);
  };
  
  const openRejectModal = (form: WardForm) => {
    setSelectedForm(form);
    setShowRejectModal(true);
    setReason('');
  };
  
  const handleApprove = async () => {
    if (!selectedForm || !user) {
      showErrorToast('ไม่พบข้อมูลแบบฟอร์มหรือผู้ใช้');
      return;
    }
    
    // ตรวจสอบว่ามี id หรือไม่
    if (!selectedForm.id) {
      showErrorToast('ไม่พบรหัสแบบฟอร์ม');
      return;
    }
    
    setApproveLoading(true);
    try {
      await approveWardForm(selectedForm.id, user); 
      showSuccessToast('อนุมัติแบบฟอร์มสำเร็จ');
      setShowApproveModal(false);
      fetchForms();
    } catch (error) {
      console.error('Error approving form:', error);
      showErrorToast('ไม่สามารถอนุมัติแบบฟอร์มได้');
    } finally {
      setApproveLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedForm || !user) {
      showErrorToast('ไม่พบข้อมูลแบบฟอร์มหรือผู้ใช้');
      return;
    }
    
    // ตรวจสอบว่ามี id หรือไม่
    if (!selectedForm.id) {
      showErrorToast('ไม่พบรหัสแบบฟอร์ม');
      return;
    }
    
    if (!reason.trim()) {
      showErrorToast('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    
    setRejectLoading(true);
    try {
      await rejectWardForm(selectedForm.id, user, reason);
      showSuccessToast('ปฏิเสธแบบฟอร์มสำเร็จ');
      setShowRejectModal(false);
      fetchForms();
    } catch (error) {
      console.error('Error rejecting form:', error);
      showErrorToast('ไม่สามารถปฏิเสธแบบฟอร์มได้');
    } finally {
      setRejectLoading(false);
    }
  };

  // คอมโพเนนต์สำหรับ Modal ยืนยันการอนุมัติ
  const ApproveModal = () => (
    <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="ยืนยันการอนุมัติ" size="md">
      <div className="p-4">
        <p className="mb-4">คุณต้องการอนุมัติแบบฟอร์มนี้ใช่หรือไม่?</p>
        <div className="flex justify-end space-x-3">
          <Button onClick={() => setShowApproveModal(false)} variant="outline">ยกเลิก</Button>
          <Button 
            onClick={handleApprove} 
            variant="primary"
            disabled={approveLoading}
          >
            {approveLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </Button>
        </div>
      </div>
    </Modal>
  );

  // ข้อมูลแผนกที่พบในรายการฟอร์ม
  const wards = React.useMemo(() => {
    const wardSet = new Set<string>();
    forms.forEach(form => {
      if (form.wardName) {
        wardSet.add(form.wardName);
      }
    });
    return Array.from(wardSet).sort();
  }, [forms]);

  // กรองฟอร์มตามจำนวนที่ต้องการแสดง
  const displayedForms = useMemo(() => {
    return forms.slice(0, itemsPerPage);
  }, [forms, itemsPerPage]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const canViewApprovals = user.role === UserRole.ADMIN 
    || user.role === UserRole.SUPER_ADMIN 
    || user.role === UserRole.DEVELOPER
    || user.role === UserRole.APPROVER
    || user.role === UserRole.NURSE
    || user.role === UserRole.VIEWER;

  if (!canViewApprovals) {
    return <p>คุณไม่มีสิทธิ์ดูหน้านี้</p>;
  }

  const canApprove = user.role === UserRole.ADMIN 
    || user.role === UserRole.SUPER_ADMIN
    || user.role === UserRole.DEVELOPER
    || user.role === UserRole.APPROVER;

  return (
    <ProtectedPage requiredRole={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DEVELOPER, UserRole.NURSE]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            การอนุมัติแบบฟอร์ม
          </h1>
          
          {isIndexError && <IndexErrorMessage error={error} />}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="w-full md:w-1/4">
                <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  id="date-filter"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>

              <div className="w-full md:w-1/4">
                <label htmlFor="ward-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  หอผู้ป่วย
                </label>
                <select
                  id="ward-filter"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  value={wardFilter}
                  onChange={(e) => setWardFilter(e.target.value)}
                  disabled={(user.role === UserRole.NURSE || user.role === UserRole.VIEWER)}
                >
                  <option value="">ทั้งหมด</option>
                  {wards.map((ward) => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-1/4">
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  สถานะ
                </label>
                <select
                  id="status-filter"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value={FormStatus.FINAL}>รออนุมัติ</option>
                  <option value={FormStatus.APPROVED}>อนุมัติแล้ว</option>
                  <option value={FormStatus.REJECTED}>ปฏิเสธ</option>
                </select>
              </div>

              <div className="w-full md:w-1/4">
                <label htmlFor="items-per-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  จำนวนรายการ
                </label>
                <select
                  id="items-per-page"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={20}>20 รายการ</option>
                  <option value={50}>50 รายการ</option>
                  <option value={100}>100 รายการ</option>
                  <option value={300}>300 รายการ</option>
                  <option value={500}>500 รายการ</option>
                  <option value={1000}>1000 รายการ</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center">
                    <FiLoader className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                    <span>กำลังโหลดข้อมูล...</span>
            </div>
          </div>
              )}
              
              {!loading && error && !isIndexError && (
                <div className="text-center py-8 text-red-500">
                  <p>{error}</p>
                </div>
              )}
              
              {!loading && !error && forms.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>ไม่พบแบบฟอร์มที่ตรงตามเงื่อนไข</p>
                </div>
              )}
              
              {!loading && !error && forms.length > 0 && (
                <>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          กะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          หอผู้ป่วย
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ผู้บันทึก
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          เวลาบันทึก
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ผู้อนุมัติ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          เวลาอนุมัติ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          การดำเนินการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {displayedForms.map((form) => (
                        form.id ? (
                          <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatTimestamp(form.date, 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.shift === ShiftType.MORNING ? 'เช้า' : 'ดึก'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.wardName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.recorderFirstName} {form.recorderLastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.finalizedAt ? formatTimestamp(form.finalizedAt, 'HH:mm') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.approverFirstName && form.approverLastName 
                                ? `${form.approverFirstName} ${form.approverLastName}` 
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {form.approvedAt ? formatTimestamp(form.approvedAt, 'HH:mm') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <ApprovalStatusBadge status={form.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-3">
                              <button
                                onClick={() => openDetailsModal(form)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                ดูรายละเอียด
                              </button>

                              {form.status === FormStatus.FINAL && canApprove && (
                                <>
                                  <button
                                    onClick={() => openApproveModal(form)}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                    disabled={approveLoading}
                                  >
                                    {approveLoading ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
                                  </button>
                                  
                                  <button
                                    onClick={() => openRejectModal(form)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    disabled={rejectLoading}
                                  >
                                    {rejectLoading ? 'กำลังดำเนินการ...' : 'ปฏิเสธ'}
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ) : null
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    แสดง {Math.min(displayedForms.length, itemsPerPage)} จาก {forms.length} รายการ
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <FormDetailsModal 
        form={selectedForm} 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)}
      />
      <ApproveModal />
      {/* Inline Reject Modal preserves state while open */}
      {showRejectModal && (
        <Modal isOpen={true} onClose={() => setShowRejectModal(false)} title="ปฏิเสธแบบฟอร์ม" size="md">
          <div className="p-4">
            <p className="mb-2">กรุณาระบุเหตุผลในการปฏิเสธ:</p>
            <textarea
              ref={rejectionTextareaRef}
              autoFocus
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 mb-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลในการปฏิเสธแบบฟอร์มนี้..."
            />
            <div className="flex justify-end space-x-3">
              <Button onClick={() => setShowRejectModal(false)} variant="outline">ยกเลิก</Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                disabled={rejectLoading || !reason.trim()}
              >
                {rejectLoading ? 'กำลังดำเนินการ...' : 'ปฏิเสธ'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ProtectedPage>
  );
}
