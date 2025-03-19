                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${labelClass}`}>แผนก:</label>
                        <div className={`block w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                            {user?.department || 'ไม่ระบุแผนก'}
                        </div>
                    </div> 