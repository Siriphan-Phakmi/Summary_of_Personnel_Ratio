// app/features/admin/UserManagement.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where, addDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, rtdb } from '@/app/core/firebase/firebase';
import { ref, onValue, get, remove, set } from 'firebase/database';
import { useAuth } from '@/app/features/auth';
import { Button, Input } from '@/app/core/ui';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { User } from '@/app/core/types/user';
import { Ward } from '@/app/core/types/ward';
import { getActiveWards } from '@/app/features/ward-form/services/wardService';
import { hashPassword } from '@/app/core/utils/authUtils';
import { clearAllUserSessions } from '@/app/features/auth/services/sessionService';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiUserX, FiUserCheck, FiLogOut, FiPlus, FiEdit, FiRefreshCw, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { FaUserCheck, FaUserSlash } from "react-icons/fa";
import { UserRole } from '@/app/core/types/user';
import { logServerAction } from '@/app/features/auth/services/logServerAction';
import { logUserActivity } from '@/app/core/utils/logUtils';

interface UserSession {
  sessionId: string;
  deviceInfo: string;
  userAgent: string;
  startTime: string;
  isActive: boolean;
  lastActive: string;
}

interface UserData extends User {
  id: string;
  createdAt?: any;
  updatedAt?: any;
  lastLogin?: any;
  password?: string;
  sessions?: UserSession[];
  department?: string;
  floor?: string | null;
}

