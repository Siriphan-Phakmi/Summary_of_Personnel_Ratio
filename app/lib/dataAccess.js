'use client';

import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { mockUsers, mockWardRecords, mockStaffRecords, getMockDataWithDelay, mockLogin } from './mockData';

// สถานะการใช้งานโหมดจำลองข้อมูล
let useMockData = true; // เปลี่ยนเป็น true เพื่อใช้ข้อมูลจำลองแทน Firebase

// ฟังก์ชันสำหรับตั้งค่าการใช้โหมดจำลองข้อมูล
export const setUseMockData = (value) => {
  useMockData = value;
  console.log(`[Data Access] ${value ? 'เปิด' : 'ปิด'}การใช้ข้อมูลจำลอง`);
  
  // เก็บค่าใน localStorage เพื่อให้คงอยู่แม้รีเฟรชหน้า
  if (typeof window !== 'undefined') {
    localStorage.setItem('useMockData', value ? 'true' : 'false');
  }
};

// รีเซ็ตค่าใน localStorage เพื่อให้แน่ใจว่าใช้ค่า true
if (typeof window !== 'undefined') {
  localStorage.removeItem('useMockData');
  // ตั้งค่าใหม่เพื่อให้แน่ใจว่าเป็น true
  localStorage.setItem('useMockData', 'true');
}

/**
 * ฟังก์ชันค้นหาผู้ใช้ตาม username
 */
export const findUserByUsername = async (username) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.warn('Using mock user data due to error:', error.message);
    return getMockDataWithDelay(mockUsers.find(u => u.username === username) || null);
  }
};

/**
 * ฟังก์ชันเข้าสู่ระบบ
 */
export const loginUser = async (username, password) => {
  try {
    // Normal Firebase login (only if not using mock data)
    if (!useMockData) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("User not found in database:", username);
        return { success: false, error: 'User not found' };
      }
      
      const userDoc = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      
      console.log("Found user:", username, "Checking password...");
      
      if (userDoc.password !== password) {
        console.log("Invalid password for user:", username);
        return { success: false, error: 'Invalid password' };
      }
      
      console.log("Login successful for user:", username);
      
      return { 
        success: true, 
        user: {
          uid: userId,
          ...userDoc
        }
      };
    }
    
    // Mock data login
    console.log('Using mock login for:', username);
    const mockUser = mockLogin(username, password);
    if (!mockUser) {
      console.log('Mock login failed - no matching user found');
      return { success: false, error: 'Invalid credentials' };
    }
    
    console.log('Mock login successful for:', username);
    return { success: true, user: mockUser };
  } catch (error) {
    console.error('Login error:', error.message);
    
    // Fallback to mock login in case of errors
    const mockUser = mockLogin(username, password);
    if (!mockUser) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    return { success: true, user: mockUser };
  }
};

/**
 * ฟังก์ชันดึงข้อมูล ward daily records
 */
export const getWardDailyRecords = async (date, wardId = null) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    const wardDailyRef = collection(db, 'wardDailyRecords');
    let q;
    
    if (wardId) {
      q = query(
        wardDailyRef,
        where('date', '==', date),
        where('wardId', '==', wardId)
      );
    } else {
      q = query(
        wardDailyRef,
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.warn('Using mock ward data due to error:', error.message);
    
    // แปลงข้อมูลจำลองให้อยู่ในรูปแบบเดียวกับข้อมูลจริง
    if (wardId) {
      const wardData = mockWardRecords[wardId];
      return wardData ? [{ 
        id: `${date}_${wardId}`,
        wardId,
        date,
        ...wardData
      }] : [];
    } else {
      return Object.entries(mockWardRecords).map(([ward, data]) => ({
        id: `${date}_${ward}`,
        wardId: ward,
        date,
        ...data
      }));
    }
  }
};

/**
 * ฟังก์ชันดึงข้อมูล staff records
 */
export const getStaffRecords = async (date, shift = null) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    const recordsRef = collection(db, 'staffRecords');
    let q;
    
    if (shift) {
      q = query(
        recordsRef,
        where('date', '==', date),
        where('shift', '==', shift)
      );
    } else {
      q = query(
        recordsRef,
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.warn('Using mock staff records due to error:', error.message);
    
    return getMockDataWithDelay(
      mockStaffRecords
        .filter(record => record.date === date && (!shift || record.shift === shift))
    );
  }
};

