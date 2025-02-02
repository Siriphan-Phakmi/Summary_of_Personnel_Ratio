import { WARD_LIST, SHIFT_LIST, COMMON_STYLES } from '../../constants/dashboard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaCheckCircle } from 'react-icons/fa';

export function FilterSection({ filters, setFilters, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, recorders, onExport, availableDates }) {
    const renderDayContents = (day, date) => {
        const formattedDate = date.toISOString().split('T')[0];
        const hasData = availableDates.includes(formattedDate);
        
        return (
            <div className="relative">
                <span className={`${hasData ? 'text-green-600' : 'text-gray-400'}`}>
                    {day}
                </span>
                {hasData && (
                    <FaCheckCircle 
                        className="absolute -top-1 -right-1 text-green-500 text-xs"
                    />
                )}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-6 rounded-xl shadow-lg mb-6">
            <h2 className="text-xl font-bold text-purple-600 mb-4">📅 ตัวกรองข้อมูล</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* View Type Filter */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-medium text-cyan-600 mb-2">View Type</label>
                    <select
                        value={filters.viewType}
                        onChange={(e) => {
                            const newViewType = e.target.value;
                            setFilters(prev => ({
                                ...prev,
                                viewType: newViewType,
                                date: newViewType === 'daily' ? new Date().toISOString().split('T')[0] : prev.date
                            }));
                        }}
                        className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                    >
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                {/* Dynamic Date Filters */}
                {filters.viewType === 'daily' && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                        <label className="block text-sm font-medium text-cyan-600 mb-2">Date</label>
                        <DatePicker
                            selected={new Date(filters.date)}
                            onChange={(date) => setFilters(prev => ({ 
                                ...prev, 
                                date: date.toISOString().split('T')[0] 
                            }))}
                            renderDayContents={renderDayContents}
                            className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                            dateFormat="yyyy-MM-dd"
                        />
                    </div>
                )}

                {filters.viewType === 'monthly' && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                        <label className="block text-sm font-medium text-cyan-600 mb-2">Month</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                        />
                    </div>
                )}

                {filters.viewType === 'yearly' && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                        <label className="block text-sm font-medium text-cyan-600 mb-2">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                        >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Shift Filter */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-medium text-cyan-600 mb-2">Shift</label>
                    <select
                        value={filters.shift}
                        onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                        className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                    >
                        <option value="All Shifts">All Shifts</option>
                        {SHIFT_LIST.map(shift => (
                            <option key={shift} value={shift}>{shift}</option>
                        ))}
                    </select>
                </div>

                {/* Ward Filter */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-medium text-cyan-600 mb-2">Ward</label>
                    <select
                        value={filters.ward}
                        onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                        className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                    >
                        <option value="All Wards">All Wards</option>
                        {WARD_LIST.map(ward => (
                            <option key={ward} value={ward}>{ward}</option>
                        ))}
                    </select>
                </div>

                {/* Recorder Filter */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-medium text-cyan-600 mb-2">Recorder</label>
                    <select
                        value={filters.recorder}
                        onChange={(e) => setFilters(prev => ({ ...prev, recorder: e.target.value }))}
                        className="w-full bg-white/90 border border-purple-200 rounded-md p-2 text-indigo-600 focus:ring-2 focus:ring-purple-300"
                    >
                        <option value="">All Recorders</option>
                        {recorders.map(recorder => (
                            <option key={recorder} value={recorder}>{recorder}</option>
                        ))}
                    </select>
                </div>

                {/* Export Button */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm flex items-end">
                    <button
                        onClick={onExport}
                        className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        Export Data
                    </button>
                </div>
            </div>
        </div>
    );
}
