import { isFutureDateMoreThanOneDay } from './dateHelpers';

// Validation functions from validation.js
export const validateInput = (value, type) => {
    switch (type) {
        case 'number':
            return /^\d*$/.test(value);
        case 'text':
            return value.length <= 100;
        default:
            return true;
    }
};

export const validateWardData = (wardData) => {
    const errors = [];
    
    // Validate number fields
    const numberFields = ['numberOfPatients', 'nurseManager', 'RN', 'PN', 'WC'];
    numberFields.forEach(field => {
        if (wardData[field] && !validateInput(wardData[field], 'number')) {
            errors.push(`${field} must be a number`);
        }
    });

    // Validate text fields
    if (wardData.comment && !validateInput(wardData.comment, 'text')) {
        errors.push('Comment must be less than 100 characters');
    }

    return errors;
};

// Check if form has any data changes
export const hasDataChanges = (formData) => {
    let changes = {
        staff: false,
        movement: false,
        additional: false
    };

    Object.values(formData.wards).forEach(ward => {
        // Check Staff changes
        if (ward.nurseManager !== '0' || ward.RN !== '0' || ward.PN !== '0' || ward.WC !== '0') {
            changes.staff = true;
        }
        // Check Patient Movement changes
        if (ward.newAdmit !== '0' || ward.transferIn !== '0' || ward.referIn !== '0' ||
            ward.transferOut !== '0' || ward.referOut !== '0' || ward.discharge !== '0' || ward.dead !== '0') {
            changes.movement = true;
        }
        // Check Additional Information changes
        if (ward.availableBeds !== '0' || ward.unavailable !== '0' || ward.plannedDischarge !== '0' || ward.comment.trim() !== '') {
            changes.additional = true;
        }
    });
    
    return changes;
};

// Validate form data
export const validateFormData = (formData, summaryData) => {
    console.log('Validating form data...', formData);

    // Check data changes
    const changes = hasDataChanges(formData);
    if (!changes.staff && !changes.movement && !changes.additional) {
        const confirmNoChanges = window.confirm(
            'คุณยังไม่ได้กรอกข้อมูลเพิ่มเติมในส่วนใดๆ\n\n' +
            'กรุณาตรวจสอบและกรอกข้อมูลในส่วนต่างๆ:\n' +
            '- ข้อมูลเจ้าหน้าที่ (Staff)\n' +
            '- ข้อมูลการเคลื่อนย้ายผู้ป่วย (Patient Movement)\n' +
            '- ข้อมูลเพิ่มเติม (Additional Information)\n\n' +
            'ต้องการดำเนินการต่อหรือไม่?'
        );
        if (!confirmNoChanges) {
            return false;
        }
    }

    const validationChecks = [
        {
            condition: !formData.date || formData.date.trim() === '',
            message: 'กรุณาเลือกวันที่ก่อนดำเนินการต่อ'
        },
        {
            condition: !formData.shift || formData.shift.trim() === '',
            message: 'กรุณาเลือกกะการทำงาน'
        },
        {
            condition: isFutureDateMoreThanOneDay(formData.date),
            message: 'ไม่สามารถบันทึกข้อมูลล่วงหน้าเกิน 1 วันได้'
        },
        {
            condition: !summaryData.recorderFirstName?.trim() || !summaryData.recorderLastName?.trim(),
            message: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล'
        },
        {
            condition: !summaryData.supervisorFirstName?.trim() || !summaryData.supervisorLastName?.trim(),
            message: 'กรุณากรอกชื่อและนามสกุลผู้ตรวจการ'
        }
    ];
    
    // Check each validation condition
    for (const check of validationChecks) {
        if (check.condition) {
            alert(check.message);
            return false;
        }
    }
    
    // Validate staff ratio requirements for each ward
    let staffRatioValid = true;
    let ratioWarningMessage = '';
    
    Object.entries(formData.wards).forEach(([ward, data]) => {
        const patientCount = parseInt(data.numberOfPatients || 0);
        const rnCount = parseInt(data.RN || 0);
        
        // Skip wards with no patients
        if (patientCount === 0) return;
        
        // Calculate ratio - 1:8 is standard (1 RN per 8 patients)
        if (rnCount > 0) {
            const ratio = patientCount / rnCount;
            
            if (ratio > 8) {
                staffRatioValid = false;
                ratioWarningMessage += `\n- ${ward}: อัตราส่วนพยาบาลต่อผู้ป่วย 1:${ratio.toFixed(1)} (มาตรฐาน 1:8)`;
            }
        } else if (patientCount > 0) {
            staffRatioValid = false;
            ratioWarningMessage += `\n- ${ward}: ไม่มีพยาบาล RN ในขณะที่มีผู้ป่วย ${patientCount} คน`;
        }
    });
    
    // Show warning for staff ratio issues
    if (!staffRatioValid) {
        const continueWithWarning = window.confirm(
            'พบอัตราส่วนพยาบาลต่อผู้ป่วยที่ต่ำกว่ามาตรฐาน:' + 
            ratioWarningMessage + 
            '\n\nต้องการดำเนินการต่อหรือไม่?'
        );
        
        if (!continueWithWarning) {
            return false;
        }
    }

    // If all checks pass
    return true;
};

// Add additional validation for patient census calculation
export const validatePatientCensusCalculation = (wardData) => {
    // Parse all movement values
    const previousCensus = parseInt(wardData.previousCensus || 0);
    const newAdmit = parseInt(wardData.newAdmit || 0); 
    const transferIn = parseInt(wardData.transferIn || 0);
    const referIn = parseInt(wardData.referIn || 0);
    const transferOut = parseInt(wardData.transferOut || 0);
    const referOut = parseInt(wardData.referOut || 0);
    const discharge = parseInt(wardData.discharge || 0);
    const dead = parseInt(wardData.dead || 0);
    
    // Calculate the expected current census
    const calculatedCensus = previousCensus + newAdmit + transferIn + referIn 
                           - transferOut - referOut - discharge - dead;
    
    // Get the current census from the data
    const currentCensus = parseInt(wardData.numberOfPatients || 0);
    
    // Check if there's a discrepancy
    if (calculatedCensus !== currentCensus) {
        return {
            valid: false,
            calculatedValue: calculatedCensus,
            currentValue: currentCensus,
            difference: Math.abs(calculatedCensus - currentCensus)
        };
    }
    
    return { valid: true };
};