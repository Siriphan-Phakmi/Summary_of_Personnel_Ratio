'use client';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getUTCDateString } from '../../../utils/dateUtils';
import { validateParams } from '../../../utils/functionHelper';

export const fetchDatesWithData = async (selectedWard) => {
    try {
        if (!selectedWard) {
            console.warn('fetchDatesWithData: selectedWard is undefined or null');
            return [];
        }
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', selectedWard)
        );
        
        const querySnapshot = await getDocs(q);
        const dates = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date) {
                const dateObj = new Date(data.date);
                if (!isNaN(dateObj.getTime())) {
                    dates.push(dateObj);
                }
            }
        });
        
        return dates;
    } catch (error) {
        console.error('Error fetching dates with data:', error);
        return [];
    }
};

export const fetchPreviousShiftData = async (date, targetWard) => {
    try {
        if (!targetWard) {
            console.warn('fetchPreviousShiftData: targetWard is undefined or null');
            return { shifts: [] };
        }
        
        const dateString = getUTCDateString(new Date(date));
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            where('date', '==', dateString)
        );
        
        const querySnapshot = await getDocs(q);
        const shifts = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            shifts.push({
                id: doc.id,
                ...data
            });
        });
        
        // Order by shift time
        shifts.sort((a, b) => {
            const timeA = a.shift.split('-')[0];
            const timeB = b.shift.split('-')[0];
            return timeA.localeCompare(timeB);
        });
        
        return shifts.length > 0 ? shifts : null;
    } catch (error) {
        console.error('Error fetching previous shift data:', error);
        return null;
    }
};

export const fetchApprovalData = async (date, targetWard) => {
    try {
        if (!targetWard) {
            console.warn('fetchApprovalData: targetWard is undefined or null');
            return 'pending';
        }
        
        const dateString = getUTCDateString(new Date(date));
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            where('date', '==', dateString)
        );
        
        const querySnapshot = await getDocs(q);
        let approvalStatus = 'pending';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.approved) {
                approvalStatus = 'approved';
            }
        });
        
        return approvalStatus;
    } catch (error) {
        console.error('Error fetching approval data:', error);
        return 'pending';
    }
};

export const checkApprovalStatus = async (date, targetWard) => {
    try {
        if (!targetWard) {
            console.warn('checkApprovalStatus: targetWard is undefined or null');
            return 'pending';
        }
        
        const dateString = getUTCDateString(new Date(date));
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            where('date', '==', dateString)
        );
        
        const querySnapshot = await getDocs(q);
        let isApproved = false;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.approved) {
                isApproved = true;
            }
        });
        
        return isApproved ? 'approved' : 'pending';
    } catch (error) {
        console.error('Error checking approval status:', error);
        return 'pending';
    }
};

export const fetchLatestRecord = async (targetWard) => {
    try {
        if (!targetWard) {
            console.warn('fetchLatestRecord: targetWard is undefined or null');
            return null;
        }
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', targetWard),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const latestDoc = querySnapshot.docs[0];
            const data = latestDoc.data();
            
            if (data.date) {
                return new Date(data.date);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching latest record:', error);
        return null;
    }
};

export const fetchWardData = async (date, selectedWard, selectedShift) => {
    // ตรวจสอบอย่างเข้มงวด
    if (!date) {
        console.error('fetchWardData: date is required but got:', date);
        return null;
    }
    
    if (!selectedWard || selectedWard.trim() === '') {
        console.error('fetchWardData: selectedWard is required but got:', selectedWard);
        return null;
    }
    
    if (!selectedShift || selectedShift.trim() === '') {
        console.error('fetchWardData: selectedShift is required but got:', selectedShift);
        return null;
    }
    
    try {
        const dateString = getUTCDateString(new Date(date));
        
        console.log('Fetching ward data with query params:', {
            wardId: selectedWard,
            date: dateString,
            shift: selectedShift
        });
        
        const q = query(
            collection(db, 'wardDailyRecords'),
            where('wardId', '==', selectedWard),
            where('date', '==', dateString),
            where('shift', '==', selectedShift)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            
            return {
                id: doc.id,
                ...data
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching ward data:', error);
        return null;
    }
}; 