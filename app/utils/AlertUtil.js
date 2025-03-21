'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from '../components/Popup';

// Show confirmation dialog
export const confirm = (title, text, options = {}) => {
  return new Promise((resolve) => {
    const popupContainer = document.createElement('div');
    popupContainer.id = 'alert-popup-container-' + Date.now();
    document.body.appendChild(popupContainer);
    
    const cleanup = () => {
      if (popupContainer && popupContainer.parentNode) {
        popupContainer.parentNode.removeChild(popupContainer);
      }
    };
    
    const buttons = [
      {
        text: options.cancelText || 'ยกเลิก',
        color: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        onClick: () => {
          cleanup();
          resolve({ isConfirmed: false, isDenied: false });
        }
      }
    ];
    
    // Add deny button if needed
    if (options.showDenyButton) {
      buttons.push({
        text: options.denyText || 'ไม่',
        color: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        onClick: () => {
          cleanup();
          resolve({ isConfirmed: false, isDenied: true });
        }
      });
    }
    
    // Add confirm button
    buttons.push({
      text: options.confirmText || 'ยืนยัน',
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      onClick: () => {
        cleanup();
        resolve({ isConfirmed: true, isDenied: false });
      }
    });

    const root = createRoot(popupContainer);
    root.render(
      <Popup
        type="confirm"
        title={title}
        message={text}
        isOpen={true}
        onClose={() => {
          cleanup();
          resolve({ isConfirmed: false, isDenied: false });
        }}
        buttons={buttons}
        autoClose={0} // Don't auto close confirmation dialogs
      />
    );
    
    // Add emergency close function to window for debugging
    window.__closeCurrentPopup = () => {
      cleanup();
      resolve({ isConfirmed: false, isDenied: false, isClosed: true });
    };
  });
};

// Show alert
export const showAlert = (title, text, type = 'info') => {
  const popupContainer = document.createElement('div');
  popupContainer.id = 'alert-popup-container-' + Date.now();
  document.body.appendChild(popupContainer);
  
  const cleanup = () => {
    setTimeout(() => {
      if (popupContainer && popupContainer.parentNode) {
        popupContainer.parentNode.removeChild(popupContainer);
      }
    }, 500); // Delay to allow animation
  };
  
  const root = createRoot(popupContainer);
  root.render(
    <Popup
      type={type}
      title={title}
      message={text}
      isOpen={true}
      onClose={cleanup}
      autoClose={3000} // Auto close alerts after 3 seconds
    />
  );
};

// Show success message
export const success = (title, message) => showAlert(title, message, 'success');

// Show error message
export const error = (title, message) => showAlert(title, message, 'error');

// Show warning message
export const warning = (title, message) => showAlert(title, message, 'warning');

// Show info message
export const info = (title, message) => showAlert(title, message, 'info');

// Add custom method to show custom popup
export const custom = (options) => {
  return new Promise((resolve) => {
    const popupContainer = document.createElement('div');
    popupContainer.id = 'alert-popup-container-' + Date.now();
    document.body.appendChild(popupContainer);
    
    const cleanup = () => {
      if (popupContainer && popupContainer.parentNode) {
        popupContainer.parentNode.removeChild(popupContainer);
      }
    };

    const root = createRoot(popupContainer);
    root.render(
      <Popup
        type="custom"
        isOpen={true}
        onClose={() => {
          cleanup();
          resolve({ isConfirmed: false, isDenied: false });
        }}
        {...options}
      />
    );
    
    // Add emergency close function to window for debugging
    window.__closeCurrentPopup = () => {
      cleanup();
      resolve({ isConfirmed: false, isDenied: false, isClosed: true });
    };
  });
};

// Default export
const AlertUtil = {
  showAlert,
  confirm,
  success,
  error,
  warning,
  info,
  custom, // Add custom to AlertUtil
};

export default AlertUtil;