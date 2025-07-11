import { FiBell, FiCheckCircle, FiAlertTriangle, FiFileText, FiClock, FiInfo } from 'react-icons/fi';
import { NotificationType } from '@/app/features/notifications/types/notification';

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({ type, className = "w-4 h-4 mr-2" }) => {
  const getIconComponent = () => {
    switch (type) {
      case NotificationType.APPROVAL_REQUEST:
        return <FiFileText className={`${className} text-orange-500`} />;
      case NotificationType.FORM_APPROVED:
        return <FiCheckCircle className={`${className} text-green-500`} />;
      case NotificationType.FORM_REJECTED:
        return <FiAlertTriangle className={`${className} text-red-500`} />;
      case NotificationType.FORM_DRAFT_SAVED:
        return <FiClock className={`${className} text-blue-500`} />;
      case NotificationType.SYSTEM_ALERT:
      default:
        return <FiInfo className={`${className} text-gray-500`} />;
    }
  };

  return getIconComponent();
};

interface BellIconProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export const BellIcon: React.FC<BellIconProps> = ({ 
  unreadCount, 
  onClick, 
  className = "relative p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
}) => (
  <button
    onClick={onClick}
    className={className}
    aria-label="การแจ้งเตือน"
  >
    <FiBell className="h-6 w-6" />
    {unreadCount > 0 && (
      <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
); 