import { useState, useEffect } from 'react';
import { Ward } from '@/app/features/ward-form/types/ward';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { logInfo, logError } from './useSafeLogging';

/**
 * Custom hook สำหรับดึงข้อมูลแผนกตามสิทธิ์ของผู้ใช้
 * @param user ข้อมูลผู้ใช้งาน
 * @param dashboardWards รายชื่อแผนกที่ต้องการแสดงใน Dashboard
 * @returns ข้อมูลแผนก, สถานะการโหลด และข้อผิดพลาด
 */
export const useWardData = (user: User | null, dashboardWards: string[]) => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  useEffect(() => {
    const loadWards = async () => {
      if (!user) {
        setWards([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // ดึงเฉพาะ Ward ที่มีสิทธิ์เข้าถึง ไม่สนใจว่าเป็น Admin หรือไม่
        const userPermittedWards = await getWardsByUserPermission(user);
        
        // กรองเฉพาะ ward ที่กำหนดไว้ใน dashboardWards
        const userDashboardWards = userPermittedWards.filter(ward => 
          dashboardWards.some(dashboardWard => 
            ward.name.toUpperCase().includes(dashboardWard.toUpperCase()) || 
            ward.id?.toUpperCase() === dashboardWard.toUpperCase()
          )
        );
        
        logInfo("[useWardData] Showing permitted wards:", userDashboardWards.map(w => w.name));
        setWards(userDashboardWards);
        
        // ถ้ามีแผนกอย่างน้อย 1 แผนก ให้เลือกแผนกแรกเป็นค่าเริ่มต้น
        if (userDashboardWards.length > 0) {
          setSelectedWardId(userDashboardWards[0].id || null);
        }
      } catch (err) {
        logError('[useWardData] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadWards();
  }, [user, dashboardWards]);

  /**
   * ตรวจสอบว่าผู้ใช้มีการเข้าถึง Ward ที่ระบุหรือไม่
   * @param wardId รหัสแผนก
   * @returns true ถ้ามีสิทธิ์เข้าถึง, false ถ้าไม่มีสิทธิ์
   */
  const hasAccessToWard = (wardId: string): boolean => {
    return wards.some(w => w.id === wardId);
  };

  /**
   * อัพเดทเมื่อมีการเปลี่ยนแปลง Ward ที่เลือก
   * @param wardId รหัสแผนก
   */
  const handleSelectWard = (wardId: string) => {
    // ถ้าผู้ใช้มีสิทธิ์เข้าถึง Ward นี้ หรือเป็น Admin ให้เลือกได้
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
    if (isAdmin || hasAccessToWard(wardId)) {
      setSelectedWardId(wardId);
    }
  };

  return {
    wards,
    selectedWardId,
    loading,
    error,
    hasAccessToWard,
    handleSelectWard,
    setSelectedWardId
  };
};

export default useWardData; 