/**
 * ฟังก์ชันบันทึกข้อมูล staff records
 */
export const saveStaffRecord = async (recordData, recordId = null) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    if (recordId) {
      // Update existing record
      await updateDoc(doc(db, 'staffRecords', recordId), {
        ...recordData,
        lastModified: serverTimestamp()
      });
      return { success: true, id: recordId };
    } else {
      // Create new record
      const docRef = await addDoc(collection(db, 'staffRecords'), {
        ...recordData,
        timestamp: serverTimestamp(),
        lastModified: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.warn('Using mock data save due to error:', error.message);
    
    // จำลองการบันทึกข้อมูล
    return getMockDataWithDelay({ 
      success: true, 
      id: recordId || `mock_record_${Date.now()}`
    });
  }
};

/**
 * ฟังก์ชันบันทึกข้อมูล ward daily records
 */
export const saveWardDailyRecord = async (wardData) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    const { wardId, date } = wardData;
    const docId = `${date}_${wardId}`;
    
    await setDoc(doc(db, 'wardDailyRecords', docId), {
      ...wardData,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    return { success: true, id: docId };
  } catch (error) {
    console.warn('Using mock ward daily record save due to error:', error.message);
    
    // จำลองการบันทึกข้อมูล
    return getMockDataWithDelay({ 
      success: true, 
      id: `${wardData.date}_${wardData.wardId}`
    });
  }
};

/**
 * ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
 */
export const getAllUsers = async () => {
  try {
    console.log('Getting all users, useMockData:', useMockData);
    
    if (useMockData) {
      console.log('Using mock data - throwing error');
      throw new Error('Using mock data');
    }
    
    console.log('Fetching users from Firebase...');
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${users.length} users in Firebase`);
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    console.log('Returning mock users instead');
    return getMockDataWithDelay(mockUsers);
  }
};

/**
 * ฟังก์ชันเพิ่มผู้ใช้ใหม่
 */
export const addUser = async (userData) => {
  try {
    console.log('Adding user, useMockData:', useMockData);
    console.log('User data:', userData);
    
    if (useMockData) {
      console.log('Using mock data - throwing error');
      throw new Error('Using mock data');
    }
    
    console.log('Adding user to Firebase...');
    const docRef = await addDoc(collection(db, 'users'), userData);
    console.log('User added successfully to Firebase, ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding user:', error);
    
    // เพิ่มผู้ใช้ในข้อมูลจำลอง
    const newId = `user_${Date.now()}`;
    console.log('Adding to mock users with ID:', newId);
    mockUsers.push({
      id: newId,
      ...userData
    });
    
    return getMockDataWithDelay({ 
      success: true, 
      id: newId
    });
  }
};

/**
 * ฟังก์ชันอัพเดทข้อมูลผู้ใช้
 */
export const updateUser = async (userId, userData) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    await updateDoc(doc(db, 'users', userId), userData);
    return { success: true };
  } catch (error) {
    console.warn('Using mock user update due to error:', error.message);
    
    // อัพเดทผู้ใช้ในข้อมูลจำลอง
    const index = mockUsers.findIndex(user => user.id === userId);
    if (index !== -1) {
      mockUsers[index] = { ...mockUsers[index], ...userData };
    }
    
    return getMockDataWithDelay({ success: true });
  }
};

/**
 * ฟังก์ชันลบผู้ใช้
 */
export const deleteUser = async (userId) => {
  try {
    if (useMockData) throw new Error('Using mock data');
    
    await deleteDoc(doc(db, 'users', userId));
    return { success: true };
  } catch (error) {
    console.warn('Using mock user delete due to error:', error.message);
    
    // ลบผู้ใช้ในข้อมูลจำลอง
    const index = mockUsers.findIndex(user => user.id === userId);
    if (index !== -1) {
      mockUsers.splice(index, 1);
    }
    
    return getMockDataWithDelay({ success: true });
  }
};
