'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  limit 
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { toast } from 'react-hot-toast';
import { FiLoader, FiAlertTriangle, FiCalendar, FiList } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface WardData {
  id: string;
  ward: string;
  date: string;
  shift: 'morning' | 'night';
  patientCensus: number;
  nurseManager: number;
  rn: number;
  pn: number;
  wc: number;
  newAdmit: number;
  transferIn: number;
  referIn: number;
  transferOut: number;
  referOut: number;
  discharge: number;
  dead: number;
  available: number;
  unavailable: number;
  plannedDischarge: number;
  isApproved: boolean;
}

interface WardOptionProps {
  value: string;
  label: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wardData, setWardData] = useState<WardData[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOptionProps[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Load available wards
  useEffect(() => {
    const fetchWards = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const dataRef = collection(db, 'wardData');
        
        // Different query based on user role
        let q;
        if (user.role === 'admin') {
          // Admins see all wards
          q = query(
            dataRef,
            where('isApproved', '==', true),
            orderBy('ward')
          );
        } else {
          // Users only see their wards
          q = query(
            dataRef,
            where('ward', 'in', user.wards || []),
            where('isApproved', '==', true)
          );
        }
        
        const snapshot = await getDocs(q);
        const wards = new Set<string>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          wards.add(data.ward);
        });
        
        const options = Array.from(wards).map(ward => ({
          value: ward,
          label: ward
        }));
        
        setWardOptions(options);
        
        // Set default selected ward if available
        if (options.length > 0) {
          setSelectedWard(options[0].value);
        }
      } catch (error) {
        console.error('Error fetching wards:', error);
        toast.error('Error loading ward options');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWards();
  }, [user]);

  // Fetch ward data when ward selection changes
  useEffect(() => {
    const fetchWardData = async () => {
      if (!user || !selectedWard) return;
      
      try {
        setLoading(true);
        const dataRef = collection(db, 'wardData');
        
        // Create date objects for range
        const startDate = dateRange.start;
        const endDate = dateRange.end;
        
        // Query for the selected ward and date range
        const q = query(
          dataRef,
          where('ward', '==', selectedWard),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          where('isApproved', '==', true),
          orderBy('date'),
          orderBy('shift')
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WardData[];
        
        setWardData(data);
      } catch (error) {
        console.error('Error fetching ward data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWardData();
  }, [user, selectedWard, dateRange]);

  // Handle ward selection change
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWard(e.target.value);
  };

  // Handle date range change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
    setDateRange(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'daily' | 'weekly' | 'monthly') => {
    setViewMode(mode);
    
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    
    if (mode === 'daily') {
      // Last 7 days
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (mode === 'weekly') {
      // Last 4 weeks
      startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      // Last 3 months
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    setDateRange({
      start: startDate,
      end: endDate
    });
  };

  // Prepare data for patient census chart
  const patientCensusChartData = {
    labels: wardData.map(item => `${item.date} (${item.shift === 'morning' ? 'AM' : 'PM'})`),
    datasets: [
      {
        label: 'Patient Census',
        data: wardData.map(item => item.patientCensus),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  // Prepare data for staff distribution chart
  const staffDistributionChartData = {
    labels: ['Nurse Manager', 'RN', 'PN', 'WC'],
    datasets: wardData.length > 0 ? [
      {
        label: 'Latest Shift Staff Distribution',
        data: [
          wardData[wardData.length - 1].nurseManager,
          wardData[wardData.length - 1].rn,
          wardData[wardData.length - 1].pn,
          wardData[wardData.length - 1].wc,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ] : [],
  };

  // Prepare data for patient movement chart
  const patientMovementChartData = {
    labels: wardData.map(item => `${item.date} (${item.shift === 'morning' ? 'AM' : 'PM'})`),
    datasets: [
      {
        label: 'New Admit',
        data: wardData.map(item => item.newAdmit),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Transfer In',
        data: wardData.map(item => item.transferIn),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Refer In',
        data: wardData.map(item => item.referIn),
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
      },
      {
        label: 'Discharge',
        data: wardData.map(item => item.discharge),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'Transfer Out',
        data: wardData.map(item => item.transferOut),
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      },
      {
        label: 'Refer Out',
        data: wardData.map(item => item.referOut),
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
    ],
  };

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, router, loading]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white">
          <h1 className="text-2xl font-bold">Ward Data Dashboard</h1>
        </div>
        
        <div className="p-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label htmlFor="ward-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Ward
              </label>
              <select
                id="ward-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={selectedWard}
                onChange={handleWardChange}
                disabled={loading || wardOptions.length === 0}
              >
                {wardOptions.length === 0 ? (
                  <option value="">No wards available</option>
                ) : (
                  wardOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="start-date" className="sr-only">Start Date</label>
                  <input
                    type="date"
                    id="start-date"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={dateRange.start}
                    onChange={(e) => handleDateChange(e, 'start')}
                    max={dateRange.end}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="sr-only">End Date</label>
                  <input
                    type="date"
                    id="end-date"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={dateRange.end}
                    onChange={(e) => handleDateChange(e, 'end')}
                    min={dateRange.start}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Mode
              </label>
              <div className="flex space-x-2 mt-1">
                <button
                  type="button"
                  className={`px-3 py-2 text-xs font-medium rounded ${
                    viewMode === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleViewModeChange('daily')}
                >
                  <FiCalendar className="inline mr-1" />
                  Daily
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-xs font-medium rounded ${
                    viewMode === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleViewModeChange('weekly')}
                >
                  <FiCalendar className="inline mr-1" />
                  Weekly
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-xs font-medium rounded ${
                    viewMode === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleViewModeChange('monthly')}
                >
                  <FiCalendar className="inline mr-1" />
                  Monthly
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <FiLoader className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : wardData.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg text-center">
              <FiAlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">No data available</h3>
              <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                No approved ward data found for the selected ward and date range.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Patient Census Chart */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Patient Census Over Time
                </h2>
                <div className="h-80">
                  <Line 
                    data={patientCensusChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                    }}
                  />
                </div>
              </div>
              
              {/* Staff Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Latest Staff Distribution
                  </h2>
                  <div className="h-80">
                    <Pie 
                      data={staffDistributionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = (staffDistributionChartData.datasets[0]?.data || []).reduce((a, b) => (a as number) + (b as number), 0) as number;
                                const percentage = ((value as number) / total * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
                
                {/* Patient Statistics */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Latest Patient Statistics
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                      <p className="text-sm text-blue-600 dark:text-blue-300">Patient Census</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                        {wardData[wardData.length - 1]?.patientCensus || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                      <p className="text-sm text-green-600 dark:text-green-300">New Admits</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-200">
                        {wardData.reduce((sum, item) => sum + item.newAdmit, 0)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-300">in selected period</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-center">
                      <p className="text-sm text-red-600 dark:text-red-300">Discharges</p>
                      <p className="text-3xl font-bold text-red-700 dark:text-red-200">
                        {wardData.reduce((sum, item) => sum + item.discharge, 0)}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-300">in selected period</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg text-center">
                      <p className="text-sm text-purple-600 dark:text-purple-300">Available Beds</p>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">
                        {wardData[wardData.length - 1]?.available || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg text-center">
                      <p className="text-sm text-amber-600 dark:text-amber-300">Planned Discharges</p>
                      <p className="text-3xl font-bold text-amber-700 dark:text-amber-200">
                        {wardData[wardData.length - 1]?.plannedDischarge || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Staff</p>
                      <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                        {(
                          (wardData[wardData.length - 1]?.nurseManager || 0) +
                          (wardData[wardData.length - 1]?.rn || 0) +
                          (wardData[wardData.length - 1]?.pn || 0) +
                          (wardData[wardData.length - 1]?.wc || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Patient Movement Chart */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Patient Movement
                </h2>
                <div className="h-80">
                  <Bar 
                    data={patientMovementChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        },
                        x: {
                          ticks: {
                            maxRotation: 90,
                            minRotation: 45
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                    }}
                  />
                </div>
              </div>
              
              {/* Latest Records Table */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Latest Records
                </h2>
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
                          Census
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Staff
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          New Admits
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Discharges
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Show only the last 5 records */}
                      {wardData.slice(-5).reverse().map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.shift === 'morning' ? 'Morning' : 'Night'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.patientCensus}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.nurseManager + item.rn + item.pn + item.wc}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.newAdmit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.discharge}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Link to see all records */}
                <div className="mt-4 text-right">
                  <button 
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center justify-end ml-auto"
                    onClick={() => router.push('/approval')}
                  >
                    <FiList className="mr-1" />
                    View all records
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 