// Custom Toggle Switch Component
function ToggleSwitch({ 
  isOn, 
  handleToggle, 
  id,
  onColor = "#10b981",
  offColor = "#ccc"
}: { 
  isOn: boolean; 
  handleToggle: () => void;
  id: string;
  onColor?: string;
  offColor?: string;
}) {
  return (
    <label className="relative inline-block w-12 h-6 cursor-pointer">
      <input
        type="checkbox"
        className="opacity-0 w-0 h-0"
        checked={isOn}
        onChange={handleToggle}
        id={id}
      />
      <span 
        className={`absolute inset-0 rounded-full transition-colors duration-200 
          ${isOn ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span 
          className={`absolute h-5 w-5 rounded-full bg-white dark:bg-gray-200 transform transition-transform duration-200 
          left-0.5 bottom-0.5 ${isOn ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </span>
    </label>
  );
}

// ฟังก์ชันสำหรับแปลง timestamp เป็น string
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'ไม่ทราบ';
  if (typeof timestamp === 'string') return new Date(timestamp).toLocaleString();
  if (typeof timestamp === 'object') {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp.seconds) {
      return new Date(Number(timestamp.seconds) * 1000).toLocaleString();
    }
  }
  return 'ไม่ทราบ';
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardList, setWardList] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [activeSessions, setActiveSessions] = useState<{[key: string]: {sessionId: string, deviceInfo: any}}>({});
  
  // Form states
  const [formData, setFormData] = useState<Partial<UserData>>({
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    role: UserRole.NURSE,
    department: '',
    floor: '',
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');
  
  // เพิ่มตัวแปร state สำหรับตรวจจับขนาดหน้าจอ
  const [isMobile, setIsMobile] = useState(false);

  // เพิ่มการตรวจสอบขนาดหน้าจอเมื่อ component โหลด
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Wrap fetch functions in useCallback
  const fetchUsers = useCallback(async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'developer')) return;
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('username'));
      const snapshot = await getDocs(q);
      const usersData: UserData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as UserData;
        usersData.push({ ...data, uid: doc.id, floor: data.floor || '' });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchActiveWards = useCallback(async () => {
    setLoadingWards(true);
    try {
      const activeWards = await getActiveWards();
      setWardList(activeWards);
    } catch (error) {
      console.error('Error fetching active wards:', error);
      toast.error('ไม่สามารถโหลดข้อมูลหอผู้ป่วยได้');
    } finally {
      setLoadingWards(false);
    }
  }, []);

  // Fetch Wards and Users
  useEffect(() => {
    fetchUsers();
    fetchActiveWards();

    // Fetch active sessions
    const fetchActiveSessions = () => {
      const sessionsRef = ref(rtdb, 'currentSessions');
      
      return onValue(sessionsRef, (snapshot) => {
        if (snapshot.exists()) {
          setActiveSessions(snapshot.val());
        } else {
          setActiveSessions({});
        }
      });
    };
    const unsubscribeSessions = fetchActiveSessions();
    
    return () => {
      unsubscribeSessions();
    };
  }, [fetchUsers, fetchActiveWards]);

  const resetForm = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      role: UserRole.NURSE,
      department: '',
      floor: '',
      active: true,
    });
    setEditingUser(null);
    setShowAddUser(false);
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '',
      role: user.role || UserRole.NURSE,
      department: user.department || '',
      floor: user.floor || '',
      active: user.active,
    });
    setError('');
  };

  const handleToggleUserStatus = async (user: UserData) => {
    if (!currentUser) return;
    setLoading(true);
    const newStatus = !user.active;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { active: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, active: newStatus } : u));
      toast.success(`เปลี่ยนสถานะ ${user.username} เป็น ${newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} สำเร็จ`);

      // Log user activity
      await logUserActivity(
        currentUser.uid,
        currentUser.username || 'unknown',
        'toggle_user_status',
        { targetUserId: user.id, targetUsername: user.username, newStatus: newStatus }
      );

    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
      
      // บันทึก log ความผิดพลาด
      await logServerAction(
        'status_change_failed', 
        { uid: currentUser?.uid || 'unknown', username: currentUser?.username || 'admin' },
        { 
          targetUserId: user.id,
          targetUsername: user.username || '',
          attempted_status: !user.active,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await clearAllUserSessions(userId);
      toast.success('บังคับออกจากระบบผู้ใช้สำเร็จ');
      // Log user activity
      await logUserActivity(
        currentUser.uid,
        currentUser.username || 'unknown',
        'force_logout',
        { targetUserId: userId }
      );
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error('Failed to force logout');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSessions = async (userId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await clearAllUserSessions(userId);
      toast.success('ล้างเซสชันผู้ใช้สำเร็จ');
      // Log user activity
      await logUserActivity(
        currentUser.uid,
        currentUser.username || 'unknown',
        'clear_user_sessions',
        { targetUserId: userId }
      );
    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast.error('ไม่สามารถลบ session ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (userId: string, sessionId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
      await remove(sessionRef);
      toast.success('ลบเซสชันสำเร็จ');
      fetchUsers(); // Refresh user data
      // Log user activity
      await logUserActivity(
        currentUser.uid,
        currentUser.username || 'unknown',
        'delete_user_session',
        { targetUserId: userId, sessionId: sessionId }
      );
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const userData: Partial<UserData> = {
        username: formData.username?.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        department: formData.department,
        floor: formData.floor || null,
        active: formData.active,
        updatedAt: serverTimestamp(),
      };
      
      if (editingUser) {
        const userRef = doc(db, 'users', editingUser.id);
        
        const updatePayload: Partial<UserData> = { ...userData };
        delete updatePayload.username;

        if (formData.password) {
            updatePayload.password = await hashPassword(formData.password);
        }
        
        await updateDoc(userRef, updatePayload);
        
        await logUserActivity(
          currentUser.uid,
          currentUser.username || 'unknown',
          'update_user',
          { targetUserId: editingUser.id, targetUsername: userData.username, changes: Object.keys(updatePayload) }
        );
        
        setUsers(users.map(u => 
          u.id === editingUser.id ? {...u, ...updatePayload, username: editingUser.username } : u
        ));
        
        toast.success(`อัปเดตข้อมูลผู้ใช้ ${editingUser.username} สำเร็จ`);
      } else {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', userData.username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError('Username นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่');
          toast.error('Username นี้มีผู้ใช้งานแล้ว');
          setLoading(false);
          return;
        }

        userData.createdAt = serverTimestamp();
        if (formData.password) {
            userData.password = await hashPassword(formData.password);
        }
        
        const newUserRef = doc(db, 'users', userData.username!);
        await setDoc(newUserRef, userData);
        
        await logUserActivity(
          currentUser.uid,
          currentUser.username || 'unknown',
          'create_user',
          { targetUserId: userData.username, targetUsername: userData.username, role: userData.role }
        );
        
        const newUserForState: UserData = {
            id: userData.username!,
            uid: userData.username!,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role!,
            department: userData.department,
            floor: userData.floor || '',
            active: userData.active,
            createdAt: new Date(),
            updatedAt: new Date(),
            sessions: [],
            lastLogin: undefined
        };
        setUsers([...users, newUserForState]);
        
        toast.success(`เพิ่มผู้ใช้ ${userData.username} สำเร็จ`);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      await logServerAction(
        editingUser ? 'update_user_failed' : 'create_user_failed',
        { uid: currentUser?.uid || 'unknown', username: currentUser?.username || 'admin' },
        {
          usernameAttempt: formData.username,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (user: UserData) => (
    <div className="flex items-center space-x-3">
      <ToggleSwitch
        isOn={user.active === true}
        handleToggle={() => handleToggleUserStatus(user)}
        id={`user-status-${user.id}`}
      />
      <span className={`text-lg font-medium ${user.active ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
      </span>
    </div>
  );

  const handleDeleteUser = async (userIdToDelete: string, usernameToDelete: string) => {
    if (!currentUser) return;

    if (currentUser.uid === userIdToDelete) {
      toast.error('ไม่สามารถลบผู้ใช้ปัจจุบันได้');
      return;
    }

    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${usernameToDelete}?`)) {
      setLoading(true);
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', userIdToDelete));
        
        // Optional: Clear sessions from Realtime Database if necessary
        try {
          const sessionsRef = ref(rtdb, `sessions/${userIdToDelete}`);
          await remove(sessionsRef);
          const currentSessionRef = ref(rtdb, `currentSessions/${userIdToDelete}`);
          await remove(currentSessionRef);
        } catch (rtdbError) {
            console.warn("Could not clear RTDB sessions during user deletion:", rtdbError);
        }

        toast.success(`ลบผู้ใช้ ${usernameToDelete} สำเร็จ`);
        await logUserActivity(
          currentUser.uid,
          currentUser.username || 'unknown',
          'delete_user',
          { targetUserId: userIdToDelete, targetUsername: usernameToDelete }
        );
        fetchUsers(); // Refresh list
      } catch (err) {
        console.error("Error deleting user:", err);
        toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้');
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase().trim();
    
    switch (searchField) {
      case 'name':
        return (
          (user.firstName || '').toLowerCase().includes(term) ||
          (user.lastName || '').toLowerCase().includes(term)
        );
      case 'username':
        return (user.username || '').toLowerCase().includes(term);
      case 'role':
        const roleText = user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป';
        return roleText.toLowerCase().includes(term) || (user.role || '').toLowerCase().includes(term);
      case 'status':
        const statusText = user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
        return statusText.toLowerCase().includes(term);
      case 'all':
      default:
        return (
          (user.firstName || '').toLowerCase().includes(term) ||
          (user.lastName || '').toLowerCase().includes(term) ||
          (user.username || '').toLowerCase().includes(term) ||
          (user.role || '').toLowerCase().includes(term) ||
          (user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน').toLowerCase().includes(term)
        );
    }
  });

  const getOptions = () => {
    return (
      <>
        <option value="user">ผู้ใช้งานทั่วไป</option>
        <option value="admin">ผู้ดูแลระบบ</option>
        <option value="developer">นักพัฒนาระบบ</option>
      </>
    );
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'developer': return 'นักพัฒนาระบบ';
      default: return 'ผู้ใช้งานทั่วไป';
    }
  };

  // Helper function to get Ward Name from ID
  const getWardNameById = (wardId: string): string => {
    const ward = wardList.find(w => w.id === wardId);
    return ward ? ward.wardName : (wardId || 'ไม่ระบุ');
  };

  if ((loading || loadingWards) && users.length === 0) {
    return (
      <ProtectedPage requiredRole={['admin', 'developer']}>
        <NavBar />
        <div className="container mx-auto px-4 py-8">
        <div className="p-4">Loading data...</div> 
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole={['admin', 'developer']}>
      <NavBar />
      <div className="container mx-auto px-4 py-8 admin-page">
        <h1 className="text-3xl font-bold mb-6">จัดการผู้ใช้</h1>
        
        <div className="mb-6">
          <button
            onClick={() => {
              setFormData({
                username: '',
                firstName: '',
                lastName: '',
                password: '',
                role: UserRole.NURSE,
                department: '',
                floor: '',
                active: true,
              });
              setEditingUser(null);
              setShowAddUser(!showAddUser);
            }}
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center text-xl font-medium"
          >
            <FiPlus className="mr-2" />
            {showAddUser ? 'ยกเลิก' : 'เพิ่มผู้ใช้ใหม่'}
          </button>
        </div>
        
        {showAddUser && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Username"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Enter username"
                  required
                  className="mb-2"
                />
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    required={!editingUser}
                    className="mb-2 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 top-9 pr-3 flex items-center text-sm leading-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <Input
                  label="First Name"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="Enter first name"
                  required
                  className="mb-2"
                />
                <Input
                  label="Last Name"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Enter last name"
                  required
                  className="mb-2"
                />
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select 
                    value={formData.department || ""}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-lg"
                  >
                    <option value="">-- เลือกแผนก --</option>
                    <option value="it">เทคโนโลยีสารสนเทศ</option>
                    <option value="nurse">สายงานพยาบาล</option>
                    <option value="doctor">เจ้าหน้าที่พยาบาล</option>
                    <option value="admin">รองผู้อำนวยการสายงานพยาบาล</option>
                    <option value="other">ศูนย์พัฒนาคุณภาพ</option>
                  </select>
                </div>
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-lg"
                  >
                    {getOptions()}
                  </select>
                </div>
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Floor / Ward 
                  </label>
                  <select 
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-lg"
                    disabled={loadingWards}
                  >
                    <option value="">-- ไม่ระบุ --</option> 
                    {loadingWards ? (
                        <option disabled>Loading wards...</option>
                    ) : (
                        wardList.map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                        ))
                    )}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading}>
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        )}
        
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:space-x-4">
          <button 
            onClick={() => {
              resetForm();
              fetchUsers();
            }}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center text-xl"
          >
            <FiRefreshCw className="mr-1" /> รีเฟรชข้อมูล
          </button>
          
          <div className="mt-4 md:mt-0 flex-1 flex flex-col md:flex-row md:items-center md:space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาผู้ใช้..."
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FiX />
                </button>
              )}
            </div>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="mt-2 md:mt-0 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-lg"
            >
              <option value="all">ทั้งหมด</option>
              <option value="name">ชื่อ-สกุล</option>
              <option value="username">ชื่อผู้ใช้</option>
              <option value="role">บทบาท</option>
              <option value="status">สถานะ</option>
            </select>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {isMobile ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-4 text-center">กำลังโหลดข้อมูล...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center">
                  {searchTerm ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ไม่พบข้อมูลผู้ใช้'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.uid} 
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      if (editingUser === user) {
                        setEditingUser(null);
                      } else {
                        setEditingUser(user);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className={editingUser === user ? "transform rotate-90 mr-2" : "mr-2"}>▶</span>
                        <div>
                          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</h3>
                          <p className="text-lg text-gray-500 dark:text-gray-300">{user.username}</p>
                        </div>
                      </div>
                      <div>
                        {renderStatus(user)}
                      </div>
                    </div>
                    
                    <div className="text-lg text-gray-500 dark:text-gray-300 mb-2">
                      <span className="font-medium">บทบาท:</span> {getRoleText(user.role)}
                    </div>
                    
                    <div className="text-lg text-gray-500 dark:text-gray-300 mb-2">
                      <span className="font-medium">Ward:</span> {getWardNameById(user.floor || '')}
                    </div>
                    
                    <div className="flex justify-end space-x-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(user);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-xl"
                        title="แก้ไขข้อมูล"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUserStatus(user);
                        }}
                        className={`${user.active ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'} text-xl`}
                        title={user.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                      >
                        {user.active ? <FiUserCheck /> : <FiUserX />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`คุณแน่ใจหรือว่าต้องการลบผู้ใช้ "${user.username}" หรือไม่?`)) {
                            handleDeleteUser(user.uid, user.username || '');
                          }
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-xl"
                        title="ลบผู้ใช้"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    
                    {editingUser === user && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm">
                        <p className="mb-1 text-gray-600 dark:text-gray-300">
                          <span className="font-medium">สร้างเมื่อ:</span> {formatTimestamp(user.createdAt)}
                        </p>
                        <p className="mb-1 text-gray-600 dark:text-gray-300">
                          <span className="font-medium">แก้ไขล่าสุด:</span> {formatTimestamp(user.updatedAt)}
                        </p>
                        <p className="mb-1 text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Ward:</span> {getWardNameById(user.floor || '')}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider table-header">
                    ชื่อ-สกุล
                  </th>
                  <th className="px-6 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider table-header">
                    ชื่อผู้ใช้
                  </th>
                  <th className="px-6 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider table-header">
                    บทบาท
                  </th>
                  <th className="px-6 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider table-header">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-right text-lg font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider table-header">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center table-data">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center table-data">
                      {searchTerm ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ไม่พบข้อมูลผู้ใช้'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <React.Fragment key={user.uid}>
                      <tr 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => {
                          if (editingUser === user) {
                            setEditingUser(null);
                          } else {
                            setEditingUser(user);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap table-data">
                          <div className="flex items-center text-xl font-medium text-gray-900 dark:text-gray-100">
                            <span className={editingUser === user ? "transform rotate-90 mr-2" : "mr-2"}>▶</span>
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-500 dark:text-gray-300 table-data">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-500 dark:text-gray-300 table-data">
                          {getRoleText(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap table-data">
                          {renderStatus(user)}
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-right text-lg font-medium table-data"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditUser(user);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 text-xl"
                            title="แก้ไขข้อมูล"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUserStatus(user);
                            }}
                            className={`${user.active ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'} mr-3 text-xl`}
                            title={user.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                          >
                            {user.active ? <FiUserCheck /> : <FiUserX />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`คุณแน่ใจหรือว่าต้องการลบผู้ใช้ "${user.username}" หรือไม่?`)) {
                                handleDeleteUser(user.uid, user.username || '');
                              }
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-xl"
                            title="ลบผู้ใช้"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                      
                      {editingUser === user && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">ข้อมูลเพิ่มเติม</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  สร้างเมื่อ: {formatTimestamp(user.createdAt)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  แก้ไขล่าสุด: {formatTimestamp(user.updatedAt)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Ward:</span> {getWardNameById(user.floor || '')}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}