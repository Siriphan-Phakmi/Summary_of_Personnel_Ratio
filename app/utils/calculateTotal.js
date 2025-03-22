/**
 * Utility functions to calculate totals for different categories in the Ward Form
 * ฟังก์ชั่นสำหรับคำนวณค่ารวมในแต่ละหมวดหมู่ของฟอร์ม Ward
 */

/**
 * Safely parses input value to number, returning 0 for invalid inputs
 * แปลงค่า input เป็นตัวเลข โดยส่งคืน 0 สำหรับค่าที่ไม่ถูกต้อง
 * @param {string|number} value - Input value to parse
 * @returns {number} - Parsed number or 0 if invalid
 */
export const parseInputValue = (value) => {
    // If value is boolean (for checkboxes), return as is
    if (typeof value === 'boolean') return value;
    
    // If value is string or number that needs parsing
    if (value === '' || value === null || value === undefined) return 0;
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculates the total for a specific category
 * คำนวณค่ารวมสำหรับหมวดหมู่
 * @param {string} category - Category name ('staffing' or 'patientCensus')
 * @param {object} formData - The form data object
 */
export const calculateTotal = (category, formData) => {

    // Helper function to parse input values safely
    const parseInputValue = (value) => {
        if (value === '' || value === null || value === undefined) return 0;
        
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    };

    switch (category) {
        case 'staffing':
            // Calculate total staff (rn + pn + na)
            const rn = parseInputValue(formData.staffing.rn);
            const pn = parseInputValue(formData.staffing.pn);
            const na = parseInputValue(formData.staffing.na);
            
            // Set the total
            formData.staffing.total = rn + pn + na;
            break;
            
        case 'patientCensus':
            const previous = parseInputValue(formData.patientCensus.previous || 0);
            const admit = parseInputValue(formData.patientCensus.admit);
            const discharge = parseInputValue(formData.patientCensus.discharge);
            const transfer = parseInputValue(formData.patientCensus.transfer);
            const referIn = parseInputValue(formData.patientCensus.referIn);
            const referOut = parseInputValue(formData.patientCensus.referOut);
            const dead = parseInputValue(formData.patientCensus.dead);
            
            // Set current census
            formData.patientCensus.current = previous + admit + referIn - discharge - transfer - referOut - dead;
            break;
            
        default:
            // No calculation for other categories
            break;
    }
    
    return formData;
};