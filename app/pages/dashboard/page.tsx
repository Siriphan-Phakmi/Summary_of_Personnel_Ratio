'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { FiCalendar, FiFilter, FiDownload, FiBarChart2 } from 'react-icons/fi';

import { useAuth } from '@/app/contexts/AuthContext';
import { WardFormData, Ward, Shift } from '@/app/types/ward';
import { getAllWards } from '@/app/services/ward/ward.service';
import { getWardForms } from '@/app/services/ward/ward-form.service';
import Loading from '@/app/components/ui/Loading';
import Button from '@/app/components/ui/Button';
import DatePicker from '@/app/components/wardForm/DatePicker';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardForms, setWardForms] = useState<WardFormData[]>([]);
  const [filteredWardForms, setFilteredWardForms] = useState<WardFormData[]>([]);
  
  // Filters
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | 'all'>('all');
  
  // Chart data
  const [showComparison, setShowComparison] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch wards on initial load
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const wardsData = await getAllWards();
        setWards(wardsData);
        
        // Set default ward selection (admin sees all, user sees their ward)
        if (user?.role === 'admin') {
          setSelectedWardId('all');
        } else if (user && wardsData.length > 0) {
          // For regular users, select their assigned ward if available
          const userWard = wardsData.find(w => user.wards?.includes(w.id));
          if (userWard) {
            setSelectedWardId(userWard.id);
          } else {
            setSelectedWardId(wardsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching wards:', error);
      }
    };

    if (user) {
      fetchWards();
    }
  }, [user]);

  // Fetch ward forms when filters change
  useEffect(() => {
    const fetchWardForms = async () => {
      if (!user || !selectedWardId) return;
      
      try {
        setIsLoading(true);
        
        // Calculate date range based on selected time frame
        let startDate = '';
        const endDate = format(selectedDate, 'yyyy-MM-dd');
        
        switch (timeFrame) {
          case 'day':
            startDate = endDate;
            break;
          case 'week':
            startDate = format(subDays(selectedDate, 6), 'yyyy-MM-dd');
            break;
          case 'month':
            startDate = format(subMonths(selectedDate, 1), 'yyyy-MM-dd');
            break;
          case 'year':
            startDate = format(subYears(selectedDate, 1), 'yyyy-MM-dd');
            break;
        }
        
        // Build filters
        const filters = {
          startDate,
          endDate,
          ...(selectedWardId !== 'all' && { wardId: selectedWardId }),
          ...(selectedShift !== 'all' && { shift: selectedShift }),
        };
        
        // Fetch data
        const forms = await getWardForms(filters);
        
        // If user is not admin, filter to only show their wards
        let filteredForms = forms;
        if (user.role !== 'admin' && user.wards) {
          filteredForms = forms.filter(form => user.wards?.includes(form.wardId));
        }
        
        setWardForms(filteredForms);
        setFilteredWardForms(filteredForms);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching ward forms:', error);
        setIsLoading(false);
      }
    };

    fetchWardForms();
  }, [user, selectedWardId, timeFrame, selectedDate, selectedShift]);

  // Handle ward change
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWardId(e.target.value);
  };

  // Handle time frame change
  const handleTimeFrameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeFrame(e.target.value as 'day' | 'week' | 'month' | 'year');
  };

  // Handle shift change
  const handleShiftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedShift(e.target.value as Shift | 'all');
  };

  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Toggle comparison view
  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!filteredWardForms.length) return null;
    
    return {
      totalPatients: filteredWardForms.reduce((sum, form) => sum + (form.patientCensus || 0), 0),
      avgPatients: Math.round(filteredWardForms.reduce((sum, form) => sum + (form.patientCensus || 0), 0) / filteredWardForms.length),
      totalAdmits: filteredWardForms.reduce((sum, form) => sum + (form.newAdmit || 0), 0),
      totalDischarges: filteredWardForms.reduce((sum, form) => sum + (form.discharge || 0), 0),
      totalDeaths: filteredWardForms.reduce((sum, form) => sum + (form.dead || 0), 0),
      avgStaffing: {
        nurseManager: Math.round(filteredWardForms.reduce((sum, form) => sum + (form.nurseManager || 0), 0) / filteredWardForms.length * 10) / 10,
        rn: Math.round(filteredWardForms.reduce((sum, form) => sum + (form.rn || 0), 0) / filteredWardForms.length * 10) / 10,
        pn: Math.round(filteredWardForms.reduce((sum, form) => sum + (form.pn || 0), 0) / filteredWardForms.length * 10) / 10,
        wc: Math.round(filteredWardForms.reduce((sum, form) => sum + (form.wc || 0), 0) / filteredWardForms.length * 10) / 10,
      }
    };
  };

  // Export data as CSV
  const exportData = () => {
    if (!filteredWardForms.length) return;
    
    // Create CSV header row
    const headers = [
      'Date', 'Shift', 'Ward', 'Patient Census', 
      'Nurse Manager', 'RN', 'PN', 'WC',
      'New Admit', 'Transfer In', 'Refer In',
      'Transfer Out', 'Refer Out', 'Discharge', 'Dead',
      'Available', 'Unavailable', 'Planned Discharge',
      'Approval Status'
    ].join(',');
    
    // Create CSV data rows
    const rows = filteredWardForms.map(form => {
      return [
        form.date,
        form.shift,
        form.wardName,
        form.patientCensus,
        form.nurseManager,
        form.rn,
        form.pn,
        form.wc,
        form.newAdmit,
        form.transferIn,
        form.referIn,
        form.transferOut,
        form.referOut,
        form.discharge,
        form.dead,
        form.available,
        form.unavailable,
        form.plannedDischarge,
        form.approvalStatus
      ].join(',');
    });
    
    // Combine header and rows
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ward-data-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render loading state
  if (authLoading) {
    return <Loading fullScreen />;
  }

  // Render if not authenticated (redirect is handled in useEffect)
  if (!user) {
    return null;
  }

  // Calculate summary data
  const summary = calculateSummary();

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ward
            </label>
            <select
              value={selectedWardId}
              onChange={handleWardChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
            >
              {user?.role === 'admin' && <option value="all">All Wards</option>}
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Frame
            </label>
            <select
              value={timeFrame}
              onChange={handleTimeFrameChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
            >
              <option value="day">1 Day</option>
              <option value="week">7 Days</option>
              <option value="month">30 Days</option>
              <option value="year">1 Year</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shift
            </label>
            <select
              value={selectedShift}
              onChange={handleShiftChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning Shift</option>
              <option value="night">Night Shift</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              disabled={false}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            variant="secondary"
            icon={FiBarChart2}
            onClick={toggleComparison}
          >
            {showComparison ? 'Hide Comparison' : 'Show Comparison'}
          </Button>
          
          <Button
            variant="secondary"
            icon={FiDownload}
            onClick={exportData}
            disabled={!filteredWardForms.length}
          >
            Export Data
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loading />
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Patient Census</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalPatients}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg: {summary.avgPatients} per shift</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Movement</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalAdmits} Admits</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{summary.totalDischarges} Discharges, {summary.totalDeaths} Deaths</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Staffing</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">RN: {summary.avgStaffing.rn}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">PN: {summary.avgStaffing.pn}, WC: {summary.avgStaffing.wc}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Forms Submitted</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredWardForms.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredWardForms.filter(f => f.approvalStatus === 'approved').length} Approved
                </p>
              </div>
            </div>
          )}
          
          {/* Ward Data Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Shift
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ward
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Patient Census
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Staffing
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Admits
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Discharges
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWardForms.length > 0 ? (
                    filteredWardForms.map((form, index) => (
                      <tr key={form.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.shift === 'morning' ? 'Morning' : 'Night'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.wardName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.patientCensus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          RN: {form.rn}, PN: {form.pn}, WC: {form.wc}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.newAdmit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {form.discharge}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            form.approvalStatus === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : form.approvalStatus === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {form.approvalStatus.charAt(0).toUpperCase() + form.approvalStatus.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No data available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Comparison View (shown conditionally) */}
          {showComparison && summary && (
            <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Shift Comparison</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Morning Shift */}
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-md font-medium text-blue-600 dark:text-blue-400 mb-3">Morning Shift</h3>
                  
                  {/* Filter for morning shift data */}
                  {(() => {
                    const morningForms = filteredWardForms.filter(form => form.shift === 'morning');
                    
                    if (morningForms.length === 0) {
                      return <p className="text-gray-500 dark:text-gray-400">No data available</p>;
                    }
                    
                    const avgPatients = Math.round(morningForms.reduce((sum, form) => sum + (form.patientCensus || 0), 0) / morningForms.length);
                    const avgRN = Math.round(morningForms.reduce((sum, form) => sum + (form.rn || 0), 0) / morningForms.length * 10) / 10;
                    const avgPN = Math.round(morningForms.reduce((sum, form) => sum + (form.pn || 0), 0) / morningForms.length * 10) / 10;
                    const avgWC = Math.round(morningForms.reduce((sum, form) => sum + (form.wc || 0), 0) / morningForms.length * 10) / 10;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. Patients:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgPatients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. RN:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgRN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. PN:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgPN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. WC:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgWC}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Patient:RN Ratio:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {avgRN > 0 ? `${Math.round(avgPatients / avgRN * 10) / 10}:1` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Night Shift */}
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-md font-medium text-indigo-600 dark:text-indigo-400 mb-3">Night Shift</h3>
                  
                  {/* Filter for night shift data */}
                  {(() => {
                    const nightForms = filteredWardForms.filter(form => form.shift === 'night');
                    
                    if (nightForms.length === 0) {
                      return <p className="text-gray-500 dark:text-gray-400">No data available</p>;
                    }
                    
                    const avgPatients = Math.round(nightForms.reduce((sum, form) => sum + (form.patientCensus || 0), 0) / nightForms.length);
                    const avgRN = Math.round(nightForms.reduce((sum, form) => sum + (form.rn || 0), 0) / nightForms.length * 10) / 10;
                    const avgPN = Math.round(nightForms.reduce((sum, form) => sum + (form.pn || 0), 0) / nightForms.length * 10) / 10;
                    const avgWC = Math.round(nightForms.reduce((sum, form) => sum + (form.wc || 0), 0) / nightForms.length * 10) / 10;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. Patients:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgPatients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. RN:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgRN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. PN:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgPN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Avg. WC:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{avgWC}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Patient:RN Ratio:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {avgRN > 0 ? `${Math.round(avgPatients / avgRN * 10) / 10}:1` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 