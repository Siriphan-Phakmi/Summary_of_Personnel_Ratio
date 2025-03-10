'use client';
import { collection, addDoc, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';

export const parseInputValue = (value) => {
    if (value === '' || value === null || value === undefined) return '0';
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? '0' : parsed.toString();
};

export const calculateTotal = (data) => {
    if (!data) return '0';
    let total = 0;
    
    // Calculate total from patient census data
    const patientCensus = parseInt(data.patientCensus || '0', 10);
    if (!isNaN(patientCensus)) {
        total += patientCensus;
    }
    
    return total.toString();
};

export const handleWardFormSubmit = async (e, formData, selectedWard, selectedDate, selectedShift, user) => {
    e.preventDefault();
    
    try {
        const dateString = getUTCDateString(new Date(selectedDate));
        const total = calculateTotal(formData);
        
        const recordData = {
            wardId: selectedWard,
            date: dateString,
            shift: selectedShift,
            patientCensus: formData.patientCensus || '0',
            admissions: formData.admissions || '0',
            discharges: formData.discharges || '0',
            transfers: formData.transfers || '0',
            deaths: formData.deaths || '0',
            rns: formData.rns || '0',
            pns: formData.pns || '0',
            nas: formData.nas || '0',
            aides: formData.aides || '0',
            studentNurses: formData.studentNurses || '0',
            notes: formData.notes || '',
            createdBy: user?.displayName || 'Unknown',
            createdById: user?.uid || 'Unknown',
            timestamp: serverTimestamp(),
            total: total
        };
        
        // If we have an ID, we're updating
        if (formData.id) {
            const docRef = doc(db, 'wardDailyRecords', formData.id);
            await updateDoc(docRef, recordData);
            return { success: true, operation: 'update', id: formData.id };
        } else {
            // Otherwise, we're creating a new record
            const docRef = await addDoc(collection(db, 'wardDailyRecords'), recordData);
            return { success: true, operation: 'create', id: docRef.id };
        }
    } catch (error) {
        console.error('Error saving data:', error);
        return { success: false, error: error.message };
    }
}; 