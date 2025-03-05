'use client';
import { useState, useEffect } from 'react';
import { getAllUsers, addUser, updateUser, deleteUser, updateAllUsersNameFields } from '../../lib/dataAccess';
import { useAuth } from '../../context/AuthContext';
import AuthGuard from '../../components/auth/AuthGuard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useRouter } from 'next/navigation';

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    fullName: '',
    position: '',
    department: '',
    role: 'user'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { user: currentUser } = useAuth();

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    console.log('Fetching users...');
    try {
      const usersList = await getAllUsers();
      console.log('Users fetched:', usersList);
      setUsers(usersList);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // แยก fullName เป็น firstName และ lastName สำหรับข้อมูลเดิม
  useEffect(() => {
    // จัดการกับข้อมูลผู้ใช้ที่มีอยู่แล้วแต่ไม่มี firstName หรือ lastName
    const processedUsers = users.map(user => {
      if ((!user.firstName || !user.lastName) && user.fullName) {
        const nameParts = user.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        return {
          ...user,
          firstName: user.firstName || firstName,
          lastName: user.lastName || lastName
        };
      }
      return user;
    });

    if (JSON.stringify(processedUsers) !== JSON.stringify(users)) {
      setUsers(processedUsers);
    }
  }, [users]);

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    console.log('Submitting new user:', newUser);
    try {
      console.log('Calling addUser function...');
      const result = await addUser(newUser);
      console.log('addUser result:', result);
      
      if (result.success) {
        console.log('User added successfully');
        setNewUser({
          username: '',
          password: '',
          firstName: '',
          lastName: '',
          fullName: '',
          position: '',
          department: '',
          role: 'user'
        });
        setIsAddingUser(false);
        console.log('Refreshing user list...');
        fetchUsers(); // Refresh user list
      } else {
        console.error('Failed to add user with error:', result.error);
        throw new Error(result.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error in handleAddUser:', error);
      setError('Failed to add user: ' + error.message);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userData = {
        username: editingUser.username,
        password: editingUser.password,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        fullName: editingUser.fullName,
        position: editingUser.position,
        department: editingUser.department,
        role: editingUser.role
      };
      
      const result = await updateUser(editingUser.id, userData);
      
      if (result.success) {
        setEditingUser(null);
        fetchUsers(); // Refresh user list
      } else {
        throw new Error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user: ' + error.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const result = await deleteUser(userId);
      
      if (result.success) {
        fetchUsers(); // Refresh user list
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-100">
        <main className="container mx-auto px-4 pt-20 pb-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold">Users Management</h2>
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const result = await updateAllUsersNameFields();
                    if (result.success) {
                      fetchUsers();
                      alert('Successfully updated all users name fields!');
                    } else {
                      throw new Error(result.error);
                    }
                  } catch (error) {
                    console.error('Error updating user names:', error);
                    setError('Failed to update name fields: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Update All Names
              </button>
              <button
                onClick={() => setIsAddingUser(true)}
                className="bg-[#0ab4ab] text-white px-4 py-2 rounded-lg hover:bg-[#0ab4ab]/90"
              >
                Add New User
              </button>
            </div>
          </div>

          {/* Add User Form */}
          {isAddingUser && (
            <div className="mb-8 p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add New User</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newUser.firstName || ''}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        setNewUser({
                          ...newUser, 
                          firstName,
                          fullName: `${firstName} ${newUser.lastName || ''}`
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newUser.lastName || ''}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        setNewUser({
                          ...newUser, 
                          lastName, 
                          fullName: `${newUser.firstName || ''} ${lastName}`
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Ward6">Ward 6</option>
                      <option value="Ward7">Ward 7</option>
                      <option value="Ward8">Ward 8</option>
                      <option value="Ward9">Ward 9</option>
                      <option value="WardGI">Ward GI</option>
                      <option value="Ward10B">Ward 10B</option>
                      <option value="Ward11">Ward 11</option>
                      <option value="Ward12">Ward 12</option>
                      <option value="ICU">ICU</option>
                      <option value="CCU">CCU</option>
                      <option value="LR">LR</option>
                      <option value="NSY">NSY</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={newUser.position}
                      onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="">Select Position</option>
                      <option value="เจ้าหน้าที่พยาบาล">เจ้าหน้าที่พยาบาล</option>
                      <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                      <option value="หัวหน้าแผนก">หัวหน้าแผนก</option>
                      <option value="แพทย์">แพทย์</option>
                      <option value="ผู้ช่วยพยาบาล">ผู้ช่วยพยาบาล</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0ab4ab] text-white rounded-md hover:bg-[#0ab4ab]/90"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit User Form */}
          {editingUser && (
            <div className="mb-8 p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Edit User</h2>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.firstName || ''}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        setEditingUser({
                          ...editingUser, 
                          firstName,
                          fullName: `${firstName} ${editingUser.lastName || ''}`
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.lastName || ''}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        setEditingUser({
                          ...editingUser, 
                          lastName,
                          fullName: `${editingUser.firstName || ''} ${lastName}`
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.fullName || ''}
                      onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={editingUser.department}
                      onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Ward6">Ward 6</option>
                      <option value="Ward7">Ward 7</option>
                      <option value="Ward8">Ward 8</option>
                      <option value="Ward9">Ward 9</option>
                      <option value="WardGI">Ward GI</option>
                      <option value="Ward10B">Ward 10B</option>
                      <option value="Ward11">Ward 11</option>
                      <option value="Ward12">Ward 12</option>
                      <option value="ICU">ICU</option>
                      <option value="CCU">CCU</option>
                      <option value="LR">LR</option>
                      <option value="NSY">NSY</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={editingUser.position || ''}
                      onChange={(e) => setEditingUser({...editingUser, position: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="">Select Position</option>
                      <option value="เจ้าหน้าที่พยาบาล">เจ้าหน้าที่พยาบาล</option>
                      <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                      <option value="หัวหน้าแผนก">หัวหน้าแผนก</option>
                      <option value="แพทย์">แพทย์</option>
                      <option value="ผู้ช่วยพยาบาล">ผู้ช่วยพยาบาล</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={editingUser.password}
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab]"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0ab4ab] text-white rounded-md hover:bg-[#0ab4ab]/90"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated At
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.firstName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.position || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? (typeof user.createdAt === 'object' && user.createdAt.seconds ? 
                        new Date(user.createdAt.seconds * 1000).toLocaleString() : 
                        (typeof user.createdAt === 'string' ? new Date(user.createdAt).toLocaleString() : '-')) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.updatedAt ? (typeof user.updatedAt === 'object' && user.updatedAt.seconds ? 
                        new Date(user.updatedAt.seconds * 1000).toLocaleString() : 
                        (typeof user.updatedAt === 'string' ? new Date(user.updatedAt).toLocaleString() : '-')) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
