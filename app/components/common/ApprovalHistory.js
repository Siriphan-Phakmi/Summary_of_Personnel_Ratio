import React from 'react';

/**
 * Component แสดงประวัติการอนุมัติข้อมูลในรูปแบบ bottom sheet
 */
const ApprovalHistory = ({ isOpen, onClose, ward, date, shift }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-x-0 bottom-0 z-10 transform transition-transform duration-300 ease-in-out">
        <div className="bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              ประวัติการอนุมัติ
            </h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4">
            <div className="mb-4 text-sm text-gray-600">
              <div><strong>แผนก:</strong> {ward?.name || '-'}</div>
              <div><strong>วันที่:</strong> {date?.toLocaleDateString('th-TH') || '-'}</div>
              <div><strong>กะ:</strong> {shift || '-'}</div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* No history message */}
              <div className="p-8 text-center text-gray-500">
                ไม่พบประวัติการอนุมัติ
              </div>
              
              {/* Example history items would be mapped here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalHistory; 