// app/features/admin/UserManagement.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { db, rtdb } from '@/app/core/firebase/firebase';
import { ref, onValue, get, remove } from 'firebase/database';
import { useAuth } from '@/app/features/auth';
import { Button, Input } from '@/app/core/ui';
import NavBar from '@/app/core/ui/NavBar';
import ProtectedPage from '@/app/core/ui/ProtectedPage';
import { User } from '@/app/core/types/user';
import { hashPassword } from '@/app/core/utils/authUtils';
import { clearAllUserSessions } from '@/app/features/auth/services/sessionService';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiUserX, FiUserCheck, FiLogOut, FiPlus, FiEdit, FiRefreshCw, FiX } from 'react-icons/fi';

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

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [activeSessions, setActiveSessions] = useState<{[key: string]: {sessionId: string, deviceInfo: any}}>({});
  
  // Form states
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [location, setLocation] = useState<string[]>([]);
  const [availableWards, setAvailableWards] = useState<{id: string, name: string}[]>([]);
  const [department, setDepartment] = useState('');
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');
  
  const { user } = useAuth();

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

  // Define fetchUsers at component level
    const fetchUsers = async () => {
      // อนุญาตให้ทั้ง admin และ developer ดูข้อมูลได้
      if (!user || (user.role !== 'admin' && user.role !== 'developer')) return;
      
    setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('username'));
        const snapshot = await getDocs(q);
        
      const usersData: UserData[] = [];
        snapshot.forEach((doc) => {
        const data = doc.data() as UserData;
          usersData.push({
            ...data,
            uid: doc.id
          });
        });
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

  // Fetch users
  useEffect(() => {
    fetchUsers();
    const fetchWards = async () => {
      try {
        const wardsRef = collection(db, 'wards');
        const snapshot = await getDocs(wardsRef);
        
        const wardsData: {id: string, name: string}[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          wardsData.push({
            id: doc.id,
            name: data.wardName
          });
        });
        
        setAvailableWards(wardsData);
      } catch (error) {
        console.error('Error fetching wards:', error);
      }
    };

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

    fetchWards();
    const unsubscribe = fetchActiveSessions();
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  const resetForm = () => {
    setUsername('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setRole('user');
    setLocation([]);
    setDepartment('');
    setEditingUser(null);
    setShowAddUser(false);
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setUsername(user.username || '');
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setRole(user.role || 'user');
    setLocation(user.location || []);
    setDepartment(user.department || '');
    setShowAddUser(true);
  };

  const handleToggleUserStatus = async (user: UserData) => {
    // อนุญาตให้ทั้ง admin และ developer ดำเนินการได้
    if (!user || (user.role !== 'admin' && user.role !== 'developer')) {
      toast.error('คุณไม่มีสิทธิ์เพียงพอที่จะดำเนินการนี้');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const newStatus = !user.active;
      
      await updateDoc(userRef, {
        active: newStatus,
        lastUpdated: new Date().toISOString()
      });
      
      // บันทึก log การเปลี่ยนสถานะ
      await logUserAction(
        newStatus ? 'activate_user' : 'deactivate_user', 
        user.uid, 
        user.username || '', 
        { 
          newStatus,
          timestamp: new Date().toISOString()
        }
      );
      
      // Update local state
      setUsers(users.map(u => 
        u.uid === user.uid ? {...u, active: newStatus} : u
      ));
      
      toast.success(`ผู้ใช้ ${user.username} ${newStatus ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว'}`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
      
      // บันทึก log ความผิดพลาด
      await logUserAction(
        'status_change_failed', 
        user.uid, 
        user.username || '', 
        { 
          attempted_status: !user.active,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  };

  const handleForceLogout = async (userId: string) => {
    try {
      // Remove the current session from RTDB
      const sessionRef = ref(rtdb, `currentSessions/${userId}`);
      await remove(sessionRef);
      
      toast.success('User was forced to logout');
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error('Failed to force logout');
    }
  };

  const handleClearSessions = async (userId: string) => {
    try {
      await clearAllUserSessions(userId);
      toast.success('ลบ session ทั้งหมดเรียบร้อย');
      fetchUsers(); // Refresh user data
    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast.error('ไม่สามารถลบ session ได้');
    }
  };

  const handleDeleteSession = async (userId: string, sessionId: string) => {
    try {
      const sessionRef = ref(rtdb, `sessions/${userId}/${sessionId}`);
      await remove(sessionRef);
      toast.success('Session deleted successfully');
      fetchUsers(); // Refresh user data
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // อนุญาตให้ทั้ง admin และ developer แก้ไขข้อมูลได้
    if (!user || (user.role !== 'admin' && user.role !== 'developer')) {
      toast.error('คุณไม่มีสิทธิ์เพียงพอที่จะดำเนินการนี้');
      return;
    }
    
    if (!username || !firstName || !lastName || (!editingUser && !password)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const userData: any = {
        username,
        firstName,
        lastName,
        role,
        location,
        department,
        lastUpdated: new Date().toISOString()
      };
      
      if (password) {
        userData.password = await hashPassword(password);
      }
      
      if (editingUser) {
        // Update existing user
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, userData);
        
        // บันทึก log การแก้ไขผู้ใช้
        await logUserAction(
          'update_user',
          editingUser.uid,
          username,
          {
            fields_updated: Object.keys(userData).filter(key => key !== 'password'),
            password_changed: !!password,
            timestamp: new Date().toISOString()
          }
        );
        
        // Update local state
        setUsers(users.map(u => 
          u.uid === editingUser.uid ? {...u, ...userData} : u
        ));
        
        toast.success(`User ${username} updated successfully`);
      } else {
        // Create new user
        userData.active = true;
        userData.createdAt = new Date().toISOString();
        
        // Generate a unique ID for the new user
        const newUserRef = doc(collection(db, 'users'));
        await setDoc(newUserRef, userData);
        
        // บันทึก log การสร้างผู้ใช้ใหม่
        await logUserAction(
          'create_user',
          newUserRef.id,
          username,
          {
            role: userData.role,
            timestamp: new Date().toISOString()
          }
        );
        
        // Add to local state
        setUsers([...users, { ...userData, uid: newUserRef.id }]);
        
        toast.success(`User ${username} created successfully`);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
      
      // บันทึก log ความผิดพลาด
      await logUserAction(
        editingUser ? 'update_user_failed' : 'create_user_failed',
        editingUser ? editingUser.uid : 'new_user',
        username,
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWardToggle = (wardId: string) => {
    setLocation(prev => 
      prev.includes(wardId) 
        ? prev.filter(id => id !== wardId) 
        : [...prev, wardId]
    );
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

  const handleDeleteUser = async (userId: string, username: string) => {
    // อนุญาตให้ทั้ง admin และ developer ดำเนินการได้
    if (!user || (user.role !== 'admin' && user.role !== 'developer')) {
      toast.error('คุณไม่มีสิทธิ์เพียงพอที่จะดำเนินการนี้');
      return;
    }
    
    try {
      // ลบผู้ใช้จาก Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      // บันทึก log การลบผู้ใช้
      await logUserAction('delete', userId, username, { 
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      // อัปเดต state เพื่อให้ UI แสดงการเปลี่ยนแปลงทันที
      setUsers(users.filter(u => u.uid !== userId));
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('ไม่สามารถลบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
      
      // บันทึก log ความผิดพลาด
      await logUserAction('delete_failed', userId, username, { 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // เพิ่มฟังก์ชันสำหรับบันทึก log
  const logUserAction = async (action: string, userId: string, username: string, details: any = {}) => {
    try {
      const logRef = collection(db, 'userActivityLogs');
      await addDoc(logRef, {
        action,
        userId,
        username,
        performedBy: user?.username || 'system',
        performedByUserId: user?.uid || 'system',
        timestamp: serverTimestamp(),
        details
      });
      console.log(`Log recorded: ${action} for user ${username}`);
    } catch (error) {
      console.error('Error recording log:', error);
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

  if (loading && users.length === 0) {
    return (
      <ProtectedPage requiredRole={['admin', 'developer']}>
        <NavBar />
        <div className="container mx-auto px-4 py-8">
        <div className="p-4">Loading user data...</div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRole={['admin', 'developer']}>
      <NavBar />
      <div className="container mx-auto px-4 py-8 admin-page">
        <h1 className="text-3xl font-bold mb-6">จัดการผู้ใช้</h1>
        
        {/* ปุ่มเพิ่มผู้ใช้ใหม่ */}
        <div className="mb-6">
          <button
            onClick={() => {
              setUsername('');
              setFirstName('');
              setLastName('');
              setPassword('');
              setRole('user');
              setLocation([]);
              setEditingUser(null);
              setShowAddUser(!showAddUser);
            }}
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center text-xl font-medium"
          >
            <FiPlus className="mr-2" />
            {showAddUser ? 'ยกเลิก' : 'เพิ่มผู้ใช้ใหม่'}
          </button>
        </div>
        
        {/* ฟอร์มเพิ่มหรือแก้ไขผู้ใช้ */}
        {showAddUser && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="mb-2"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                  required={!editingUser}
                  className="mb-2"
                />
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                  className="mb-2"
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                  className="mb-2"
                />
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select 
                    value={department || ""}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-lg"
                  >
                    <option value="">-- เลือกแผนก --</option>
                    <option value="it">แผนกไอที</option>
                    <option value="nurse">แผนกพยาบาล</option>
                    <option value="doctor">แผนกแพทย์</option>
                    <option value="admin">แผนกธุรการ</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-lg"
                  >
                    {getOptions()}
                  </select>
                </div>
                <div className="md:col-span-2 mb-4">
                  <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Wards
                </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                    {availableWards.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                  {availableWards.map(ward => (
                    <div key={ward.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`ward-${ward.id}`}
                        checked={location.includes(ward.id)}
                        onChange={() => handleWardToggle(ward.id)}
                              className="mr-3 h-5 w-5 accent-blue-600 dark:accent-blue-500"
                      />
                            <label htmlFor={`ward-${ward.id}`} className="text-lg text-gray-900 dark:text-gray-100">{ward.name}</label>
                    </div>
                  ))}
                      </div>
                    ) : (
                      <p className="text-lg text-gray-500 dark:text-gray-400">No wards available</p>
                    )}
                  </div>
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
        
        {/* ปุ่มรีเฟรชข้อมูล */}
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
        
        {/* แสดงตารางบน Desktop และการ์ดบน Mobile */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {isMobile ? (
            /* มุมมองสำหรับมือถือแบบการ์ด */
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
                    
                    {/* แสดงข้อมูลเพิ่มเติมเมื่อกดเปิด */}
                    {editingUser === user && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm">
                        <p className="mb-1 text-gray-600 dark:text-gray-300">
                          <span className="font-medium">สร้างเมื่อ:</span> {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'ไม่ทราบ'}
                        </p>
                        <p className="mb-1 text-gray-600 dark:text-gray-300">
                          <span className="font-medium">แก้ไขล่าสุด:</span> {user.lastUpdated ? new Date(user.lastUpdated).toLocaleString() : 'ไม่ทราบ'}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* มุมมองสำหรับเดสก์ท็อปแบบตาราง */
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
                          // ถ้ากดที่แถวแล้ว ให้เปิด/ปิดการแสดงข้อมูลเพิ่มเติม
                          if (editingUser === user) {
                            setEditingUser(null); // ปิดการแสดงข้อมูล
                          } else {
                            setEditingUser(user); // เปิดการแสดงข้อมูล
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
                            // หยุดการ propagation เพื่อให้การคลิกปุ่มไม่ทำให้แถวทั้งแถวถูกคลิกด้วย
                            e.stopPropagation();
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // ป้องกันการทำงานซ้ำซ้อน
                              handleEditUser(user);
                              
                              // หน่วงเวลาเล็กน้อยก่อนโฟกัสที่ช่อง username
                              setTimeout(() => {
                                const usernameInput = document.querySelector('input[placeholder="Enter username"]') as HTMLInputElement;
                                if (usernameInput) {
                                  usernameInput.focus();
                                }
                              }, 100);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 text-xl"
                            title="แก้ไขข้อมูล"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // ป้องกันการทำงานซ้ำซ้อน
                              handleToggleUserStatus(user);
                            }}
                            className={`${user.active ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'} mr-3 text-xl`}
                            title={user.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                          >
                            {user.active ? <FiUserCheck /> : <FiUserX />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // ป้องกันการทำงานซ้ำซ้อน
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
                      
                      {/* ส่วนขยายแสดงรายละเอียดเพิ่มเติม */}
                      {editingUser === user && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">ข้อมูลเพิ่มเติม</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  สร้างเมื่อ: {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'ไม่ทราบ'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  แก้ไขล่าสุด: {user.lastUpdated ? new Date(user.lastUpdated).toLocaleString() : 'ไม่ทราบ'}
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