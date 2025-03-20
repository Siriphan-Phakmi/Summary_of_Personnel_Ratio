import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Alert = ({ 
    isOpen, 
    onClose, 
    title, 
    message, 
    confirmText = 'ตกลง', 
    cancelText, 
    onConfirm,
    type = 'info' // 'info', 'warning', 'error', 'success'
}) => {
    useEffect(() => {
        if (isOpen) {
            // ป้องกันการ scroll เมื่อ modal เปิด
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // กำหนดสีตาม type
    const getTypeStyles = () => {
        switch (type) {
            case 'warning':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
                };
            case 'error':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    buttonColor: 'bg-red-500 hover:bg-red-600'
                };
            case 'success':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    buttonColor: 'bg-green-500 hover:bg-green-600'
                };
            default: // info
                return {
                    icon: (
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    buttonColor: 'bg-blue-500 hover:bg-blue-600'
                };
        }
    };

    const { icon, buttonColor } = getTypeStyles();

    const AlertContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur effect */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
                onClick={onClose}
            />

            {/* Alert Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                {/* Header */}
                <div className="flex items-center p-4 border-b">
                    <div className="mr-3">
                        {icon}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                        {title}
                    </h3>
                </div>

                {/* Body */}
                <div className="p-4">
                    <p className="text-sm text-gray-500">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t">
                    {cancelText && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${buttonColor}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    // ใช้ Portal เพื่อแสดง Alert นอก DOM hierarchy ปกติ
    return createPortal(
        AlertContent,
        document.body
    );
};

export default Alert; 