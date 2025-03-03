'use client';

// Mock data for users
export const mockUsers = [
  {
    id: 'user1',
    username: 'Ward6',
    department: 'Ward6',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user2',
    username: 'Ward7',
    department: 'Ward7',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user3',
    username: 'Ward8',
    department: 'Ward8',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user4',
    username: 'Ward9',
    department: 'Ward9',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user5',
    username: 'WardGI',
    department: 'WardGI',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user6',
    username: 'Ward10B',
    department: 'Ward10B',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user7',
    username: 'Ward11',
    department: 'Ward11',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user8',
    username: 'Ward12',
    department: 'Ward12',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user9',
    username: 'ICU',
    department: 'ICU',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user10',
    username: 'CCU',
    department: 'CCU',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user11',
    username: 'LR',
    department: 'LR',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'user12',
    username: 'NSY',
    department: 'NSY',
    role: 'user',
    password: 'password123'
  },
  {
    id: 'admin1',
    username: 'admin',
    department: 'Admin',
    role: 'admin',
    password: 'admin123'
  }
];

// Mock data for ward records
export const mockWardRecords = {
  'Ward6': {
    patientCensus: '25',
    overallData: '23',
    approvalStatus: 'approved',
    shifts: {
      '07:00-19:00': {
        nurseManager: '1',
        RN: '5',
        PN: '2',
        WC: '2',
        newAdmit: '3',
        transferIn: '1',
        referIn: '0',
        transferOut: '0',
        referOut: '1',
        discharge: '4',
        dead: '0',
        comment: 'ทุกอย่างปกติ'
      },
      '19:00-07:00': {
        nurseManager: '0',
        RN: '4',
        PN: '2',
        WC: '1',
        newAdmit: '2',
        transferIn: '0',
        referIn: '0',
        transferOut: '1',
        referOut: '0',
        discharge: '0',
        dead: '1',
        comment: 'พยาบาลขาด 1 คน'
      }
    }
  },
  'Ward7': {
    patientCensus: '18',
    overallData: '20',
    approvalStatus: 'pending',
    shifts: {
      '07:00-19:00': {
        nurseManager: '1',
        RN: '4',
        PN: '3',
        WC: '1',
        newAdmit: '4',
        transferIn: '0',
        referIn: '1',
        transferOut: '1',
        referOut: '0',
        discharge: '2',
        dead: '0',
        comment: ''
      }
    }
  }
};

// Mock staff records for shifts
export const mockStaffRecords = [
  {
    id: 'shift1',
    date: '2025-03-01',
    shift: '07:00-19:00',
    wards: {
      Ward6: {
        numberOfPatients: '25',
        nurseManager: '1',
        RN: '5',
        PN: '2',
        WC: '2',
        overallData: '23'
      },
      Ward7: {
        numberOfPatients: '18',
        nurseManager: '1',
        RN: '4',
        PN: '3',
        WC: '1',
        overallData: '20'
      }
    },
    summaryData: {
      opdTotal24hr: '45',
      existingPatients: '120',
      newPatients: '18',
      admissions24hr: '12',
      supervisorFirstName: 'สมศักดิ์',
      supervisorLastName: 'มีสุข',
      recorderFirstName: 'สมชาย',
      recorderLastName: 'ใจดี'
    }
  }
];

// Helper function for mock login
export const mockLogin = (username, password) => {
  const user = mockUsers.find(u => u.username === username && u.password === password);
  if (user) {
    return {
      uid: user.id,
      username: user.username,
      department: user.department,
      role: user.role
    };
  }
  return null;
};

// Helper function to get mock data with delay to simulate network
export const getMockDataWithDelay = (data, delay = 500) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
};
