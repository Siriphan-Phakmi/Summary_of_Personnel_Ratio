'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import LoadingScreen from '../../ui/LoadingScreen';
import { Swal } from '../../../utils/alertService';
import { formatThaiDate, getThaiDateNow, getUTCDateString } from '../../../utils/dateUtils';
import { getCurrentShift } from '../../../utils/dateHelpers';
import Calendar from '../../ui/Calendar';
import FormDateShiftSelector from '../../common/FormDateShiftSelector';
import { useAuth } from '../../../context/AuthContext';
import { logEvent } from '../../../utils/clientLogging';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

// Import components and functions from submodules
import {
    fetchDatesWithData,
    fetchPreviousShiftData,
    fetchApprovalData,
    fetchLatestRecord,
    checkApprovalStatus,
    safeFetchWardData,
    handleInputChange,
    handleShiftChange,
    handleDateSelect,
    handleBeforeUnload,
    handleWardFormSubmit,
    calculateTotal,
    ApprovalDataButton,
    LatestRecordButton,
    checkPast30DaysRecords,
    fetchWardData,
    parseInputValue,
    navigateToCreateIndex,
    MainFormContent
} from './index';

import { 
    checkLast7DaysData,
    saveWardDataDraft,
    getUserDrafts,
    getLatestDraft,
    deleteWardDataDraft
} from '../../../lib/dataAccess';

import ApprovalStatusIndicator from '../../common/ApprovalStatusIndicator';

const WardForm = ({ wardId }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    
    // State variables
    const [formVisible, setFormVisible] = useState(false);
    const [selectedWard, setSelectedWard] = useState(wardId || '');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState(getCurrentShift());
    const [thaiDate, setThaiDate] = useState(getThaiDateNow());
    const [showCalendar, setShowCalendar] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [previousShiftData, setPreviousShiftData] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null);
    const [latestRecordDate, setLatestRecordDate] = useState(null);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shiftStatus, setShiftStatus] = useState(null);
    const [approvalPending, setApprovalPending] = useState(false);
    const [supervisorApproved, setSupervisorApproved] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [originalData, setOriginalData] = useState(null);
    
    const [formData, setFormData] = useState({
        patientCensus: '',
        overallData: '',
        newAdmit: '',
        transferIn: '',
        referIn: '',
        transferOut: '',
        referOut: '',
        discharge: '',
        dead: '',
        rns: '',
        pns: '',
        nas: '',
        aides: '',
        studentNurses: '',
        notes: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        isDraft: false
    });

    // Initialize data when component mounts
    useEffect(() => {
        const initializeData = async () => {
            if (!selectedWard || !selectedDate) return;
            
            setIsLoading(true);
            try {
                // Fetch dates with data
                const dates = await fetchDatesWithData(selectedWard);
                setDatesWithData(dates);

                // Check approval status
                const status = await checkApprovalStatus(selectedDate, selectedWard);
                setApprovalStatus(status);
                setApprovalPending(status === 'pending');
                setSupervisorApproved(status === 'approved');

                // Fetch ward data
                const data = await fetchWardData(selectedDate, selectedWard, selectedShift);
                if (data) {
                    setFormData(data);
                    setOriginalData(data);
                    setHasUnsavedChanges(false);
                }

            } catch (error) {
                console.error('Error initializing data:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to initialize data',
                    icon: 'error',
                    confirmButtonColor: '#0ab4ab'
                });
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [selectedWard, selectedDate, selectedShift, user]);

    // Handle local date select
    const handleLocalDateSelect = async (date) => {
        setSelectedDate(date);
        setThaiDate(formatThaiDate(date));
    };

    // Handle save draft
    const onSaveDraft = async () => {
        if (!user?.uid) {
            Swal.fire({
                title: 'Error',
                text: 'You must be logged in to save drafts',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await saveWardDataDraft({
                ...formData,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                userId: user.uid
            });

            if (result.success) {
                setIsDraftMode(true);
                setHasUnsavedChanges(false);
                Swal.fire({
                    title: 'Success',
                    text: 'Draft saved successfully',
                    icon: 'success',
                    confirmButtonColor: '#0ab4ab'
                });
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to save draft',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle submit
    const onSubmit = async () => {
        if (!user?.uid) {
            Swal.fire({
                title: 'Error',
                text: 'You must be logged in to submit',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const docId = `${selectedWard}_${format(selectedDate, 'yyyyMMdd')}_${selectedShift}`;
            const docRef = doc(db, 'wardDataFinal', docId);
            
            await setDoc(docRef, {
                ...formData,
                wardId: selectedWard,
                date: format(selectedDate, 'yyyy-MM-dd'),
                shift: selectedShift,
                timestamp: serverTimestamp(),
                userId: user.uid,
                userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            });

            setHasUnsavedChanges(false);
            setIsDraftMode(false);

            Swal.fire({
                title: 'Success',
                text: 'Data submitted successfully',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
        } catch (error) {
            console.error('Error submitting:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to submit data',
                icon: 'error',
                confirmButtonColor: '#0ab4ab'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // เพิ่มฟังก์ชัน handleShiftChange ที่นี่แทนการ import
    const handleLocalShiftChange = (shift) => {
        if (typeof setSelectedShift === 'function') {
            setSelectedShift(shift);
        } else {
            console.warn('handleShiftChange: setSelectedShift is not a function', setSelectedShift);
        }
    };

    return (
        <MainFormContent
            isLoading={isLoading}
            selectedDate={selectedDate}
            selectedShift={selectedShift}
            selectedWard={selectedWard}
            formData={formData}
            setFormData={setFormData}
            handleLocalDateSelect={handleLocalDateSelect}
            handleShiftChange={handleLocalShiftChange}
            thaiDate={thaiDate}
            setThaiDate={setThaiDate}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            datesWithData={datesWithData}
            theme={theme}
            approvalStatus={approvalStatus}
            setHasUnsavedChanges={setHasUnsavedChanges}
            onSaveDraft={onSaveDraft}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
        />
    );
};

export default WardForm; 