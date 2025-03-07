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

  return {
    numberOfPatients: validateNumber(wardData.numberOfPatients || 0, 'numberOfPatients'),
    RN: validateNumber(wardData.RN || 0, 'RN'),
    PN: validateNumber(wardData.PN || 0, 'PN'),
    admin: validateNumber(wardData.admin || 0, 'admin'),
    newAdmissions: validateNumber(wardData.newAdmissions || 0, 'newAdmissions'),
    discharge: validateNumber(wardData.discharge || 0, 'discharge')
  };
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
    recorder: record.recorder || ''
  };
};
