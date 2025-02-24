'use client';
import PropTypes from 'prop-types';
import { THEME_COLORS } from '../../config/constants';

const LoadingSpinner = ({ fullScreen = false }) => {
  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ab4ab]" />
      <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinnerContent}
    </div>
  );
};

LoadingSpinner.propTypes = {
  fullScreen: PropTypes.bool
};

export default LoadingSpinner; 