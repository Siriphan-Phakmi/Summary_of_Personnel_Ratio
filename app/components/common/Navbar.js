'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { PAGES, PAGE_LABELS } from '../../config/constants';
import { useEffect, useState } from 'react';

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // ใช้สถานะเพื่อติดตาม currentPage ภายใน component
  const [activePage, setActivePage] = useState();

  // ตรวจสอบว่าอยู่ที่หน้าไหนเมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    // ตรวจสอบ pathname และตั้งค่า activePage ตามพาธที่อยู่ปัจจุบัน
    if (pathname === '/') {
      setActivePage(window.currentPage || PAGES.FORM);
      
      // ตรวจสอบการเปลี่ยนแปลงของ window.currentPage
      const handleCurrentPageChange = () => {
        setActivePage(window.currentPage);
      };
      
      // ลงทะเบียนฟังก์ชันสำหรับตรวจสอบการเปลี่ยนแปลง
      window.addEventListener('currentPageChange', handleCurrentPageChange);
      
      return () => {
        window.removeEventListener('currentPageChange', handleCurrentPageChange);
      };
    }
    else if (pathname === '/ward-form') {
      setActivePage(PAGES.WARD);
    }
    else if (pathname === '/approval') {
      setActivePage(PAGES.FORM);
    }
    else if (pathname === '/dashboard') {
      setActivePage(PAGES.DASHBOARD);
    }
    else if (pathname.includes('/admin/user-management')) {
      setActivePage(PAGES.USER_MANAGEMENT);
    }
  }, [pathname]);

  // การนำทางไปยังหน้าต่างๆ
  const navigateTo = (page) => {
    // ตรวจสอบสิทธิ์การเข้าถึง
    if (page === PAGES.USER_MANAGEMENT && user?.role?.toLowerCase() !== 'admin') {
      Swal.fire({
        title: 'ไม่มีสิทธิ์เข้าถึง',
        text: 'คุณไม่มีสิทธิ์เข้าถึงหน้าจัดการผู้ใช้',
        icon: 'warning',
        confirmButtonColor: '#0ab4ab'
      });
      return;
    }

    // ตั้งค่า activePage ก่อนเพื่อให้ UI อัปเดตทันที
    setActivePage(page);

    switch(page) {
      case PAGES.WARD:
        router.push('/ward-form');
        break;
      case PAGES.FORM:  // Approval
        // เปลี่ยนเป็น server-side navigation เพื่อให้เกิด logs
        router.push('/approval');
        break;
      case PAGES.DASHBOARD:
        // เปลี่ยนเป็น server-side navigation เพื่อให้เกิด logs
        router.push('/dashboard');
        break;
      case PAGES.USER_MANAGEMENT:
        router.push('/admin/user-management');
        break;
      default:
        router.push('/');
    }
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    try {
      const result = await Swal.fire({
        title: 'ต้องการออกจากระบบ?',
        text: 'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
      });

      if (result.isConfirmed) {
        await logout();
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#0ab4ab'
      });
    }
  };

  if (!user) return null;

  // ถ้า user ไม่ได้อยู่ในหน้า login จะแสดง navbar
  if (pathname === '/login') return null;

  return (
    <div className="bg-[#0ab4ab] text-white shadow-md p-3 fixed top-0 left-0 right-0 z-50 w-full">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateTo(PAGES.WARD)}
            className={`px-3 py-1 rounded ${
              activePage === PAGES.WARD
                ? 'bg-white text-[#0ab4ab]' 
                : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition font-medium`}
          >
            {PAGE_LABELS[PAGES.WARD]}
          </button>
          <button
            onClick={() => navigateTo(PAGES.FORM)}
            className={`px-3 py-1 rounded ${
              activePage === PAGES.FORM
                ? 'bg-white text-[#0ab4ab]' 
                : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition font-medium`}
          >
            {PAGE_LABELS[PAGES.FORM]}
          </button>
          <button
            onClick={() => navigateTo(PAGES.DASHBOARD)}
            className={`px-3 py-1 rounded ${
              activePage === PAGES.DASHBOARD
                ? 'bg-white text-[#0ab4ab]' 
                : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition font-medium`}
          >
            {PAGE_LABELS[PAGES.DASHBOARD]}
          </button>
          <button
            onClick={() => navigateTo(PAGES.USER_MANAGEMENT)}
            className={`px-3 py-1 rounded ${
              activePage === PAGES.USER_MANAGEMENT
                ? 'bg-white text-[#0ab4ab]' 
                : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition font-medium`}
          >
            {PAGE_LABELS[PAGES.USER_MANAGEMENT]}
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="text-white text-sm mr-4">
            Logged in as: {user.username || 'user'} | Department: {user.department || ''} | Role: {user.role || 'user'}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-1 bg-red-600 rounded-lg hover:bg-red-700 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar; 