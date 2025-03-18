import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const LoadingScreen = ({ timeout = 15000, onTimeout, showRetry = false }) => {
    const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTimeoutMessage(true);
            if (onTimeout) onTimeout();
        }, timeout);

        return () => clearTimeout(timer);
    }, [timeout, onTimeout]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-white via-blue-50 to-[#0ab4ab]/10 flex items-center justify-center z-50">
            <div className="bg-white/80 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                        <Image
                            src="/images/BPK.jpg"
                            alt="BPK Loading"
                            fill={true}
                            style={{ objectFit: 'contain' }}
                            className={`rounded-lg ${!showTimeoutMessage ? 'animate-pulse' : ''}`}
                            priority={true}
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        {!showTimeoutMessage ? (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0ab4ab] mb-3"></div>
                                <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
                                <p className="text-sm text-gray-500 mt-1">โปรดรอสักครู่</p>
                            </>
                        ) : (
                            <>
                                <p className="text-red-600 font-medium mb-2">การโหลดข้อมูลใช้เวลานานเกินไป</p>
                                <p className="text-sm text-gray-500 mb-4">กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง</p>
                                {showRetry && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-4 py-2 bg-[#0ab4ab] text-white rounded-lg hover:bg-[#098f88] transition-colors"
                                    >
                                        ลองใหม่
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;