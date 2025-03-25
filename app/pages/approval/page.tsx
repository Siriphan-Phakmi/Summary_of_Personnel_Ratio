'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiCheck, FiCheckCircle, FiClock, FiAlertCircle, FiLock } from 'react-icons/fi';

import { useAuth } from '@/app/contexts/AuthContext';
import Button from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import Input from '@/app/components/ui/Input';
import NumberInput from '@/app/components/wardForm/NumberInput';
import Loading from '@/app/components/ui/Loading';

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
  
  // Get approval status badge
  const getApprovalStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            <FiCheckCircle className="mr-1" />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
            <FiClock className="mr-1" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
            <FiAlertCircle className="mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };
  
  // Get shift badge
  const getShiftBadge = (shift: Shift) => {
    return shift === 'morning' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
        Morning
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100">
        Night
      </span>
    );
  };
  
  // If still loading auth, show loading spinner
  if (authLoading) {
    return <Loading fullScreen />;
  }
  
  // If user not logged in, don't render anything (redirect handled by useEffect)
  if (!user) {
    return null;
  }
  
  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Ward Form Approval
      </h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Date
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          />
        </div>
        
        {user.role === 'admin' && dailySummaryId && (
          <Button
            variant="primary"
            onClick={() => setShowDailySummaryModal(true)}
          >
            View Daily Summary
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loading />
        </div>
      ) : filteredWardForms.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 shadow rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No ward forms found for the selected date.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([wardId, forms]) => {
            const wardName = forms[0]?.wardName || 'Unknown Ward';
            
            // Sort forms by shift: morning first, then night
            const sortedForms = [...forms].sort((a, b) => {
              if (a.shift === 'morning' && b.shift === 'night') return -1;
              if (a.shift === 'night' && b.shift === 'morning') return 1;
              return 0;
            });
            
            return (
              <div key={wardId} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {wardName}
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedForms.map((form) => (
                    <div key={form.id} className="px-4 py-5 sm:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div className="mb-4 md:mb-0">
                          <div className="flex items-center mb-2">
                            {getShiftBadge(form.shift)}
                            <span className="ml-2">{getApprovalStatusBadge(form.approvalStatus)}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Census</p>
                              <p className="mt-1 text-lg text-gray-900 dark:text-white">{form.patientCensus}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nurse Manager</p>
                              <p className="mt-1 text-lg text-gray-900 dark:text-white">{form.nurseManager}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">RN</p>
                              <p className="mt-1 text-lg text-gray-900 dark:text-white">{form.rn}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">PN</p>
                              <p className="mt-1 text-lg text-gray-900 dark:text-white">{form.pn}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">WC</p>
                              <p className="mt-1 text-lg text-gray-900 dark:text-white">{form.wc}</p>
                            </div>
                          </div>
                          
                          {form.comment && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Comment</p>
                              <p className="mt-1 text-sm text-gray-900 dark:text-white">{form.comment}</p>
                            </div>
                          )}
                          
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recorded By</p>
                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                              {form.createdBy?.firstName} {form.createdBy?.lastName}
                            </p>
                          </div>
                          
                          {form.approvalStatus === 'approved' && form.approvedBy && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved By</p>
                              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                {form.approvedBy.firstName} {form.approvedBy.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {form.approvedBy?.timestamp && format(new Date(form.approvedBy.timestamp), 'PPpp')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {user.role === 'admin' && (
                          <div className="flex space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={FiEdit2}
                              onClick={() => handleEditClick(form)}
                              disabled={isSubmitting}
                            >
                              Edit
                            </Button>
                            
                            {form.approvalStatus === 'pending' && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={FiCheck}
                                onClick={() => handleApprovalClick(form)}
                                disabled={isSubmitting}
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Password verification modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
          setAdminPasswordError('');
        }}
        title="Admin Authentication"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPasswordModal(false);
                setAdminPassword('');
                setAdminPasswordError('');
              }}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={verifyAdminPassword}
              disabled={!adminPassword.trim()}
            >
              Verify
            </Button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Please enter your admin password to continue with the edit.
          </p>
          <Input
            id="adminPassword"
            type="password"
            label="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            error={adminPasswordError}
            placeholder="Enter your admin password"
          />
        </div>
      </Modal>
      
      {/* Edit form modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedForm(null);
          setEditFormData({});
        }}
        title={`Edit Ward Form - ${selectedForm?.wardName || ''}`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedForm(null);
                setEditFormData({});
              }}
              className="mr-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
              loading={isSubmitting}
            >
              Save Changes
            </Button>
          </>
        }
      >
        {selectedForm && (
          <div className="py-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput
                id="patientCensus"
                label="Patient Census"
                value={editFormData.patientCensus || 0}
                onChange={(value) => handleEditFormChange('patientCensus', value)}
              />
              
              <NumberInput
                id="nurseManager"
                label="Nurse Manager"
                value={editFormData.nurseManager || 0}
                onChange={(value) => handleEditFormChange('nurseManager', value)}
              />
              
              <NumberInput
                id="rn"
                label="RN"
                value={editFormData.rn || 0}
                onChange={(value) => handleEditFormChange('rn', value)}
              />
              
              <NumberInput
                id="pn"
                label="PN"
                value={editFormData.pn || 0}
                onChange={(value) => handleEditFormChange('pn', value)}
              />
              
              <NumberInput
                id="wc"
                label="WC"
                value={editFormData.wc || 0}
                onChange={(value) => handleEditFormChange('wc', value)}
              />
              
              <NumberInput
                id="newAdmit"
                label="New Admit"
                value={editFormData.newAdmit || 0}
                onChange={(value) => handleEditFormChange('newAdmit', value)}
              />
              
              <NumberInput
                id="transferIn"
                label="Transfer In"
                value={editFormData.transferIn || 0}
                onChange={(value) => handleEditFormChange('transferIn', value)}
              />
              
              <NumberInput
                id="referIn"
                label="Refer In"
                value={editFormData.referIn || 0}
                onChange={(value) => handleEditFormChange('referIn', value)}
              />
              
              <NumberInput
                id="transferOut"
                label="Transfer Out"
                value={editFormData.transferOut || 0}
                onChange={(value) => handleEditFormChange('transferOut', value)}
              />
              
              <NumberInput
                id="referOut"
                label="Refer Out"
                value={editFormData.referOut || 0}
                onChange={(value) => handleEditFormChange('referOut', value)}
              />
              
              <NumberInput
                id="discharge"
                label="Discharge"
                value={editFormData.discharge || 0}
                onChange={(value) => handleEditFormChange('discharge', value)}
              />
              
              <NumberInput
                id="dead"
                label="Dead"
                value={editFormData.dead || 0}
                onChange={(value) => handleEditFormChange('dead', value)}
              />
              
              <NumberInput
                id="available"
                label="Available"
                value={editFormData.available || 0}
                onChange={(value) => handleEditFormChange('available', value)}
              />
              
              <NumberInput
                id="unavailable"
                label="Unavailable"
                value={editFormData.unavailable || 0}
                onChange={(value) => handleEditFormChange('unavailable', value)}
              />
              
              <NumberInput
                id="plannedDischarge"
                label="Planned Discharge"
                value={editFormData.plannedDischarge || 0}
                onChange={(value) => handleEditFormChange('plannedDischarge', value)}
              />
            </div>
            
            <div>
              <Input
                id="comment"
                label="Comment"
                value={editFormData.comment || ''}
                onChange={(e) => handleEditFormChange('comment', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        )}
      </Modal>
      
      {/* Approval modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedForm(null);
          setSupervisorFirstName('');
          setSupervisorLastName('');
        }}
        title="Approve Ward Form"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowApprovalModal(false);
                setSelectedForm(null);
                setSupervisorFirstName('');
                setSupervisorLastName('');
              }}
              className="mr-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprovalSubmit}
              loading={isSubmitting}
              disabled={!supervisorFirstName.trim() || !supervisorLastName.trim()}
            >
              Approve
            </Button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You are about to approve the ward form for {selectedForm?.wardName} ({selectedForm?.shift} shift). Please enter your signature to continue.
          </p>
          
          <div className="space-y-4">
            <Input
              id="supervisorFirstName"
              label="First Name"
              value={supervisorFirstName}
              onChange={(e) => setSupervisorFirstName(e.target.value)}
              placeholder="Enter your first name"
            />
            
            <Input
              id="supervisorLastName"
              label="Last Name"
              value={supervisorLastName}
              onChange={(e) => setSupervisorLastName(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>
      </Modal>
      
      {/* Daily summary modal */}
      <Modal
        isOpen={showDailySummaryModal}
        onClose={() => {
          if (!dailySummaryId) {
            setShowDailySummaryModal(false);
          }
        }}
        title="24-Hour Summary"
        size="md"
        footer={
          <>
            {!dailySummaryId && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowDailySummaryModal(false)}
                  className="mr-2"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDailySummarySubmit}
                  loading={isSubmitting}
                  disabled={
                    !supervisorFirstName.trim() || 
                    !supervisorLastName.trim()
                  }
                >
                  Save Summary
                </Button>
              </>
            )}
            
            {dailySummaryId && (
              <Button
                variant="primary"
                onClick={() => setShowDailySummaryModal(false)}
              >
                Close
              </Button>
            )}
          </>
        }
      >
        <div className="py-2">
          {!dailySummaryId && (
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              All ward forms for today have been approved. Please enter the 24-hour summary data.
            </p>
          )}
          
          <div className="space-y-4">
            <NumberInput
              id="opd24hr"
              label="OPD 24hr"
              value={dailySummaryData.opd24hr || 0}
              onChange={(value) => handleDailySummaryChange('opd24hr', value)}
              disabled={!!dailySummaryId}
            />
            
            <NumberInput
              id="oldPatient"
              label="Old Patient"
              value={dailySummaryData.oldPatient || 0}
              onChange={(value) => handleDailySummaryChange('oldPatient', value)}
              disabled={!!dailySummaryId}
            />
            
            <NumberInput
              id="newPatient"
              label="New Patient"
              value={dailySummaryData.newPatient || 0}
              onChange={(value) => handleDailySummaryChange('newPatient', value)}
              disabled={!!dailySummaryId}
            />
            
            <NumberInput
              id="admit24hr"
              label="Admit 24hr"
              value={dailySummaryData.admit24hr || 0}
              onChange={(value) => handleDailySummaryChange('admit24hr', value)}
              disabled={!!dailySummaryId}
            />
            
            {!dailySummaryId && (
              <>
                <Input
                  id="supervisorFirstName"
                  label="Supervisor First Name"
                  value={supervisorFirstName}
                  onChange={(e) => setSupervisorFirstName(e.target.value)}
                  placeholder="Enter first name"
                  disabled={!!dailySummaryId}
                />
                
                <Input
                  id="supervisorLastName"
                  label="Supervisor Last Name"
                  value={supervisorLastName}
                  onChange={(e) => setSupervisorLastName(e.target.value)}
                  placeholder="Enter last name"
                  disabled={!!dailySummaryId}
                />
              </>
            )}
            
            {dailySummaryId && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Supervisor Signature</p>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {supervisorFirstName} {supervisorLastName}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
} 