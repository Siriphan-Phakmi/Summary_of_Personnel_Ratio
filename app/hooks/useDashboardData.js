import { useState, useEffect, useCallback, useReducer } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const initialState = {
    loading: true,
    error: null,
    data: {
        allRecords: [],
        availableDates: [],
        recorders: [],
        overallData: {
            total: 0,
            overallData: 0,
            byWard: {},
            summaryData: {
                opdTotal24hr: 0,
                existingPatients: 0,
                newPatients: 0,
                admissions24hr: 0
            },
            calculations: {
                admissionRate: 0,
                conversionRatio: 0
            }
        }
    }
};

function dashboardReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true };
        case 'FETCH_SUCCESS':
            return {
                loading: false,
                error: null,
                data: action.payload
            };
        case 'FETCH_ERROR':
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        case 'UPDATE_OVERALL_DATA':
            return {
                ...state,
                data: {
                    ...state.data,
                    overallData: action.payload
                }
            };
        default:
            return state;
    }
}

export function useDashboardData() {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        shift: '',
        ward: '',
        recorder: '',
        viewType: 'daily'
    });

    const calculateRates = useCallback((currentTotal, summaryData) => {
        const { opdTotal24hr } = summaryData;
        return {
            admissionRate: opdTotal24hr ? ((currentTotal * 100) / opdTotal24hr).toFixed(2) : 0,
            conversionRatio: currentTotal ? (opdTotal24hr / currentTotal).toFixed(2) : 0
        };
    }, []);

    const filterData = useCallback((records, currentFilters) => {
        let filteredRecords = [...records];

        switch (currentFilters.viewType) {
            case 'daily':
                if (currentFilters.date) {
                    filteredRecords = filteredRecords.filter(record => record.date === currentFilters.date);
                }
                break;
            case 'monthly':
                filteredRecords = filteredRecords.filter(record =>
                    record.date.startsWith(currentFilters.month)
                );
                break;
            case 'yearly':
                filteredRecords = filteredRecords.filter(record =>
                    record.date.startsWith(currentFilters.year)
                );
                break;
        }

        if (currentFilters.shift) {
            filteredRecords = filteredRecords.filter(record => record.shift === currentFilters.shift);
        }
        if (currentFilters.ward) {
            filteredRecords = filteredRecords.filter(record => record.wards[currentFilters.ward]);
        }
        if (currentFilters.recorder) {
            filteredRecords = filteredRecords.filter(record => record.recorder === currentFilters.recorder);
        }

        return filteredRecords;
    }, []);

    const fetchData = useCallback(async () => {
        try {
            dispatch({ type: 'FETCH_START' });
            const staffRef = collection(db, 'staffRecords');
            const q = query(staffRef, orderBy('timestamp', 'desc'));
            console.log('Fetching data from Firebase...');
            const querySnapshot = await getDocs(q);

            const records = querySnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Record data:', data);
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                };
            });

            console.log('Total records fetched:', records.length);

            const dates = [...new Set(records.map(record => record.date))].sort().reverse();
            const uniqueRecorders = [...new Set(records.map(record => record.recorder))].filter(Boolean).sort();

            const filteredRecords = filterData(records, filters);
            console.log('Filtered records:', filteredRecords.length);

            const latestRecord = filteredRecords[0];
            console.log('Latest record:', latestRecord);

            const overallData = latestRecord ? {
                total: calculateTotalPatients(latestRecord.wards),
                overallData: latestRecord.overallData || 0,
                byWard: latestRecord.wardTotals || {},
                summaryData: latestRecord.summaryData,
                calculations: calculateRates(latestRecord.overallData, latestRecord.summaryData)
            } : initialState.data.overallData;

            console.log('Overall data:', overallData);

            dispatch({
                type: 'FETCH_SUCCESS',
                payload: {
                    allRecords: records,
                    availableDates: dates,
                    recorders: uniqueRecorders,
                    overallData
                }
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            dispatch({ type: 'FETCH_ERROR', payload: error.message });
        }
    }, [filters, calculateRates, filterData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        ...state,
        filters,
        setFilters,
        refreshData: fetchData
    };
}

function calculateTotalPatients(wards) {
    return Object.values(wards).reduce((total, ward) => {
        return total + (parseInt(ward.numberOfPatients) || 0);
    }, 0);
}
