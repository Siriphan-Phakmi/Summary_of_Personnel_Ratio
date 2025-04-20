import React, { useState } from 'react';
import { useWardManagement } from '../hooks/useWardManagement';
import { toast } from 'react-hot-toast';
import { Ward } from '../services/databaseService';
import { useAuth } from '@/app/features/auth';

/**
 * คอมโพเนนต์สำหรับจัดการวอร์ด
 */
const WardManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { wards, loading, error, addWard, editWard, removeWard } = useWardManagement();
  const [newWardName, setNewWardName] = useState('');
  const [editingWard, setEditingWard] = useState<string | null>(null);
  const [editingWardName, setEditingWardName] = useState('');

  // จัดการการส่งฟอร์มสร้างวอร์ดใหม่
  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWardName.trim()) {
      toast.error('กรุณากรอกชื่อวอร์ด');
      return;
    }
    
    const success = await addWard(newWardName, currentUser);
    
    if (success) {
      toast.success(`สร้างวอร์ด "${newWardName}" สำเร็จ`);
      setNewWardName('');
    }
  };

  // เริ่มการแก้ไขวอร์ด
  const handleStartEdit = (wardId: string, wardName: string) => {
    setEditingWard(wardId);
    setEditingWardName(wardName);
  };

  // ยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditingWard(null);
    setEditingWardName('');
  };

  // บันทึกการแก้ไขวอร์ด
  const handleSaveEdit = async (wardId: string) => {
    if (!editingWardName.trim()) {
      toast.error('กรุณากรอกชื่อวอร์ด');
      return;
    }
    
    const success = await editWard(wardId, editingWardName, currentUser);
    
    if (success) {
      toast.success(`อัปเดตวอร์ด "${editingWardName}" สำเร็จ`);
      setEditingWard(null);
      setEditingWardName('');
    }
  };

  // ลบวอร์ด
  const handleDeleteWard = async (wardId: string, wardName: string) => {
    if (window.confirm(`ยืนยันการลบวอร์ด "${wardName}"?`)) {
      const success = await removeWard(wardId, currentUser);
      
      if (success) {
        toast.success(`ลบวอร์ด "${wardName}" สำเร็จ`);
      }
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md mb-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">สร้างวอร์ดใหม่</h2>
        
        <form onSubmit={handleCreateWard} className="flex gap-3">
          <input
            type="text"
            placeholder="ชื่อวอร์ด"
            value={newWardName}
            onChange={(e) => setNewWardName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างวอร์ด'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          วอร์ดทั้งหมด
        </h2>
        
        {loading && !wards.length ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-pulse">กำลังโหลด...</div>
          </div>
        ) : !wards.length ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            ไม่พบข้อมูลวอร์ด
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ชื่อวอร์ด
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {wards.map((ward) => (
                  <tr key={ward.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingWard === ward.id ? (
                        <input
                          type="text"
                          value={editingWardName}
                          onChange={(e) => setEditingWardName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-gray-100">{ward.wardName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {editingWard === ward.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(ward.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            disabled={loading}
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(ward.id, ward.wardName)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteWard(ward.id, ward.wardName)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            disabled={loading}
                          >
                            ลบ
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WardManager; 