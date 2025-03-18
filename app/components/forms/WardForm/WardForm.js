// ... existing code ...

const WardForm = ({ selectedWard, ...props }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [initError, setInitError] = useState(null);
    
    // State variables
    const [showForm, setShowForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(() => {
      const currentShift = getCurrentShift();
      console.log('Initial shift set to:', currentShift);
      return currentShift;
    });

    // ... existing state declarations ...

    // Add timeout for loading state
    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                setInitError('การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
            }
        }, 15000); // 15 seconds timeout

        return () => clearTimeout(loadingTimeout);
    }, [isLoading]);

    // Initialize data when component mounts
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard || !selectedDate) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setInitError(null);
            
            try {
                // Fetch dates with data
                const dates = await Promise.race([
                    fetchDatesWithData(selectedWard),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 10000)
                    )
                ]);
                setDatesWithData(dates);

                // Check approval status
                const status = await checkApprovalStatus(selectedDate, selectedWard);
                setApprovalStatus(status);
                setApprovalPending(status === 'pending');
                setSupervisorApproved(status === 'approved');

                // Fetch ward data
                const data = await fetchWardData(selectedDate, selectedWard, selectedShift);
                if (data) {
                    setFormData(data);
                    setOriginalData(data);
                    setHasUnsavedChanges(false);
                }

                setShowForm(true);

            } catch (error) {
                console.error('Error initializing data:', error);
                setInitError(error.message === 'Timeout' 
                    ? 'การโหลดข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
                    : 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
                );
                
                Swal.fire({
                    title: 'Error',
                    text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab',
                    showConfirmButton: true,
                    confirmButtonText: 'ลองใหม่',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [selectedWard, selectedDate, selectedShift, user]);

    // ... rest of the component code ...

    // Add error display
    if (initError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-red-800 font-semibold text-lg mb-2">เกิดข้อผิดพลาด</h3>
                    <p className="text-red-600">{initError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {isLoading && <LoadingScreen />}
            {showForm && (
                // ... existing JSX ...
            )}
        </>
    );
};

export default WardForm;