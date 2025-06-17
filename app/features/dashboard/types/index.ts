// Data for Bed Summary Pie Chart
export interface BedSummaryData {
  name?: string; // Add name property
  availableBeds?: number; // จาก dailySummaries
  unavailableBeds?: number; // จาก dailySummaries
  plannedDischarge?: number;
  available?: number; // จาก wardForm
  unavailable?: number; // จาก wardForm
  wardName?: string; // เพิ่มชื่อ Ward
}

export interface WardBedData {
  id: string;
  name: string;
  available: number;
  unavailable: number;
  plannedDischarge: number;
} 