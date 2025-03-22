// Validation utilities for dashboard data

export const validateNumber = (value, fieldName) => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid number for ${fieldName}: ${value}`);
  }
  return num;
};

export const validateWardData = (wardData) => {
  if (!wardData || typeof wardData !== 'object') {
    throw new Error('Invalid ward data structure');
  }

  const validated = {
    numberOfPatients: validateNumber(wardData.numberOfPatients || 0, 'numberOfPatients'),
    RN: validateNumber(wardData.RN || 0, 'RN'),
    PN: validateNumber(wardData.PN || 0, 'PN'),
    admin: validateNumber(wardData.admin || 0, 'admin'),
    newAdmissions: validateNumber(wardData.newAdmissions || 0, 'newAdmissions'),
    discharge: validateNumber(wardData.discharge || 0, 'discharge')
  };
  
  // Validate staff ratio - RN:Patient should be at least 1:8 for general wards
  const patientCount = validated.numberOfPatients;
  const rnCount = validated.RN;
  
  if (patientCount > 0 && rnCount > 0) {
    const ratio = patientCount / rnCount;
    validated.staffRatioValid = ratio <= 8; // Standard ratio is 1:8
    validated.staffRatio = ratio.toFixed(2);
  }
  
  return validated;
};

export const validateSummaryData = (summaryData) => {
  if (!summaryData || typeof summaryData !== 'object') {
    throw new Error('Invalid summary data structure');
  }

  return {
    opdTotal24hr: validateNumber(summaryData.opdTotal24hr || 0, 'opdTotal24hr'),
    existingPatients: validateNumber(summaryData.existingPatients || 0, 'existingPatients'),
    newPatients: validateNumber(summaryData.newPatients || 0, 'newPatients'),
    admissions24hr: validateNumber(summaryData.admissions24hr || 0, 'admissions24hr')
  };
};

export const validateDate = (date) => {
  if (!date) return null;
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format');
  }
  return parsedDate;
};

export const validateRecord = (record) => {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid record structure');
  }

  const validatedWards = {};
  if (record.wards) {
    Object.entries(record.wards).forEach(([wardName, wardData]) => {
      validatedWards[wardName] = validateWardData(wardData);
    });
  }

  return {
    id: record.id,
    date: validateDate(record.date),
    shift: record.shift || '',
    wards: validatedWards,
    summaryData: validateSummaryData(record.summaryData || {}),
    timestamp: validateDate(record.timestamp) || new Date(),
    recorder: record.recorder || '',
    recorderFirstName: record.recorderFirstName || '',
    recorderLastName: record.recorderLastName || ''
  };
};

// Calculate expected staff based on patient count
export const calculateExpectedStaff = (patientCount, careLevel = 'standard') => {
  // Standard care level ratios
  const ratios = {
    'intensive': 1/2,  // 1 RN per 2 patients
    'intermediate': 1/4, // 1 RN per 4 patients
    'standard': 1/8,   // 1 RN per 8 patients
    'minimal': 1/12    // 1 RN per 12 patients
  };
  
  const ratio = ratios[careLevel] || ratios.standard;
  const expectedRN = Math.ceil(patientCount * ratio);
  const expectedPN = Math.ceil(patientCount * ratio * 0.5); // Half the number of RNs
  
  return { 
    expectedRN, 
    expectedPN,
    total: expectedRN + expectedPN,
    isAdequate: (record) => {
      if (!record) return false;
      return (record.RN >= expectedRN && record.PN >= expectedPN);
    }
  };
};
