import { WARD_LIST, SHIFT_LIST, COMMON_STYLES } from '../../constants/dashboard';

export function FilterSection({ filters, setFilters, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, recorders, onExport }) {
    return (
        <div className={`${COMMON_STYLES.card} mb-4`}>
            <h2 className={COMMON_STYLES.title}>Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* View Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">View Type</label>
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
                        className="w-full text-black rounded-md border border-gray-300 p-2"
                    >
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                {/* Dynamic Date Filters */}
                {filters.viewType === 'daily' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        />
                    </div>
                )}

                {filters.viewType === 'monthly' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        />
                    </div>
                )}

                {filters.viewType === 'yearly' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        >
                            {Array.from(
                                { length: 10 },
                                (_, i) => new Date().getFullYear() - i
                            ).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Other Filters */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                    <select
                        value={filters.shift}
                        onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                        className="w-full text-black rounded-md border border-gray-300 p-2"
                    >
                        <option value="">All Shifts</option>
                        {SHIFT_LIST.map(shift => (
                            <option key={shift} value={shift}>{shift}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                    <select
                        value={filters.ward}
                        onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                        className="w-full text-black rounded-md border border-gray-300 p-2"
                    >
                        <option value="">All Wards</option>
                        {WARD_LIST.map(ward => (
                            <option key={ward} value={ward}>{ward}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recorder</label>
                    <select
                        value={filters.recorder}
                        onChange={(e) => setFilters(prev => ({ ...prev, recorder: e.target.value }))}
                        className="w-full text-black rounded-md border border-gray-300 p-2"
                    >
                        <option value="">All Recorders</option>
                        {recorders.map(recorder => (
                            <option key={recorder} value={recorder}>{recorder}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={onExport}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Export to Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
