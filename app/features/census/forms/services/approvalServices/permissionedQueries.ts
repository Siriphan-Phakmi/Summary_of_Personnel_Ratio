import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  and
} from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { WardForm, FormStatus, ShiftType } from '@/app/core/types/ward';
import { User, UserRole } from '@/app/core/types/user';
import { format, subDays } from 'date-fns';
import { COLLECTION_WARDFORMS } from './index';

/**
 * ดึงแบบฟอร์มที่รอการอนุมัติตามสิทธิ์ของผู้ใช้งาน
 * @param user ข้อมูลผู้ใช้งาน
 * @param limitCount จำนวนแบบฟอร์มที่ต้องการดึง
 * @returns แบบฟอร์มที่รอการอนุมัติ
 */
export const getPendingFormsByUserPermission = async (
  user: User,
  limitCount: number = 20
): Promise<WardForm[]> => {
  try {
    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ในการอนุมัติหรือไม่
    if (user.role !== UserRole.APPROVER && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      return [];
    }
    
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    let formsQuery;
    
    // กรณีเป็น admin หรือ super_admin ดูได้ทุกแบบฟอร์ม
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      formsQuery = query(
        formsRef,
        where('status', '==', FormStatus.FINAL),
        orderBy('dateString', 'desc'),
        orderBy('shift', 'asc'),
        limit(limitCount)
      );
    } 
    // กรณีเป็น approver ดูได้เฉพาะแบบฟอร์มของวอร์ดที่มีสิทธิ์
    else if (user.approveWardIds && user.approveWardIds.length > 0) {
      // ใช้ OR query ในการค้นหาแบบฟอร์มของวอร์ดที่มีสิทธิ์
      // แต่เนื่องจาก Firestore ไม่รองรับ OR query ใน where clause โดยตรง
      // จึงต้องแยกการค้นหาตามจำนวนวอร์ดที่มีสิทธิ์
      
      // ถ้ามีวอร์ดเดียวที่มีสิทธิ์
      if (user.approveWardIds.length === 1) {
        formsQuery = query(
          formsRef,
          where('wardId', '==', user.approveWardIds[0]),
          where('status', '==', FormStatus.FINAL),
          orderBy('dateString', 'desc'),
          orderBy('shift', 'asc'),
          limit(limitCount)
        );
      } 
      // ถ้ามีหลายวอร์ดที่มีสิทธิ์ ต้องดึงข้อมูลแยกแล้วมารวมกัน
      else {
        const allFormPromises = user.approveWardIds.map(wardId => {
          const wardQuery = query(
            formsRef,
            where('wardId', '==', wardId),
            where('status', '==', FormStatus.FINAL),
            orderBy('dateString', 'desc'),
            orderBy('shift', 'asc'),
            limit(Math.ceil(limitCount / user.approveWardIds!.length))
          );
          return getDocs(wardQuery);
        });
        
        const allFormSnapshots = await Promise.all(allFormPromises);
        
        // รวมข้อมูลจากทุกวอร์ด
        const forms: WardForm[] = [];
        allFormSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            forms.push({
              ...(doc.data() as WardForm),
              id: doc.id
            });
          });
        });
        
        // เรียงลำดับตามวันที่และกะ แล้วจำกัดจำนวน
        return forms
          .sort((a, b) => {
            // เรียงตามวันที่ (ล่าสุด)
            const dateA = new Date(a.dateString || '');
            const dateB = new Date(b.dateString || '');
            const dateCompare = dateB.getTime() - dateA.getTime();
            if (dateCompare !== 0) return dateCompare > 0 ? 1 : -1;
            
            // ถ้าวันที่เดียวกัน เรียงตามกะ (เช้า -> ดึก)
            return a.shift === ShiftType.MORNING ? -1 : 1;
          })
          .slice(0, limitCount);
      }
    } 
    // กรณีไม่มีสิทธิ์อนุมัติวอร์ดใดเลย
    else {
      return [];
    }
    
    // ถ้าเป็นกรณีที่มีวอร์ดที่มีสิทธิ์เพียงวอร์ดเดียว
    if (formsQuery) {
      const formDocs = await getDocs(formsQuery);
      
      const forms: WardForm[] = formDocs.docs.map(doc => ({
        ...(doc.data() as WardForm),
        id: doc.id
      }));
      
      return forms;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching pending forms by user permission:', error);
    throw error;
  }
};

