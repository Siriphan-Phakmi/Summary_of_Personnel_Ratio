import { useState, useEffect } from 'react';
import { fetchWards, createWard, updateWard, deleteWard } from '../services/databaseService';
import { Ward } from '../services/databaseService';
import { User } from '@/app/core/types/user';
import { logUserActivity } from '@/app/core/utils/logUtils';

/**
 * Hook สำหรับจัดการข้อมูลวอร์ด
 */
export const useWardManagement = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลดข้อมูลวอร์ดเมื่อเริ่มต้น
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (mounted) {
        await loadWards();
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
    };
  }, []); // empty dependency array to run only once on mount

  // โหลดข้อมูลวอร์ดทั้งหมด
  const loadWards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWards();
      setWards(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลวอร์ดได้');
      console.error('Error loading wards:', err);
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มวอร์ดใหม่
  const addWard = async (wardName: string, currentUser: User | null | undefined): Promise<boolean> => {
    if (!currentUser) {
      setError('User not authenticated to add ward.');
      return false;
    }
    try {
      setLoading(true);
      setError(null);
      // Create an object matching the expected type Omit<Ward, 'id'>
      // Assuming default values for other fields like description and active status
      const newWardData = {
        wardId: wardName, // Consider if wardId should be generated differently
        wardName: wardName,
        description: '', // Default empty description
        active: true, // Default active status
        // Add placeholders for missing properties; they will be set by createWard
        createdAt: '', 
        updatedAt: '',
      };
      const newWard = await createWard(newWardData); // Pass the object with all required fields

      // 'createWard' now returns the created Ward object, not just success boolean
      if (newWard) {
        // Reload wards after successful creation
        await loadWards();
        // Log user activity
        await logUserActivity(
          currentUser.uid,
          currentUser.username || 'unknown',
          'create_ward',
          { wardId: newWard.id, wardName: newWard.wardName }
        );
        // You might want to return the newWard object or true here depending on desired hook behavior
        return true; // Assuming we still return boolean for success
      }
      
      return false;
    } catch (err) {
      setError('ไม่สามารถสร้างวอร์ดได้');
      console.error('Error creating ward:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // อัปเดตวอร์ดที่มีอยู่
  const editWard = async (wardId: string, wardName: string, currentUser: User | null | undefined): Promise<boolean> => {
    if (!currentUser) {
      setError('User not authenticated to edit ward.');
      return false;
    }
    try {
      setLoading(true);
      setError(null);
      // ส่ง object แทน string
      await updateWard(wardId, { wardName: wardName });
      
      // โหลดข้อมูลวอร์ดใหม่หลังจากอัปเดตสำเร็จ
      await loadWards();
      // Log user activity
      await logUserActivity(
        currentUser.uid,
        currentUser.username || 'unknown',
        'edit_ward',
        { wardId: wardId, newWardName: wardName }
      );
      return true;
    } catch (err) {
      setError('ไม่สามารถอัปเดตวอร์ดได้');
      console.error('Error updating ward:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ลบวอร์ดที่มีอยู่
  const removeWard = async (wardId: string, currentUser: User | null | undefined): Promise<boolean> => {
    if (!currentUser) {
      setError('User not authenticated to delete ward.');
      return false;
    }
    try {
      setLoading(true);
      setError(null);
      // ไม่ต้องใช้ตัวแปร success เนื่องจาก deleteWard ไม่คืนค่า
      const wardToDelete = wards.find(w => w.id === wardId); // Find ward name for logging
      await deleteWard(wardId);
      
      // โหลดข้อมูลวอร์ดใหม่หลังจากลบสำเร็จ
      await loadWards();
      // Log user activity
      if (wardToDelete) { // Log only if ward info was found before deletion
        await logUserActivity(
          currentUser.uid,
          currentUser.username || 'unknown',
          'delete_ward',
          { wardId: wardId, wardName: wardToDelete.wardName }
        );
      }
      return true;
    } catch (err) {
      setError('ไม่สามารถลบวอร์ดได้');
      console.error('Error deleting ward:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    wards,
    loading,
    error,
    loadWards,
    addWard,
    editWard,
    removeWard
  };
}; 