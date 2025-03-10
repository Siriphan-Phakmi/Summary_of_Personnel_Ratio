import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, auth, FETCH_LIMIT, COLLECTIONS, ACCESS_LEVELS, checkUserAccess, handleUnauthorized } from '../config/firebase-config';
import { validateRecord } from '../utils/validation';
import { handleError, ValidationError, DataFetchError } from '../utils/error-handler';
import {
    useMemoizedCalculations,
    useOptimizedFilter,
    processInChunks,
    getCachedData,
    setCachedData,
    debounce
} from '../utils/performance';

const initialState = {
    loading: true,
    error: null,
    errorType: null,
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
                error: action.payload.message,
                errorType: action.payload.type
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
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        shift: '',
        ward: '',
        recorder: '',
        viewType: 'daily'
    });

    // Memoize filter function
    const optimizedFilter = useOptimizedFilter();

    // Memoize calculations
    const calculations = useMemoizedCalculations(
        state.data.overallData.byWard,
        [state.data.overallData.byWard]
    );

    const calculateRates = useCallback((currentTotal, summaryData) => {
        if (!currentTotal || !summaryData) return { admissionRate: 0, conversionRatio: 0 };
        
        const { opdTotal24hr } = summaryData;
        return {
            admissionRate: opdTotal24hr ? ((currentTotal * 100) / opdTotal24hr).toFixed(2) : 0,
            conversionRatio: currentTotal ? (opdTotal24hr / currentTotal).toFixed(2) : 0
        };
    }, []);

    // Memoize filtered data
    const filteredData = useMemo(() => {
        return optimizedFilter(state.data.allRecords, filters);
    }, [state.data.allRecords, filters, optimizedFilter]);

    const fetchData = useCallback(async () => {
        try {
            // Check cache first
            const cacheKey = JSON.stringify(filters);
            const cachedData = getCachedData(cacheKey);
            
            if (cachedData) {
                dispatch({ type: 'FETCH_SUCCESS', payload: cachedData });
                return;
            }

            dispatch({ type: 'FETCH_START' });

            // Check if user is authenticated
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Authentication required');
            }

            // Check if user has required access level
            const hasAccess = await checkUserAccess(user, ACCESS_LEVELS.READ);
            if (!hasAccess) {
                handleUnauthorized();
            }

            // Implement rate limiting
            const now = Date.now();
            if (now - lastFetchTime < FETCH_LIMIT.COOLDOWN) {
                throw new Error('Please wait before fetching data again');
            }
            setLastFetchTime(now);

            const staffRef = collection(db, COLLECTIONS.STAFF_RECORDS);
            
            // Add pagination and limit
            const q = query(
                staffRef,
                orderBy('timestamp', 'desc'),
                limit(FETCH_LIMIT.LIMIT)
            );

            const querySnapshot = await getDocs(q);
            
            // Process records in chunks to avoid blocking the main thread
            const validRecords = await processInChunks(
                querySnapshot.docs,
                async (doc) => {
                    try {
                        const rawData = doc.data();
                        return validateRecord({
                            id: doc.id,
                            ...rawData
                        });
                    } catch (validationError) {
                        console.error(`Validation error for document ${doc.id}:`, validationError);
                        return null;
                    }
                }
            );

            const filteredRecords = filteredData.length > 0 ? filteredData : validRecords;
            
            if (filteredRecords.length === 0) {
                throw new ValidationError('No records match the current filters');
            }

            const payload = {
                allRecords: validRecords,
                availableDates: [...new Set(validRecords.map(record => record.date))].sort().reverse(),
                recorders: [...new Set(validRecords.map(record => record.recorder))].filter(Boolean).sort(),
                overallData: calculations || initialState.data.overallData
            };

            // Cache the results
            setCachedData(cacheKey, payload);
            
            dispatch({ type: 'FETCH_SUCCESS', payload });

        } catch (error) {
            const handledError = handleError(error);
            dispatch({
                type: 'FETCH_ERROR',
                payload: {
                    message: handledError.message,
                    type: handledError.type
                }
            });
        }
    }, [filters, calculateRates, filteredData, calculations, optimizedFilter]);

    // Debounce filter changes
    const debouncedFetchData = useMemo(() => {
        const wait = filters.viewType === 'daily' ? 300 : 600;
        return debounce(fetchData, wait);
    }, [fetchData, filters.viewType]);

    useEffect(() => {
        debouncedFetchData();
        return () => {
            // Cleanup function
            cache.clear();
        };
    }, [debouncedFetchData]);

    return {
        ...state,
        filters,
        setFilters,
        calculations
    };
}

function calculateTotalPatients(wards) {
    return Object.values(wards).reduce((total, ward) => {
        return total + (parseInt(ward.numberOfPatients) || 0);
    }, 0);
}
