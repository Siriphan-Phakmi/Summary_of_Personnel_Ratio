'use client';
import React from 'react';
import { useState } from 'react';
import { Swal } from '../../../utils/alertService';
import { checkApprovalStatus, fetchWardData } from './DataFetchers';
import { parseInputValue } from './FormHandlers';
import { formatThaiDate } from '../../../utils/dateUtils';

export const handleBeforeUnload = (hasUnsavedChanges, e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
    }
};

export const handleInputChange = (e, formData, setFormData, setHasUnsavedChanges) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs: convert empty strings to '0' and validate numbers
    const processedValue = name !== 'notes' ? parseInputValue(value) : value;
    
    setFormData(prev => ({
        ...prev,
        [name]: processedValue
    }));
    
    setHasUnsavedChanges(true);
};

export const handleShiftChange = (shift, setSelectedShift) => {
    setSelectedShift(shift);
};

export const handleDateSelect = async (date, selectedWard, selectedShift, setSelectedDate, setThaiDate, setShowCalendar, setApprovalStatus, setFormData) => {
    setSelectedDate(date);
    setThaiDate(formatThaiDate(date));
    setShowCalendar(false);
    
    try {
        // Check approval status for selected date
        const status = await checkApprovalStatus(date, selectedWard);
        setApprovalStatus(status);
        
        // Fetch ward data for the selected date and shift
        const wardData = await fetchWardData(date, selectedWard, selectedShift);
        
        if (wardData) {
            setFormData({
                id: wardData.id,
                patientCensus: wardData.patientCensus || '0',
                admissions: wardData.admissions || '0',
                discharges: wardData.discharges || '0',
                transfers: wardData.transfers || '0',
                deaths: wardData.deaths || '0',
                rns: wardData.rns || '0',
                pns: wardData.pns || '0',
                nas: wardData.nas || '0',
                aides: wardData.aides || '0',
                studentNurses: wardData.studentNurses || '0',
                notes: wardData.notes || ''
            });
        } else {
            // If no data exists, reset form
            setFormData({
                patientCensus: '0',
                admissions: '0',
                discharges: '0',
                transfers: '0',
                deaths: '0',
                rns: '0',
                pns: '0',
                nas: '0',
                aides: '0',
                studentNurses: '0',
                notes: ''
            });
        }
    } catch (error) {
        console.error('Error in handleDateSelect:', error);
        Swal.fire({
            title: 'Error',
            text: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            icon: 'error',
            confirmButtonColor: '#0ab4ab'
        });
    }
}; 