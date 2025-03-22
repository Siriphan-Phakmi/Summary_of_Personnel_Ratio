'use client';

/**
 * Form Handlers - Utility functions for form data processing
 */

/**
 * Safely parse an input value to a number
 * @param {string|number} value - The input value to parse
 * @returns {number} - The parsed number or 0 if invalid
 */
export const parseInputValue = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate patient census based on movement data
 * @param {Object} data - Movement data
 * @returns {number} - Calculated patient census
 */
export const calculatePatientCensus = (data) => {
    // Previous patient census is the base
    const previousCensus = parseInputValue(data.previousCensus);
    
    // Add incoming patients
    const newAdmit = parseInputValue(data.newAdmit);
    const transferIn = parseInputValue(data.transferIn);
    const referIn = parseInputValue(data.referIn);
    
    // Subtract outgoing patients
    const transferOut = parseInputValue(data.transferOut);
    const referOut = parseInputValue(data.referOut);
    const discharge = parseInputValue(data.discharge);
    const dead = parseInputValue(data.dead);
    
    // Calculate current census
    return Math.max(0, previousCensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead);
};

/**
 * Calculate overall data based on patient census and movement
 * @param {Object} wardData - Ward data including patient census
 * @param {Object} movement - Patient movement data
 * @returns {number} - Calculated overall data
 */
export const calculateOverallData = (wardData, movement) => {
    const patientCensus = parseInputValue(wardData.patientCensus);
    
    // Add incoming patients
    const newAdmit = parseInputValue(movement.newAdmit);
    const transferIn = parseInputValue(movement.transferIn);
    const referIn = parseInputValue(movement.referIn);
    
    // Subtract outgoing patients
    const transferOut = parseInputValue(movement.transferOut);
    const referOut = parseInputValue(movement.referOut);
    const discharge = parseInputValue(movement.discharge);
    const dead = parseInputValue(movement.dead);
    
    // Calculate overall data
    return Math.max(0, patientCensus + newAdmit + transferIn + referIn - transferOut - referOut - discharge - dead);
};

/**
 * Calculate staff ratio and check against standards
 * @param {number} patients - Number of patients
 * @param {number} rn - Number of RN staff
 * @param {number} pn - Number of PN staff 
 * @returns {Object} - Staff ratio metrics
 */
export const calculateStaffRatio = (patients, rn, pn = 0) => {
    const totalStaff = parseInputValue(rn) + parseInputValue(pn);
    const patientCount = parseInputValue(patients);
    
    if (totalStaff === 0) {
        return {
            ratio: 0,
            meetsStandard: patientCount === 0, // Only meets standard if no patients
            message: patientCount > 0 ? 'ไม่มีเจ้าหน้าที่พยาบาล' : 'ไม่มีผู้ป่วย'
        };
    }
    
    const ratio = patientCount / totalStaff;
    const rnRatio = patientCount / parseInputValue(rn);
    
    // Standards based on Thailand Nursing Council guidelines
    const meetsStandard = rnRatio <= 8; // 1:8 is standard for general wards
    
    return {
        ratio: ratio.toFixed(2),
        rnRatio: rnRatio.toFixed(2),
        meetsStandard,
        message: meetsStandard ? 'อัตราส่วนได้มาตรฐาน' : 'อัตราส่วนต่ำกว่ามาตรฐาน'
    };
};

/**
 * Auto-populate form fields based on historical data or standards
 * @param {Object} formData - Current form data
 * @param {Object} historicalData - Historical data for the ward
 * @returns {Object} - Updated form data
 */
export const autoPopulateFormData = (formData, historicalData) => {
    if (!historicalData) return formData;
    
    const updatedFormData = {...formData};
    
    // Auto-populate staff data if not already set
    if (!updatedFormData.staffSection) updatedFormData.staffSection = {};
    
    // Loop through historical data fields and auto-populate empty fields
    Object.entries(historicalData).forEach(([section, data]) => {
        if (!updatedFormData[section]) updatedFormData[section] = {};
        
        Object.entries(data).forEach(([field, value]) => {
            // Only populate if current value is empty
            if (!updatedFormData[section][field]) {
                updatedFormData[section][field] = value;
            }
        });
    });
    
    return updatedFormData;
};

export default {
    parseInputValue,
    calculatePatientCensus,
    calculateOverallData,
    calculateStaffRatio,
    autoPopulateFormData
};
