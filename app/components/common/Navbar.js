'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Swal } from '../../utils/alertService';
import { PAGES, PAGE_LABELS } from '../../config/constants';
import { useEffect, useState } from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import AlertUtil from '../../utils/AlertUtil';

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
    else if (pathname === '/page/ward-form' || pathname === '/ward-form') {
      setActivePage(PAGES.WARD);
    }
    else if (pathname === '/page/shift-form' || pathname === '/shift-form') {
      setActivePage(PAGES.SHIFT);
    }
    else if (pathname === '/page/approval' || pathname === '/approval') {
      setActivePage(PAGES.FORM);
    }
    else if (pathname === '/page/dashboard' || pathname === '/dashboard') {
      setActivePage(PAGES.DASHBOARD);
    }
    else if (pathname === '/page/user-management' || pathname.includes('/admin/user-management')) {
      setActivePage(PAGES.USER_MANAGEMENT);
    }
  }, [pathname]);

  // การนำทางไปยังหน้าต่างๆ
  const navigateTo = async (page) => {
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

    // ตรวจสอบสิทธิ์การเข้าถึงหน้า Ward Form
    if (page === PAGES.WARD && (!user?.department || user.department === '')) {
      Swal.fire({
        title: 'ไม่มีสิทธิ์เข้าถึง',
        text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เนื่องจากไม่มีแผนกที่กำหนด กรุณาติดต่อผู้ดูแลระบบ',
        icon: 'warning',
        confirmButtonColor: '#0ab4ab'
      });
      return;
    }

    // ตรวจสอบว่ามีข้อมูลที่ยังไม่ได้บันทึกหรือไม่
    if (window.hasUnsavedChanges) {
      const result = await Swal.fire({
        title: 'มีข้อมูลที่ยังไม่ได้บันทึก',
        text: 'คุณต้องการออกจากหน้านี้หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกจะหายไป',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0ab4ab',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, เปลี่ยนหน้า',
        cancelButtonText: 'ไม่, อยู่หน้านี้ต่อ'
      });
      
      if (!result.isConfirmed) {
        return; // ยกเลิกการนำทาง
      }
    }

    // ตั้งค่า activePage ก่อนเพื่อให้ UI อัปเดตทันที
    setActivePage(page);

    switch(page) {
      case PAGES.WARD:
        router.push('/page/ward-form/');
        break;
      case PAGES.SHIFT:
        router.push('/page/shift-form/');
        break;
      case PAGES.FORM:  // Approval
        router.push('/page/approval/');
        break;
      case PAGES.DASHBOARD:
        router.push('/page/dashboard/');
        break;
      case PAGES.USER_MANAGEMENT:
        router.push('/page/user-management/');
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
        router.push('/page/login');
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
  if (pathname === '/login' || pathname === '/page/login') return null;

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-[#0ab4ab]'} text-white shadow-md p-3 fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300`}>
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <div className="flex flex-wrap items-center space-x-2 md:space-x-4 mb-2 md:mb-0">
          <button
            onClick={() => navigateTo(PAGES.WARD)}
            className={`px-4 py-2 rounded-md font-medium text-base ${
              activePage === PAGES.WARD
                ? 'bg-gray-700 text-white shadow-md border-2 border-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition-all duration-200`}
          >
            <span className="font-bold">{PAGE_LABELS[PAGES.WARD]}</span>
          </button>
          <button
            onClick={() => navigateTo(PAGES.FORM)}
            className={`px-4 py-2 rounded-md font-medium text-base ${
              activePage === PAGES.FORM
                ? 'bg-gray-700 text-white shadow-md border-2 border-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition-all duration-200`}
          >
            <span className={activePage === PAGES.FORM ? "font-bold" : ""}>{PAGE_LABELS[PAGES.FORM]}</span>
          </button>
          <button
            onClick={() => navigateTo(PAGES.DASHBOARD)}
            className={`px-4 py-2 rounded-md font-medium text-base ${
              activePage === PAGES.DASHBOARD
                ? 'bg-gray-700 text-white shadow-md border-2 border-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
            } transition-all duration-200`}
          >
            <span className={activePage === PAGES.DASHBOARD ? "font-bold" : ""}>{PAGE_LABELS[PAGES.DASHBOARD]}</span>
          </button>
          {/* แสดงปุ่ม User Management เฉพาะเมื่อผู้ใช้เป็น admin เท่านั้น */}
          {user?.role?.toLowerCase() === 'admin' && (
            <button
              onClick={() => navigateTo(PAGES.USER_MANAGEMENT)}
              className={`px-4 py-2 rounded-md font-medium text-base ${
                activePage === PAGES.USER_MANAGEMENT
                  ? 'bg-gray-700 text-white shadow-md border-2 border-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-[#0ab4ab] text-white hover:bg-teal-600'
              } transition-all duration-200`}
            >
              <span className={activePage === PAGES.USER_MANAGEMENT ? "font-bold" : ""}>{PAGE_LABELS[PAGES.USER_MANAGEMENT]}</span>
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center">
          <div className="text-white text-sm mr-4 mb-2 md:mb-0">
            Logged in as: {user.username || user.email || 'user'} | 
            Department: {user.department || 'ไม่ระบุแผนก'} | 
            Role: {user.role || 'user'}
          </div>
          
          {/* Theme Toggle Button */}
          <div className="mr-3">
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleLogout}
            className="py-2 px-3 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
          >
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;