import RefactoredDashboardPage from './layout/RefactoredDashboardPage';
import WardDataTable from './ward-summary/WardDataTable';
import { WardSummaryStatsComponent as WardSummaryStats } from './ward-summary';
import EnhancedBarChart from './charts/EnhancedBarChart';
import EnhancedPieChart from './charts/EnhancedPieChart';
import PatientTrendChart from './charts/PatientTrendChart';
import WardSummaryTable from './ward-summary/WardSummaryTable';
import ShiftComparisonPanel from './ShiftComparisonPanel';
import CalendarWithEvents from './CalendarWithEvents';
import BedSummaryPieChart from './charts/BedSummaryPieChart';
import FormStatusBadge from './FormStatusBadge';
import ShiftBadge from './ShiftBadge';
import WardSummaryCard from './ward-summary/WardSummaryCard';
import ShiftComparisonChart from './charts/ShiftComparisonChart';
import PatientCensusCalculation from './PatientCensusCalculation';
import WardButton from './ward-summary/WardButton';
import ShiftSummary from './ShiftSummary';
import WardSummaryGrid from './ward-summary/WardSummaryGrid';
import WardSummaryDashboard from './ward-summary/WardSummaryDashboard';
import NoDataMessage from './NoDataMessage';
import WardCensusButtons from './ward-summary/WardCensusButtons';
import DashboardHeader from './layout/DashboardHeader';
import DashboardCalendar from './layout/DashboardCalendar';
import PatientCensusSection from './sections/PatientCensusSection';

// Export all components
export {
  RefactoredDashboardPage,
  WardDataTable,
  WardSummaryStats,
  EnhancedBarChart,
  EnhancedPieChart,
  PatientTrendChart,
  WardSummaryTable,
  ShiftComparisonPanel,
  CalendarWithEvents,
  BedSummaryPieChart,
  FormStatusBadge,
  ShiftBadge,
  WardSummaryCard,
  ShiftComparisonChart,
  PatientCensusCalculation,
  WardButton,
  ShiftSummary,
  WardSummaryGrid,
  WardSummaryDashboard,
  NoDataMessage,
  WardCensusButtons,
  DashboardHeader,
  DashboardCalendar,
  PatientCensusSection,
};

// Export types
export * from './types';

// Export section components
export * from './sections';

export { default as DashboardPage } from './layout/RefactoredDashboardPage'; 