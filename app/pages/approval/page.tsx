'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiCheck, FiCheckCircle, FiClock, FiAlertCircle, FiLock } from 'react-icons/fi';

import { useAuth } from '@/app/contexts/AuthContext';
import Button from '@/app/components/ui/Button';
import Loading from '@/app/components/ui/Loading';

// Import our components
import ApprovalStatusBadge from './components/ApprovalStatusBadge';
import ShiftBadge from './components/ShiftBadge';
import ApprovalFormEditor from './components/ApprovalFormEditor';
import ApprovalForm from './components/ApprovalForm';
import DailySummaryForm from './components/DailySummaryForm';
import PasswordVerificationModal from './components/PasswordVerificationModal';

import { 
  WardFormData, 
  DailySummary,
  Shift,
  ApprovalStatus
} from '@/app/types/ward';
import { 
  getWardForms, 
  updateWardFormApprovalStatus, 
  editWardFormByAdmin,
  saveDailySummary,
  getDailySummaryByDate
} from '@/app/services/ward';

export default function ApprovalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // State for approvals data
  const [isLoading, setIsLoading] = useState(true);
  const [wardForms, setWardForms] = useState<WardFormData[]>([]);
  const [filteredWardForms, setFilteredWardForms] = useState<WardFormData[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [grouped, setGrouped] = useState<Record<string, WardFormData[]>>({});
  
  // State for edit and approval modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<WardFormData | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [editFormData, setEditFormData] = useState<Partial<WardFormData>>({});
  const [supervisorFirstName, setSupervisorFirstName] = useState('');
  const [supervisorLastName, setSupervisorLastName] = useState('');
  
  // State for daily summary data
  const [dailySummaryId, setDailySummaryId] = useState<string | null>(null);
  const [dailySummaryData, setDailySummaryData] = useState<Partial<DailySummary>>({
    opd24hr: 0,
    oldPatient: 0,
    newPatient: 0,
    admit24hr: 0,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  // Load approval data
  useEffect(() => {
    const loadApprovalData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get ward forms for selected date
        const forms = await getWardForms({
          startDate: selectedDate,
          endDate: selectedDate,
        });
        
        setWardForms(forms);
        
        // Filter forms based on user role
        if (user && user.role === 'admin') {
          setFilteredWardForms(forms);
        } else {
          // Regular users only see their assigned wards
          // You would need to implement a user-ward relationship to make this work properly
          const userWardForms = forms.filter(form => {
            // For now, let's assume users can only see forms they created
            return form.createdBy?.uid === user.uid;
          });
          setFilteredWardForms(userWardForms);
        }
        
        // Get daily summary if it exists
        const summary = await getDailySummaryByDate(selectedDate);
        if (summary) {
          setDailySummaryId(summary.id || null);
          setDailySummaryData({
            opd24hr: summary.opd24hr,
            oldPatient: summary.oldPatient,
            newPatient: summary.newPatient,
            admit24hr: summary.admit24hr,
          });
          
          // Pre-fill supervisor name
          setSupervisorFirstName(summary.supervisorSignature?.firstName || '');
          setSupervisorLastName(summary.supervisorSignature?.lastName || '');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading approval data:', error);
        toast.error('Error loading approval data');
        setIsLoading(false);
      }
    };
    
    loadApprovalData();
  }, [user, selectedDate]);
  
  // Group ward forms by ward ID
  useEffect(() => {
    if (filteredWardForms.length > 0) {
      const groupedByWard = filteredWardForms.reduce((acc, form) => {
        if (!acc[form.wardId]) {
          acc[form.wardId] = [];
        }
        acc[form.wardId].push(form);
        return acc;
      }, {} as Record<string, WardFormData[]>);
      
      setGrouped(groupedByWard);
      
      // Check if all forms are approved to prompt for daily summary
      const allApproved = filteredWardForms.every(form => form.approvalStatus === 'approved');
      const hasAllShifts = Object.keys(groupedByWard).every(wardId => {
        const wardForms = groupedByWard[wardId];
        return wardForms.some(f => f.shift === 'morning') && wardForms.some(f => f.shift === 'night');
      });
      
      if (allApproved && hasAllShifts && user?.role === 'admin' && !dailySummaryId) {
        setShowDailySummaryModal(true);
      }
    }
  }, [filteredWardForms, dailySummaryId, user]);
  
  // Handle edit button click
  const handleEditClick = (form: WardFormData) => {
    setSelectedForm(form);
    setEditFormData({
      patientCensus: form.patientCensus,
      nurseManager: form.nurseManager,
      rn: form.rn,
      pn: form.pn,
      wc: form.wc,
      newAdmit: form.newAdmit,
      transferIn: form.transferIn,
      referIn: form.referIn,
      transferOut: form.transferOut,
      referOut: form.referOut,
      discharge: form.discharge,
      dead: form.dead,
      available: form.available,
      unavailable: form.unavailable,
      plannedDischarge: form.plannedDischarge,
      comment: form.comment || '',
    });
    setShowPasswordModal(true);
  };
  
  // Verify admin password
  const verifyAdminPassword = () => {
    // In a real application, you would verify this password against your authentication system
    // This is just a placeholder for demonstration
    const correctPassword = 'admin123'; // This should be replaced with actual verification
    
    if (adminPassword === correctPassword) {
      setShowPasswordModal(false);
      setAdminPassword('');
      setAdminPasswordError('');
      setShowEditModal(true);
    } else {
      setAdminPasswordError('Incorrect password');
    }
  };
  
  // Handle approval button click
  const handleApprovalClick = (form: WardFormData) => {
    setSelectedForm(form);
    // Pre-fill supervisor name with user's name if available
    if (user) {
      setSupervisorFirstName(user.firstName || '');
      setSupervisorLastName(user.lastName || '');
    }
    setShowApprovalModal(true);
  };
  
  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!selectedForm || !user) return;
    
    try {
      setIsSubmitting(true);
      
      const updatedForms = wardForms.map(form => 
        form.id === selectedForm.id 
          ? { ...form, ...editFormData } 
          : form
      );
      
      await editWardFormByAdmin(
        selectedForm.id!,
        editFormData,
        user.uid,
        `${user.firstName || ''} ${user.lastName || 'Admin'}`
      );
      
      toast.success('Form updated successfully');
      
      setWardForms(updatedForms);
      setFilteredWardForms(
        user.role === 'admin' 
          ? updatedForms 
          : updatedForms.filter(f => f.createdBy?.uid === user.uid)
      );
      
      setShowEditModal(false);
      setSelectedForm(null);
      setEditFormData({});
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Error updating form');
      setIsSubmitting(false);
    }
  };
  
  // Handle approval form submission
  const handleApprovalSubmit = async () => {
    if (!selectedForm || !user) return;
    
    if (!supervisorFirstName.trim() || !supervisorLastName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const updatedForms = wardForms.map(form => 
        form.id === selectedForm.id 
          ? { 
              ...form, 
              approvalStatus: 'approved' as ApprovalStatus,
              approvedBy: {
                uid: user.uid,
                firstName: supervisorFirstName.trim(),
                lastName: supervisorLastName.trim(),
                email: user.email || '',
                timestamp: Date.now(),
              }
            } 
          : form
      );
      
      await updateWardFormApprovalStatus(
        selectedForm.id || '',
        'approved' as ApprovalStatus,
        {
          uid: user.uid,
          firstName: supervisorFirstName.trim(),
          lastName: supervisorLastName.trim(),
          email: user.email || '',
        }
      );
      
      toast.success('Form approved successfully');
      
      setWardForms(updatedForms);
      setFilteredWardForms(
        user.role === 'admin' 
          ? updatedForms 
          : updatedForms.filter(f => f.createdBy?.uid === user.uid)
      );
      
      // Check if all forms are approved to prompt for daily summary
      const allApproved = updatedForms.every(form => 
        form.approvalStatus === 'approved' || form.id === selectedForm.id
      );
      
      const hasAllShifts = Object.values(grouped).every(wardForms => {
        return wardForms.some(f => f.shift === 'morning') && wardForms.some(f => f.shift === 'night');
      });
      
      if (allApproved && hasAllShifts && user.role === 'admin' && !dailySummaryId) {
        setShowDailySummaryModal(true);
      }
      
      setShowApprovalModal(false);
      setSelectedForm(null);
      setSupervisorFirstName('');
      setSupervisorLastName('');
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error approving form:', error);
      toast.error('Error approving form');
      setIsSubmitting(false);
    }
  };
  
  // Handle daily summary submission
  const handleDailySummarySubmit = async () => {
    if (!user) return;
    
    if (!supervisorFirstName.trim() || !supervisorLastName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const summaryData: DailySummary = {
        date: selectedDate,
        opd24hr: dailySummaryData.opd24hr || 0,
        oldPatient: dailySummaryData.oldPatient || 0,
        newPatient: dailySummaryData.newPatient || 0,
        admit24hr: dailySummaryData.admit24hr || 0,
        supervisorSignature: {
          firstName: supervisorFirstName.trim(),
          lastName: supervisorLastName.trim(),
          uid: user.uid,
        },
        createdAt: Date.now(),
      };
      
      const summaryId = await saveDailySummary(summaryData, dailySummaryId || undefined);
      
      setDailySummaryId(summaryId);
      toast.success('Daily summary saved successfully');
      
      setShowDailySummaryModal(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error saving daily summary:', error);
      toast.error('Error saving daily summary');
      setIsSubmitting(false);
    }
  };
  
  // Handle form input change
  const handleEditFormChange = (field: keyof WardFormData, value: number | string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle daily summary input change
  const handleDailySummaryChange = (field: keyof DailySummary, value: number) => {
    setDailySummaryData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // If still loading auth, show loading spinner
  if (authLoading) {
    return <Loading fullScreen />;
  }
  
  // If user not logged in, don't render anything (redirect handled by useEffect)
  if (!user) {
    return null;
  }
  
  // If user doesn't have admin role, show restricted access message
  if (user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-lg text-center">
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">Restricted Access</h1>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access this page. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto pb-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Form Approval
      </h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Approval Dashboard
          </h2>
          
          <div className="w-full md:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loading />
          </div>
        ) : filteredWardForms.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              No forms available for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([wardId, forms]) => (
              <div key={wardId} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 font-medium">
                  {forms[0]?.wardName || 'Unknown Ward'}
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {forms.map((form) => (
                    <div key={form.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <ShiftBadge shift={form.shift} />
                            <ApprovalStatusBadge status={form.approvalStatus} />
                          </div>
                          
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Submitted by: {form.firstName} {form.lastName}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {form.approvalStatus === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApprovalClick(form)}
                                icon={FiCheck}
                              >
                                Approve
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditClick(form)}
                                icon={FiEdit2}
                              >
                                Edit
                              </Button>
                            </>
                          )}
                          
                          {form.approvalStatus === 'approved' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEditClick(form)}
                              icon={FiEdit2}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Patient Census:</span>
                          <span className="ml-1 font-medium">{form.patientCensus}</span>
                        </div>
                        
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">RN:</span>
                          <span className="ml-1 font-medium">{form.rn}</span>
                        </div>
                        
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">PN:</span>
                          <span className="ml-1 font-medium">{form.pn}</span>
                        </div>
                        
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">WC:</span>
                          <span className="ml-1 font-medium">{form.wc}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Daily summary section */}
      {user.role === 'admin' && dailySummaryId && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Daily Summary
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">OPD 24hr</div>
              <div className="font-semibold text-xl">{dailySummaryData.opd24hr || 0}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Old Patients</div>
              <div className="font-semibold text-xl">{dailySummaryData.oldPatient || 0}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">New Patients</div>
              <div className="font-semibold text-xl">{dailySummaryData.newPatient || 0}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Admit 24hr</div>
              <div className="font-semibold text-xl">{dailySummaryData.admit24hr || 0}</div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Approved by: {supervisorFirstName} {supervisorLastName}
          </div>
        </div>
      )}
      
      {/* Use our component-based modals */}
      <PasswordVerificationModal
        showPasswordModal={showPasswordModal}
        setShowPasswordModal={setShowPasswordModal}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        adminPasswordError={adminPasswordError}
        verifyAdminPassword={verifyAdminPassword}
      />
      
      <ApprovalFormEditor
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        selectedForm={selectedForm}
        editFormData={editFormData}
        handleEditFormChange={handleEditFormChange}
        handleEditSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
      />
      
      <ApprovalForm
        showApprovalModal={showApprovalModal}
        setShowApprovalModal={setShowApprovalModal}
        selectedForm={selectedForm}
        supervisorFirstName={supervisorFirstName}
        setSupervisorFirstName={setSupervisorFirstName}
        supervisorLastName={supervisorLastName}
        setSupervisorLastName={setSupervisorLastName}
        handleApprovalSubmit={handleApprovalSubmit}
        isSubmitting={isSubmitting}
      />
      
      <DailySummaryForm
        showDailySummaryModal={showDailySummaryModal}
        setShowDailySummaryModal={setShowDailySummaryModal}
        dailySummaryData={dailySummaryData}
        handleDailySummaryChange={handleDailySummaryChange}
        supervisorFirstName={supervisorFirstName}
        setSupervisorFirstName={setSupervisorFirstName}
        supervisorLastName={supervisorLastName}
        setSupervisorLastName={setSupervisorLastName}
        handleDailySummarySubmit={handleDailySummarySubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
} 