'use client';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import { PAGES, PAGE_LABELS, THEME_COLORS } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { Swal } from '../../utils/alertService';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // ให้เห็น
  const navigationPages = Object.values(PAGES);
    
  const handleNavigation = (page) => {
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isUser = user?.role?.toLowerCase() === 'user';

    switch (page) {
      case PAGES.USER_MANAGEMENT:
        if (!isAdmin) {
          Swal.fire({
            title: 'ไม่ได้เข้า',
            text: 'ไม่ได้เข้าหน้าที่ใช้งาน',
            icon: 'warning',
            confirmButtonColor: '#0ab4ab'
          });
          return;
        }
        router.push('/admin/user-management');
        break;

      case PAGES.WARD:
        router.push('/ward-form');
        break;

      case PAGES.FORM: // Approval page
      case PAGES.DASHBOARD:
        if (isUser) {
          // ถ้าเป็น user ให้เปลี่ยนหน้าแต่แสดงข้อความแจ้ง
          setCurrentPage(page);
          Swal.fire({
            title: 'โหมดดูข้อมูลเท่านั้น',
            text: 'ข้อมูลได้แต่ไม่สามารถแก้ไขได้',
            icon: 'info',
            confirmButtonColor: '#0ab4ab'
          });
        } else {
          setCurrentPage(page);
        }
        break;

      default:
        setCurrentPage(page);
    }
  };

  // ข้อมูล ้ใช้จาก context
  const username = user?.username || 'Guest';
  const department = user?.department || '-';
  const role = user?.role || '-';

  return (
    <nav className={`bg-[${THEME_COLORS.PRIMARY}] p-4`}>
      <div className="w-full relative">
        {/* Navigation layout with buttons */}
        <div className="flex justify-between">
          {/* Empty div for spacing to ensure navigation buttons remain centered */}
          <div className="w-24"></div>
          
          {/* Center navigation buttons */}
          <div className="flex space-x-4">
            {navigationPages.map((page) => (
              <button
                key={page}
                onClick={() => handleNavigation(page)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === page
                    ? `bg-${THEME_COLORS.WHITE} text-[${THEME_COLORS.PRIMARY}]`
                    : `text-${THEME_COLORS.WHITE} hover:bg-[${THEME_COLORS.PRIMARY}]/80`
                }`}
              >
                {PAGE_LABELS[page]}
              </button>
            ))}
          </div>
          
          {/* User info and logout button on the right */}
          <div className="flex items-center space-x-4">
            <span className="text-white">
              Logged in as: <strong>{username}</strong> | 
              Department: <strong>{department}</strong> | 
              Role: <strong>{role}</strong>
            </span>
            <button
              onClick={logout}
              className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all`}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

Navigation.propTypes = {
  currentPage: PropTypes.oneOf(Object.values(PAGES)).isRequired,
  setCurrentPage: PropTypes.func.isRequired
};

export default Navigation;
