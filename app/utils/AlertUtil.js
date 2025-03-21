'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from '../components/Popup';

// Helper ที่จะให้สามารถเรียกใช้ Popup แบบ imperative (ไม่ต้องสร้าง state)
const createPopup = () => {
  // สร้าง div element สำหรับ render popup
  const popupContainer = document.createElement('div');
  document.body.appendChild(popupContainer);

  // สร้าง root
  const root = createRoot(popupContainer);

  // ฟังก์ชันสำหรับลบ popup ออกจาก DOM
  const removePopup = () => {
    root.unmount();
    if (popupContainer.parentNode) {
      document.body.removeChild(popupContainer);
    }
  };

  // คืนค่าฟังก์ชันที่ใช้แสดง popup
  return {
    show: (props) => {
      const handleClose = () => {
        // เรียก onClose callback ถ้ามี
        if (props.onClose) {
          props.onClose();
        }
        // ลบ popup ออกจาก DOM
        removePopup();
      };

      // Render popup component
      root.render(
        <Popup
          {...props}
          isOpen={true}
          onClose={handleClose}
        />
      );

      // คืนค่าฟังก์ชันสำหรับปิด popup
      return {
        close: handleClose
      };
    }
  };
};

// สร้างฟังก์ชันสำหรับแสดง Alert ประเภทต่างๆ
export const AlertUtil = {
  // แสดง alert ทั่วไป
  alert: (title, message, options = {}) => {
    const popup = createPopup();
    return popup.show({
      type: 'info',
      title,
      message,
      ...options,
    });
  },

  // แสดง alert สำเร็จ
  success: (title, message, options = {}) => {
    const popup = createPopup();
    return popup.show({
      type: 'success',
      title,
      message,
      ...options,
    });
  },

  // แสดง alert ข้อผิดพลาด
  error: (title, message, options = {}) => {
    const popup = createPopup();
    return popup.show({
      type: 'error',
      title,
      message,
      ...options,
    });
  },

  // แสดง alert เตือน
  warning: (title, message, options = {}) => {
    const popup = createPopup();
    return popup.show({
      type: 'warning',
      title,
      message,
      ...options,
    });
  },

  // แสดง confirm dialog
  confirm: (title, message, options = {}) => {
    return new Promise((resolve) => {
      const popup = createPopup();
      
      const handleConfirm = () => {
        resolve(true);
      };
      
      const handleCancel = () => {
        resolve(false);
      };
      
      popup.show({
        type: 'warning',
        title,
        message,
        autoClose: 0, // ไม่ปิดอัตโนมัติ
        buttons: [
          {
            text: options.cancelText || 'ยกเลิก',
            onClick: handleCancel,
            variant: 'secondary'
          },
          {
            text: options.confirmText || 'ตกลง',
            onClick: handleConfirm,
            variant: 'primary'
          }
        ],
        ...options,
      });
    });
  },

  // แสดง toast notification
  toast: (message, options = {}) => {
    const popup = createPopup();
    return popup.show({
      type: options.type || 'info',
      message,
      autoClose: options.autoClose || 3000,
      ...options,
    });
  }
};

export default AlertUtil; 