/**
 * ดึงแบบฟอร์มที่อนุมัติแล้วตามสิทธิ์ของผู้ใช้งาน
 * @param user ข้อมูลผู้ใช้งาน
 * @param limitCount จำนวนแบบฟอร์มที่ต้องการดึง
 * @returns แบบฟอร์มที่อนุมัติแล้ว
 */
export const getApprovedFormsByUserPermission = async (
  user: User,
  limitCount: number = 20
): Promise<WardForm[]> => {
  try {
    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ในการอนุมัติหรือไม่
    if (user.role !== UserRole.APPROVER && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      return [];
    }
    
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    let formsQuery;
    
    // ดึงข้อมูลย้อนหลัง 30 วัน
    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDaysAgoString = format(thirtyDaysAgo, 'yyyy-MM-dd');
    
    // กรณีเป็น admin หรือ super_admin ดูได้ทุกแบบฟอร์ม
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      formsQuery = query(
        formsRef,
        and(
          where('status', '==', FormStatus.APPROVED),
          where('dateString', '>=', thirtyDaysAgoString)
        ),
        orderBy('dateString', 'desc'),
        orderBy('shift', 'asc'),
        limit(limitCount)
      );
    } 
    // กรณีเป็น approver ดูได้เฉพาะแบบฟอร์มของวอร์ดที่มีสิทธิ์
    else if (user.approveWardIds && user.approveWardIds.length > 0) {
      // ใช้ OR query ในการค้นหาแบบฟอร์มของวอร์ดที่มีสิทธิ์
      
      // ถ้ามีวอร์ดเดียวที่มีสิทธิ์
      if (user.approveWardIds.length === 1) {
        formsQuery = query(
          formsRef,
          and(
            where('wardId', '==', user.approveWardIds[0]),
            where('status', '==', FormStatus.APPROVED),
            where('dateString', '>=', thirtyDaysAgoString)
          ),
          orderBy('dateString', 'desc'),
          orderBy('shift', 'asc'),
          limit(limitCount)
        );
      } 
      // ถ้ามีหลายวอร์ดที่มีสิทธิ์ ต้องดึงข้อมูลแยกแล้วมารวมกัน
      else {
        const allFormPromises = user.approveWardIds.map(wardId => {
          const wardQuery = query(
            formsRef,
            and(
              where('wardId', '==', wardId),
              where('status', '==', FormStatus.APPROVED),
              where('dateString', '>=', thirtyDaysAgoString)
            ),
            orderBy('dateString', 'desc'),
            orderBy('shift', 'asc'),
            limit(Math.ceil(limitCount / user.approveWardIds!.length))
          );
          return getDocs(wardQuery);
        });
        
        const allFormSnapshots = await Promise.all(allFormPromises);
        
        // รวมข้อมูลจากทุกวอร์ด
        const forms: WardForm[] = [];
        allFormSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            forms.push({
              ...(doc.data() as WardForm),
              id: doc.id
            });
          });
        });
        
        // เรียงลำดับตามวันที่และกะ แล้วจำกัดจำนวน
        return forms
          .sort((a, b) => {
            // เรียงตามวันที่ (ล่าสุด)
            const dateA = new Date(a.dateString || '');
            const dateB = new Date(b.dateString || '');
            const dateCompare = dateB.getTime() - dateA.getTime();
            if (dateCompare !== 0) return dateCompare > 0 ? 1 : -1;
            
            // ถ้าวันที่เดียวกัน เรียงตามกะ (เช้า -> ดึก)
            return a.shift === ShiftType.MORNING ? -1 : 1;
          })
          .slice(0, limitCount);
      }
    } 
    // กรณีไม่มีสิทธิ์อนุมัติวอร์ดใดเลย
    else {
      return [];
    }
    
    // ถ้าเป็นกรณีที่มีวอร์ดที่มีสิทธิ์เพียงวอร์ดเดียวหรือเป็น admin
    if (formsQuery) {
      const formDocs = await getDocs(formsQuery);
      
      const forms: WardForm[] = formDocs.docs.map(doc => ({
        ...(doc.data() as WardForm),
        id: doc.id
      }));
      
      return forms;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching approved forms by user permission:', error);
    throw error;
  }
};