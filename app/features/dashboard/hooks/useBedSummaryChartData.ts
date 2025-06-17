'use client';

import { useMemo } from 'react';
import { BedSummaryData, WardBedData } from '@/app/features/dashboard/types';
import { COLORS, NO_AVAILABLE_BEDS_COLOR } from '@/app/features/dashboard/utils/chartConstants';

export const useBedSummaryChartData = (data: BedSummaryData | WardBedData[]) => {
  return useMemo(() => {
    const isMultipleWards = Array.isArray(data);
    
    let chartData: any[] = [];
    let totalAvailableBeds = 0;
    let totalUnavailableBeds = 0;
    let totalBeds = 0;
    
    if (isMultipleWards) {
      chartData = (data as WardBedData[])
        .map((ward, index) => {
          const availableBeds = ward.available || 0;
          const unavailableBeds = ward.unavailable || 0;
          
          totalAvailableBeds += availableBeds;
          totalUnavailableBeds += unavailableBeds;
          totalBeds += availableBeds + unavailableBeds;
          
          return {
            id: ward.id,
            name: ward.name || ward.id,
            value: availableBeds,
            unavailable: unavailableBeds,
            totalBeds: availableBeds + unavailableBeds,
            plannedDischarge: ward.plannedDischarge || 0,
            color: availableBeds > 0 ? COLORS[index % COLORS.length] : NO_AVAILABLE_BEDS_COLOR,
          };
        });
    } else {
      const singleData = data as BedSummaryData;
      
      const availableBeds = singleData.available || singleData.availableBeds || 0;
      const unavailableBeds = singleData.unavailable || singleData.unavailableBeds || 0;
      
      totalAvailableBeds = availableBeds;
      totalUnavailableBeds = unavailableBeds;
      totalBeds = availableBeds + unavailableBeds;
      
      chartData = [
        { 
          name: singleData.name || singleData.wardName || 'เตียงว่าง', 
          value: availableBeds, 
          unavailable: unavailableBeds,
          totalBeds: availableBeds + unavailableBeds,
          plannedDischarge: singleData.plannedDischarge || 0,
          color: availableBeds > 0 ? COLORS[0] : NO_AVAILABLE_BEDS_COLOR
        }
      ];
    }

    let pieChartData: any[] = [];
    
    if (totalAvailableBeds === 0 && totalUnavailableBeds > 0) {
      pieChartData = chartData.map(item => ({
        id: item.id,
        name: item.name,
        value: item.unavailable,
        totalBeds: item.totalBeds,
        color: NO_AVAILABLE_BEDS_COLOR,
        isUnavailable: true,
      }));
    } else {
      pieChartData = chartData.map(item => ({
        id: item.id,
        name: item.name,
        value: item.value,
        unavailable: item.unavailable,
        totalBeds: item.totalBeds,
        plannedDischarge: item.plannedDischarge,
        color: item.color,
      }));
    }

    return { chartData, pieChartData, totalAvailableBeds, totalUnavailableBeds, totalBeds };
  }, [data]);
}; 