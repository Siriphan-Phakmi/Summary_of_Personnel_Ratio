import React from 'react';
import Image from 'next/image';

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-white via-blue-50 to-[#0ab4ab]/10 flex items-center justify-center z-50">
            <div className="bg-white/80 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                        <Image
                            src="/images/BPK.jpg"
                            alt="BPK Loading"
                            layout="fill"
                            objectFit="contain"
                            className="animate-pulse rounded-lg"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0ab4ab] mb-3"></div>
                        <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
                        <p className="text-sm text-gray-500 mt-1">โปรดรอสักครู่</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen; 