import React from 'react';

/**
 * Component แสดงปุ่มดำเนินการสำหรับฟอร์ม เช่น บันทึก, บันทึกฉบับร่าง, ยกเลิก
 */
const FormActions = ({
  onSaveDraft,
  onSubmit,
  isSubmitting,
  isSaving,
  date,
  shift,
  ward,
  hasErrors = false
}) => {
  return (
    <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 space-y-3">
      <div className="text-gray-600 text-sm mb-2">การดำเนินการ</div>
      
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting || isSaving || hasErrors}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-w-[120px]"
        >
          {isSaving ? (
            <>
              <span className="animate-spin">⏳</span> กำลังบันทึก...
            </>
          ) : (
            <>บันทึกฉบับร่าง</>
          )}
        </button>
        
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || isSaving || hasErrors}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin">⏳</span> กำลังบันทึก...
            </>
          ) : (
            <>บันทึกข้อมูล</>
          )}
        </button>
      </div>
      
      {hasErrors && (
        <div className="text-red-500 text-sm mt-2">
          กรุณาตรวจสอบข้อมูลที่มีข้อผิดพลาดก่อนบันทึก
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        การบันทึกข้อมูลจะส่งข้อมูลไปรออนุมัติจาก Supervisor และไม่สามารถแก้ไขได้อีก
      </div>
    </div>
  );
};

export default FormActions; 