/**
 * @fileoverview This barrel file exports all dashboard-related types.
 * It centralizes all type definitions for easy importing across the feature.
 */

export * from './button-types';
export * from './chart-types';
export * from './component-types';
export * from './componentInterfaces';
export * from './dashboardPageTypes';
export * from './interface-types';
export * from './shiftComparisonTypes';

// Re-export core form types for convenience within the dashboard feature
export type { Ward, WardForm, ShiftType, FormStatus } from '@/app/features/ward-form/types/ward';