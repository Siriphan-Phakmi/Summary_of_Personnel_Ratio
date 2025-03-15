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

    for (const check of validationChecks) {
        if (check.condition) {
            console.log('Validation failed:', check.message);
            if (check.message) alert(check.message);
            return false;
        }
    }

    // Validate ward data
    for (const [wardName, wardData] of Object.entries(formData.wards)) {
        const wardErrors = validateWardData(wardData);
        if (wardErrors.length > 0) {
            alert(`Errors in ${wardName}:\n${wardErrors.join('\n')}`);
            return false;
        }
    }

    return true;
};