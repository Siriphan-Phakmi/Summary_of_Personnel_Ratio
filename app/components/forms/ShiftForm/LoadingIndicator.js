export const LoadingIndicator = ({ loadingMessage }) => {
    if (!loadingMessage) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-6 max-w-md mx-4 shadow-2xl border-2 border-[#0ab4ab]/20">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-[#0ab4ab]/20 rounded-full animate-spin border-t-[#0ab4ab]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-gray-800">{loadingMessage}</p>
                    <p className="text-sm text-gray-500">กรุณารอสักครู่...</p>
                </div>
            </div>
        </div>
    );
};