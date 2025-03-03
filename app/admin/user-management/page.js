'use client';
import { useState, useEffect } from 'react';
import { getAllUsers, addUser, updateUser, deleteUser } from '../../lib/dataAccess';
import { useAuth } from '../../context/AuthContext';
import AuthGuard from '../../components/auth/AuthGuard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import Navigation from '../../components/common/Navigation';
import { useRouter } from 'next/navigation';

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-[#0ab4ab] py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => router.back()} 
                  className="bg-white text-[#0ab4ab] px-3 py-1 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <span className="mr-1">←</span> กลับ
                </button>
                <h1 className="text-2xl font-bold text-white">User Management</h1>
              </div>
              <div className="text-white">
                Admin: {currentUser?.username}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Add User Button */}
          <div className="mb-6">
            <button
              onClick={() => setIsAddingUser(true)}
              className="bg-[#0ab4ab] text-white px-4 py-2 rounded-lg hover:bg-[#0ab4ab]/90"
            >
              Add New User
            </button>
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
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
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
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
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
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
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
