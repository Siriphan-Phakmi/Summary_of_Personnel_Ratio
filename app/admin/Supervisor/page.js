'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function SupervisorEdit() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // ตรวจสอบการ login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('supervisorAuth');
      if (!isAuth) {
        router.push('/admin/login');
      }
    }
  }, [router]);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('supervisorAuth');
      router.push('/admin/login');
    }
  };

  // ดึงข้อมูลจาก Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'dailyData'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDays(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // บันทึกข้อมูลลง Firebase
  const handleChange = async (index, field, value) => {
    try {
      const day = days[index];
      const docRef = doc(db, 'dailyData', day.id);
      
      // อัพเดทข้อมูลใน state
      const newDays = [...days];
      newDays[index] = {
        ...newDays[index],
        [field]: value,
        lastModified: new Date().toISOString()
      };
      setDays(newDays);

      // อัพเดทข้อมูลใน Firebase
      await updateDoc(docRef, {
        [field]: value,
        lastModified: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating data:', err);
      setError('ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  if (loading) return <div className="p-6">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Supervisor Edit</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ออกจากระบบ
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">วันที่</th>
              <th className="p-2 border">จำนวนบุคลากร</th>
              <th className="p-2 border">จำนวนผู้ป่วย</th>
              <th className="p-2 border">สูตรคำนวณ</th>
              <th className="p-2 border">แก้ไขล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={day.id}>
                <td className="p-2 border">{format(new Date(day.date), 'dd/MM/yyyy')}</td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={day.manpower || 0}
                    onChange={(e) => handleChange(index, 'manpower', Number(e.target.value))}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="p-2 border">
                  <input
                    type="number"
                    value={day.patients || 0}
                    onChange={(e) => handleChange(index, 'patients', Number(e.target.value))}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="p-2 border">
                  <input
                    value={day.formula || ''}
                    onChange={(e) => handleChange(index, 'formula', e.target.value)}
                    className="w-full p-1 border rounded"
                    placeholder="ใส่สูตรคำนวณ"
                  />
                </td>
                <td className="p-2 border text-sm">
                  {day.lastModified ? format(new Date(day.lastModified), 'dd/MM/yyyy HH:mm') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
