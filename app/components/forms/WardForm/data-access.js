/**
 * ดึงประวัติข้อมูล ward ตามเงื่อนไขที่กำหนด
 * @param {string} wardId - รหัส ward
 * @param {string} date - วันที่ต้องการดึงข้อมูล (format: yyyy-MM-dd)
 * @param {string} shift - กะที่ต้องการดึงข้อมูล
 * @returns {Promise<Array>} - ข้อมูลประวัติทั้งหมดที่พบ
 */
export const fetchWardHistory = async (wardId, date, shift) => {
    try {
        const historyRef = collection(db, 'wardDataHistory');
        const q = query(
            historyRef,
            where('wardId', '==', wardId),
            where('date', '==', date),
            where('shift', '==', shift),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const historyData = [];

        querySnapshot.forEach((doc) => {
            historyData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return historyData;
    } catch (error) {
        console.error('Error fetching ward history:', error);
        return [];
    }
}; 